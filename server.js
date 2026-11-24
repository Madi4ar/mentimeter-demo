'use strict';
// Викторина: сервер без внешних зависимостей (только Node.js 16+).
// Запуск: node server.js   →   экран ведущего /host, участники заходят на /

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST_PIN = String(process.env.HOST_PIN || '1234');
const PUBLIC_URL = String(process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'quiz.json');

const { MAX_POINTS, SAMPLE, cleanQuiz, validateQuiz, compactQuestion, calcPoints, cleanName } = require('./lib/quiz');

const MAX_PLAYERS = 600;
const GRACE_MS = 700; // запас на сетевую задержку после конца времени

/* ---------- вопросы ---------- */

function loadQuiz() {
  try {
    return cleanQuiz(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (e) {
    return cleanQuiz(SAMPLE);
  }
}

function saveQuiz() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(quiz, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('Не удалось сохранить вопросы на диск:', e.message);
  }
}

let quiz = loadQuiz();

/* ---------- состояние игры ---------- */

const players = new Map(); // id -> игрок
const clients = new Set(); // открытые SSE-соединения

const game = {
  phase: 'lobby', // lobby | question | reveal | board | final
  qIndex: -1,
  questions: [],
  autoEnd: true,
  startedAt: 0,
  endsAt: 0,
  timer: null,
  autoTimer: null,
  answers: new Map(), // playerId -> {choice, ms}
  counts: null,
  correctCount: 0,
  board: null,
  snap: new Map(), // состояние очков на момент прошлого показа рейтинга
};

let rankCache = null;

function cmpPlayers(a, b) {
  return b.score - a.score || a.timeMs - b.timeMs || a.name.localeCompare(b.name, 'ru');
}

function ranking() {
  if (!rankCache) {
    rankCache = Array.from(players.values()).sort(cmpPlayers);
    rankCache.forEach((p, i) => { p.rank = i + 1; });
  }
  return rankCache;
}

// участник «на связи»: открыт поток событий или недавно приходил запрос состояния
function isOnline(p) {
  return p.conns > 0 || Date.now() - p.lastSeen < 6000;
}

function connectedCount() {
  let n = 0;
  for (const p of players.values()) if (isOnline(p)) n++;
  return n;
}

function clearTimers() {
  clearTimeout(game.timer);
  clearTimeout(game.autoTimer);
  game.timer = null;
  game.autoTimer = null;
}

function makeBoard() {
  const cur = ranking();
  const prevSorted = Array.from(players.values())
    .map((p) => ({ p, s: game.snap.get(p.id) || { score: 0, timeMs: 0 } }))
    .sort((a, b) => b.s.score - a.s.score || a.s.timeMs - b.s.timeMs || a.p.name.localeCompare(b.p.name, 'ru'));
  const prevRank = new Map(prevSorted.map((x, i) => [x.p.id, i + 1]));
  const rows = cur.slice(0, 10).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    prevScore: (game.snap.get(p.id) || { score: 0 }).score,
    rank: p.rank,
    prevRank: prevRank.get(p.id),
  }));
  game.snap = new Map(cur.map((p) => [p.id, { score: p.score, timeMs: p.timeMs }]));
  return { rows, total: players.size };
}

function startGame() {
  const err = validateQuiz(quiz);
  if (err) return err;
  game.questions = quiz.questions.map(compactQuestion);
  game.autoEnd = quiz.autoEnd;
  resetScores();
  game.snap = new Map();
  startQuestion(0);
  return null;
}

function resetScores() {
  for (const p of players.values()) { p.score = 0; p.timeMs = 0; p.last = null; }
  rankCache = null;
}

function startQuestion(i) {
  clearTimers();
  game.qIndex = i;
  game.phase = 'question';
  game.answers = new Map();
  game.counts = null;
  game.correctCount = 0;
  for (const p of players.values()) { p.last = null; p.seenQ = -1; }
  const q = game.questions[i];
  game.startedAt = Date.now();
  game.endsAt = game.startedAt + q.seconds * 1000;
  game.timer = setTimeout(endQuestion, q.seconds * 1000 + GRACE_MS);
  pushAll();
}

function endQuestion() {
  if (game.phase !== 'question') return;
  clearTimers();
  const q = game.questions[game.qIndex];
  const limit = q.seconds * 1000;
  const counts = q.options.map(() => 0);
  let correctCount = 0;
  for (const p of players.values()) {
    const a = game.answers.get(p.id);
    const res = { choice: a ? a.choice : null, correct: false, points: 0, ms: a ? a.ms : null };
    if (a) {
      counts[a.choice]++;
      if (a.choice === q.correct) {
        res.correct = true;
        res.points = calcPoints(a.ms, limit);
        p.score += res.points;
        p.timeMs += a.ms;
        correctCount++;
      }
    }
    p.last = res;
  }
  rankCache = null;
  game.counts = counts;
  game.correctCount = correctCount;
  game.phase = 'reveal';
  pushAll();
}

function showBoard() {
  game.board = makeBoard();
  game.phase = 'board';
  pushAll();
}

function showFinal() {
  game.board = makeBoard();
  game.phase = 'final';
  pushAll();
}

function toLobby(clearPlayers) {
  clearTimers();
  if (clearPlayers) players.clear();
  resetScores();
  game.phase = 'lobby';
  game.qIndex = -1;
  game.answers = new Map();
  game.counts = null;
  game.board = null;
  game.snap = new Map();
  rankCache = null;
  pushAll();
}

/* ---------- рассылка состояния (SSE) ---------- */

function send(c, obj) {
  try { c.res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) { /* соединение закрыто */ }
}

function baseState() {
  const q = game.questions[game.qIndex];
  const s = {
    phase: game.phase,
    qIndex: game.qIndex,
    total: game.phase === 'lobby' ? quiz.questions.length : game.questions.length,
    now: Date.now(),
    playerCount: players.size,
    connected: connectedCount(),
    answered: game.answers.size,
    startedAt: game.startedAt,
    endsAt: game.endsAt,
  };
  if (q && game.phase !== 'lobby' && game.phase !== 'final') {
    s.question = { text: q.text, options: q.options, seconds: q.seconds };
    if (game.phase !== 'question') {
      s.correct = q.correct;
      s.counts = game.counts;
      s.correctCount = game.correctCount;
    }
  }
  if (game.phase === 'board' || game.phase === 'final') s.board = game.board;
  return s;
}

function hostState(base) {
  const s = Object.assign({}, base);
  if (game.phase === 'lobby') {
    s.players = Array.from(players.values()).slice(-400).map((p) => ({ id: p.id, name: p.name }));
  }
  return s;
}

function meFor(p) {
  ranking();
  // время ответа считаем с момента, когда участник получил вопрос (честнее при медленной сети)
  if (game.phase === 'question' && p.seenQ !== game.qIndex) { p.seenQ = game.qIndex; p.seenAt = Date.now(); }
  const showLast = game.phase === 'reveal' || game.phase === 'board' || game.phase === 'final';
  const a = game.answers.get(p.id);
  return {
    name: p.name,
    score: p.score,
    rank: p.rank,
    choice: a ? a.choice : null,
    last: showLast ? p.last : null,
  };
}

function pushAll() {
  const base = baseState();
  for (const c of clients) {
    if (c.role === 'host') send(c, hostState(base));
    else {
      const p = players.get(c.pid);
      send(c, Object.assign({}, base, { me: p ? meFor(p) : null }));
    }
  }
}

function pushHosts() {
  const hs = hostState(baseState());
  for (const c of clients) if (c.role === 'host') send(c, hs);
}

function pushPlayer(pid) {
  const p = players.get(pid);
  const base = baseState();
  for (const c of clients) {
    if (c.role === 'player' && c.pid === pid) send(c, Object.assign({}, base, { me: p ? meFor(p) : null }));
  }
}

let hostTimer = null;
function scheduleHostPush() {
  if (hostTimer) return;
  hostTimer = setTimeout(() => { hostTimer = null; pushHosts(); }, 150);
}

// сообщение-«пульс»: клиент по нему понимает, что поток событий жив
setInterval(() => {
  for (const c of clients) send(c, { hb: 1 });
}, 10000);

/* ---------- HTTP ---------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req, limit = 300000) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function pinOk(pin) {
  const a = crypto.createHash('sha256').update(String(pin || '')).digest();
  const b = crypto.createHash('sha256').update(HOST_PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

function lanUrls() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family === 'IPv4' && !n.internal) out.push(`http://${n.address}:${PORT}`);
    }
  }
  return out;
}

function serveStatic(req, res, urlPath) {
  let rel = urlPath;
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/host' || rel === '/host/') rel = '/host.html';
  let file;
  try { file = path.normalize(path.join(PUB, decodeURIComponent(rel))); } catch (e) { res.writeHead(400); return res.end(); }
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Не найдено'); }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
    headers['Cache-Control'] = ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, headers);
    res.end(data);
  });
}

function openEvents(req, res, q) {
  const role = q.get('role') === 'host' ? 'host' : 'player';
  if (role === 'host' && !pinOk(q.get('pin'))) { res.writeHead(401); return res.end(); }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 1500\n\n');
  const c = { res, role, pid: role === 'player' ? String(q.get('id') || '') : null };
  clients.add(c);
  const p = c.pid ? players.get(c.pid) : null;
  if (p) { p.conns++; p.lastSeen = Date.now(); scheduleHostPush(); }
  const base = baseState();
  if (role === 'host') send(c, hostState(base));
  else send(c, Object.assign({}, base, { me: p ? meFor(p) : null }));
  req.on('close', () => {
    clients.delete(c);
    const pp = c.pid ? players.get(c.pid) : null;
    if (pp) { pp.conns = Math.max(0, pp.conns - 1); scheduleHostPush(); }
  });
}

async function handleApi(req, res, u) {
  const pathname = u.pathname;
  let body = {};
  if (req.method === 'POST') {
    try { body = await readJson(req); } catch (e) { return json(res, 400, { error: 'Некорректный запрос', code: 'bad_request' }); }
  }

  if (pathname === '/api/info' && req.method === 'GET') {
    return json(res, 200, { urls: PUBLIC_URL ? [PUBLIC_URL] : lanUrls(), publicUrl: PUBLIC_URL || null, maxPoints: MAX_POINTS });
  }

  // запасной режим: клиент опрашивает состояние сам (работает через любые прокси и туннели)
  if (pathname === '/api/state' && req.method === 'GET') {
    const base = baseState();
    if (u.searchParams.get('role') === 'host') {
      if (!pinOk(req.headers['x-pin'])) return json(res, 401, { error: 'Неверный PIN', code: 'bad_pin' });
      return json(res, 200, hostState(base));
    }
    const p = players.get(String(u.searchParams.get('id') || ''));
    if (p) p.lastSeen = Date.now();
    return json(res, 200, Object.assign({}, base, { me: p ? meFor(p) : null }));
  }

  if (pathname === '/api/join' && req.method === 'POST') {
    const first = cleanName(body.first);
    const last = cleanName(body.last);
    if (!first || !last) return json(res, 400, { error: 'Введите имя и фамилию', code: 'need_name' });
    const name = `${first} ${last}`;
    const key = name.toLowerCase().replace(/ё/g, 'е');
    for (const p of players.values()) {
      if (p.key === key) return json(res, 200, { id: p.id, name: p.name });
    }
    if (players.size >= MAX_PLAYERS) return json(res, 409, { error: 'Достигнут лимит участников', code: 'limit' });
    const id = crypto.randomBytes(9).toString('base64url');
    players.set(id, { id, key, name, score: 0, timeMs: 0, last: null, conns: 0, rank: 0, lastSeen: Date.now(), seenQ: -1, seenAt: 0 });
    rankCache = null;
    scheduleHostPush();
    return json(res, 200, { id, name });
  }

  if (pathname === '/api/answer' && req.method === 'POST') {
    const p = players.get(String(body.id || ''));
    if (!p) return json(res, 404, { error: 'unknown' });
    if (game.phase !== 'question') return json(res, 409, { error: 'closed' });
    const now = Date.now();
    if (now > game.endsAt + GRACE_MS) return json(res, 409, { error: 'closed' });
    if (game.answers.has(p.id)) return json(res, 409, { error: 'already' });
    const q = game.questions[game.qIndex];
    const choice = body.choice;
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return json(res, 400, { error: 'bad choice' });
    const from = p.seenQ === game.qIndex ? Math.max(p.seenAt, game.startedAt) : game.startedAt;
    const ms = Math.min(Math.max(now - from, 0), q.seconds * 1000);
    game.answers.set(p.id, { choice, ms });
    json(res, 200, { ok: true });
    pushPlayer(p.id);
    scheduleHostPush();
    if (game.autoEnd && !game.autoTimer) {
      let all = true;
      let any = false;
      for (const pl of players.values()) {
        if (isOnline(pl)) { any = true; if (!game.answers.has(pl.id)) { all = false; break; } }
      }
      if (any && all) game.autoTimer = setTimeout(endQuestion, 800);
    }
    return;
  }

  // ---- только ведущий ----
  if (pathname.startsWith('/api/host/')) {
    if (!pinOk(req.headers['x-pin'])) return json(res, 401, { error: 'Неверный PIN', code: 'bad_pin' });

    if (pathname === '/api/host/quiz' && req.method === 'GET') return json(res, 200, quiz);

    if (pathname === '/api/host/quiz' && req.method === 'POST') {
      if (game.phase !== 'lobby') return json(res, 409, { error: 'Вопросы можно менять только до начала игры', code: 'locked' });
      quiz = cleanQuiz(body);
      saveQuiz();
      scheduleHostPush();
      return json(res, 200, { ok: true, error: (validateQuiz(quiz) || {}).error || null });
    }

    if (pathname === '/api/host/action' && req.method === 'POST') {
      const t = body.type;
      const ph = game.phase;
      if (t === 'start') {
        if (ph !== 'lobby') return json(res, 409, { error: 'Игра уже идёт', code: 'already_started' });
        const err = startGame();
        if (err) return json(res, 400, err);
      } else if (t === 'reveal') {
        if (ph !== 'question') return json(res, 409, { error: 'Сейчас не идёт вопрос', code: 'not_question' });
        endQuestion();
      } else if (t === 'board') {
        if (ph !== 'reveal') return json(res, 409, { error: 'Рейтинг показывают после ответа', code: 'board_after_reveal' });
        showBoard();
      } else if (t === 'next') {
        if (ph !== 'reveal' && ph !== 'board') return json(res, 409, { error: 'Рано', code: 'too_early' });
        if (game.qIndex + 1 < game.questions.length) startQuestion(game.qIndex + 1);
        else showFinal();
      } else if (t === 'final') {
        if (ph !== 'reveal' && ph !== 'board') return json(res, 409, { error: 'Рано', code: 'too_early' });
        showFinal();
      } else if (t === 'reset') {
        toLobby(false);
      } else if (t === 'clear') {
        toLobby(true);
      } else if (t === 'kick') {
        const id = String(body.id || '');
        if (players.delete(id)) { rankCache = null; pushAll(); }
      } else {
        return json(res, 400, { error: 'Неизвестное действие', code: 'unknown_action' });
      }
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { error: 'Не найдено', code: 'not_found' });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/events') return openEvents(req, res, u.searchParams);
  if (u.pathname.startsWith('/api/')) {
    handleApi(req, res, u).catch((e) => {
      console.error(e);
      if (!res.headersSent) json(res, 500, { error: 'Ошибка сервера', code: 'server' });
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(req, res, u.pathname);
});

server.keepAliveTimeout = 65000;

process.on('uncaughtException', (e) => console.error('Ошибка:', e));

server.listen(PORT, () => {
  console.log('\nВикторина запущена\n');
  console.log('  Экран ведущего :  http://localhost:' + PORT + '/host   (PIN: ' + HOST_PIN + ')');
  const urls = PUBLIC_URL ? [PUBLIC_URL] : lanUrls();
  urls.forEach((u) => console.log('  Для участников :  ' + u));
  if (HOST_PIN === '1234') console.log('\n  Совет: задайте свой PIN →  HOST_PIN=мойпин node server.js');
  console.log('');
});
