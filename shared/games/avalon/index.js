export const GOOD_COUNTS = { 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6 };
export const QUEST_TEAMS = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};
export const SPECIAL_ROLES = [
  "percival",
  "morgana",
  "mordred",
  "oberon",
  "cleric",
  "lunatic",
  "brute",
  "revealer",
  "good_lancelot",
  "evil_lancelot",
  "untrustworthy_servant",
  "trickster",
];
export const BASE_ROLES = ["merlin", "servant", "assassin", "minion"];
export const ROLES = [...BASE_ROLES, ...SPECIAL_ROLES];
export const DEFAULT_SPECIAL_ROLES = ["percival", "morgana"];
export const LANCELOTS = ["good_lancelot", "evil_lancelot"];
export const LANCELOT_MODES = ["fixed", "switching"];
export const ROLE_COLLECTIONS = [
  { id: "original", roles: ["percival", "morgana", "mordred", "oberon"] },
  { id: "lancelot", roles: LANCELOTS },
  {
    id: "bigBox",
    roles: ["cleric", "lunatic", "brute", "revealer", "untrustworthy_servant", "trickster"],
  },
];
export const isEvil = (role) =>
  [
    "assassin",
    "minion",
    "morgana",
    "mordred",
    "oberon",
    "lunatic",
    "brute",
    "revealer",
    "evil_lancelot",
    "trickster",
  ].includes(role);
export const canLieAboutLoyalty = (role) => role === "trickster";
export function ladyTargetIds(players, lady) {
  if (!lady || lady.targetId) return [];
  return players
    .filter(
      (player) =>
        player.id !== lady.holderId && !lady.usedBy.includes(player.id),
    )
    .map((player) => player.id);
}
export function roleAlignment(role, switched = false) {
  return isEvil(role) !== (switched && LANCELOTS.includes(role))
    ? "evil"
    : "good";
}
export const selfAlignment = (self) =>
  self?.alignment ?? roleAlignment(self?.role);
export const roleHintKey = (role, mode = "fixed", recruited = false) =>
  role === "untrustworthy_servant" && recruited
    ? "avalon.untrustworthy.recruitedHint"
    : mode === "switching" && LANCELOTS.includes(role)
      ? `avalon.lancelot.roleHints.${role}`
      : `avalon.roleHints.${role}`;
export function roleDependenciesValid(roles) {
  return (
    LANCELOTS.every((role) => roles.includes(role)) ||
    LANCELOTS.every((role) => !roles.includes(role))
  );
}
export function questChoices(
  role,
  questIndex,
  alignment = roleAlignment(role),
) {
  if (role === "untrustworthy_servant") return [true];
  if (role === "lunatic") return [false];
  if (alignment !== "evil" || (role === "brute" && questIndex >= 3))
    return [true];
  return [true, false];
}
export function roleRoster(count, specialRoles) {
  const good = ["merlin", ...specialRoles.filter((role) => !isEvil(role))];
  const evil = ["assassin", ...specialRoles.filter(isEvil)];
  const goodSlots = GOOD_COUNTS[count] ?? 0;
  const evilSlots = count - goodSlots;
  return {
    valid:
      Object.hasOwn(GOOD_COUNTS, count) &&
      roleDependenciesValid(specialRoles) &&
      good.length <= goodSlots &&
      evil.length <= evilSlots,
    goodSlots,
    evilSlots,
    roles: [
      ...good,
      ...Array(Math.max(0, goodSlots - good.length)).fill("servant"),
      ...evil,
      ...Array(Math.max(0, evilSlots - evil.length)).fill("minion"),
    ],
  };
}
