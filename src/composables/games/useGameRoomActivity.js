import { useLocale } from "@/i18n";
import { useToast } from "@/composables/useToast";

const feedback = {
  joined: { type: "success", icon: "ri-user-add-line" },
  left: { type: "info", icon: "ri-user-unfollow-line" },
  offline: { type: "warning", icon: "ri-wifi-off-line" },
  online: { type: "success", icon: "ri-wifi-line" },
  selfOnline: { type: "success", icon: "ri-wifi-line" },
  ready: { type: "success", icon: "ri-checkbox-circle-line" },
  unready: { type: "info", icon: "ri-time-line" },
  host: { type: "info", icon: "ri-vip-crown-line" },
  seat: { type: "info", icon: "ri-exchange-line" },
};

function snapshot(room) {
  return {
    code: room.code,
    round: room.round,
    stage: room.stage,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map(({ id, nickname, online, departed, ready, seat }) => ({
      id, nickname, online, departed, ready, seat,
    })),
  };
}

export function useGameRoomActivity(onSound) {
  const { t } = useLocale();
  const toast = useToast({ position: "center-top", duration: 2800, closable: false, soft: true });
  let previous = null;
  let previousRoom = null;
  let previousConnection = null;
  let skipNextSnapshot = false;
  let pendingSelfRecovery = false;
  const pendingJoins = new Set();

  function announce(kind, params = {}) {
    const { type, icon } = feedback[kind];
    toast[type](t(`games.roomActivity.${kind}`, params), { icon });
  }

  function activities(before, current) {
    const changes = [];
    const oldPlayers = new Map(before.players.map((player) => [player.id, player]));
    const newPlayers = new Map(current.players.map((player) => [player.id, player]));
    for (const player of before.players) {
      if (newPlayers.has(player.id)) continue;
      pendingJoins.delete(player.id);
      changes.push(["left", { name: player.nickname }]);
    }
    for (const player of current.players) {
      const old = oldPlayers.get(player.id);
      if (!old) {
        if (!player.online) pendingJoins.add(player.id);
        changes.push(["joined", { name: player.nickname }]);
        continue;
      }
      if (old.online !== player.online) {
        if (!(player.online && pendingJoins.delete(player.id))) {
          changes.push([
            player.online ? "online" : player.departed ? "left" : "offline",
            { name: player.nickname },
          ]);
        }
      }
      if (before.round !== current.round) continue;
      if (before.status === "lobby" && current.status === "lobby") {
        if (before.stage === current.stage && old.ready !== player.ready)
          changes.push([player.ready ? "ready" : "unready", { name: player.nickname }]);
        if (old.seat !== player.seat)
          changes.push(["seat", { name: player.nickname, n: player.seat + 1 }]);
      }
    }
    if (before.hostId !== current.hostId) {
      const host = newPlayers.get(current.hostId);
      if (host) changes.push(["host", { name: host.nickname }]);
    }
    return changes;
  }

  function observe(room, connection) {
    if (connection !== previousConnection) {
      if (connection === "online" && previousConnection && previousConnection !== "online") {
        skipNextSnapshot = true;
        pendingSelfRecovery = !!previous && room?.code === previous.code;
      } else if (connection !== "online") {
        pendingSelfRecovery = false;
      }
      previousConnection = connection;
    }
    if (!room) {
      previous = null;
      previousRoom = null;
      pendingJoins.clear();
      return;
    }
    const changedRoom = room !== previousRoom;
    previousRoom = room;
    const current = snapshot(room);
    const sameRoom = previous?.code === current.code;
    if (!sameRoom || (skipNextSnapshot && changedRoom)) {
      const recovered = pendingSelfRecovery && sameRoom && changedRoom;
      previous = current;
      skipNextSnapshot = false;
      pendingSelfRecovery = false;
      pendingJoins.clear();
      if (recovered) {
        announce("selfOnline");
        onSound?.("selfOnline");
      }
      return;
    }
    const changes = changedRoom ? activities(previous, current) : [];
    previous = current;
    changes.forEach(([kind, params]) => announce(kind, params));
    if (changes.length) onSound?.(changes[0][0]);
  }

  return { observe };
}
