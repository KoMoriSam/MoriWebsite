// IDs and parameter schemas are shared by the composer and the authoritative adapter.
export const PHRASE_GROUPS = [
  { id: 'accuse', icon: 'ri-spy-line', phrases: [
    { id: 'suspicious', player: true }, { id: 'likely_evil', player: true },
    { id: 'contradiction', player: true }, { id: 'vote_pattern', player: true },
    { id: 'linked', player: true }, { id: 'avoid', player: true },
  ] },
  { id: 'defend', icon: 'ri-shield-line', phrases: [
    { id: 'am_good' }, { id: 'deny_accusation' }, { id: 'explain_me' },
    { id: 'no_proof' }, { id: 'alternative' }, { id: 'vouch', player: true },
  ] },
  { id: 'info', icon: 'ri-information-line', phrases: [
    { id: 'trust', player: true }, { id: 'doubt', player: true },
    { id: 'cleared', player: true }, { id: 'request_reason', player: true },
    { id: 'need_evidence' }, { id: 'withhold' }, { id: 'revise', player: true },
  ] },
  { id: 'identity', icon: 'ri-id-card-line', phrases: [
    { id: 'claim', role: true }, { id: 'counterclaim', player: true, role: true },
    { id: 'ask_role', player: true }, { id: 'protect_merlin' },
    { id: 'dont_expose' }, { id: 'claim_unproven' },
  ] },
  { id: 'team', icon: 'ri-group-line', phrases: [
    { id: 'take_me' }, { id: 'include', player: true }, { id: 'exclude', player: true },
    { id: 'replace', player: true }, { id: 'keep_team' }, { id: 'change_team' },
    { id: 'split_suspects' }, { id: 'ask_captain' },
  ] },
  { id: 'vote', icon: 'ri-checkbox-circle-line', phrases: [
    { id: 'support' }, { id: 'oppose' }, { id: 'explain_vote', player: true },
    { id: 'dont_rush' }, { id: 'rejection_risk' }, { id: 'vote_is_not_proof' },
  ] },
  { id: 'quest', icon: 'ri-flag-line', phrases: [
    { id: 'quest_clean', quest: true }, { id: 'quest_failed', quest: true },
    { id: 'quest_suspect', player: true, quest: true }, { id: 'quest_review', quest: true },
    { id: 'success_not_clear' }, { id: 'two_fails' }, { id: 'compare_votes' },
  ] },
  { id: 'strategy', icon: 'ri-compass-3-line', phrases: [
    { id: 'test_team' }, { id: 'stable_team' }, { id: 'need_info' },
    { id: 'decide' }, { id: 'last_chance' }, { id: 'assassin_thinking' },
  ] },
  { id: 'social', icon: 'ri-chat-3-line', phrases: [
    { id: 'agree', player: true }, { id: 'disagree', player: true },
    { id: 'pause' }, { id: 'reconnect_wait' }, { id: 'review_player', player: true },
    { id: 'well_played' },
  ] },
];
export const QUICK_PHRASES = PHRASE_GROUPS.flatMap(group => group.phrases);
export const findPhrase = id => QUICK_PHRASES.find(phrase => phrase.id === id);
