import {
  ROLES,
  isEvil,
  LANCELOTS,
  roleAlignment,
  roleRoster,
  DEFAULT_SPECIAL_ROLES,
  canLieAboutLoyalty,
} from "./index.js";

// Each complete night signal supplies both positive and negative evidence.
// These descriptors are shared by the server's disclosure and the client's deductions.
export function nightSignals(role, mode = "fixed") {
  const signals = [];
  if (role === "merlin")
    signals.push({
      channel: "knownEvil",
      roles: ROLES.filter(
        (value) =>
          (isEvil(value) && value !== "mordred") ||
          value === "untrustworthy_servant",
      ),
    });
  if (role === "percival")
    signals.push({ channel: "knownCandidates", roles: ["merlin", "morgana"] });
  if (
    isEvil(role) &&
    role !== "oberon" &&
    !(role === "evil_lancelot" && mode === "switching")
  ) {
    signals.push({
      channel: "knownEvil",
      roles: ROLES.filter((value) => isEvil(value) && value !== "oberon"),
    });
  }
  if (LANCELOTS.includes(role) && mode === "fixed")
    signals.push({
      channel: "knownRoles",
      roles: LANCELOTS.filter((value) => value !== role),
      exact: true,
    });
  if (role === "untrustworthy_servant")
    signals.push({ channel: "knownRoles", roles: ["assassin"], exact: true });
  return signals;
}

export function nightInformation(
  roles,
  observerId,
  openingLeaderId,
  mode = "fixed",
) {
  const selfRole = roles[observerId];
  const information = {
    knownEvil: [],
    knownCandidates: [],
    knownRoles: {},
    knownLoyalties: {},
  };
  for (const signal of nightSignals(selfRole, mode)) {
    const matches = Object.entries(roles).filter(
      ([id, role]) =>
        signal.roles.includes(role) && (!signal.exact || id !== observerId),
    );
    information[signal.channel] = signal.exact
      ? Object.fromEntries(matches)
      : matches.map(([id]) => id);
  }
  if (selfRole === "cleric")
    information.knownLoyalties[openingLeaderId] = roleAlignment(
      roles[openingLeaderId],
    );
  return information;
}

export const gameView = (room) =>
  room.game && typeof room.game === "object" ? room.game : room;
// A private swap cannot be inferred from the original character card.
export function alignmentOptions(
  room,
  role,
  quest = gameView(room).questIndex ?? 0,
) {
  const game = gameView(room);
  if (role === "untrustworthy_servant" && game.recruitedId) return ["evil"];
  if (
    LANCELOTS.includes(role) &&
    game.lancelotMode === "switching" &&
    quest >= 2
  ) {
    if (LANCELOTS.includes(game.self?.role)) {
      const draws = game.self.lancelotDraws ?? [];
      const parity =
        draws.filter((draw) => draw.quest <= quest && draw.switched).length %
          2 ===
        1;
      return [roleAlignment(role, parity)];
    }
    if (game.phase === "finished" && quest === game.questIndex) {
      const id = Object.keys(game.revealedRoles ?? {}).find(
        (id) => game.revealedRoles[id] === role,
      );
      if (game.revealedAllegiances?.[id]) return [game.revealedAllegiances[id]];
    }
    return ["good", "evil"];
  }
  return [roleAlignment(role)];
}
export function currentAlignment(room, role) {
  const sides = alignmentOptions(room, role);
  return sides.length === 1 ? sides[0] : null;
}

function canAssign(domains, slots, forcedId, forcedRole) {
  const assigned = new Map();
  function place(id, visited) {
    const options = id === forcedId ? [forcedRole] : domains.get(id);
    for (let slot = 0; slot < slots.length; slot++) {
      if (visited.has(slot) || !options.includes(slots[slot])) continue;
      visited.add(slot);
      if (!assigned.has(slot) || place(assigned.get(slot), visited)) {
        assigned.set(slot, id);
        return true;
      }
    }
    return false;
  }
  return [...domains.keys()].every((id) => place(id, new Set()));
}

// Accept only the observer's room view. Never consult server roles or local guesses.
export function playerKnowledge(room) {
  const game = gameView(room);
  const self = game.self ?? room.self ?? {};
  const players = game.participants ?? room.players ?? [];
  const specialRoles = room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES;
  const roster = roleRoster(players.length, specialRoles).roles;
  const available = [...roster];
  if (self.role) {
    const own = available.indexOf(self.role);
    if (own !== -1) available.splice(own, 1);
  }
  const domains = new Map();
  const signals = self.role
    ? nightSignals(self.role, self.lancelotMode ?? game.lancelotMode)
    : [];
  const failedRecruit = game.history?.find(
    (entry) => entry.type === "recruit" && !entry.success,
  )?.targetId;
  for (const player of players) {
    if (player.id === room.selfId) continue;
    const exact =
      game.revealedRoles?.[player.id] ??
      game.publicRoles?.[player.id] ??
      self.knownRoles?.[player.id];
    let candidates = [...new Set(available)];
    for (const signal of signals) {
      const seen = signal.exact
        ? Object.hasOwn(self[signal.channel] ?? {}, player.id)
        : (self[signal.channel] ?? []).includes(player.id);
      candidates = candidates.filter(
        (role) => signal.roles.includes(role) === seen,
      );
    }
    const initial = self.knownLoyalties?.[player.id];
    if (initial)
      candidates = candidates.filter(
        (role) => roleAlignment(role) === initial || canLieAboutLoyalty(role),
      );
    for (const observation of self.loyaltyObservations ?? []) {
      if (observation.targetId !== player.id) continue;
      candidates = candidates.filter(
        (role) =>
          canLieAboutLoyalty(role) ||
          (observation.source === "cleric" || role === "untrustworthy_servant"
            ? [roleAlignment(role)]
            : alignmentOptions(room, role, observation.quest)
          ).includes(observation.alignment),
      );
    }
    if (failedRecruit === player.id)
      candidates = candidates.filter(
        (role) => role !== "untrustworthy_servant",
      );
    if (exact) candidates = candidates.filter((role) => role === exact);
    domains.set(player.id, candidates);
  }
  // Enforce known role quantities jointly, rather than treating each player in isolation.
  const feasible = self.role && canAssign(domains, available);
  return Object.fromEntries(
    [...domains].map(([id, candidates]) => {
      const roles = feasible
        ? candidates.filter((role) => canAssign(domains, available, id, role))
        : candidates;
      const sides = new Set(
        roles.flatMap((role) => alignmentOptions(room, role)),
      );
      const latest = self.loyaltyObservations
        ?.filter((item) => item.targetId === id)
        .at(-1);
      if (
        latest?.source === "lady" &&
        game.recruitedId !== id &&
        !(
          game.lancelotMode === "switching" &&
          game.questIndex >= 2 &&
          game.questIndex > latest.quest
        )
      ) {
        sides.clear();
        for (const role of roles)
          for (const side of canLieAboutLoyalty(role)
            ? ["evil"]
            : [latest.alignment])
            sides.add(side);
      }
      const openingSides = new Set(roles.map((role) => roleAlignment(role)));
      return [
        id,
        {
          roles,
          current: sides.size === 1 ? [...sides][0] : null,
          initial:
            self.knownLoyalties?.[id] && openingSides.size === 1
              ? [...openingSides][0]
              : null,
          reported: latest?.alignment ?? self.knownLoyalties?.[id] ?? null,
        },
      ];
    }),
  );
}
