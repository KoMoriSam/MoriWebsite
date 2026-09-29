import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { advanceRoomTime, applyRoomAction, createPlayer, createRoom, ensure, LOBBY_START_DELAY, roomView, ROOM_TTL } from './games/state.js';
import { QUEST_TEAMS } from './avalon/rules.js';
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
// A second adapter with a different player limit verifies that the platform is game-independent.
const counter = {
  id: 'counter', minPlayers: 2, maxPlayers: 3,
  create(players) { return { value: 0, privatePlayers: players.map(p => p.id) }; },
  apply(state, players, id, action) { ensure(action.type === 'increment', 'INVALID'); return { state: { ...state, value: state.value + 1 }, stageChanged: false, finished: state.value + 1 >= 2 }; },
  view(state, players, id) { return { value: state.value, ownSeat: id }; },
  abort(state) { return { ...state, aborted: true }; },
  phrase(action) { ensure(action.phraseId === 'counter_status', 'INVALID'); return { phraseId: action.phraseId, params: { value: 0 } }; },
};
const resolveCounter = id => { ensure(id === counter.id, 'GAME_TYPE'); return counter; };
const participants = Array.from({ length: 2 }, (_, i) => ({ ...createPlayer('C' + i, 'hash' + i), ready: true, online: true }));
let sharedRoom = createRoom('ABCDEFGH', 'counter', participants[0], Date.now(), resolveCounter); sharedRoom.players = participants;
const cmd = (room, type) => ({ type, stage: room.stage, id: crypto.randomUUID() });
const apply = (room, type) => applyRoomAction(room, room.hostId, cmd(room, type), Date.now(), undefined, resolveCounter).room;
let countdownRoom = createRoom('HGFEDCBA', 'counter', { ...participants[0], ready: false }, 1_000, resolveCounter);
countdownRoom.players.push({ ...participants[1], ready: false });
countdownRoom = applyRoomAction(countdownRoom, participants[0].id, { ...cmd(countdownRoom, 'ready'), ready: true }, 2_000, undefined, resolveCounter).room;
check(countdownRoom.lobbyStartsAt, null);
countdownRoom = applyRoomAction(countdownRoom, participants[1].id, { ...cmd(countdownRoom, 'ready'), ready: true }, 3_000, undefined, resolveCounter).room;
check(countdownRoom.lobbyStartsAt, 3_000 + LOBBY_START_DELAY);
check(advanceRoomTime(countdownRoom, 7_999, resolveCounter).changed, false);
countdownRoom = applyRoomAction(countdownRoom, participants[1].id, { ...cmd(countdownRoom, 'ready'), ready: false }, 4_000, undefined, resolveCounter).room;
check(countdownRoom.lobbyStartsAt, null);
check(advanceRoomTime(countdownRoom, 8_000, resolveCounter).changed, false);
countdownRoom = applyRoomAction(countdownRoom, participants[1].id, { ...cmd(countdownRoom, 'ready'), ready: true }, 5_000, undefined, resolveCounter).room;
check(countdownRoom.lobbyStartsAt, 5_000 + LOBBY_START_DELAY);
countdownRoom.players[1].seat = 2;
const countdownResult = advanceRoomTime(countdownRoom, 10_000, resolveCounter);
check(countdownResult.changed, true); check(countdownResult.room.status, 'playing');
check(countdownResult.room.lobbyStartsAt, null); check(countdownResult.room.round, 1);
check(countdownResult.room.players.map(player => player.seat), [0, 1]);
let seatRoom = createRoom('HGFEDCBA', 'counter', participants[0], 11_000, resolveCounter);
seatRoom.players.push({ ...participants[1], seat: 1 });
seatRoom = applyRoomAction(seatRoom, participants[1].id, { ...cmd(seatRoom, 'move_seat'), seat: 2 }, 12_000, undefined, resolveCounter).room;
check(roomView(seatRoom, participants[0].id, resolveCounter).players.map(player => player.seat), [0, 2]);
assert.throws(() => applyRoomAction(seatRoom, participants[0].id, { ...cmd(seatRoom, 'move_seat'), seat: 2 }, 12_001, undefined, resolveCounter), error => error.code === 'SEAT'); checks++;
assert.throws(() => applyRoomAction(seatRoom, participants[0].id, { ...cmd(seatRoom, 'move_seat'), seat: 3 }, 12_001, undefined, resolveCounter), error => error.code === 'SEAT'); checks++;
seatRoom = applyRoomAction(seatRoom, participants[0].id, { ...cmd(seatRoom, 'move_seat'), seat: 1 }, 13_000, undefined, resolveCounter).room;
check(seatRoom.players.map(player => player.id), [participants[0].id, participants[1].id]);
check(seatRoom.players.map(player => player.seat), [1, 2]);
seatRoom = applyRoomAction(seatRoom, participants[0].id, cmd(seatRoom, 'start'), 14_000, undefined, resolveCounter).room;
check(seatRoom.players.map(player => player.seat), [0, 1]);
check(seatRoom.gameState.privatePlayers, [participants[0].id, participants[1].id]);
sharedRoom = apply(sharedRoom, 'start');
check(sharedRoom.status, 'playing'); check(sharedRoom.gameType, 'counter');
check(advanceRoomTime(sharedRoom, Date.now(), resolveCounter).changed, false);
const commonView = roomView(sharedRoom, sharedRoom.hostId, resolveCounter);
check(commonView.limits, { minPlayers: 2, maxPlayers: 3 });
check(commonView.game, { value: 0, ownSeat: sharedRoom.hostId });
check(commonView.players.every(p => !('role' in p) && !('tokenHash' in p)), true);
sharedRoom = applyRoomAction(sharedRoom, sharedRoom.hostId, { ...cmd(sharedRoom, 'say'), phraseId: 'counter_status' }, Date.now(), undefined, resolveCounter).room;
check(sharedRoom.messages[0].phraseId, 'counter_status');
check(roomView(sharedRoom, sharedRoom.hostId, resolveCounter).messages[0].params, { value: 0 });
sharedRoom = apply(sharedRoom, 'increment'); sharedRoom = apply(sharedRoom, 'increment');
check(sharedRoom.status, 'finished'); sharedRoom = apply(sharedRoom, 'restart');
check(sharedRoom.gameState, null); check(sharedRoom.players.every(p => !p.ready), true);
check(sharedRoom.messages, []);
sharedRoom.players.forEach(p => { p.ready = true; }); sharedRoom = apply(sharedRoom, 'start'); sharedRoom = apply(sharedRoom, 'end');
check(sharedRoom.status, 'finished'); check(sharedRoom.gameState.aborted, true);
sharedRoom = apply(sharedRoom, 'quick_start');
check(sharedRoom.status, 'playing'); check(sharedRoom.gameState.value, 0);
sharedRoom = apply(sharedRoom, 'end');
sharedRoom = apply(sharedRoom, 'restart');
assert.throws(() => applyRoomAction(sharedRoom, sharedRoom.hostId, { ...cmd(sharedRoom, 'configure'), config: {} }, Date.now(), undefined, resolveCounter), error => error.code === 'INVALID'); checks++;
const genericGuest = sharedRoom.players.find(player => player.id !== sharedRoom.hostId);
assert.throws(() => applyRoomAction(sharedRoom, genericGuest.id, { ...cmd(sharedRoom, 'kick'), targetId: sharedRoom.hostId }, Date.now(), undefined, resolveCounter), error => error.code === 'HOST_ONLY'); checks++;
for (const targetId of [sharedRoom.hostId, 'missing']) {
  assert.throws(() => applyRoomAction(sharedRoom, sharedRoom.hostId, { ...cmd(sharedRoom, 'kick'), targetId }, Date.now(), undefined, resolveCounter), error => error.code === 'KICK_TARGET'); checks++;
}
const kickedGeneric = applyRoomAction(sharedRoom, sharedRoom.hostId, { ...cmd(sharedRoom, 'kick'), targetId: genericGuest.id }, Date.now(), undefined, resolveCounter).room;
check(kickedGeneric.players.map(player => player.id), [sharedRoom.hostId]);
check(kickedGeneric.stage, sharedRoom.stage + 1);
// Use Wrangler's installed runtime; no new dependency or remote service is needed.
const require = createRequire(import.meta.url);
const runtimeRequire = createRequire(require.resolve('wrangler/package.json'));
const { build } = runtimeRequire('esbuild');
const { Miniflare, convertV4MiniflareOptions } = runtimeRequire('miniflare');
const bundle = await build({
  stdin: { contents: `
    import worker, { GameRoom } from './scripts/api-worker.js';
    export class TestedGameRoom extends GameRoom {
      inspect() { return this.read(false); }
      alarmTime() { return this.ctx.storage.getAlarm(); }
      async advanceHost() { const room = this.read(); const host = room.players.find(p => p.id === room.hostId); host.online = false; host.disconnectedAt = Date.now() - 61000; this.save(room); await this.alarm(); }
      async expire() { const room = this.read(); room.lastActivityAt = Date.now() - ${ROOM_TTL + 1}; this.save(room); await this.alarm(); }
      async advanceDiscussion() { const room = this.read(false); room.gameState.discussion.endsAt = Date.now() - 1; this.save(room); await this.alarm(); }
      async advanceLobby() { const room = this.read(false); room.lobbyStartsAt = Date.now() - 1; this.save(room); await this.alarm(); }
    }
    export default { async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/__test/')) {
        const stub = env.GAME_ROOMS.getByName('room:' + url.searchParams.get('code'));
        if (url.pathname === '/__test/inspect') return Response.json(await stub.inspect());
        if (url.pathname === '/__test/alarm') return Response.json(await stub.alarmTime());
        if (url.pathname === '/__test/host') { await stub.advanceHost(); return new Response('ok'); }
        if (url.pathname === '/__test/expire') { await stub.expire(); return new Response('ok'); }
        if (url.pathname === '/__test/discussion') { await stub.advanceDiscussion(); return new Response('ok'); }
        if (url.pathname === '/__test/lobby') { await stub.advanceLobby(); return new Response('ok'); }
      }
      return worker.fetch(request, env);
    } };
  `, resolveDir: process.cwd(), sourcefile: 'games-test.js' },
  bundle: true, write: false, format: 'esm', platform: 'browser', external: ['cloudflare:workers'],
});
const runtimeOptions = {
  name: 'games-test', modules: true, script: bundle.outputFiles[0].text,
  compatibilityDate: '2026-08-23', compatibilityFlags: ['nodejs_compat'],
  durableObjects: { GAME_ROOMS: { className: 'TestedGameRoom', useSQLite: true } },
  bindings: { GAMES_ALLOWED_ORIGINS: 'https://komori.cc' },
  cf: false,
};
const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(runtimeOptions) : runtimeOptions);
const sockets = [];
async function http(path, { method = 'POST', body, token, origin = 'https://komori.cc', ip = '127.0.0.1' } = {}) {
  return mf.dispatchFetch(`https://api.komori.cc${path}`, {
    method, headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
function inbox(ws) {
  const messages = []; const waiting = new Set();
  ws.addEventListener('message', event => {
    if (event.data === 'pong') return;
    messages.push(JSON.parse(event.data)); for (const wake of waiting) wake();
  });
  return {
    messages,
    async until(predicate) {
      if (predicate(messages)) return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiting.delete(wake); reject(new Error('WebSocket test timed out')); }, 5000);
        const wake = () => { if (predicate(messages)) { clearTimeout(timer); waiting.delete(wake); resolve(); } };
        waiting.add(wake);
      });
    },
    get state() { return messages.filter(m => m.type === 'state').at(-1)?.room; },
  };
}
async function connect(seat) {
  const response = await http(`/games/rooms/${seat.code}/connect`, { token: seat.token });
  check(response.status, 200); const session = await response.json();
  const upgraded = await mf.dispatchFetch(`https://api.komori.cc/games/rooms/${seat.code}/socket`, {
    headers: { Origin: 'https://komori.cc', Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `games,ticket-${session.ticket}` },
  });
  check(upgraded.status, 101);
  const ws = upgraded.webSocket; const events = inbox(ws); ws.accept(); sockets.push(ws);
  await events.until(messages => messages.some(m => m.type === 'state'));
  return { ws, events, ticket: session.ticket };
}
async function send(client, type, payload = {}, expected = 'ack') {
  const action = { id: crypto.randomUUID(), stage: client.events.state.stage, type, ...payload };
  client.ws.send(JSON.stringify(action));
  await client.events.until(messages => messages.some(m => m.id === action.id));
  const result = client.events.messages.find(m => m.id === action.id);
  check(result.type, expected);
  return action;
}
const inspect = async code => (await mf.dispatchFetch(`http://localhost/__test/inspect?code=${code}`)).json();
try {
  check((await http('/games/rooms', { origin: 'https://wrong.example', body: { gameType: 'avalon', nickname: 'No' } })).status, 403);
  check((await http('/games/rooms', { method: 'OPTIONS' })).status, 204);
  check((await http('/games/rooms', { body: 'x'.repeat(2049) })).status, 413);
  check((await http('/games/rooms', { body: '{' })).status, 400);
  const unknown = await http('/games/rooms', { body: { gameType: '__proto__', nickname: 'Unknown' }, ip: '4.4.4.4' });
  check(unknown.status, 400); check((await unknown.json()).error, 'GAME_TYPE');
  check((await http('/games/rooms', { body: { gameType: 'avalon', nickname: '' }, ip: '1.1.1.1' })).status, 400);
  const response = await http('/games/rooms', { body: { gameType: 'avalon', nickname: 'Host' }, ip: '2.2.2.2' });
  check(response.status, 201); check(response.headers.get('Cache-Control'), 'no-store');
  const seat = await response.json(); check(/^[A-HJ-NP-Z2-9]{8}$/.test(seat.code), true);
  check(seat.gameType, 'avalon');
  const clients = [await connect(seat)];
  const wrongGame = await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'other', nickname: 'WrongGame' } });
  check(wrongGame.status, 409); check((await wrongGame.json()).error, 'GAME_MISMATCH');
  check((await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'avalon', nickname: 'Host' } })).status, 409);
  check((await http(`/games/rooms/${seat.code}/connect`, { token: 'a'.repeat(64) })).status, 401);
  for (let i = 1; i < 5; i++) {
    const joined = await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'avalon', nickname: `Player${i}` } });
    check(joined.status, 201); clients.push(await connect(await joined.json()));
  }
  const extraResponse = await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'avalon', nickname: 'Guest' } });
  check(extraResponse.status, 201);
  const extraSeat = await extraResponse.json(); const extraClient = await connect(extraSeat);
  const spareTicket = await (await http(`/games/rooms/${seat.code}/connect`, { token: extraSeat.token })).json();
  for (const client of clients) await client.events.until(() => client.events.state.players.length === 6);
  const forbiddenKick = await send(clients[1], 'kick', { targetId: extraSeat.playerId }, 'error');
  check(clients[1].events.messages.find(message => message.id === forbiddenKick.id).error, 'HOST_ONLY');
  const invalidKick = await send(clients[0], 'kick', { targetId: seat.playerId }, 'error');
  check(clients[0].events.messages.find(message => message.id === invalidKick.id).error, 'KICK_TARGET');
  const removed = new Promise(resolve => extraClient.ws.addEventListener('close', event => resolve(event.code), { once: true }));
  const kickedAction = await send(clients[0], 'kick', { targetId: extraSeat.playerId });
  await extraClient.events.until(messages => messages.some(message => message.error === 'KICKED'));
  check(await removed, 4003);
  for (const client of clients) await client.events.until(() => client.events.state.players.length === 5);
  check((await inspect(seat.code)).players.some(player => player.id === extraSeat.playerId), false);
  check((await http(`/games/rooms/${seat.code}/connect`, { token: extraSeat.token })).status, 401);
  const staleTicket = await mf.dispatchFetch(`https://api.komori.cc/games/rooms/${seat.code}/socket`, { headers: { Origin: 'https://komori.cc', Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `games,ticket-${spareTicket.ticket}` } });
  check(staleTicket.status, 401);
  await send(clients[2], 'move_seat', { seat: 9 });
  await clients[0].events.until(() => clients[0].events.state.players.find(player => player.id === clients[2].events.state.selfId)?.seat === 9);
  await clients[1].events.until(() => clients[1].events.state.players.find(player => player.id === clients[2].events.state.selfId)?.seat === 9);
  check((await inspect(seat.code)).players.at(-1).seat, 9);
  const occupiedSeat = await send(clients[1], 'move_seat', { seat: 9 }, 'error');
  check(clients[1].events.messages.find(message => message.id === occupiedSeat.id).error, 'SEAT');
  const fillResponse = await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'avalon', nickname: 'SeatFill' } });
  check(fillResponse.status, 201);
  const fillSeat = await fillResponse.json();
  check((await inspect(seat.code)).players.find(player => player.id === fillSeat.playerId).seat, 2);
  await clients[0].events.until(() => clients[0].events.state.players.some(player => player.id === fillSeat.playerId));
  await send(clients[0], 'kick', { targetId: fillSeat.playerId });
  await clients[2].events.until(() => clients[2].events.state.players.length === 5 && !clients[2].events.state.players.some(player => player.id === fillSeat.playerId));
  await send(clients[2], 'move_seat', { seat: 2 });
  await clients[0].events.until(() => clients[0].events.state.players.find(player => player.id === clients[2].events.state.selfId)?.seat === 2);
  // A replay must only acknowledge the original command, even with a forged new target.
  clients[0].ws.send(JSON.stringify({ ...kickedAction, targetId: clients[1].events.state.selfId }));
  await clients[0].events.until(messages => messages.filter(message => message.id === kickedAction.id).length === 2);
  check((await inspect(seat.code)).players.length, 5);
  for (const client of clients) await send(client, 'ready', { ready: true });
  check(clients[0].events.state.gameConfig, { specialRoles: ['percival', 'morgana'] });
  const forbiddenConfig = await send(clients[1], 'configure', { config: { specialRoles: [] } }, 'error');
  check(clients[1].events.messages.find(m => m.id === forbiddenConfig.id).error, 'HOST_ONLY');
  await send(clients[0], 'configure', { config: { specialRoles: ['mordred', 'percival'] } });
  for (const client of clients) await client.events.until(() => client.events.state.gameConfig?.specialRoles.includes('mordred'));
  check(clients.every(c => c.events.state.players.every(p => !p.ready)), true);
  await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
  check((await inspect(seat.code)).gameConfig, { specialRoles: ['percival', 'mordred'] });
  await send(clients[0], 'configure', { config: { specialRoles: ['percival', 'morgana'] } });
  for (const client of clients) await client.events.until(() => client.events.state.gameConfig?.specialRoles.includes('morgana'));
  for (const client of clients) await send(client, 'ready', { ready: true });
  await clients[0].events.until(() => clients[0].events.state.lobbyStartsAt !== null);
  check((await inspect(seat.code)).lobbyStartsAt > Date.now(), true);
  await send(clients[1], 'ready', { ready: false });
  await clients[0].events.until(() => clients[0].events.state.lobbyStartsAt === null);
  check((await inspect(seat.code)).status, 'lobby');
  await send(clients[1], 'ready', { ready: true });
  await clients[0].events.until(() => clients[0].events.state.lobbyStartsAt !== null);
  check(await (await mf.dispatchFetch(`http://localhost/__test/alarm?code=${seat.code}`)).json(), clients[0].events.state.lobbyStartsAt);
  await mf.dispatchFetch(`http://localhost/__test/lobby?code=${seat.code}`);
  await clients[0].events.until(() => clients[0].events.state.game?.phase === 'night');
  const inGameKick = await send(clients[0], 'kick', { targetId: clients[1].events.state.selfId }, 'error');
  check(clients[0].events.messages.find(message => message.id === inGameKick.id).error, 'PHASE');
  check((await http(`/games/rooms/${seat.code}/join`, { body: { gameType: 'avalon', nickname: 'Late' } })).status, 409);
  for (const client of clients) {
    await client.events.until(() => client.events.state.game?.phase === 'night');
    check(client.events.state.players.every(p => !('role' in p) && !('tokenHash' in p)), true);
    check(client.events.state.game.self.role, null);
    check(client.events.state.game.self.knownEvil.length, 0);
    check(client.events.state.game.self.knownCandidates, []);
  }
  await send(clients[0], 'peek_role');
  await clients[0].events.until(() => clients[0].events.state.game?.self.roleRevealed);
  await send(clients[0], 'confirm_role');
  await clients[0].events.until(() => clients[0].events.state.game?.self.nightConfirmed);
  await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
  check(Object.keys((await inspect(seat.code)).gameState.nightConfirmed).length, 1);
  clients[0] = await connect(seat);
  check(clients[0].events.state.game.self.nightConfirmed, true);
  for (const client of clients.slice(1)) {
    await send(client, 'peek_role');
    await client.events.until(() => client.events.state.game?.self.roleRevealed);
    await send(client, 'confirm_role');
  }
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'discussion');
  const stored = await inspect(seat.code);
  const percival = clients.find(c => c.events.state.game.self.role === 'percival');
  check(percival.events.state.game.self.knownCandidates, stored.gameState.participants.filter(p => ['merlin', 'morgana'].includes(stored.gameState.roles[p.id])).map(p => p.id));
  check(percival.events.state.game.self.knownEvil, []);
  const leader = clients.find(c => c.events.state.selfId === stored.players[stored.gameState.leaderIndex].id);
  const beforeSpeech = await inspect(seat.code);
  const utterance = await send(clients[1], 'say', { phraseId: 'counterclaim', targetId: seat.playerId, role: 'merlin', text: 'forged', playerId: seat.playerId });
  for (const client of clients) await client.events.until(() => client.events.state.messages?.some(message => message.id === utterance.id));
  const spoken = await inspect(seat.code);
  check(spoken.gameState, beforeSpeech.gameState); check(spoken.stage, beforeSpeech.stage);
  check(spoken.messages.at(-1).nickname, 'Player1');
  check(spoken.messages.at(-1).params, { name: 'Host', role: 'merlin' });
  check(spoken.messages.at(-1).text, undefined);
  const tooFast = await send(clients[1], 'say', { phraseId: 'pause' }, 'error');
  check(clients[1].events.messages.find(message => message.id === tooFast.id).error, 'CHAT_COOLDOWN');
  const forgedTarget = await send(clients[2], 'say', { phraseId: 'suspicious', targetId: 'unknown' }, 'error');
  check(clients[2].events.messages.find(message => message.id === forgedTarget.id).error, 'CHAT_TARGET');
  clients[1].ws.send(JSON.stringify(utterance));
  await clients[1].events.until(messages => messages.filter(message => message.id === utterance.id).length === 2);
  check((await inspect(seat.code)).messages.length, 1);
  await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
  check((await inspect(seat.code)).messages, spoken.messages);
  const speechReconnect = await connect(seat);
  check(speechReconnect.events.state.messages, spoken.messages);
  check(speechReconnect.events.state.game.discussion, spoken.gameState.discussion);
  check(await (await mf.dispatchFetch(`http://localhost/__test/alarm?code=${seat.code}`)).json(), spoken.gameState.discussion.endsAt);
  clients[0] = speechReconnect;
  const currentLeader = clients.find(client => client.events.state.selfId === leader.events.state.selfId);
  await mf.dispatchFetch(`http://localhost/__test/discussion?code=${seat.code}`);
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'team');
  await send(currentLeader, 'team', { team: stored.players.slice(0, 2).map(p => p.id) });
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'vote');
  check(currentLeader.events.state.game.self.voted, true);
  check(currentLeader.events.state.game.self.autoApproved, true);
  const partialVoter = clients.find(client => client !== currentLeader && client !== clients[0]);
  const partialVote = await send(partialVoter, 'vote', { approve: false });
  const partial = await inspect(seat.code);
  check(Object.keys(partial.gameState.ballots).length, 2);
  check(partial.gameState.ballots[currentLeader.events.state.selfId], true);
  await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
  check(Object.keys((await inspect(seat.code)).gameState.ballots).length, 2);
  partialVoter.ws.send(JSON.stringify(partialVote));
  await partialVoter.events.until(messages => messages.filter(m => m.id === partialVote.id).length === 2);
  check((await inspect(seat.code)).revision, partial.revision);
  const rejoined = await connect(seat);
  check(rejoined.events.state.selfId, seat.playerId);
  check(rejoined.events.state.game?.phase, 'vote');
  const reused = await mf.dispatchFetch(`https://api.komori.cc/games/rooms/${seat.code}/socket`, { headers: { Origin: 'https://komori.cc', Upgrade: 'websocket', 'Sec-WebSocket-Protocol': `games,ticket-${rejoined.ticket}` } });
  check(reused.status, 401);
  clients[0] = rejoined;
  for (let questIndex = 0; questIndex < 3; questIndex++) {
    if (questIndex > 0) {
      for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'discussion');
      const snapshot = await inspect(seat.code);
      const captain = clients.find(c => c.events.state.selfId === snapshot.players[snapshot.gameState.leaderIndex].id);
      if (snapshot.gameState.discussion.mode === 'fast') {
        const partner = clients.find(client => client !== captain);
        await send(captain, 'discussion_partner', { targetId: partner.events.state.selfId });
        for (const client of clients) await client.events.until(() => client.events.state.game.discussion?.partnerId === partner.events.state.selfId);
        const observer = clients.find(client => ![captain, partner].includes(client));
        const forbidden = await send(observer, 'say', { phraseId: 'pause' }, 'error');
        check(observer.events.messages.find(message => message.id === forbidden.id).error, 'DISCUSSION_SPEAKER');
        const countdown = (await inspect(seat.code)).gameState.discussion;
        await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
        check((await inspect(seat.code)).gameState.discussion, countdown);
        check(await (await mf.dispatchFetch(`http://localhost/__test/alarm?code=${seat.code}`)).json(), countdown.endsAt);
      }
      while ((await inspect(seat.code)).gameState.phase === 'discussion') await mf.dispatchFetch(`http://localhost/__test/discussion?code=${seat.code}`);
      for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'team');
      await send(captain, 'team', { team: snapshot.players.slice(0, QUEST_TEAMS[5][questIndex]).map(p => p.id) });
    }
    for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'vote');
    for (const client of clients.filter(client => !client.events.state.game.self.voted)) {
      await send(client, 'vote', { approve: true });
    }
    for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'quest');
    for (const client of clients.filter(c => c.events.state.game.team.includes(c.events.state.selfId))) await send(client, 'quest', { success: true });
  }
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'evil_discussion');
  const assassinClient = clients.find(c => c.events.state.game.self.role === 'assassin');
  const merlinClient = clients.find(c => c.events.state.game.self.role === 'merlin');
  check('revealedRoles' in assassinClient.events.state.game, false);
  const premature = await send(assassinClient, 'assassinate', { targetId: merlinClient.events.state.selfId }, 'error');
  check(assassinClient.events.messages.find(message => message.id === premature.id).error, 'PHASE');
  await send(assassinClient, 'end_assassination_discussion');
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'assassinate');
  await send(assassinClient, 'assassinate', { targetId: merlinClient.events.state.selfId });
  for (const client of clients) await client.events.until(() => client.events.state.game?.phase === 'finished');
  check(rejoined.events.state.game.result.winner, 'evil');
  check(Object.keys(rejoined.events.state.game.revealedRoles).length, 5);
  const completedRound = rejoined.events.state.round;
  await send(rejoined, 'quick_start');
  for (const client of clients) await client.events.until(() => client.events.state.round === completedRound + 1);
  check(rejoined.events.state.game.phase, 'night');
  check(rejoined.events.state.game.self.role, null);
  check(rejoined.events.state.game.history, []);
  check(rejoined.events.state.messages, []);
  check(rejoined.events.state.gameConfig, { specialRoles: ['percival', 'morgana'] });
  check('revealedRoles' in rejoined.events.state.game, false);
  await send(rejoined, 'quick_start');
  for (const client of clients) await client.events.until(() => client.events.state.round === completedRound + 2);
  await mf.unsafeEvictDurableObject('games-test', 'TestedGameRoom', { name: `room:${seat.code}`, webSockets: 'hibernate' });
  const quickStored = await inspect(seat.code);
  check(quickStored.round, completedRound + 2); check(quickStored.gameState.phase, 'night');
  await mf.dispatchFetch(`http://localhost/__test/host?code=${seat.code}`);
  check((await inspect(seat.code)).hostId !== seat.playerId, true);
  await mf.dispatchFetch(`http://localhost/__test/expire?code=${seat.code}`);
  check((await http(`/games/rooms/${seat.code}/connect`, { token: seat.token })).status, 404);
  for (let i = 0; i < 5; i++) check((await http('/games/rooms', { body: { gameType: 'avalon', nickname: 'Rate' }, ip: '3.3.3.3' })).status, 201);
  check((await http('/games/rooms', { body: { gameType: 'avalon', nickname: 'Rate' }, ip: '3.3.3.3' })).status, 429);
  console.log(`Games: ${checks} integration assertions passed, including SQLite persistence, hibernation, WebSockets, seat recovery, duplicate commands, host transfer, expiry, CORS and rate limits.`);
} finally {
  for (const ws of sockets) { try { ws.close(1000); } catch { /* Already closed. */ } }
  await mf.dispose();
}
await import('./check-game-room-client.mjs');
