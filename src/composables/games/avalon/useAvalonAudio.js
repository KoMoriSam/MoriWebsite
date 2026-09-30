import { onBeforeUnmount, onMounted, ref } from "vue";

const STORAGE_KEY = "avalon:audio-enabled";
const notes = {
  night: [[392, 0, 0.2, "sine"], [294, 0.24, 0.32, "sine"]],
  discussion: [[523, 0, 0.13, "sine"], [659, 0.16, 0.2, "sine"]],
  team: [[440, 0, 0.09, "triangle"], [523, 0.13, 0.09, "triangle"], [659, 0.26, 0.16, "triangle"]],
  vote: [[698, 0, 0.09, "triangle"], [698, 0.16, 0.13, "triangle"]],
  approved: [[523, 0, 0.12, "sine"], [784, 0.16, 0.25, "sine"]],
  rejected: [[440, 0, 0.15, "triangle"], [330, 0.2, 0.27, "triangle"]],
  quest: [[392, 0, 0.12, "sine"], [587, 0.17, 0.24, "sine"]],
  questSuccess: [[523, 0, 0.13, "sine"], [659, 0.17, 0.13, "sine"], [784, 0.34, 0.27, "sine"]],
  questFailure: [[392, 0, 0.17, "triangle"], [311, 0.22, 0.18, "triangle"], [262, 0.44, 0.3, "triangle"]],
  evilDiscussion: [[587, 0, 0.12, "triangle"], [440, 0.19, 0.16, "triangle"], [370, 0.42, 0.24, "triangle"]],
  assassinate: [[494, 0, 0.12, "triangle"], [370, 0.17, 0.14, "triangle"], [294, 0.36, 0.3, "triangle"]],
  good: [[523, 0, 0.12, "sine"], [659, 0.15, 0.12, "sine"], [784, 0.3, 0.32, "sine"]],
  evil: [[392, 0, 0.16, "triangle"], [311, 0.21, 0.16, "triangle"], [262, 0.42, 0.34, "triangle"]],
  ended: [[440, 0, 0.15, "sine"], [349, 0.2, 0.25, "sine"]],
  playerJoin: [[659, 0, 0.09, "sine"], [880, 0.14, 0.16, "sine"]],
  playerLeave: [[523, 0, 0.12, "triangle"], [392, 0.17, 0.18, "triangle"]],
  playerOffline: [[440, 0, 0.08, "triangle"], [330, 0.15, 0.12, "triangle"]],
  playerOnline: [[392, 0, 0.09, "sine"], [587, 0.14, 0.19, "sine"]],
  playerReady: [[784, 0, 0.08, "sine"], [988, 0.12, 0.12, "sine"]],
  playerUnready: [[587, 0, 0.1, "triangle"], [440, 0.15, 0.13, "triangle"]],
  playerHost: [[523, 0, 0.1, "triangle"], [659, 0.14, 0.1, "triangle"], [784, 0.28, 0.17, "triangle"]],
  playerSeat: [[392, 0, 0.08, "sine"], [523, 0.12, 0.1, "sine"]],
};
const phaseNotes = {
  night: "night",
  discussion: "discussion",
  team: "team",
  vote: "vote",
  quest: "quest",
  evil_discussion: "evilDiscussion",
  assassinate: "assassinate",
};
const activityNotes = {
  joined: "playerJoin",
  left: "playerLeave",
  offline: "playerOffline",
  online: "playerOnline",
  selfOnline: "playerOnline",
  ready: "playerReady",
  unready: "playerUnready",
  host: "playerHost",
  seat: "playerSeat",
};

function storedEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function snapshot(room) {
  const game = room.game;
  const votes = game?.history?.filter((entry) => entry.type === "vote") ?? [];
  const quests = game?.quests ?? [];
  return {
    code: room.code,
    round: room.round,
    phase: game?.phase ?? null,
    voteCount: votes.length,
    approved: votes.at(-1)?.approved,
    questCount: quests.length,
    questSuccess: quests.at(-1)?.success,
    winner: game?.result?.winner,
  };
}

export function useAvalonAudio() {
  const enabled = ref(storedEnabled());
  let context = null;
  let previous = null;
  let previousRoom = null;
  let previousConnection = null;
  let skipNextSnapshot = false;

  function unlock() {
    if (!enabled.value) return;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        context = new AudioContext();
      } catch {
        return;
      }
    }
    if (context.state === "suspended") void context.resume().catch(() => {});
  }

  function play(cue) {
    if (!enabled.value || document.hidden || context?.state !== "running") return;
    const melody = notes[cue];
    if (!melody) return;
    const start = context.currentTime + 0.02;
    for (const [frequency, offset, duration, type] of melody) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + offset;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.035, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
    }
  }

  function observe(room, connection) {
    if (connection !== previousConnection) {
      if (connection === "online" && previousConnection && previousConnection !== "online") {
        skipNextSnapshot = true;
      }
      previousConnection = connection;
    }
    if (!room) {
      previous = null;
      previousRoom = null;
      return;
    }
    const changedRoom = room !== previousRoom;
    previousRoom = room;
    const current = snapshot(room);
    if (!previous || current.code !== previous.code || (skipNextSnapshot && changedRoom)) {
      previous = current;
      skipNextSnapshot = false;
      return;
    }
    let cue = null;
    if (current.round !== previous.round) {
      if (current.phase === "night") cue = "night";
    } else if (current.phase === "finished" && previous.phase !== "finished") {
      cue = current.winner === "good" ? "good" : current.winner === "evil" ? "evil" : "ended";
    } else if (current.phase === "assassinate" && previous.phase !== "assassinate") {
      cue = "assassinate";
    } else if (current.phase === "evil_discussion" && previous.phase !== "evil_discussion") {
      cue = "evilDiscussion";
    } else if (current.questCount > previous.questCount) {
      cue = current.questSuccess ? "questSuccess" : "questFailure";
    } else if (current.voteCount > previous.voteCount) {
      cue = current.approved ? "approved" : "rejected";
    } else if (current.phase !== previous.phase) {
      cue = phaseNotes[current.phase] ?? null;
    }
    previous = current;
    if (cue) play(cue);
  }

  function playActivity(kind) {
    play(activityNotes[kind]);
  }

  function toggle() {
    enabled.value = !enabled.value;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled.value));
    } catch {}
    if (enabled.value) unlock();
  }

  onMounted(() => {
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (context) void context.close().catch(() => {});
  });

  return { enabled, observe, toggle, playActivity };
}
