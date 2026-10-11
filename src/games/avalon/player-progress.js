const PHASES = {
  opening: { field: "openingCount", labelKey: "avalon.opening.progress", icon: "ri-check-line" },
  night: { field: "nightCount", labelKey: "avalon.night.progress", icon: "ri-moon-clear-line" },
  vote: { field: "voteCount", labelKey: "avalon.voteProgress", icon: "ri-hand-coin-line" },
  quest: { field: "questCount", labelKey: "avalon.questProgress", icon: "ri-sword-line" },
};

export function getPlayerProgress(room) {
  const game = room?.game;
  const phase = PHASES[game?.phase];
  if (!phase) return null;
  const playerIds = game.phase === "quest" ? game.team ?? [] : null;
  return {
    count: game[phase.field] ?? 0,
    total: playerIds?.length ?? game.participants?.length ?? room.players.length,
    playerIds,
    submissions: game.submissionStatus ?? null,
    textKey: `avalon.progressLabels.${game.phase}`,
    labelKey: phase.labelKey,
    icon: phase.icon,
  };
}
