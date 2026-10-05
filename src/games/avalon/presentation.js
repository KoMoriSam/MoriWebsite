import {
  selfAlignment,
  DEFAULT_SPECIAL_ROLES,
  LANCELOTS,
  canLieAboutLoyalty,
} from "../../../shared/games/avalon/index.js";
import {
  gameView,
  currentAlignment,
  playerKnowledge,
} from "../../../shared/games/avalon/knowledge.js";

export const ROLE_ICONS = {
  merlin: "ri-magic-line",
  assassin: "ri-sword-line",
  servant: "ri-shield-star-line",
  minion: "ri-skull-line",
  percival: "ri-eye-line",
  morgana: "ri-magic-line",
  mordred: "ri-shield-keyhole-line",
  oberon: "ri-user-unfollow-line",
  cleric: "ri-cross-line",
  lunatic: "ri-emotion-unhappy-line",
  brute: "ri-hammer-line",
  revealer: "ri-eye-2-line",
  good_lancelot: "ri-shield-line",
  evil_lancelot: "ri-sword-line",
  untrustworthy_servant: "ri-user-shared-line",
  trickster: "ri-emotion-line",
};

export const roleImage = (role) => `/assets/images/games/avalon/${role}.webp`;
export const SKILL_CARDS = {
  lady: {
    image: "/assets/images/games/avalon/lady.webp",
    title: "avalon.lady.title",
    hint: "avalon.lady.cardHint",
  },
};
export const currentRoleAlignment = currentAlignment;
export function loyaltyWarningKeys(config = {}, source = "lady") {
  const roles = config.specialRoles ?? DEFAULT_SPECIAL_ROLES;
  const alignmentCanChange =
    roles.includes("untrustworthy_servant") ||
    (config.lancelotMode === "switching" &&
      LANCELOTS.every((role) => roles.includes(role)));
  return [
    ...(roles.some(canLieAboutLoyalty) ? ["avalon.loyalty.lieWarning"] : []),
    ...(alignmentCanChange
      ? [
          source === "cleric"
            ? "avalon.loyalty.openingWarning"
            : "avalon.loyalty.changeWarning",
        ]
      : []),
  ];
}
export function playerAlignment(room, id) {
  const game = gameView(room);
  if (id === room.selfId) return selfAlignment(game.self);
  if (game.revealedAllegiances?.[id]) return game.revealedAllegiances[id];
  return playerKnowledge(room)[id]?.current ?? null;
}

export function possibleRoles(room, id) {
  if (id === room.selfId || (room.phase ?? gameView(room).phase) === "finished")
    return [];
  return playerKnowledge(room)[id]?.roles ?? [];
}

export function knownPlayer(room, player, faceUp = false) {
  const game = gameView(room);
  const self = game.self;
  const phase = room.phase ?? game.phase;
  if (phase !== "finished" && !faceUp && !game.publicRoles?.[player.id])
    return null;
  const candidates = possibleRoles(room, player.id);
  const role =
    phase === "finished"
      ? (game.revealedRoles?.[player.id] ?? player.role)
      : (game.publicRoles?.[player.id] ??
        (player.id === room.selfId
          ? self.role
          : candidates.length === 1
            ? candidates[0]
            : null));
  if (role)
    return {
      label: `avalon.roles.${role}`,
      icon: ROLE_ICONS[role],
      tone:
        playerAlignment(room, player.id) ??
        currentRoleAlignment(room, role) ??
        "candidate",
    };
  if (player.id === room.selfId) return null;
  const knowledge = playerKnowledge(room)[player.id];
  if (knowledge?.reported && !knowledge.initial && !knowledge.current)
    return {
      label:
        knowledge.reported === "good"
          ? "avalon.loyalty.reportedGood"
          : "avalon.loyalty.reportedEvil",
      icon: "ri-eye-line",
      tone: "candidate",
    };
  if (knowledge?.initial) {
    if (!knowledge.current)
      return {
        label: `avalon.knowledge.opening${knowledge.initial === "good" ? "Good" : "Evil"}`,
        icon: "ri-eye-line",
        tone: "candidate",
      };
    return {
      label: `avalon.knowledge.${knowledge.current}`,
      icon: knowledge.current === "evil" ? "ri-skull-line" : "ri-shield-line",
      tone: knowledge.current,
    };
  }
  if (self.knownCandidates?.includes(player.id))
    return {
      label: "avalon.knowledge.candidate",
      icon: "ri-eye-line",
      tone: "candidate",
    };
  if (self.knownEvil?.includes(player.id))
    return {
      label:
        knowledge?.current === "evil"
          ? self.role === "merlin"
            ? "avalon.knowledge.evil"
            : "avalon.knowledge.ally"
          : self.role === "merlin" &&
              candidates.includes("untrustworthy_servant")
            ? "avalon.knowledge.merlinSignal"
            : "avalon.knowledge.nightEvil",
      icon: knowledge?.current === "evil" ? "ri-skull-line" : "ri-eye-line",
      tone: knowledge?.current ?? "candidate",
    };
  if (knowledge?.current)
    return {
      label: `avalon.knowledge.${knowledge.current}`,
      icon: knowledge.current === "evil" ? "ri-skull-line" : "ri-shield-line",
      tone: knowledge.current,
    };
  return null;
}
