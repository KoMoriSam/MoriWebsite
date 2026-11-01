import { getGame } from "./registry.js";
import { ensure, randomInt } from "./utils.js";
import {
  MESSAGE_LIMIT,
  MESSAGE_COOLDOWN,
} from "../../shared/games/messages.js";
export { GameError, ensure, randomInt } from "./utils.js";

export const ROOM_TTL = 24 * 60 * 60 * 1000;
export const HOST_GRACE = 60_000;
export const LOBBY_START_DELAY = 5_000;
const participants = (room) =>
  room.players.map(({ id, nickname }) => ({ id, nickname }));
export function assignSeats(room) {
  room.players.forEach((player, index) => {
    if (!Number.isInteger(player.seat)) player.seat = index;
  });
  room.players.sort((a, b) => a.seat - b.seat);
}
function compactSeats(room) {
  assignSeats(room);
  room.players.forEach((player, index) => {
    player.seat = index;
  });
}
const readyToStart = (room, definition) =>
  room.players.length >= definition.minPlayers &&
  room.players.length <= definition.maxPlayers &&
  room.players.every((player) => player.ready && player.online);
export function syncLobbyStart(room, now = Date.now(), resolveGame = getGame) {
  room.lobbyStartsAt =
    room.status === "lobby" && readyToStart(room, resolveGame(room.gameType))
      ? (room.lobbyStartsAt ?? now + LOBBY_START_DELAY)
      : null;
}
export function createRoom(
  code,
  gameType,
  player,
  now = Date.now(),
  resolveGame = getGame,
) {
  const definition = resolveGame(gameType);
  return {
    code,
    gameType,
    hostId: player.id,
    players: [{ ...player, seat: 0 }],
    status: "lobby",
    lobbyStartsAt: null,
    stage: 1,
    revision: 1,
    round: 0,
    lastActivityAt: now,
    gameState: null,
    gameConfig: definition.normalizeConfig?.() ?? null,
    messages: [],
  };
}
export function normalizePlayerProfile(nickname, profile) {
  ensure(
    profile == null || (typeof profile === "object" && !Array.isArray(profile)),
    "PROFILE",
  );
  const source = profile?.profileSource ?? "guest";
  ensure(["guest", "github"].includes(source), "PROFILE");
  ensure(typeof nickname === "string", "NICKNAME");
  nickname = nickname.trim();
  ensure(
    nickname.length > 0 &&
      nickname.length <= (source === "github" ? 256 : 24) &&
      !/[\p{Cc}\p{Cf}]/u.test(nickname),
    "NICKNAME",
  );
  let avatarUrl = null;
  if (source === "github" && profile?.avatarUrl) {
    ensure(
      typeof profile.avatarUrl === "string" && profile.avatarUrl.length <= 512,
      "PROFILE",
    );
    let url;
    try {
      url = new URL(profile.avatarUrl);
    } catch {
      ensure(false, "PROFILE");
    }
    ensure(
      url.protocol === "https:" &&
        url.hostname === "avatars.githubusercontent.com" &&
        !url.port &&
        !url.username &&
        !url.password &&
        !url.hash &&
        /^\/u\/\d+$/.test(url.pathname),
      "PROFILE",
    );
    avatarUrl = url.href;
  }
  return { nickname, avatarUrl, profileSource: source };
}
export function createPlayer(
  nickname,
  tokenHash,
  now = Date.now(),
  profile = null,
) {
  return {
    id: crypto.randomUUID(),
    ...normalizePlayerProfile(nickname, profile),
    tokenHash,
    ready: false,
    online: false,
    departed: false,
    disconnectedAt: now,
    receipts: [],
  };
}
export function transferHost(room, now = Date.now(), immediate = false) {
  const host = room.players.find((p) => p.id === room.hostId);
  if (
    host?.online ||
    (!immediate && host && now - host.disconnectedAt < HOST_GRACE)
  )
    return false;
  const successor = room.players.find((p) => p.online && p.id !== room.hostId);
  if (!successor) return false;
  room.hostId = successor.id;
  return true;
}
export function applyRoomAction(
  source,
  playerId,
  action,
  now = Date.now(),
  rng = randomInt,
  resolveGame = getGame,
) {
  const room = structuredClone(source);
  const player = room.players.find((p) => p.id === playerId);
  ensure(player, "UNAUTHORIZED", 401);
  ensure(
    action && typeof action === "object" && !Array.isArray(action),
    "INVALID",
  );
  ensure(
    typeof action.id === "string" && /^[\w-]{16,80}$/.test(action.id),
    "INVALID",
  );
  if (player.receipts.includes(action.id))
    return { room: source, duplicate: true };
  ensure(action.stage === room.stage, "STALE", 409);
  const definition = resolveGame(room.gameType);
  const host = () => ensure(room.hostId === playerId, "HOST_ONLY", 403);
  switch (action.type) {
    case "dissolve":
      host();
      return { room: null, duplicate: false };
    case "profile": {
      ensure(room.status === "lobby", "PHASE");
      const profile = normalizePlayerProfile(action.nickname, action.profile);
      ensure(
        !room.players.some(
          (other) =>
            other.id !== playerId &&
            other.nickname.toLocaleLowerCase() ===
              profile.nickname.toLocaleLowerCase(),
        ),
        "NICKNAME_TAKEN",
        409,
      );
      Object.assign(player, profile);
      player.ready = false;
      room.lobbyStartsAt = null;
      room.stage++;
      break;
    }
    case "move_seat":
      ensure(room.status === "lobby", "PHASE");
      ensure(
        Number.isInteger(action.seat) &&
          action.seat >= 0 &&
          action.seat < definition.maxPlayers,
        "SEAT",
      );
      assignSeats(room);
      ensure(
        !room.players.some((occupant) => occupant.seat === action.seat),
        "SEAT",
      );
      player.seat = action.seat;
      room.players.sort((a, b) => a.seat - b.seat);
      room.lobbyStartsAt = null;
      room.stage++;
      break;
    case "kick":
      host();
      ensure(room.status === "lobby", "PHASE");
      ensure(
        action.targetId !== playerId &&
          room.players.some((target) => target.id === action.targetId),
        "KICK_TARGET",
      );
      room.players = room.players.filter(
        (target) => target.id !== action.targetId,
      );
      room.lobbyStartsAt = null;
      room.stage++;
      break;
    case "say": {
      ensure(
        ["playing", "finished"].includes(room.status) &&
          typeof definition.phrase === "function",
        "PHASE",
      );
      const content = definition.phrase(
        action,
        room.gameState,
        participants(room),
        room.gameConfig ?? undefined,
        playerId,
        now,
      );
      const previous = (room.messages ?? []).findLast(
        (message) => message.playerId === playerId,
      );
      ensure(
        !previous || now - previous.at >= MESSAGE_COOLDOWN,
        "CHAT_COOLDOWN",
        429,
      );
      room.messages = [
        ...(room.messages ?? []).slice(-(MESSAGE_LIMIT - 1)),
        {
          id: action.id,
          playerId,
          nickname: player.nickname,
          ...content,
          at: now,
          round: room.round,
        },
      ];
      break;
    }
    case "configure":
      host();
      ensure(room.status === "lobby", "PHASE");
      ensure(typeof definition.normalizeConfig === "function", "INVALID");
      ensure(action.config !== undefined, "INVALID");
      room.gameConfig = definition.normalizeConfig(action.config);
      room.lobbyStartsAt = null;
      room.players.forEach((p) => {
        p.ready = false;
      });
      room.stage++;
      break;
    case "ready":
      ensure(
        room.status === "lobby" && typeof action.ready === "boolean",
        "PHASE",
      );
      if (
        action.ready &&
        room.players.length >= definition.minPlayers &&
        room.players.every((p) =>
          p.id === playerId ? p.online : p.ready && p.online,
        )
      )
        definition.validateConfig?.(
          room.players.length,
          room.gameConfig ?? undefined,
        );
      player.ready = action.ready;
      break;
    case "start":
      host();
      ensure(room.status === "lobby", "PHASE");
      ensure(
        room.players.length >= definition.minPlayers &&
          room.players.length <= definition.maxPlayers &&
          room.players.every((p) => p.ready && p.online),
        "NOT_READY",
      );
      compactSeats(room);
      room.gameState = definition.create(
        participants(room),
        rng,
        room.gameConfig ?? undefined,
      );
      room.messages = [];
      room.status = "playing";
      room.lobbyStartsAt = null;
      room.round++;
      room.stage++;
      break;
    case "end":
      host();
      ensure(room.status === "playing", "PHASE");
      room.gameState = definition.abort(room.gameState);
      room.status = "finished";
      room.stage++;
      break;
    case "quick_start":
      host();
      ensure(["playing", "finished"].includes(room.status), "PHASE");
      ensure(
        room.players.length >= definition.minPlayers &&
          room.players.length <= definition.maxPlayers &&
          room.players.every((p) => p.online),
        "QUICK_NOT_READY",
      );
      compactSeats(room);
      room.gameState = definition.create(
        participants(room),
        rng,
        room.gameConfig ?? undefined,
      );
      room.players.forEach((p) => {
        p.ready = false;
      });
      room.messages = [];
      room.status = "playing";
      room.round++;
      room.stage++;
      break;
    case "restart":
      host();
      ensure(room.status === "finished", "PHASE");
      room.status = "lobby";
      room.lobbyStartsAt = null;
      room.gameState = null;
      room.messages = [];
      room.players.forEach((p) => {
        p.ready = false;
      });
      room.stage++;
      break;
    case "leave":
      player.online = false;
      player.disconnectedAt = now;
      if (room.status === "playing") player.departed = true;
      transferHost(room, now, true);
      if (room.status !== "playing") {
        room.players = room.players.filter((p) => p.id !== playerId);
        room.lobbyStartsAt = null;
        if (room.hostId === playerId) room.hostId = room.players[0]?.id ?? null;
        room.stage++;
      }
      break;
    default: {
      ensure(room.status === "playing", "PHASE");
      const transition = definition.apply(
        room.gameState,
        participants(room),
        playerId,
        action,
        now,
      );
      room.gameState = transition.state;
      if (transition.stageChanged) room.stage++;
      if (transition.finished) room.status = "finished";
    }
  }
  syncLobbyStart(room, now, resolveGame);
  player.receipts = [...player.receipts.slice(-63), action.id];
  room.lastActivityAt = now;
  room.revision++;
  return { room, duplicate: false };
}
export function advanceRoomTime(
  source,
  now = Date.now(),
  resolveGame = getGame,
) {
  if (
    source.status === "lobby" &&
    source.lobbyStartsAt &&
    now >= source.lobbyStartsAt
  ) {
    const room = structuredClone(source);
    if (readyToStart(room, resolveGame(room.gameType))) {
      compactSeats(room);
      room.gameState = resolveGame(room.gameType).create(
        participants(room),
        randomInt,
        room.gameConfig ?? undefined,
      );
      room.messages = [];
      room.status = "playing";
      room.round++;
      room.stage++;
    }
    room.lobbyStartsAt = null;
    room.revision++;
    room.lastActivityAt = now;
    return { room, changed: true };
  }
  if (source.status !== "playing") return { room: source, changed: false };
  const transition = resolveGame(source.gameType).tick?.(
    source.gameState,
    participants(source),
    now,
  );
  if (!transition) return { room: source, changed: false };
  const room = structuredClone(source);
  room.gameState = transition.state;
  if (transition.stageChanged) room.stage++;
  if (transition.finished) room.status = "finished";
  room.revision++;
  room.lastActivityAt = now;
  return { room, changed: true };
}
export function roomView(room, playerId, resolveGame = getGame) {
  ensure(
    room.players.some((p) => p.id === playerId),
    "UNAUTHORIZED",
    401,
  );
  const definition = resolveGame(room.gameType);
  return {
    code: room.code,
    gameType: room.gameType,
    status: room.status,
    lobbyStartsAt: room.lobbyStartsAt ?? null,
    hostId: room.hostId,
    stage: room.stage,
    revision: room.revision,
    round: room.round,
    selfId: playerId,
    players: room.players.map(
      (
        {
          id,
          nickname,
          avatarUrl,
          profileSource,
          ready,
          online,
          departed,
          seat,
        },
        index,
      ) => ({
        id,
        nickname,
        avatarUrl: avatarUrl ?? null,
        profileSource: profileSource ?? "guest",
        ready,
        online,
        departed: !!departed,
        seat: seat ?? index,
      }),
    ),
    limits: {
      minPlayers: definition.minPlayers,
      maxPlayers: definition.maxPlayers,
    },
    gameConfig: room.gameConfig ?? definition.normalizeConfig?.() ?? null,
    messages: room.messages ?? [],
    game: room.gameState
      ? definition.view(room.gameState, participants(room), playerId)
      : null,
    expiresAt: room.lastActivityAt + ROOM_TTL,
    serverNow: Date.now(),
  };
}
