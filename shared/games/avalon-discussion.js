export const SLOW_SECONDS_PER_PLAYER = 30;
export const FAST_INVITE_SECONDS = 15;
export const FAST_DIALOGUE_SECONDS = 60;
export function canDiscuss(state, playerId) {
  if (state.phase !== 'discussion') return state.phase !== 'night';
  const discussion = state.discussion;
  return discussion?.mode === 'slow' || (discussion?.mode === 'fast' && !!discussion.partnerId &&
    [state.leaderId ?? state.participants[state.leaderIndex]?.id, discussion.partnerId].includes(playerId));
}
