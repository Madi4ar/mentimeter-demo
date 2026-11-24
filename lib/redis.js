'use strict';
// Минимальный клиент Upstash Redis по REST (без зависимостей). Работает и с Vercel KV.
// Переменные окружения: KV_REST_API_URL + KV_REST_API_TOKEN или UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) {
    const e = new Error('Redis не подключён: нет KV_REST_API_URL / KV_REST_API_TOKEN');
    e.code = 'no_db';
    throw e;
  }
  return { url: url.replace(/\/+$/, ''), token };
}

// выполняет список команд одним запросом, возвращает массив результатов
async function pipe(cmds) {
  if (!cmds.length) return [];
  const { url, token } = creds();
  const r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map((c) => c.map((x) => (typeof x === 'number' ? String(x) : x)))),
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
