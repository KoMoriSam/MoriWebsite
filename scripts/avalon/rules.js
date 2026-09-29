import { ensure, GameError, randomInt } from '../games/utils.js';
import { SPECIAL_ROLES, DEFAULT_SPECIAL_ROLES, QUEST_TEAMS, isEvil, roleRoster } from '../../shared/games/avalon.js';
import { findPhrase } from '../../shared/games/avalon-phrases.js';
import { canDiscuss, SLOW_SECONDS_PER_PLAYER, FAST_INVITE_SECONDS, FAST_DIALOGUE_SECONDS, ASSASSINATION_DISCUSSION_SECONDS } from '../../shared/games/avalon-discussion.js';
export { GOOD_COUNTS, SPECIAL_ROLES, isEvil } from '../../shared/games/avalon.js';
export { QUEST_TEAMS } from '../../shared/games/avalon.js';
export function normalizeConfig(config = { specialRoles: DEFAULT_SPECIAL_ROLES }) {
  ensure(config && typeof config === 'object' && !Array.isArray(config) && Object.keys(config).every(key => key === 'specialRoles'), 'ROLE_CONFIG');
  ensure(Array.isArray(config.specialRoles) && config.specialRoles.every(role => SPECIAL_ROLES.includes(role)) && new Set(config.specialRoles).size === config.specialRoles.length, 'ROLE_CONFIG');
  return { specialRoles: SPECIAL_ROLES.filter(role => config.specialRoles.includes(role)) };
}
export function roleList(count, config) {
  const { specialRoles } = normalizeConfig(config);
  const roster = roleRoster(count, specialRoles);
  ensure(roster.valid, 'ROLE_CAPACITY');
  return roster.roles;
}
function finish(state, winner, reason, targetId = null) {
  state.phase = 'finished'; state.result = { winner, reason, targetId };
}
function record(state, entry, now = Date.now()) {
  state.history.push({ quest: state.questIndex, at: now, ...entry });
}
function startDiscussion(state, now) {
  const index = state.discussionCount ?? 0;
  const mode = index % 2 === 0 ? 'slow' : 'fast';
  const seconds = mode === 'slow' ? state.participants.length * SLOW_SECONDS_PER_PLAYER : FAST_INVITE_SECONDS;
  state.phase = 'discussion'; state.discussionCount = index + 1;
  state.discussion = { mode, startedAt: now, endsAt: now + seconds * 1000, partnerId: null };
}
function startAssassinationDiscussion(state, now) {
  state.phase = 'evil_discussion';
  state.discussion = { mode: 'evil', startedAt: now, endsAt: now + ASSASSINATION_DISCUSSION_SECONDS * 1000, partnerId: null };
  record(state, { type: 'begin_evil_discussion' }, now);
}
function beginAssassination(state, now) {
  state.phase = 'assassinate';
  record(state, { type: 'begin_assassinate' }, now);
}
function invitePartner(state, partnerId, now) {
  state.discussion = { ...state.discussion, partnerId, startedAt: now, endsAt: now + FAST_DIALOGUE_SECONDS * 1000 };
  record(state, { type: 'dialogue', leaderId: state.participants[state.leaderIndex].id, targetId: partnerId }, now);
}
function tick(source, _players, now = Date.now()) {
  if (!['discussion', 'evil_discussion'].includes(source.phase)) return null;
  if (source.discussion && now < source.discussion.endsAt) return null;
  const state = structuredClone(source);
  if (state.phase === 'evil_discussion') beginAssassination(state, state.discussion?.endsAt ?? now);
  else if (!state.discussion) startDiscussion(state, now);
  else if (state.discussion.mode === 'fast' && !state.discussion.partnerId) {
    invitePartner(state, state.participants[(state.leaderIndex + 1) % state.participants.length].id, state.discussion.endsAt);
    if (now >= state.discussion.endsAt) {
      state.phase = 'team'; record(state, { type: 'begin_team', leaderId: state.participants[state.leaderIndex].id }, state.discussion.endsAt);
    }
  } else {
    state.phase = 'team'; record(state, { type: 'begin_team', leaderId: state.participants[state.leaderIndex].id }, state.discussion.endsAt);
  }
  return { state, stageChanged: true, finished: false };
}
function nextLeader(state) { state.leaderIndex = (state.leaderIndex + 1) % state.participants.length; }
function create(players, rng = randomInt, config) {
  const count = players.length;
  const roles = roleList(count, config);
  for (let i = roles.length - 1; i > 0; i--) {
    const j = rng(i + 1); [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return {
    phase: 'night', participants: players, roles: Object.fromEntries(players.map((p, i) => [p.id, roles[i]])),
    roleRevealed: {}, nightConfirmed: {},
    questIndex: 0, leaderIndex: rng(count), team: [], ballots: {}, questCards: {},
    quests: [], rejected: 0, history: [], result: null, discussionCount: 0, discussion: null,
  };
}
function apply(source, players, playerId, action, now = Date.now()) {
  const state = structuredClone(source); const count = state.participants.length;
  const phase = state.phase; const questIndex = state.questIndex;
  switch (action.type) {
    case 'peek_role':
      ensure(state.phase === 'night', 'PHASE');
      ensure(!Object.hasOwn(state.roleRevealed, playerId), 'ALREADY_SUBMITTED', 409);
      state.roleRevealed[playerId] = true; break;
    case 'confirm_role':
      ensure(state.phase === 'night' && Object.hasOwn(state.roleRevealed, playerId), 'PHASE');
      ensure(!Object.hasOwn(state.nightConfirmed, playerId), 'ALREADY_SUBMITTED', 409);
      state.nightConfirmed[playerId] = true;
      if (Object.keys(state.nightConfirmed).length === count) startDiscussion(state, now);
      break;
    case 'begin_team':
      ensure(state.phase === 'discussion', 'PHASE');
      ensure(state.participants[state.leaderIndex].id === playerId, 'LEADER_ONLY', 403);
      ensure(!state.discussion || now < state.discussion.endsAt, 'DISCUSSION_CLOSED');
      state.phase = 'team';
      record(state, { type: 'begin_team', leaderId: playerId }, now);
      break;
    case 'discussion_partner':
      ensure(state.phase === 'discussion' && state.discussion?.mode === 'fast' && !state.discussion.partnerId, 'PHASE');
      ensure(state.participants[state.leaderIndex].id === playerId, 'LEADER_ONLY', 403);
      ensure(now < state.discussion.endsAt, 'DISCUSSION_CLOSED');
      ensure(action.targetId !== playerId && state.participants.some(player => player.id === action.targetId), 'DIALOGUE_TARGET');
      invitePartner(state, action.targetId, now); break;
    case 'end_assassination_discussion':
      ensure(state.phase === 'evil_discussion', 'PHASE');
      ensure(isEvil(state.roles[playerId]) && state.roles[playerId] !== 'oberon', 'EVIL_ONLY', 403);
      ensure(now < state.discussion.endsAt, 'DISCUSSION_CLOSED');
      beginAssassination(state, now); break;
    case 'team':
      ensure(state.phase === 'team', 'PHASE');
      ensure(state.participants[state.leaderIndex].id === playerId, 'LEADER_ONLY', 403);
      ensure(Array.isArray(action.team) && action.team.length === QUEST_TEAMS[count][state.questIndex] && new Set(action.team).size === action.team.length && action.team.every(id => players.some(p => p.id === id)), 'TEAM');
      state.team = [...action.team]; state.ballots = { [playerId]: true }; state.phase = 'vote';
      record(state, { type: 'team', leaderId: playerId, team: [...state.team] }); break;
    case 'vote': {
      ensure(state.phase === 'vote' && typeof action.approve === 'boolean', 'PHASE');
      ensure(!Object.hasOwn(state.ballots, playerId), 'ALREADY_SUBMITTED', 409);
      state.ballots[playerId] = action.approve;
      if (Object.keys(state.ballots).length === count) {
        const approved = Object.values(state.ballots).filter(Boolean).length > count / 2;
        record(state, { type: 'vote', leaderId: state.participants[state.leaderIndex].id, team: [...state.team], votes: state.participants.map(p => ({ playerId: p.id, approve: state.ballots[p.id] })), approved });
        if (approved) { state.phase = 'quest'; state.questCards = {}; state.rejected = 0; }
        else if (++state.rejected === 5) finish(state, 'evil', 'rejections');
        else { nextLeader(state); startDiscussion(state, now); state.team = []; }
        state.ballots = {};
      }
      break;
    }
    case 'quest': {
      ensure(state.phase === 'quest' && typeof action.success === 'boolean', 'PHASE');
      ensure(state.team.includes(playerId), 'TEAM_ONLY', 403);
      ensure(!Object.hasOwn(state.questCards, playerId), 'ALREADY_SUBMITTED', 409);
      ensure(action.success || isEvil(state.roles[playerId]), 'GOOD_CANNOT_FAIL', 403);
      state.questCards[playerId] = action.success;
      if (Object.keys(state.questCards).length === state.team.length) {
        const failures = Object.values(state.questCards).filter(value => !value).length;
        const threshold = count >= 7 && state.questIndex === 3 ? 2 : 1;
        const result = { type: 'quest', quest: state.questIndex, team: [...state.team], failures, success: failures < threshold };
        state.quests.push(result); record(state, result); state.questCards = {};
        const successes = state.quests.filter(q => q.success).length;
        if (state.quests.length - successes === 3) finish(state, 'evil', 'quests');
        else if (successes === 3) startAssassinationDiscussion(state, now);
        else { state.questIndex++; nextLeader(state); startDiscussion(state, now); state.team = []; }
      }
      break;
    }
    case 'assassinate': {
      ensure(state.phase === 'assassinate', 'PHASE');
      ensure(state.roles[playerId] === 'assassin', 'ASSASSIN_ONLY', 403);
      ensure(Object.hasOwn(state.roles, action.targetId) && action.targetId !== playerId, 'TARGET');
      const merlin = state.roles[action.targetId] === 'merlin';
      finish(state, merlin ? 'evil' : 'good', merlin ? 'merlin' : 'assassination', action.targetId);
      record(state, { type: 'assassinate', playerId, targetId: action.targetId, winner: state.result.winner, reason: state.result.reason });
      break;
    }
    default: throw new GameError('INVALID');
  }
  return { state, stageChanged: action.type === 'discussion_partner' || state.phase !== phase || state.questIndex !== questIndex, finished: state.phase === 'finished' };
}
function view(state, _players, playerId) {
  const role = state.roles[playerId];
  const roleRevealed = state.phase !== 'night' || Object.hasOwn(state.roleRevealed || {}, playerId);
  const knownEvil = !roleRevealed || role === 'oberon' ? [] : state.participants.filter(p => {
    const other = state.roles[p.id];
    return role === 'merlin' ? isEvil(other) && other !== 'mordred' : isEvil(role) && isEvil(other) && other !== 'oberon';
  }).map(p => p.id);
  // Preserve seat order: candidate order must not distinguish Merlin from Morgana.
  const knownCandidates = roleRevealed && role === 'percival' ? state.participants.filter(p => ['merlin', 'morgana'].includes(state.roles[p.id])).map(p => p.id) : [];
  return {
    phase: state.phase, participants: state.participants,
    self: { role: roleRevealed ? role : null, roleRevealed, nightConfirmed: Object.hasOwn(state.nightConfirmed || {}, playerId), knownEvil, knownCandidates, voted: Object.hasOwn(state.ballots, playerId), autoApproved: state.phase === 'vote' && state.participants[state.leaderIndex].id === playerId && state.ballots[playerId] === true, questSubmitted: Object.hasOwn(state.questCards, playerId) },
    nightCount: Object.keys(state.nightConfirmed || {}).length,
    ...(state.phase === 'finished' ? { revealedRoles: state.roles } : {}),
    leaderId: state.phase === 'night' ? null : state.participants[state.leaderIndex]?.id ?? null,
    questIndex: state.questIndex, team: state.team, teamSizes: QUEST_TEAMS[state.participants.length],
    twoFails: state.participants.length >= 7 && state.questIndex === 3,
    voteCount: Object.keys(state.ballots).length, questCount: Object.keys(state.questCards).length,
    quests: state.quests, rejected: state.rejected, history: state.history, result: state.result,
    discussion: ['discussion', 'evil_discussion'].includes(state.phase) ? state.discussion ?? null : null,
  };
}
export const avalon = {
  id: 'avalon', minPlayers: 5, maxPlayers: 10, normalizeConfig, validateConfig: roleList, create, apply, view, tick,
  deadline: state => ['discussion', 'evil_discussion'].includes(state.phase) ? state.discussion?.endsAt ?? null : null,
  phrase(action, state, players, config, playerId, now = Date.now()) {
    ensure(state.phase !== 'night', 'CHAT_PHASE');
    ensure(!['discussion', 'evil_discussion'].includes(state.phase) || (canDiscuss(state, playerId) && now < state.discussion.endsAt), 'DISCUSSION_SPEAKER');
    const phrase = findPhrase(action.phraseId);
    ensure(phrase, 'CHAT_PHRASE');
    const params = {};
    if (phrase.player) {
      const target = players.find(player => player.id === action.targetId);
      ensure(target, 'CHAT_TARGET');
      params.name = target.nickname;
    }
    if (phrase.role) {
      ensure(roleList(state.participants.length, config).includes(action.role), 'CHAT_ROLE');
      params.role = action.role;
    }
    if (phrase.quest) {
      ensure(Number.isInteger(action.quest) && action.quest >= 1 && action.quest <= state.questIndex + 1 && action.quest <= 5, 'CHAT_QUEST');
      params.quest = action.quest;
    }
    return { phraseId: phrase.id, params };
  },
  abort(source) { const state = structuredClone(source); finish(state, null, 'aborted'); record(state, { type: 'end' }); return state; },
};
