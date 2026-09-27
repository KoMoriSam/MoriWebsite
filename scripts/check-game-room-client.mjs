import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { createRenderer, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { applyRoomAction, createPlayer, createRoom, roomView } from './games/state.js';

// Exercise the real composable with a lost acknowledgement and seat replacement.
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/game-room-client', optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, watch: null }, appType: 'custom' });
const globals = ['window', 'localStorage', 'sessionStorage', 'fetch', 'WebSocket', 'crypto'];
const previous = new Map(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const token = 'a'.repeat(64); const credential = { gameType: 'avalon', code: 'ABCDEFGH', token, playerId: '' };
const player = { ...createPlayer('Tester', 'hash'), online: true };
credential.playerId = player.id;
let persisted = createRoom(credential.code, 'avalon', player);
const sockets = []; const sent = []; const requests = []; let loseAck = false;
class FakeSocket {
  static OPEN = 1;
  constructor(url, protocols) {
    this.url = url; this.protocols = protocols; this.readyState = 0; sockets.push(this);
    queueMicrotask(() => { this.readyState = 1; this.onopen?.(); this.deliver({ type: 'state', room: view() }); });
  }
  deliver(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
  send(raw) {
    if (raw === 'ping') { this.onmessage?.({ data: 'pong' }); return; }
    const action = JSON.parse(raw); sent.push(action);
    const result = applyRoomAction(persisted, player.id, action); persisted = result.room;
    if (loseAck) { loseAck = false; this.close(1006); return; }
    queueMicrotask(() => {
      this.deliver({ type: 'ack', id: action.id });
      if (persisted.players.some(p => p.id === player.id)) this.deliver({ type: 'state', room: view() });
      else this.close(4002);
    });
  }
  close(code = 1000) { if (this.readyState === 3) return; this.readyState = 3; queueMicrotask(() => this.onclose?.({ code })); }
}
function view() {
  return roomView(persisted, player.id);
}
const memory = () => ({ data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); }, removeItem(key) { this.data.delete(key); } });
const storage = memory(); const session = memory();
function setGlobal(name, value) { Object.defineProperty(globalThis, name, { value, configurable: true, writable: true }); }
const renderer = createRenderer({
  createElement: () => ({ children: [] }), createText: text => ({ text }), createComment: () => ({}),
  setElementText: () => {}, setText: () => {}, insert: (node, parent) => parent.children.push(node),
  remove: () => {}, patchProp: () => {}, parentNode: () => null, nextSibling: () => null,
});
let app;
try {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/games/avalon', name: 'avalon', component: { render: () => null } }] });
  await router.push('/games/avalon'); await router.isReady();
  setGlobal('window', { location: { origin: 'http://192.168.1.10:5173' }, isSecureContext: false });
  // HTTP LAN pages expose getRandomValues, but not randomUUID.
  setGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  setGlobal('localStorage', storage); setGlobal('sessionStorage', session); setGlobal('WebSocket', FakeSocket);
  setGlobal('fetch', async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/connect') ? { ticket: 'b'.repeat(64), gameType: 'avalon' } : credential };
  });
  const { useGameRoom } = await server.ssrLoadModule('/src/composables/useGameRoom.js');
  let client;
  app = renderer.createApp({ setup() { client = useGameRoom('avalon'); return () => h('p'); } });
  app.use(router); app.mount({ children: [] });
  await client.openRoom(false, 'Tester'); await nextTick();
  assert.equal(client.connection.value, 'online');
  assert.equal(client.room.value.selfId, player.id);
  assert.equal(router.currentRoute.value.query.room, credential.code);
  assert.equal(JSON.parse(storage.getItem(`mori:games:room:${credential.code}`)).token, token);
  assert.ok(requests.every(request => !request.url.includes(token)));
  assert.ok(sockets.every(socket => !socket.url.href.includes(token)));
  loseAck = true;
  const revision = persisted.revision;
  const operation = client.run('ready', { ready: true });
  await nextTick();
  assert.equal(client.sending.value, true);
  client.reconnect();
  await operation; await nextTick();
  assert.equal(client.connection.value, 'online');
  assert.equal(client.sending.value, false);
  assert.equal(persisted.revision, revision + 1);
  assert.equal(sent[0].id, sent[1].id);
  assert.match(sent[0].id, /^[a-f0-9]{32}$/);
  assert.equal(client.room.value.players[0].ready, true);
  sockets.at(-1).close(4001); await nextTick();
  assert.equal(client.connection.value, 'replaced');
  assert.equal(client.error.value, 'REPLACED');
  client.reconnect();
  // Drain request, WebSocket open and state delivery microtasks.
  for (let i = 0; i < 8; i++) await nextTick();
  assert.equal(client.connection.value, 'online');
  assert.equal(client.error.value, '');
  sockets.at(-1).close(4003); await nextTick();
  assert.equal(client.connection.value, 'offline');
  assert.equal(client.error.value, 'KICKED');
  assert.equal(client.room.value, null);
  assert.equal(storage.getItem(`mori:games:room:${credential.code}`), null);
  const socketCount = sockets.length;
  client.reconnect(); await nextTick();
  assert.equal(sockets.length, socketCount);
  await client.openRoom(false, 'Tester'); await nextTick();
  assert.equal(client.connection.value, 'online');
  await client.leave(); await nextTick();
  assert.equal(client.room.value, null);
  assert.equal(storage.getItem(`mori:games:room:${credential.code}`), null);
  assert.equal(router.currentRoute.value.query.room, undefined);
  console.log('Game room client: room entry, credential privacy, lost acknowledgement recovery, duplicate prevention, seat replacement, reclaim, kick credential cleanup and lobby departure passed.');
} finally {
  app?.unmount();
  for (const name of globals) {
    const descriptor = previous.get(name);
    if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
  await server.close();
}
