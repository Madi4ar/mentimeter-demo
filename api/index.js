'use strict';
// Викторина для Vercel: функции без состояния, состояние игры лежит в Redis (Upstash).
// Тот же API, что у server.js, но без потока событий: клиенты опрашивают /api/state.

const crypto = require('crypto');
const { pipe, obj } = require('../lib/redis');
const Q = require('../lib/quiz');

const HOST_PIN = String(process.env.HOST_PIN || '1234');
const GRACE_MS = 700;
const ONLINE_MS = 8000;
const MAX_PLAYERS = 600;
const SCALE = 1e8; // место в рейтинге = очки * SCALE - суммарное время (мс)

const K = {
  quiz: 'q:quiz', qn: 'q:qn', qs: 'q:qs', game: 'q:game',
  names: 'q:names', keys: 'q:keys', rank: 'q:rank', seen: 'q:seen', snap: 'q:snap',
  p: (id) => 'q:p:' + id,
  cnt: (qk) => 'q:cnt:' + qk,
};

function fresh() {
  return { phase: 'lobby', qIndex: -1, gid: '', total: 0, cur: null, correct: -1, autoEnd: true, startedAt: 0, endsAt: 0, revealAt: 0, board: null };
}

function parseGame(s) {
  if (!s) return fresh();
  try { return Object.assign(fresh(), JSON.parse(s)); } catch (e) { return fresh(); }
}

// фаза с учётом времени: по таймеру вопрос сам «закрывается», ждать таймеров на сервере не нужно
function eff(g, now) {
  if (g.phase !== 'question') return g.phase;
  if (now >= g.endsAt + GRACE_MS) return 'reveal';
  if (g.revealAt && now >= g.revealAt) return 'reveal';
  return 'question';
}

const qkeyOf = (g) => g.gid + ':' + g.qIndex;

function pinOk(pin) {
  const a = crypto.createHash('sha256').update(String(pin || '')).digest();
  const b = crypto.createHash('sha256').update(HOST_PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

function send(res, code, o) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(o));
}

function baseState(g, ph, now) {
  const s = { phase: ph, qIndex: g.qIndex, total: g.total, now, startedAt: g.startedAt, endsAt: g.endsAt, poll: ph === 'question' ? 1000 : 2000 };
  if (g.cur && ph !== 'lobby' && ph !== 'final') {
    s.question = g.cur;
    if (ph !== 'question') s.correct = g.correct;
  }
  if (ph === 'board' || ph === 'final') s.board = g.board;
  return s;
}

/* ---------- состояние для ведущего и участников ---------- */

async function hostState() {
  const now = Date.now();
  const [gs, qn] = await pipe([['GET', K.game], ['GET', K.qn]]);
  const g = parseGame(gs);
  const ph = eff(g, now);
  const s = baseState(g, ph, now);
  s.poll = 1000;
  if (ph === 'lobby') s.total = Number(qn) || Q.cleanQuiz(Q.SAMPLE).questions.length;
  const cmds = [['ZCARD', K.rank], ['ZCOUNT', K.seen, now - ONLINE_MS, '+inf']];
  if (ph === 'lobby') cmds.push(['HGETALL', K.names]);
  if (ph === 'question' || ph === 'reveal') cmds.push(['HGETALL', K.cnt(qkeyOf(g))]);
  const r = await pipe(cmds);
  s.playerCount = r[0];
  s.connected = r[1];
  s.answered = 0;
  if (ph === 'lobby') {
    const names = obj(r[2]);
    s.players = Object.keys(names).slice(-400).map((id) => ({ id, name: names[id] }));
  }
  if (ph === 'question' || ph === 'reveal') {
    const c = obj(r[2]);
    s.answered = Number(c.a) || 0;
    if (ph === 'reveal') {
      s.counts = g.cur.options.map((_, i) => Number(c['o' + i]) || 0);
      s.correctCount = Number(c.c) || 0;
    }
  }
  return s;
}

async function playerState(id) {
  const now = Date.now();
  const [gs, hash] = await pipe([['GET', K.game], ['HGETALL', K.p(id)], ['ZADD', K.seen, 'XX', now, id]]);
  const g = parseGame(gs);
  const ph = eff(g, now);
  const s = baseState(g, ph, now);
  const p = obj(hash);
  s.playerCount = 0; s.connected = 0; s.answered = 0;
  if (!p.name) { s.me = null; return s; }

  const qk = qkeyOf(g);
  const mine = g.gid ? p['a_' + qk] : null; // «выбор|мс|очки»
  let choice = null, ms = null, pts = 0;
  if (mine) { const a = mine.split('|'); choice = Number(a[0]); ms = Number(a[1]); pts = Number(a[2]); }
  const me = { name: p.name, score: Number(p.score) || 0, rank: null, choice, last: null };
  if (ph === 'question') {
    me.score -= pts; // очки за текущий вопрос видны только после показа ответа
    // время ответа считаем с момента, когда участник получил вопрос
    if (p.seenKey !== qk) await pipe([['HSET', K.p(id), 'seenKey', qk, 'seenAt', now]]);
  } else {
    const [card, rk] = await pipe([['ZCARD', K.rank], ['ZREVRANK', K.rank, id]]);
    s.playerCount = card;
    me.rank = rk == null ? null : rk + 1;
    if (ph !== 'lobby') {
      me.last = { choice, correct: choice != null && choice === g.correct, points: pts, ms };
    }
  }
  s.me = me;
  return s;
}

/* ---------- действия ведущего ---------- */

async function allIds() {
  const [ids] = await pipe([['HKEYS', K.names]]);
  return ids || [];
}

async function resetScores() {
  const ids = await allIds();
  const cmds = ids.map((id) => ['HSET', K.p(id), 'score', 0, 'timeMs', 0]);
  if (ids.length) cmds.push(['ZADD', K.rank].concat(...ids.map((id) => [0, id])));
  cmds.push(['DEL', K.snap]);
  await pipe(cmds);
}

async function makeBoard() {
  const [top, snapS, card, all] = await pipe([
    ['ZREVRANGE', K.rank, 0, 9, 'WITHSCORES'], ['GET', K.snap], ['ZCARD', K.rank], ['ZRANGE', K.rank, 0, -1, 'WITHSCORES'],
  ]);
  const ids = [], comp = [];
  for (let i = 0; i + 1 < top.length; i += 2) { ids.push(top[i]); comp.push(Number(top[i + 1])); }
  const names = ids.length ? (await pipe([['HMGET', K.names].concat(ids)]))[0] : [];
  let snap = {};
  try { snap = JSON.parse(snapS || '{}'); } catch (e) { snap = {}; }
  const prev = Object.values(snap);
  const rows = ids.map((id, i) => {
    const before = snap[id] || 0;
    return {
      id, name: names[i] || '?', score: Math.round(comp[i] / SCALE), prevScore: Math.round(before / SCALE),
      rank: i + 1, prevRank: 1 + prev.filter((v) => v > before).length,
    };
  });
  const next = {};
  for (let i = 0; i + 1 < all.length; i += 2) next[all[i]] = Number(all[i + 1]);
  await pipe([['SET', K.snap, JSON.stringify(next)]]);
  return { rows, total: card };
}

async function startQuestion(g, qs, i, now) {
  const q = qs[i];
  g.phase = 'question';
  g.qIndex = i;
  g.cur = { text: q.text, options: q.options, seconds: q.seconds };
  g.correct = q.correct;
  g.startedAt = now;
  g.endsAt = now + q.seconds * 1000;
  g.revealAt = 0;
  g.board = null;
}

async function loadQuiz() {
  const [s] = await pipe([['GET', K.quiz]]);
  if (!s) return Q.cleanQuiz(Q.SAMPLE);
  try { return Q.cleanQuiz(JSON.parse(s)); } catch (e) { return Q.cleanQuiz(Q.SAMPLE); }
}

async function hostAction(body, send_) {
  const now = Date.now();
  const [gs] = await pipe([['GET', K.game]]);
  const g = parseGame(gs);
  const ph = eff(g, now);
  const t = body.type;
  const save = () => pipe([['SET', K.game, JSON.stringify(g)]]);

  if (t === 'start') {
    if (ph !== 'lobby') return send_(409, { error: 'Игра уже идёт', code: 'already_started' });
    const quiz = await loadQuiz();
    const err = Q.validateQuiz(quiz);
    if (err) return send_(400, err);
    const qs = quiz.questions.map(Q.compactQuestion);
    await resetScores();
    await pipe([['SET', K.qs, JSON.stringify(qs)]]);
    g.gid = String(now); g.total = qs.length; g.autoEnd = quiz.autoEnd;
    await startQuestion(g, qs, 0, now);
    await save();
  } else if (t === 'reveal') {
    if (ph !== 'question' && !(g.phase === 'question' && ph === 'reveal')) return send_(409, { error: 'Сейчас не идёт вопрос', code: 'not_question' });
    g.phase = 'reveal';
    await save();
  } else if (t === 'board') {
    if (ph !== 'reveal') return send_(409, { error: 'Рейтинг показывают после ответа', code: 'board_after_reveal' });
    g.board = await makeBoard();
    g.phase = 'board';
    await save();
  } else if (t === 'next' || t === 'final') {
    if (ph !== 'reveal' && ph !== 'board') return send_(409, { error: 'Рано', code: 'too_early' });
    if (t === 'next' && g.qIndex + 1 < g.total) {
      const [qsS] = await pipe([['GET', K.qs]]);
      await startQuestion(g, JSON.parse(qsS), g.qIndex + 1, now);
    } else {
      g.board = await makeBoard();
      g.phase = 'final';
    }
    await save();
  } else if (t === 'reset' || t === 'clear') {
    if (t === 'clear') {
      const ids = await allIds();
      const cmds = ids.map((id) => ['DEL', K.p(id)]);
      cmds.push(['DEL', K.names, K.keys, K.rank, K.seen, K.snap]);
      await pipe(cmds);
    } else {
      await resetScores();
    }
    const n = g.total;
    Object.assign(g, fresh());
    g.total = n;
    await save();
  } else if (t === 'kick') {
    const id = String(body.id || '');
    if (id) {
      const [key] = await pipe([['HGET', K.p(id), 'key']]);
      const cmds = [['DEL', K.p(id)], ['HDEL', K.names, id], ['ZREM', K.rank, id], ['ZREM', K.seen, id]];
      if (key) cmds.push(['HDEL', K.keys, key]);
      await pipe(cmds);
    }
  } else {
    return send_(400, { error: 'Неизвестное действие', code: 'unknown_action' });
  }
  return send_(200, { ok: true });
}

/* ---------- участники ---------- */

async function join(body, send_) {
  const first = Q.cleanName(body.first);
  const last = Q.cleanName(body.last);
  if (!first || !last) return send_(400, { error: 'Введите имя и фамилию', code: 'need_name' });
  const name = `${first} ${last}`;
  const key = name.toLowerCase().replace(/ё/g, 'е');
  const [card, existing] = await pipe([['ZCARD', K.rank], ['HGET', K.keys, key]]);
  if (existing) {
    const [nm] = await pipe([['HGET', K.names, existing]]);
    if (nm) return send_(200, { id: existing, name: nm });
  }
  if (card >= MAX_PLAYERS) return send_(409, { error: 'Достигнут лимит участников', code: 'limit' });
  const id = crypto.randomBytes(9).toString('base64url');
  const [won] = await pipe([['HSETNX', K.keys, key, id]]);
  if (!won) { // одновременный вход с тем же именем: берём уже созданного
    const [other] = await pipe([['HGET', K.keys, key]]);
    const [nm] = await pipe([['HGET', K.names, other]]);
    return send_(200, { id: other, name: nm || name });
  }
  await pipe([
    ['HSET', K.p(id), 'name', name, 'key', key, 'score', 0, 'timeMs', 0],
    ['HSET', K.names, id, name],
    ['ZADD', K.rank, 0, id],
    ['ZADD', K.seen, Date.now(), id],
  ]);
  return send_(200, { id, name });
}

async function answer(body, send_) {
  const id = String(body.id || '');
  const now = Date.now();
  const [gs, hash] = await pipe([['GET', K.game], ['HGETALL', K.p(id)]]);
  const p = obj(hash);
  if (!p.name) return send_(404, { error: 'unknown' });
  const g = parseGame(gs);
  if (eff(g, now) !== 'question') return send_(409, { error: 'closed' });
  const choice = body.choice;
  if (!Number.isInteger(choice) || choice < 0 || choice >= g.cur.options.length) return send_(400, { error: 'bad choice' });
  const qk = qkeyOf(g);
  const from = p.seenKey === qk ? Math.max(Number(p.seenAt) || 0, g.startedAt) : g.startedAt;
  const limit = g.cur.seconds * 1000;
  const ms = Math.min(Math.max(now - from, 0), limit);
  const correct = choice === g.correct;
  const pts = correct ? Q.calcPoints(ms, limit) : 0;

  // HSETNX гарантирует один ответ на вопрос, даже если запросы пришли одновременно
  const [first] = await pipe([['HSETNX', K.p(id), 'a_' + qk, `${choice}|${ms}|${pts}`]]);
  if (!first) return send_(409, { error: 'already' });
  const ck = K.cnt(qk);
  const cmds = [['HINCRBY', ck, 'a', 1], ['HINCRBY', ck, 'o' + choice, 1], ['ZCOUNT', K.seen, now - ONLINE_MS, '+inf']];
  if (correct) cmds.push(['HINCRBY', ck, 'c', 1], ['HINCRBY', K.p(id), 'score', pts], ['HINCRBY', K.p(id), 'timeMs', ms], ['ZINCRBY', K.rank, pts * SCALE - ms, id]);
  const r = await pipe(cmds);
  send_(200, { ok: true });
  return { answered: r[0], online: r[2], g, qk };
}

// когда ответили все, кто на связи, показываем ответ через 0,8 с
async function maybeAutoReveal(info, now) {
  if (!info || !info.g.autoEnd || info.g.revealAt) return;
  if (!(info.online > 0 && info.answered >= info.online)) return;
  const [gs] = await pipe([['GET', K.game]]);
  const g = parseGame(gs);
  if (g.phase !== 'question' || qkeyOf(g) !== info.qk || g.revealAt) return;
  g.revealAt = now + 800;
  await pipe([['SET', K.game, JSON.stringify(g)]]);
}

/* ---------- вход ---------- */

module.exports = async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const pathname = u.pathname.replace(/\/+$/, '');
  const method = req.method;
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
  const reply = (code, o) => send(res, code, o);
  const hostPin = req.headers['x-pin'];

  try {
    if (pathname === '/api/info' && method === 'GET') {
      const hh = String(req.headers['x-forwarded-host'] || req.headers.host || '');
      const proto = String(req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(hh) ? 'http' : 'https')).split(',')[0];
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const origin = host ? `${proto}://${host}` : '';
      return reply(200, { urls: origin ? [origin] : [], publicUrl: origin || null, maxPoints: Q.MAX_POINTS, mode: 'poll' });
    }
    if (pathname === '/api/state' && method === 'GET') {
      if (u.searchParams.get('role') === 'host') {
        if (!pinOk(hostPin)) return reply(401, { error: 'Неверный PIN', code: 'bad_pin' });
        return reply(200, await hostState());
      }
      return reply(200, await playerState(String(u.searchParams.get('id') || '')));
    }
    if (pathname === '/api/join' && method === 'POST') return await join(body, reply);
    if (pathname === '/api/answer' && method === 'POST') {
      const info = await answer(body, reply);
      await maybeAutoReveal(info, Date.now());
      return;
    }
    if (pathname.startsWith('/api/host/')) {
      if (!pinOk(hostPin)) return reply(401, { error: 'Неверный PIN', code: 'bad_pin' });
      if (pathname === '/api/host/quiz' && method === 'GET') return reply(200, await loadQuiz());
      if (pathname === '/api/host/quiz' && method === 'POST') {
        const [gs] = await pipe([['GET', K.game]]);
        if (eff(parseGame(gs), Date.now()) !== 'lobby') return reply(409, { error: 'Вопросы можно менять только до начала игры', code: 'locked' });
        const quiz = Q.cleanQuiz(body);
        await pipe([['SET', K.quiz, JSON.stringify(quiz)], ['SET', K.qn, quiz.questions.length]]);
        return reply(200, { ok: true, error: (Q.validateQuiz(quiz) || {}).error || null });
      }
      if (pathname === '/api/host/action' && method === 'POST') return await hostAction(body, reply);
    }
    return reply(404, { error: 'Не найдено', code: 'not_found' });
  } catch (e) {
    console.error(e);
    if (e && e.code === 'no_db') return reply(500, { error: 'Не подключена база данных Redis (Upstash)', code: 'no_db' });
    return reply(500, { error: 'Ошибка сервера', code: 'server' });
  }
};
