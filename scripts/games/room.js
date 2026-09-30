import { DurableObject } from 'cloudflare:workers';
import { advanceRoomTime, applyRoomAction, assignSeats, createPlayer, createRoom, ensure, GameError, HOST_GRACE, roomView, ROOM_TTL, syncLobbyStart, transferHost } from './state.js';
import { getGame } from './registry.js';

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const secret = () => crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS tickets (ticket TEXT PRIMARY KEY, player_id TEXT NOT NULL, expires INTEGER NOT NULL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  read(required = true) {
    const row = this.ctx.storage.sql.exec('SELECT data FROM room WHERE id = 1').toArray()[0];
    let room = row ? JSON.parse(row.data) : null;
    if (required) {
      ensure(room, 'NOT_FOUND', 404);
      ensure(Date.now() < room.lastActivityAt + ROOM_TTL, 'EXPIRED', 410);
      const advanced = advanceRoomTime(room);
      if (advanced.changed) { room = advanced.room; this.save(room); this.broadcast(room); }
    }
    return room;
  }
  save(room) {
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room (id, data) VALUES (1, ?)', JSON.stringify(room));
  }
  sockets(playerId = null) {
    return this.ctx.getWebSockets().filter(ws => {
      const data = ws.deserializeAttachment();
      return ws.readyState === 1 && !data?.superseded && (!playerId || data?.playerId === playerId);
    });
  }
  broadcast(room) {
    for (const ws of this.sockets()) {
      const id = ws.deserializeAttachment()?.playerId;
      if (!room.players.some(p => p.id === id)) continue;
      try { ws.send(JSON.stringify({ type: 'state', room: roomView(room, id) })); }
      catch { ws.close(1011, 'connection'); }
    }
  }
  async schedule(room) {
    const now = Date.now();
    const host = room.players.find(p => p.id === room.hostId);
    const deadline = !host?.online && host && host.disconnectedAt + HOST_GRACE > now ? host.disconnectedAt + HOST_GRACE : Infinity;
    const gameDeadline = room.status === 'playing' ? getGame(room.gameType).deadline?.(room.gameState) : null;
    await this.ctx.storage.setAlarm(Math.min(room.lastActivityAt + ROOM_TTL, deadline, gameDeadline ?? Infinity, room.lobbyStartsAt ?? Infinity));
  }
  authenticate(room, tokenHash) {
    const player = room.players.find(p => p.tokenHash === tokenHash);
    ensure(player, 'UNAUTHORIZED', 401);
    return player;
  }
  async create(code, gameType, nickname, profile) {
    getGame(gameType);
    const token = secret();
    const tokenHash = await hashToken(token);
    ensure(!this.read(false), 'CONFLICT', 409);
    const player = createPlayer(nickname, tokenHash, Date.now(), profile);
    const room = createRoom(code, gameType, player);
    this.save(room);
    await this.schedule(room);
    return { code, gameType, token, playerId: player.id };
  }
  async join(nickname, gameType, profile) {
    const token = secret();
    const tokenHash = await hashToken(token);
    const room = this.read();
    ensure(room.gameType === gameType, 'GAME_MISMATCH', 409);
    ensure(room.status === 'lobby', 'ROOM_LOCKED', 409);
    ensure(room.players.length < getGame(room.gameType).maxPlayers, 'ROOM_FULL', 409);
    const player = createPlayer(nickname, tokenHash, Date.now(), profile);
    ensure(!room.players.some(p => p.nickname.toLocaleLowerCase() === player.nickname.toLocaleLowerCase()), 'NICKNAME_TAKEN', 409);
    assignSeats(room);
    player.seat = Array.from({ length: getGame(room.gameType).maxPlayers }, (_, seat) => seat).find(seat => !room.players.some(occupant => occupant.seat === seat));
    room.players.push(player); room.revision++; room.lastActivityAt = Date.now();
    room.players.sort((a, b) => a.seat - b.seat);
    syncLobbyStart(room, room.lastActivityAt);
    this.save(room); this.broadcast(room);
    await this.schedule(room);
    return { code: room.code, gameType: room.gameType, token, playerId: player.id };
  }
  async ticket(token) {
    ensure(typeof token === 'string' && /^[a-f0-9]{64}$/.test(token), 'UNAUTHORIZED', 401);
    const tokenHash = await hashToken(token);
    const room = this.read();
    const player = this.authenticate(room, tokenHash);
    const ticket = secret();
    this.ctx.storage.sql.exec('DELETE FROM tickets WHERE expires <= ?', Date.now());
    this.ctx.storage.sql.exec('INSERT INTO tickets VALUES (?, ?, ?)', ticket, player.id, Date.now() + 30_000);
    return { ticket, gameType: room.gameType, playerId: player.id };
  }
  async takeRateLimit(key, limit) {
    const now = Date.now();
    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM limits WHERE expires <= ?', now);
    const row = sql.exec('SELECT count, expires FROM limits WHERE key = ?', key).toArray()[0];
    if (row && row.count >= limit) return false;
    sql.exec('INSERT OR REPLACE INTO limits VALUES (?, ?, ?)', key, (row?.count || 0) + 1, row?.expires || now + 60_000);
    await this.ctx.storage.setAlarm(now + 60_000);
    return true;
  }
  async fetch(request) {
    try {
      ensure(request.method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket', 'INVALID', 400);
      const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(p => p.trim());
      const ticket = protocols.find(p => /^ticket-[a-f0-9]{64}$/.test(p))?.slice(7);
      ensure(protocols.includes('games') && ticket, 'UNAUTHORIZED', 401);
      const room = this.read();
      const saved = this.ctx.storage.sql.exec('SELECT player_id, expires FROM tickets WHERE ticket = ?', ticket).toArray()[0];
      ensure(saved && saved.expires > Date.now(), 'UNAUTHORIZED', 401);
      this.ctx.storage.sql.exec('DELETE FROM tickets WHERE ticket = ?', ticket);
      const player = room.players.find(p => p.id === saved.player_id);
      ensure(player, 'UNAUTHORIZED', 401);
      for (const old of this.sockets(player.id)) {
        old.serializeAttachment({ ...old.deserializeAttachment(), superseded: true });
        old.close(4001, 'replaced');
      }
      const [client, server] = Object.values(new WebSocketPair());
      server.serializeAttachment({ playerId: player.id, count: 0, window: Date.now() });
      this.ctx.acceptWebSocket(server);
      player.online = true; player.departed = false; player.disconnectedAt = null;
      transferHost(room); room.revision++;
      syncLobbyStart(room);
      this.save(room); this.broadcast(room);
      await this.schedule(room);
      return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'games' } });
    } catch (error) {
      return Response.json({ error: error instanceof GameError ? error.code : 'SERVER' }, { status: error instanceof GameError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  async webSocketMessage(ws, message) {
    const attachment = ws.deserializeAttachment();
    if (!attachment || attachment.superseded || ws.readyState !== 1) return;
    let action;
    try {
      ensure(typeof message === 'string' && new TextEncoder().encode(message).length <= 4096, 'INVALID');
      if (Date.now() - attachment.window >= 10_000) { attachment.window = Date.now(); attachment.count = 0; }
      attachment.count++; ws.serializeAttachment(attachment);
      ensure(attachment.count <= 30, 'RATE_LIMIT', 429);
      action = JSON.parse(message);
      const current = this.read();
      const { room, duplicate } = applyRoomAction(current, attachment.playerId, action);
      if (!duplicate) this.save(room);
      if (!duplicate && action.type === 'kick') {
        this.ctx.storage.sql.exec('DELETE FROM tickets WHERE player_id = ?', action.targetId);
        for (const target of this.sockets(action.targetId)) {
          target.serializeAttachment({ ...target.deserializeAttachment(), superseded: true });
          target.send(JSON.stringify({ type: 'error', id: null, error: 'KICKED' }));
          target.close(4003, 'kicked');
        }
      }
      ws.send(JSON.stringify({ type: 'ack', id: action.id }));
      this.broadcast(room);
      if (action.type === 'leave') {
        ws.serializeAttachment({ ...ws.deserializeAttachment(), superseded: true });
        ws.close(4002, 'left');
      }
      await this.schedule(room);
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', id: typeof action?.id === 'string' ? action.id : null, error: error instanceof GameError ? error.code : error instanceof SyntaxError ? 'INVALID' : 'SERVER' }));
      if (error instanceof GameError && error.code === 'STALE') {
        ws.send(JSON.stringify({ type: 'state', room: roomView(this.read(), attachment.playerId) }));
      }
      if (error instanceof GameError && ['EXPIRED', 'NOT_FOUND', 'UNAUTHORIZED'].includes(error.code)) ws.close(4004, 'unavailable');
    }
  }
  async disconnect(ws) {
    const data = ws.deserializeAttachment();
    if (!data || data.superseded) return;
    ws.serializeAttachment({ ...data, superseded: true });
    if (this.sockets(data.playerId).length) return;
    const room = this.read(false);
    const player = room?.players.find(p => p.id === data.playerId);
    if (!player || !player.online) return;
    player.online = false; player.disconnectedAt = Date.now(); room.revision++;
    syncLobbyStart(room, player.disconnectedAt);
    this.save(room); this.broadcast(room);
    await this.schedule(room);
  }
  async webSocketClose(ws, code) { ws.close(code); await this.disconnect(ws); }
  async webSocketError(ws) { ws.close(1011, 'connection'); await this.disconnect(ws); }
  async alarm() {
    let room = this.read(false);
    if (!room) { this.ctx.storage.sql.exec('DELETE FROM limits WHERE expires <= ?', Date.now()); return; }
    if (Date.now() >= room.lastActivityAt + ROOM_TTL) {
      for (const ws of this.sockets()) ws.close(4004, 'expired');
      this.ctx.storage.sql.exec('DELETE FROM room'); this.ctx.storage.sql.exec('DELETE FROM tickets');
      return;
    }
    const advanced = advanceRoomTime(room); room = advanced.room;
    const hostChanged = transferHost(room);
    if (hostChanged) room.revision++;
    if (advanced.changed || hostChanged) { this.save(room); this.broadcast(room); }
    await this.schedule(room);
  }
}
