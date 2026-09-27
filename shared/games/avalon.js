export const GOOD_COUNTS = { 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6 };
export const SPECIAL_ROLES = ['percival', 'morgana', 'mordred', 'oberon'];
export const DEFAULT_SPECIAL_ROLES = ['percival', 'morgana'];
export const isEvil = role => ['assassin', 'minion', 'morgana', 'mordred', 'oberon'].includes(role);
export function roleRoster(count, specialRoles) {
  const good = ['merlin', ...specialRoles.filter(role => !isEvil(role))];
  const evil = ['assassin', ...specialRoles.filter(isEvil)];
  const goodSlots = GOOD_COUNTS[count] ?? 0;
  const evilSlots = count - goodSlots;
  return {
    valid: Object.hasOwn(GOOD_COUNTS, count) && good.length <= goodSlots && evil.length <= evilSlots,
    goodSlots, evilSlots,
    roles: [...good, ...Array(Math.max(0, goodSlots - good.length)).fill('servant'), ...evil, ...Array(Math.max(0, evilSlots - evil.length)).fill('minion')],
  };
}
