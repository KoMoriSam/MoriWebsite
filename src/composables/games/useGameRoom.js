import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const ENDPOINT = (import.meta.env.VITE_GAMES_API || (import.meta.env.PROD ? 'https://api.komori.cc/games/rooms' : '/api/games/rooms')).replace(/\/+$/, '');
const VALID_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const MAX_RECONNECT_ATTEMPTS = 3;
const key = code => `mori:games:room:${code}`;
function commandId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function useGameRoom(gameType) {
  const lastKey = `mori:games:last:${gameType}`;
  const route = useRoute(); const router = useRouter();
  const room = ref(null); const code = ref(''); const error = ref('');
  const connection = ref('offline'); const busy = ref(false); const sending = ref(false);
  const canReconnect = ref(false);
  const storageAvailable = ref(true);
  let credentials = null; let socket = null; let epoch = 0; let stopped = false;
  let retry = null; let heartbeat = null; let handshake = null; let attempt = 0;
  const pending = new Map();
  function readCredentials(roomCode) {
    try {
      const saved = JSON.parse(localStorage.getItem(key(roomCode)) || 'null');
      return saved?.code === roomCode && saved.gameType === gameType && /^[a-f0-9]{64}$/.test(saved.token) ? saved : null;
    } catch { storageAvailable.value = false; return null; }
  }
  function saveCredentials(value) {
    try { localStorage.setItem(key(value.code), JSON.stringify(value)); sessionStorage.setItem(lastKey, value.code); }
    catch { storageAvailable.value = false; }
  }
  function forget(roomCode) {
    try { localStorage.removeItem(key(roomCode)); if (sessionStorage.getItem(lastKey) === roomCode) sessionStorage.removeItem(lastKey); }
    catch { /* The in-memory seat remains usable. */ }
  }
  async function request(path, body, token) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(ENDPOINT + path, {
        method: 'POST', signal: controller.signal,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'SERVER');
      return data;
    } catch (cause) {
      if (cause instanceof TypeError || cause.name === 'AbortError') throw new Error('NETWORK');
      throw cause;
    } finally { clearTimeout(timeout); }
  }
  function cleanupConnection() {
    clearTimeout(retry); clearTimeout(handshake); clearInterval(heartbeat);
    retry = heartbeat = handshake = null;
    if (socket) { const old = socket; socket = null; old.close(); }
  }
  function rejectPending(reason) {
    for (const entry of pending.values()) { clearTimeout(entry.timeout); entry.reject(new Error(reason)); }
    pending.clear(); sending.value = false;
  }
  function scheduleReconnect(generation) {
    if (stopped || generation !== epoch) return;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      connection.value = 'offline';
      if (!error.value) error.value = 'NETWORK';
      return;
    }
    connection.value = 'reconnecting';
    retry = setTimeout(() => { void connect(generation); }, Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)));
  }
  async function connect(generation = epoch) {
    if (!credentials || stopped || generation !== epoch) return;
    cleanupConnection();
    connection.value = attempt ? 'reconnecting' : 'connecting';
    try {
      const session = await request(`/${credentials.code}/connect`, null, credentials.token);
      if (generation !== epoch || stopped) return;
      if (session.gameType !== gameType) throw new Error('GAME_MISMATCH');
      const url = new URL(`${ENDPOINT}/${credentials.code}/socket`, window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url, ['games', `ticket-${session.ticket}`]);
      socket = ws;
      let openedAt = 0;
      const current = () => generation === epoch && socket === ws && !stopped;
      handshake = setTimeout(() => { if (current() && ws.readyState !== WebSocket.OPEN) ws.close(); }, 10_000);
      ws.onopen = () => {
        if (!current()) { ws.close(); return; }
        clearTimeout(handshake); openedAt = Date.now();
        connection.value = 'online'; error.value = '';
        let lastPong = Date.now();
        ws._pong = () => { lastPong = Date.now(); };
        heartbeat = setInterval(() => {
          if (Date.now() - lastPong > 50_000) ws.close();
          else if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 20_000);
        for (const entry of pending.values()) ws.send(JSON.stringify(entry.action));
      };
      ws.onmessage = event => {
        if (!current()) return;
        if (event.data === 'pong') { ws._pong?.(); return; }
        let data; try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'state') {
          room.value = data.room;
          return;
        }
        if (data.type === 'ack' || data.type === 'error') {
          const entry = pending.get(data.id);
          if (entry) { clearTimeout(entry.timeout); pending.delete(data.id); sending.value = pending.size > 0; }
          if (data.type === 'error') { error.value = data.error || 'SERVER'; entry?.reject(new Error(error.value)); }
          else entry?.resolve();
        }
      };
      ws.onclose = event => {
        if (!current()) return;
        socket = null; clearInterval(heartbeat); clearTimeout(handshake);
        if (openedAt && Date.now() - openedAt >= 60_000) attempt = 0;
        if (event.code === 4003) {
          error.value = 'KICKED'; connection.value = 'offline';
          forget(credentials.code); rejectPending('KICKED');
          credentials = null; canReconnect.value = false; room.value = null;
          return;
        }
        if ([4001, 4002, 4004].includes(event.code)) {
          connection.value = event.code === 4001 ? 'replaced' : 'offline';
          error.value = event.code === 4001 ? 'REPLACED' : 'EXPIRED';
          if (event.code !== 4001) {
            forget(credentials.code); credentials = null;
            canReconnect.value = false; room.value = null;
          }
          rejectPending(event.code === 4001 ? 'REPLACED' : 'EXPIRED');
          return;
        }
        scheduleReconnect(generation);
      };
      ws.onerror = () => { /* onclose owns retry and status changes. */ };
    } catch (cause) {
      if (generation !== epoch || stopped) return;
      error.value = cause.message;
      if (['UNAUTHORIZED', 'EXPIRED', 'NOT_FOUND', 'GAME_MISMATCH'].includes(cause.message)) {
        forget(credentials.code); credentials = null; canReconnect.value = false;
        room.value = null; connection.value = 'offline'; rejectPending(cause.message);
      } else scheduleReconnect(generation);
    }
  }
  async function enter(value) {
    epoch++; cleanupConnection(); rejectPending('NETWORK');
    credentials = value; canReconnect.value = true;
    code.value = value.code; room.value = null; attempt = 0;
    saveCredentials(value);
    await router.replace({ path: route.path, query: { ...route.query, room: value.code } });
    await connect(epoch);
  }
  async function openRoom(join = false, nickname = '', profile) {
    if (busy.value) return;
    error.value = ''; busy.value = true;
    try {
      const roomCode = code.value.trim().toUpperCase();
      if (join && !VALID_CODE.test(roomCode)) throw new Error('ROOM_CODE');
      if (join) {
        const saved = readCredentials(roomCode);
        if (saved) { await enter(saved); return; }
      }
      const value = await request(join ? `/${roomCode}/join` : '', { nickname, gameType, ...(profile ? { profile } : {}) });
      if (!stopped) await enter(value);
    } catch (cause) { error.value = cause.message; }
    finally { busy.value = false; }
  }
  function action(type, payload = {}) {
    if (socket?.readyState !== WebSocket.OPEN || !room.value) return Promise.reject(new Error('NETWORK'));
    const command = { ...payload, type, stage: room.value.stage, id: commandId() };
    error.value = ''; sending.value = true;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { pending.delete(command.id); sending.value = pending.size > 0; error.value = 'NETWORK'; reject(new Error('NETWORK')); }, 45_000);
      pending.set(command.id, { action: command, resolve, reject, timeout });
      try { socket.send(JSON.stringify(command)); }
      catch { clearTimeout(timeout); pending.delete(command.id); sending.value = pending.size > 0; reject(new Error('NETWORK')); }
    });
  }
  async function run(type, payload) {
    if (sending.value) return false;
    try { await action(type, payload); return true; } catch (cause) { error.value = cause.message; return false; }
  }
  async function leave() {
    if (busy.value || sending.value) return;
    const remove = !room.value || room.value.status !== 'playing';
    if (connection.value === 'online') {
      try { await action('leave'); } catch (cause) { error.value = cause.message; return; }
    }
    epoch++; cleanupConnection(); rejectPending('NETWORK');
    if (remove && credentials) forget(credentials.code);
    credentials = null; canReconnect.value = false;
    room.value = null; connection.value = 'offline'; error.value = '';
    await router.replace({ path: route.path, query: { ...route.query, room: undefined } });
  }
  function reconnect() {
    if (!credentials || stopped) return;
    epoch++; attempt = 0; error.value = ''; void connect(epoch);
  }
  onMounted(() => {
    let roomCode = typeof route.query.room === 'string' ? route.query.room.toUpperCase() : '';
    if (!roomCode) { try { roomCode = sessionStorage.getItem(lastKey) || ''; } catch { /* Optional convenience. */ } }
    if (!VALID_CODE.test(roomCode)) return;
    code.value = roomCode;
    const saved = readCredentials(roomCode);
    if (saved) void enter(saved);
  });
  watch(() => route.query.room, value => {
    const roomCode = typeof value === 'string' ? value.toUpperCase() : '';
    if (credentials?.code === roomCode) return;
    epoch++; cleanupConnection(); rejectPending('NETWORK');
    credentials = null; canReconnect.value = false;
    room.value = null; connection.value = 'offline';
    code.value = roomCode;
    if (VALID_CODE.test(roomCode)) {
      credentials = readCredentials(roomCode);
      canReconnect.value = Boolean(credentials);
      if (credentials) void connect(epoch);
    }
  });
  onBeforeUnmount(() => { stopped = true; epoch++; cleanupConnection(); rejectPending('NETWORK'); });
  return { room, code, error, connection, canReconnect, busy, sending, storageAvailable, openRoom, run, leave, reconnect };
}
