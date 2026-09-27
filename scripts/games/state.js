import { getGame } from './registry.js';
import { ensure, randomInt } from './utils.js';
import { MESSAGE_LIMIT, MESSAGE_COOLDOWN } from '../../shared/games/messages.js';
export { GameError, ensure, randomInt } from './utils.js';

export const ROOM_TTL = 24 * 60 * 60 * 1000;
export const HOST_GRACE = 60_000;
const participants = room => room.players.map(({ id, nickname }) => ({ id, nickname }));
export function createRoom(code, gameType, player, now = Date.now(), resolveGame = getGame) {
  const definition = resolveGame(gameType);
  return { code, gameType, hostId: player.id, players: [player], status: 'lobby', stage: 1, revision: 1, round: 0, lastActivityAt: now, gameState: null, gameConfig: definition.normalizeConfig?.() ?? null, messages: [] };
}
export function createPlayer(nickname, tokenHash, now = Date.now()) {
  ensure(typeof nickname === 'string', 'NICKNAME'); nickname = nickname.trim();
  ensure(nickname.length > 0 && nickname.length <= 24 && !/[\p{Cc}\p{Cf}]/u.test(nickname), 'NICKNAME');
  return { id: crypto.randomUUID(), nickname, tokenHash, ready: false, online: false, disconnectedAt: now, receipts: [] };
}
export function transferHost(room, now = Date.now(), immediate = false) {
  const host = room.players.find(p => p.id === room.hostId);
  if (host?.online || (!immediate && host && now - host.disconnectedAt < HOST_GRACE)) return false;
  const successor = room.players.find(p => p.online && p.id !== room.hostId);
  if (!successor) return false;
  room.hostId = successor.id; return true;
}
export function applyRoomAction(source, playerId, action, now = Date.now(), rng = randomInt, resolveGame = getGame) {
  const room = structuredClone(source);
  const player = room.players.find(p => p.id === playerId);
  ensure(player, 'UNAUTHORIZED', 401);
  ensure(action && typeof action === 'object' && !Array.isArray(action), 'INVALID');
  ensure(typeof action.id === 'string' && /^[\w-]{16,80}$/.test(action.id), 'INVALID');
  if (player.receipts.includes(action.id)) return { room: source, duplicate: true };
  ensure(action.stage === room.stage, 'STALE', 409);
  const definition = resolveGame(room.gameType);
  const host = () => ensure(room.hostId === playerId, 'HOST_ONLY', 403);
  switch (action.type) {
    case 'kick':
      host(); ensure(room.status === 'lobby', 'PHASE');
      ensure(action.targetId !== playerId && room.players.some(target => target.id === action.targetId), 'KICK_TARGET');
      room.players = room.players.filter(target => target.id !== action.targetId);
      room.stage++; break;
    case 'say': {
      ensure(['playing', 'finished'].includes(room.status) && typeof definition.phrase === 'function', 'PHASE');
      const content = definition.phrase(action, room.gameState, participants(room), room.gameConfig ?? undefined, playerId, now);
      const previous = (room.messages ?? []).findLast(message => message.playerId === playerId);
      ensure(!previous || now - previous.at >= MESSAGE_COOLDOWN, 'CHAT_COOLDOWN', 429);
      room.messages = [...(room.messages ?? []).slice(-(MESSAGE_LIMIT - 1)), { id: action.id, playerId, nickname: player.nickname, ...content, at: now, round: room.round }];
      break;
    }
    case 'configure':
      host(); ensure(room.status === 'lobby', 'PHASE');
      ensure(typeof definition.normalizeConfig === 'function', 'INVALID');
      ensure(action.config !== undefined, 'INVALID');
      room.gameConfig = definition.normalizeConfig(action.config);
      room.players.forEach(p => { p.ready = false; }); room.stage++; break;
    case 'ready':
      ensure(room.status === 'lobby' && typeof action.ready === 'boolean', 'PHASE');
      player.ready = action.ready; break;
    case 'start':
      host(); ensure(room.status === 'lobby', 'PHASE');
      ensure(room.players.length >= definition.minPlayers && room.players.length <= definition.maxPlayers && room.players.every(p => p.ready && p.online), 'NOT_READY');
      room.gameState = definition.create(participants(room), rng, room.gameConfig ?? undefined);
      room.messages = []; room.status = 'playing'; room.round++; room.stage++; break;
    case 'end':
      host(); ensure(room.status === 'playing', 'PHASE');
      room.gameState = definition.abort(room.gameState);
      room.status = 'finished'; room.stage++; break;
    case 'quick_start':
      host(); ensure(['playing', 'finished'].includes(room.status), 'PHASE');
      ensure(room.players.length >= definition.minPlayers && room.players.length <= definition.maxPlayers && room.players.every(p => p.online), 'QUICK_NOT_READY');
      room.gameState = definition.create(participants(room), rng, room.gameConfig ?? undefined);
      room.players.forEach(p => { p.ready = false; });
      room.messages = []; room.status = 'playing'; room.round++; room.stage++; break;
    case 'restart':
      host(); ensure(room.status === 'finished', 'PHASE');
      room.status = 'lobby'; room.gameState = null; room.messages = [];
      room.players.forEach(p => { p.ready = false; }); room.stage++; break;
    case 'leave':
      player.online = false; player.disconnectedAt = now;
      transferHost(room, now, true);
      if (room.status !== 'playing') {
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.hostId === playerId) room.hostId = room.players[0]?.id ?? null;
        room.stage++;
      }
      break;
    default: {
      ensure(room.status === 'playing', 'PHASE');
      const transition = definition.apply(room.gameState, participants(room), playerId, action, now);
      room.gameState = transition.state;
      if (transition.stageChanged) room.stage++;
      if (transition.finished) room.status = 'finished';
    }
  }
  player.receipts = [...player.receipts.slice(-63), action.id];
  room.lastActivityAt = now; room.revision++;
  return { room, duplicate: false };
}
export function advanceRoomTime(source, now = Date.now(), resolveGame = getGame) {
  if (source.status !== 'playing') return { room: source, changed: false };
  const transition = resolveGame(source.gameType).tick?.(source.gameState, participants(source), now);
  if (!transition) return { room: source, changed: false };
  const room = structuredClone(source);
  room.gameState = transition.state;
  if (transition.stageChanged) room.stage++;
  if (transition.finished) room.status = 'finished';
  room.revision++; room.lastActivityAt = now;
  return { room, changed: true };
}
export function roomView(room, playerId, resolveGame = getGame) {
  ensure(room.players.some(p => p.id === playerId), 'UNAUTHORIZED', 401);
  const definition = resolveGame(room.gameType);
  return {
    code: room.code, gameType: room.gameType, status: room.status, hostId: room.hostId,
    stage: room.stage, revision: room.revision, round: room.round, selfId: playerId,
    players: room.players.map(({ id, nickname, ready, online }) => ({ id, nickname, ready, online })),
    limits: { minPlayers: definition.minPlayers, maxPlayers: definition.maxPlayers },
    gameConfig: room.gameConfig ?? definition.normalizeConfig?.() ?? null,
    messages: room.messages ?? [],
    game: room.gameState ? definition.view(room.gameState, participants(room), playerId) : null,
    expiresAt: room.lastActivityAt + ROOM_TTL, serverNow: Date.now(),
  };
}
