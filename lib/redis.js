'use strict';
// Клиент Redis: Upstash / Vercel KV по REST (без зависимостей) или любой Redis по REDIS_URL.
// Переменные окружения: KV_REST_API_URL + KV_REST_API_TOKEN или UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Vercel может добавить к ним префикс (например, STORAGE_KV_REST_API_URL), такие тоже подходят.
// Если REST-переменных нет, но есть REDIS_URL (Redis Cloud и др.), подключаемся по TCP через пакет redis.

function findPair() {
  const env = process.env;
  for (const [u, t] of [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']]) {
    if (env[u] && env[t]) return [env[u], env[t]];
    for (const k of Object.keys(env)) {
      if (!k.endsWith('_' + u) || !env[k]) continue;
      const tk = k.slice(0, -u.length) + t;
      if (env[tk]) return [env[k], env[tk]];
    }
  }
  return ['', ''];
}

function redisUrl() {
  const env = process.env;
  if (env.REDIS_URL) return env.REDIS_URL;
  const k = Object.keys(env).find((x) => x.endsWith('_REDIS_URL') && env[x]);
  return k ? env[k] : '';
}

// одно соединение на экземпляр функции, переживает «тёплые» вызовы
let tcp = null;
function tcpClient(url) {
  if (!tcp) {
    const { createClient } = require('redis');
    const c = createClient({ url, RESP: 2 }); // RESP2: ответы в том же виде, что у REST (HGETALL — плоский массив)
    c.on('error', (e) => console.error('Redis:', e.message));
    tcp = c.connect().catch((e) => { tcp = null; throw e; });
  }
  return tcp;
}

function creds() {
  const [url, token] = findPair();
  if (!url || !token) {
    const tcpUrl = redisUrl();
    if (tcpUrl) return { tcpUrl };
    const e = new Error('Redis не подключён: нет KV_REST_API_URL / KV_REST_API_TOKEN');
    e.code = 'no_db';
    throw e;
  }
  return { url: url.replace(/\/+$/, ''), token };
}

// выполняет список команд одним запросом, возвращает массив результатов
async function pipe(cmds) {
  if (!cmds.length) return [];
  const { url, token, tcpUrl } = creds();
  const args = cmds.map((c) => c.map((x) => (typeof x === 'number' ? String(x) : x)));
  if (tcpUrl) {
    // команды, отправленные подряд, node-redis сам склеивает в один пакет
    const c = await tcpClient(tcpUrl);
    return Promise.all(args.map((a) => c.sendCommand(a)));
  }
  const r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error('Redis: HTTP ' + r.status);
  const j = await r.json();
  return j.map((x) => {
    if (x && x.error) throw new Error('Redis: ' + x.error);
    return x ? x.result : null;
  });
}

// [k1, v1, k2, v2] → { k1: v1, k2: v2 }
function obj(flat) {
  const o = {};
  if (Array.isArray(flat)) for (let i = 0; i + 1 < flat.length; i += 2) o[flat[i]] = flat[i + 1];
  return o;
}

module.exports = { pipe, obj };
