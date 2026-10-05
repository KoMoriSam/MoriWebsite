// Pure snapshot/cue selection, shared by the room and its checks.
export function audioSnapshot(room) {
  const game = room.game;
  const votes = game?.history?.filter((entry) => entry.type === "vote") ?? [];
  const quests = game?.quests ?? [];
  return {
    code: room.code,
    round: room.round,
    status: room.status,
    phase: game?.phase ?? null,
    era: game?.era,
    stage: room.stage,
    actor: game?.actorId,
    self: room.selfId,
    voteCount: votes.length,
    approved: votes.at(-1)?.approved,
    questCount: quests.length,
    questSuccess: quests.at(-1)?.success,
    lancelotSwitches: game?.history?.filter((entry) => entry.type === "lancelot_draw" && entry.switched).length ?? 0,
    winner: game?.result?.winner,
    event: game?.history?.at(-1)?.type,
  };
}

export function audioCue(type, current, previous) {
  if (
    (current.status === "finished" && previous.status !== "finished") ||
    (current.phase === "finished" && previous.phase !== "finished")
  ) {
    return current.winner === "good"
      ? "good"
      : current.winner === "evil"
        ? "evil"
        : "ended";
  }
  if (current.round !== previous.round || (current.phase && !previous.phase)) {
    return type === "avalon" ? "night" : "discussion";
  }
  if (type === "fogport") {
    if (current.era !== previous.era) return "questSuccess";
    if (current.phase === "liquidation" && previous.phase !== "liquidation")
      return "rejected";
    if (current.actor !== previous.actor && current.actor === current.self)
      return "team";
    if (current.stage !== previous.stage && current.phase === "turn") {
      return current.event === "sell" ? "approved" : "quest";
    }
    return null;
  }
  if (type === "avalon") {
    if (current.lancelotSwitches > (previous.lancelotSwitches ?? 0))
      return "lancelotSwitch";
    if (current.phase === "assassinate" && previous.phase !== "assassinate")
      return "assassinate";
    if (
      current.phase === "evil_discussion" &&
      previous.phase !== "evil_discussion"
    )
      return "evilDiscussion";
    if (current.questCount > previous.questCount)
      return current.questSuccess ? "questSuccess" : "questFailure";
    if (current.voteCount > previous.voteCount)
      return current.approved ? "approved" : "rejected";
    if (current.phase !== previous.phase)
      return (
        {
          night: "night",
          discussion: "discussion",
          team: "team",
          vote: "vote",
          quest: "quest",
        }[current.phase] ?? null
      );
  }
  return null;
}
