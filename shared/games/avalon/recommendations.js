import { SPECIAL_ROLES, roleRoster } from './index.js';

// These are configuration references, not eligibility restrictions.
export const ROLE_RECOMMENDATIONS = {
  5: { recommended: ['percival', 'morgana'], discouraged: ['oberon', 'cleric', 'lunatic', 'brute', 'revealer', 'good_lancelot', 'evil_lancelot'] },
  6: { recommended: ['percival', 'morgana'], discouraged: ['oberon', 'cleric', 'lunatic', 'brute', 'revealer', 'good_lancelot', 'evil_lancelot'] },
  7: { recommended: ['percival', 'morgana', 'mordred'], discouraged: [] },
  8: { recommended: ['percival', 'cleric', 'morgana', 'mordred'], discouraged: [] },
  9: { recommended: ['percival', 'cleric', 'morgana', 'mordred'], discouraged: [] },
  10: { recommended: ['percival', 'cleric', 'morgana', 'mordred', 'revealer'], discouraged: [] },
};

export function roleRecommendations(count) {
  const reference = ROLE_RECOMMENDATIONS[count] ?? ROLE_RECOMMENDATIONS[5];
  const recommended = roleRoster(count, reference.recommended).valid ? reference.recommended : [];
  return ['recommended', 'optional', 'discouraged'].map(level => ({
    level,
    roles: SPECIAL_ROLES.filter(role =>
      (recommended.includes(role) ? 'recommended' : reference.discouraged.includes(role) ? 'discouraged' : 'optional') === level),
  })).filter(group => group.roles.length);
}
