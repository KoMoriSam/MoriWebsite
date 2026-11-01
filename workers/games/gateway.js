import { ensure, GameError, randomInt } from './utils.js';
import { getGame } from './registry.js';
import { hashToken } from './room.js';

const PREFIX = '/games/rooms';
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_ORIGINS = 'https://komori.cc,https://www.komori.cc,http://localhost:5173,http://127.0.0.1:5173';
async function readBody(request) {
  ensure(request.headers.get('Content-Type')?.split(';')[0].trim() === 'application/json', 'INVALID', 415);
  ensure(Number(request.headers.get('Content-Length') || 0) <= 2048, 'INVALID', 413);
  const reader = request.body?.getReader();
  ensure(reader, 'INVALID');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new GameError('INVALID', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new GameError('INVALID'); }
}
export async function handleGames(request, env) {
  const origin = request.headers.get('Origin') || '';
  const configured = env.GAMES_ALLOWED_ORIGINS || (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*' ? env.ALLOWED_ORIGIN : DEFAULT_ORIGINS);
  const allowed = configured.split(',').map(s => s.trim().replace(/\/$/, '')).includes(origin);
  const headers = {
    'Cache-Control': 'no-store', 'Vary': 'Origin',
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
  };
  const json = (data, status = 200) => Response.json(data, { status, headers });
  try {
    ensure(allowed, 'ORIGIN', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    ensure(env.GAME_ROOMS, 'UNAVAILABLE', 503);
    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    const suffix = path.slice(PREFIX.length);
    const match = suffix.match(/^\/([A-HJ-NP-Z2-9]{8})\/(join|connect|socket)$/);
    ensure(suffix === '' || match, 'NOT_FOUND', 404);
    const operation = match?.[2] || 'create';
    ensure(request.method === (operation === 'socket' ? 'GET' : 'POST'), 'INVALID', 405);
    const ip = await hashToken(request.headers.get('CF-Connecting-IP') || 'local');
    const limiter = env.GAME_ROOMS.getByName(`limit:${ip}`);
    ensure(await limiter.takeRateLimit(operation, { create: 5, join: 20, connect: 120, socket: 120 }[operation]), 'RATE_LIMIT', 429);
    if (operation === 'create') {
      const body = await readBody(request);
      getGame(body?.gameType);
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
        try { return json(await env.GAME_ROOMS.getByName(`room:${code}`).create(code, body.gameType, body?.nickname, body?.profile), 201); }
        catch (error) { if (error?.message !== 'CONFLICT' || attempt === 2) throw error; }
      }
    }
    const code = match[1]; ensure(CODE.test(code), 'NOT_FOUND', 404);
    const room = env.GAME_ROOMS.getByName(`room:${code}`);
    if (operation === 'socket') return await room.fetch(request);
    if (operation === 'join') { const body = await readBody(request); return json(await room.join(body?.nickname, body?.gameType, body?.profile), 201); }
    const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    ensure(token, 'UNAUTHORIZED', 401);
    return json(await room.ticket(token));
  } catch (error) {
    // RPC preserves message, but does not preserve a custom Error prototype/status.
    const code = error?.code || error?.message;
    const known = ['INVALID', 'NICKNAME', 'NICKNAME_TAKEN', 'NOT_FOUND', 'EXPIRED', 'UNAUTHORIZED', 'ORIGIN', 'UNAVAILABLE', 'RATE_LIMIT', 'ROOM_LOCKED', 'ROOM_FULL', 'CONFLICT', 'GAME_TYPE', 'GAME_MISMATCH'];
    const status = error?.status || ({ NOT_FOUND: 404, EXPIRED: 410, UNAUTHORIZED: 401, ORIGIN: 403, UNAVAILABLE: 503, RATE_LIMIT: 429, ROOM_LOCKED: 409, ROOM_FULL: 409, CONFLICT: 409, GAME_MISMATCH: 409 }[code] ?? 400);
    return json({ error: known.includes(code) ? code : 'SERVER' }, known.includes(code) ? status : 500);
  }
}
