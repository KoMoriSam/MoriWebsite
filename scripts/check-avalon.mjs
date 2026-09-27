import assert from 'node:assert/strict';
import { GOOD_COUNTS, isEvil, QUEST_TEAMS, SPECIAL_ROLES, normalizeConfig, roleList } from './avalon/rules.js';
import { advanceRoomTime, applyRoomAction as applyAction, createPlayer, createRoom, HOST_GRACE, roomView as playerView, transferHost } from './games/state.js';
import { knownPlayer, possibleRoles } from '../src/games/avalon-presentation.js';
import { possibleMarks } from '../src/games/avalon-notes.js';
import { QUICK_PHRASES } from '../shared/games/avalon-phrases.js';
import { MESSAGE_COOLDOWN, MESSAGE_LIMIT } from '../shared/games/messages.js';
import fs from 'node:fs';

let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const rejects = (fn, code) => { assert.throws(fn, error => error.code === code); checks++; };
const command = (room, type, payload = {}) => ({ type, id: crypto.randomUUID(), stage: room.stage, ...payload });
function fixture(count = 5, night = false, specialRoles = []) {
  const players = Array.from({ length: count }, (_, i) => ({ ...createPlayer(`P${i + 1}`, `secret-${i}`), online: true, ready: true, disconnectedAt: null }));
  const room = createRoom('ABCDEFGH', 'avalon', players[0]); room.players = players;
  room.gameConfig = { specialRoles };
  let started = applyAction(room, room.hostId, command(room, 'start'), Date.now(), () => 0).room;
  if (night) return started;
  for (const player of started.players) {
    started = act(started, player.id, 'peek_role');
    started = act(started, player.id, 'confirm_role');
  }
  return endDiscussion(started);
}
const act = (room, id, type, payload) => applyAction(room, id, command(room, type, payload), Math.max(Date.now(), room.lastActivityAt)).room;
function endDiscussion(room) {
  while (room.gameState.phase === 'discussion') room = advanceRoomTime(room, room.gameState.discussion.endsAt).room;
  return room;
}
function propose(room, team) {
  const leader = room.players[room.gameState.leaderIndex].id;
  if (room.gameState.phase === 'discussion') room = endDiscussion(room);
  return act(room, leader, 'team', { team });
}
function vote(room, approve = true) {
  for (const p of room.players.filter(player => !Object.hasOwn(room.gameState.ballots, player.id))) room = act(room, p.id, 'vote', { approve });
  return room;
}
function quest(room, failures = 0) {
  const evil = room.players.filter(p => isEvil(room.gameState.roles[p.id])).slice(0, failures);
  const rest = room.players.filter(p => !evil.some(e => e.id === p.id));
  const team = [...evil, ...rest].slice(0, QUEST_TEAMS[room.players.length][room.gameState.questIndex]).map(p => p.id);
  room = vote(propose(room, team));
  for (const id of team) room = act(room, id, 'quest', { success: !evil.some(p => p.id === id) });
  return room;
}

for (let count = 5; count <= 10; count++) {
  let opening = fixture(count, true);
  check(opening.gameState.phase, 'night');
  for (const player of opening.players) {
    const view = playerView(opening, player.id).game;
    check(view.self.role, null); check(view.self.knownEvil, []);
    check(view.leaderId, null); check('roles' in view, false);
  }
  rejects(() => act(opening, opening.hostId, 'confirm_role'), 'PHASE');
  rejects(() => propose(opening, opening.players.slice(0, 2).map(p => p.id)), 'PHASE');
  const first = command(opening, 'peek_role');
  opening = applyAction(opening, opening.hostId, first).room;
  check(applyAction(opening, opening.hostId, first).duplicate, true);
  check(playerView(opening, opening.hostId).game.self.role, opening.gameState.roles[opening.hostId]);
  check(playerView(opening, opening.players[1].id).game.self.role, null);
  rejects(() => act(opening, opening.hostId, 'peek_role'), 'ALREADY_SUBMITTED');
  opening = act(opening, opening.hostId, 'confirm_role');
  check(playerView(structuredClone(opening), opening.hostId).game.self.nightConfirmed, true);
  check(playerView(opening, opening.players[1].id).game.nightCount, 1);
  rejects(() => act(opening, opening.hostId, 'confirm_role'), 'ALREADY_SUBMITTED');
  for (const player of opening.players.slice(1)) {
    opening = act(opening, player.id, 'peek_role');
    opening = act(opening, player.id, 'confirm_role');
  }
  check(opening.gameState.phase, 'discussion');
  const leader = opening.players[opening.gameState.leaderIndex].id;
  rejects(() => act(opening, leader, 'team', { team: opening.players.slice(0, 2).map(p => p.id) }), 'PHASE');
  rejects(() => act(opening, opening.players.find(player => player.id !== leader).id, 'begin_team'), 'LEADER_ONLY');
  const earlyEnd = command(opening, 'begin_team');
  const earlyAt = opening.gameState.discussion.startedAt + 1000;
  const endedEarly = applyAction(opening, leader, earlyEnd, earlyAt).room;
  check(endedEarly.gameState.phase, 'team');
  check(endedEarly.stage, opening.stage + 1);
  check(endedEarly.gameState.history.at(-1).at, earlyAt);
  check(applyAction(endedEarly, leader, earlyEnd, earlyAt).duplicate, true);
  check(advanceRoomTime(endedEarly, opening.gameState.discussion.endsAt).changed, false);
  rejects(() => act(endedEarly, leader, 'begin_team'), 'PHASE');
  check(opening.gameState.discussion.mode, 'slow');
  check(opening.gameState.discussion.endsAt - opening.gameState.discussion.startedAt, count * 30_000);
  check(advanceRoomTime(opening, opening.gameState.discussion.endsAt - 1).changed, false);
  opening = endDiscussion(opening); check(opening.gameState.phase, 'team');
  rejects(() => act(opening, leader, 'confirm_role'), 'PHASE');
}
check(QUEST_TEAMS, { 5: [2,3,2,3,3], 6: [2,3,4,3,4], 7: [2,3,3,4,4], 8: [3,4,4,5,5], 9: [3,4,4,5,5], 10: [3,4,4,5,5] });
for (let count = 5; count <= 10; count++) {
  let room = fixture(count);
  check(room.players.filter(p => !isEvil(room.gameState.roles[p.id])).length, GOOD_COUNTS[count]);
  check(room.players.filter(p => room.gameState.roles[p.id] === 'merlin').length, 1);
  check(room.players.filter(p => room.gameState.roles[p.id] === 'assassin').length, 1);
  for (const p of room.players) {
    const view = playerView(room, p.id);
    check(view.players.every(p => !('role' in p) && !('tokenHash' in p) && !('receipts' in p)), true);
    check(view.game.self.knownEvil.length, room.gameState.roles[p.id] === 'merlin' || isEvil(room.gameState.roles[p.id]) ? count - GOOD_COUNTS[count] : 0);
  }
  for (let i = 0; i < 3; i++) room = quest(room);
  check(room.gameState.phase, 'assassinate');
  const assassin = room.players.find(p => room.gameState.roles[p.id] === 'assassin');
  const merlin = room.players.find(p => room.gameState.roles[p.id] === 'merlin');
  rejects(() => act(room, merlin.id, 'assassinate', { targetId: assassin.id }), 'ASSASSIN_ONLY');
  const evilWin = act(room, assassin.id, 'assassinate', { targetId: merlin.id });
  check(evilWin.gameState.result.winner, 'evil');
  check(evilWin.gameState.history.at(-1).type, 'assassinate');
  check(evilWin.gameState.history.at(-1).targetId, merlin.id);
  check(evilWin.gameState.history.filter(entry => entry.quest === 0).map(entry => entry.type), ['begin_team', 'team', 'vote', 'quest']);
  check(evilWin.gameState.history.filter(entry => entry.type === 'quest').every(entry => !('questCards' in entry) && !('votes' in entry)), true);
  const goodWin = act(room, assassin.id, 'assassinate', { targetId: room.players.find(p => room.gameState.roles[p.id] === 'servant').id });
  check(goodWin.gameState.result.winner, 'good');
  check(Object.keys(playerView(goodWin, merlin.id).game.revealedRoles).length, count);
  const departed = act(goodWin, room.players.find(p => p.id !== merlin.id).id, 'leave');
  check(playerView(departed, merlin.id).game.teamSizes, QUEST_TEAMS[count]);
  room = fixture(count);
  for (let i = 0; i < 3; i++) room = quest(room, 1);
  check(room.gameState.result, { winner: 'evil', reason: 'quests', targetId: null });
}

let room = fixture(); const initial = structuredClone(room);
rejects(() => act(room, room.players[1].id, 'team', { team: [] }), 'LEADER_ONLY');
rejects(() => propose(room, [room.players[0].id, room.players[0].id]), 'TEAM');
rejects(() => propose(room, ['missing', 'missing2']), 'TEAM');
rejects(() => act(room, room.players[1].id, 'end'), 'HOST_ONLY');
check(room, initial);
room = propose(room, room.players.slice(0, 2).map(p => p.id));
check(room.gameState.ballots, { [room.players[0].id]: true });
check(playerView(room, room.players[0].id).game.self.autoApproved, true);
check(playerView(room, room.players[0].id).game.self.voted, true);
check(playerView(room, room.players[1].id).game.self.autoApproved, false);
check(playerView(room, room.players[1].id).game.voteCount, 1);
rejects(() => act(room, room.players[0].id, 'vote', { approve: false }), 'ALREADY_SUBMITTED');
const first = command(room, 'vote', { approve: false });
room = applyAction(room, room.players[1].id, first).room;
check(playerView(room, room.players[1].id).game.history.map(entry => entry.type), ['begin_team', 'team']);
check(playerView(room, room.players[1].id).game.history.every(entry => !('votes' in entry)), true);
check('ballots' in playerView(room, room.players[1].id), false);
check(applyAction(room, room.players[1].id, first).duplicate, true);
rejects(() => act(room, room.players[0].id, 'vote', { approve: true }), 'ALREADY_SUBMITTED');
const oldStage = room.stage;
for (const p of room.players.slice(2)) room = act(room, p.id, 'vote', { approve: false });
check(room.gameState.history.map(entry => entry.type), ['begin_team', 'team', 'vote']);
check(room.gameState.history.every(entry => entry.quest === 0 && Number.isFinite(entry.at)), true);
rejects(() => applyAction(room, room.players[1].id, { ...command(room, 'team'), stage: oldStage }), 'STALE');
check(applyAction(room, room.players[1].id, first).duplicate, true);
check(room.gameState.history.at(-1).votes.find(vote => vote.playerId === room.players[0].id).approve, true);
for (let i = 0; i < 4; i++) room = vote(propose(room, room.players.slice(0, 2).map(p => p.id)), false);
check(room.gameState.result.reason, 'rejections');

room = fixture(6);
room = propose(room, room.players.slice(0, 2).map(p => p.id));
for (const [i, p] of room.players.entries()) if (i > 0) room = act(room, p.id, 'vote', { approve: i < 3 });
check(room.gameState.phase, 'discussion'); check(room.gameState.rejected, 1);
for (let count = 5; count <= 10; count++) {
  for (const failures of [1, 2]) {
    room = fixture(count); room.gameState.questIndex = 3;
    room = quest(room, failures);
    check(room.gameState.quests[0].success, count >= 7 && failures === 1);
  }
}
room = fixture();
const good = room.players.filter(p => !isEvil(room.gameState.roles[p.id]));
room = vote(propose(room, good.slice(0, 2).map(p => p.id)));
rejects(() => act(room, good[0].id, 'quest', { success: false }), 'GOOD_CANNOT_FAIL');
const outsider = room.players.find(p => !room.gameState.team.includes(p.id));
rejects(() => act(room, outsider.id, 'quest', { success: true }), 'TEAM_ONLY');
room = act(room, good[0].id, 'quest', { success: true });
check('questCards' in playerView(room, outsider.id), false);
check(playerView(room, outsider.id).game.questCount, 1);
rejects(() => act(room, good[0].id, 'quest', { success: true }), 'ALREADY_SUBMITTED');
room = act(room, room.hostId, 'end'); check(room.gameState.result.winner, null);
room = act(room, room.hostId, 'restart');
check(room.status, 'lobby'); check(room.players.every(p => !p.ready), true); check(room.gameState, null);
rejects(() => act(room, room.hostId, 'start'), 'NOT_READY');
room = fixture();
const originalHost = room.hostId;
const host = room.players.find(p => p.id === originalHost); host.online = false; host.disconnectedAt = 0;
check(transferHost(room, HOST_GRACE - 1), false);
check(transferHost(room, HOST_GRACE), true);
check(room.hostId !== originalHost, true);
const activeLeave = act(room, room.players[2].id, 'leave');
check(activeLeave.players.length, 5); check(activeLeave.players[2].online, false);
rejects(() => createPlayer('\n', 'hash'), 'NICKNAME');
// Every original-role combination respects faction counts and private night information.
check(normalizeConfig(), { specialRoles: ['percival', 'morgana'] });
for (const bad of [null, {}, [], { specialRoles: ['unknown'] }, { specialRoles: ['morgana', 'morgana'] }, { specialRoles: 'morgana' }, { specialRoles: [], roles: ['merlin'] }]) {
  rejects(() => normalizeConfig(bad), 'ROLE_CONFIG');
}
for (let count = 5; count <= 10; count++) {
  for (let mask = 0; mask < 16; mask++) {
    const specialRoles = SPECIAL_ROLES.filter((_, i) => mask & (1 << i));
    if (specialRoles.filter(isEvil).length + 1 > count - GOOD_COUNTS[count]) {
      rejects(() => roleList(count, { specialRoles }), 'ROLE_CAPACITY');
      continue;
    }
    const roles = roleList(count, { specialRoles });
    check(roles.length, count); check(roles.filter(role => !isEvil(role)).length, GOOD_COUNTS[count]);
    for (const role of ['merlin', 'assassin', ...SPECIAL_ROLES]) check(roles.filter(r => r === role).length, ['merlin', 'assassin', ...specialRoles].includes(role) ? 1 : 0);
    let configured = fixture(count, true, specialRoles);
    for (const player of configured.players) {
      check(playerView(configured, player.id).game.self.knownCandidates, []);
      check(playerView(configured, player.id).game.self.knownEvil, []);
    }
    for (const player of configured.players) configured = act(configured, player.id, 'peek_role');
    const assigned = configured.gameState.roles;
    for (const player of configured.players) {
      const own = assigned[player.id];
      const self = playerView(configured, player.id).game.self;
      const expected = configured.players.filter(p => own === 'merlin'
        ? isEvil(assigned[p.id]) && assigned[p.id] !== 'mordred'
        : isEvil(own) && own !== 'oberon' && isEvil(assigned[p.id]) && assigned[p.id] !== 'oberon').map(p => p.id);
      check(self.knownEvil, expected);
      check(self.knownCandidates, own === 'percival' ? configured.players.filter(p => ['merlin', 'morgana'].includes(assigned[p.id])).map(p => p.id) : []);
      check('revealedRoles' in playerView(configured, player.id).game, false);
    }
    // Every added evil role can sabotage; Percival remains unable to fail quests.
    for (const role of specialRoles) {
      let testRoom = fixture(count, false, specialRoles);
      const player = testRoom.players.find(p => testRoom.gameState.roles[p.id] === role);
      testRoom = vote(propose(testRoom, [player.id, ...testRoom.players.filter(p => p.id !== player.id).slice(0, QUEST_TEAMS[count][0] - 1).map(p => p.id)]));
      if (isEvil(role)) check(act(testRoom, player.id, 'quest', { success: false }).gameState.questCards[player.id], false);
      else rejects(() => act(testRoom, player.id, 'quest', { success: false }), 'GOOD_CANNOT_FAIL');
    }
  }
}
room = fixture(); room = act(room, room.hostId, 'end'); room = act(room, room.hostId, 'restart');
room.players.forEach(p => { p.ready = true; });
const staleReady = command(room, 'ready', { ready: true });
rejects(() => act(room, room.players[1].id, 'configure', { config: { specialRoles: ['percival'] } }), 'HOST_ONLY');
rejects(() => act(room, room.hostId, 'configure'), 'INVALID');
room = act(room, room.hostId, 'configure', { config: { specialRoles: ['mordred', 'percival'] } });
check(room.players.every(p => !p.ready), true);
check(playerView(structuredClone(room), room.players[1].id).gameConfig, { specialRoles: ['percival', 'mordred'] });
rejects(() => applyAction(room, room.players[0].id, staleReady), 'STALE');
rejects(() => act(room, room.hostId, 'start'), 'NOT_READY');
room = act(room, room.hostId, 'configure', { config: { specialRoles: SPECIAL_ROLES } });
room.players.forEach(p => { p.ready = true; });
rejects(() => act(room, room.hostId, 'start'), 'ROLE_CAPACITY');
check(room.status, 'lobby');
let full = fixture(10, false, SPECIAL_ROLES);
const byRole = role => full.players.find(p => full.gameState.roles[p.id] === role);
const markerView = role => { const view = playerView(full, byRole(role).id); return { ...view, ...view.game }; };
check(knownPlayer(markerView('merlin'), byRole('mordred'), true), null);
check(knownPlayer(markerView('merlin'), byRole('oberon'), true).label, 'avalon.knowledge.evil');
check(knownPlayer(markerView('assassin'), byRole('oberon'), true), null);
check(knownPlayer(markerView('assassin'), byRole('mordred'), true).label, 'avalon.knowledge.ally');
check(knownPlayer(markerView('percival'), byRole('merlin'), true), knownPlayer(markerView('percival'), byRole('morgana'), true));
check(knownPlayer(markerView('percival'), byRole('merlin'), true).label, 'avalon.knowledge.candidate');
check(knownPlayer(markerView('percival'), byRole('assassin'), true), null);
check(knownPlayer(markerView('merlin'), byRole('merlin')), null);
check(knownPlayer(markerView('merlin'), byRole('merlin'), true).label, 'avalon.roles.merlin');
for (const viewer of ['oberon', 'servant']) {
  for (const player of full.players.filter(p => p.id !== byRole(viewer).id)) check(knownPlayer(markerView(viewer), player, true), null);
}
for (const viewer of full.players) {
  const view = playerView(full, viewer.id);
  for (const player of full.players) check(knownPlayer({ ...view, ...view.game }, player, false), null);
}
for (const player of full.players) {
  const revealed = knownPlayer({ ...markerView('merlin'), phase: 'finished' }, { ...player, role: full.gameState.roles[player.id] });
  check(revealed.label, `avalon.roles.${full.gameState.roles[player.id]}`);
  check(revealed.tone, isEvil(full.gameState.roles[player.id]) ? 'evil' : 'good');
}
const percivalId = full.players.find(p => full.gameState.roles[p.id] === 'percival').id;
const originalVision = playerView(full, percivalId).game;
const swapped = structuredClone(full);
const merlinId = full.players.find(p => full.gameState.roles[p.id] === 'merlin').id;
const morganaId = full.players.find(p => full.gameState.roles[p.id] === 'morgana').id;
[swapped.gameState.roles[merlinId], swapped.gameState.roles[morganaId]] = [swapped.gameState.roles[morganaId], swapped.gameState.roles[merlinId]];
check(playerView(swapped, percivalId).game, originalVision);
rejects(() => act(full, full.hostId, 'configure', { config: { specialRoles: [] } }), 'PHASE');
for (let i = 0; i < 3; i++) full = quest(full);
const fullAssassin = full.players.find(p => full.gameState.roles[p.id] === 'assassin');
const fullOberon = full.players.find(p => full.gameState.roles[p.id] === 'oberon');
// An unknown evil target must not act as an oracle or reveal Oberon's affiliation via an error.
check(act(full, fullAssassin.id, 'assassinate', { targetId: fullOberon.id }).gameState.result.winner, 'good');
rejects(() => act(full, fullAssassin.id, 'assassinate', { targetId: fullAssassin.id }), 'TARGET');
full = act(full, full.hostId, 'end'); full = act(full, full.hostId, 'restart');
check(full.gameConfig, { specialRoles: SPECIAL_ROLES });
for (let count = 5; count <= 10; count++) {
  let quick = fixture(count, false, ['percival', 'morgana']);
  quick = quest(quick); quick.players.forEach(p => { p.ready = false; });
  const before = structuredClone(quick);
  const oldAction = command(quick, 'begin_team');
  const request = command(quick, 'quick_start');
  rejects(() => applyAction(quick, quick.players[1].id, request), 'HOST_ONLY');
  const disconnected = structuredClone(quick); disconnected.players[1].online = false;
  rejects(() => act(disconnected, disconnected.hostId, 'quick_start'), 'QUICK_NOT_READY');
  quick = applyAction(quick, quick.hostId, request).room;
  check(before.gameState.quests.length, 1);
  check(quick.gameState.phase, 'night'); check(quick.status, 'playing');
  check(quick.round, before.round + 1); check(quick.stage, before.stage + 1);
  check(quick.gameConfig, before.gameConfig); check(quick.hostId, before.hostId);
  check(quick.players.map(p => p.id), before.players.map(p => p.id));
  check(quick.gameState.history, []); check(quick.gameState.quests, []);
  check(quick.gameState.nightConfirmed, {}); check(quick.gameState.roleRevealed, {});
  check(quick.gameState.result, null); check(quick.gameState.rejected, 0);
  check(applyAction(quick, quick.hostId, request).duplicate, true);
  rejects(() => applyAction(quick, quick.hostId, oldAction), 'STALE');
  for (const player of quick.players) {
    const privateView = playerView(quick, player.id).game.self;
    check(privateView.role, null); check(privateView.knownEvil, []); check(privateView.knownCandidates, []);
  }
  quick = act(quick, quick.hostId, 'end');
  check(quick.gameState.history.at(-1).type, 'end');
  quick = act(quick, quick.hostId, 'quick_start');
  check(quick.round, before.round + 2); check(quick.gameState.phase, 'night');
  quick = act(quick, quick.hostId, 'end'); quick = act(quick, quick.hostId, 'restart');
  rejects(() => act(quick, quick.hostId, 'quick_start'), 'PHASE');
}
room = fixture(); room.gameConfig = { specialRoles: SPECIAL_ROLES };
rejects(() => act(room, room.hostId, 'quick_start'), 'ROLE_CAPACITY');
room.gameConfig = { specialRoles: [] }; room.players = room.players.slice(0, 4);
rejects(() => act(room, room.hostId, 'quick_start'), 'QUICK_NOT_READY');
// Local guesses must respect private knowledge without excluding the actual role.
for (let count = 5; count <= 10; count++) {
  for (let mask = 0; mask < 16; mask++) {
    const specialRoles = SPECIAL_ROLES.filter((_, index) => mask & (1 << index));
    if (specialRoles.filter(isEvil).length + 1 > count - GOOD_COUNTS[count]) continue;
    const started = fixture(count, false, specialRoles);
    for (const viewer of started.players) {
      const view = playerView(started, viewer.id);
      const local = { ...view, ...view.game, game: view.round };
      check(possibleMarks(local, viewer.id), []);
      for (const other of started.players.filter(player => player.id !== viewer.id)) {
        const options = possibleMarks(local, other.id);
        const actual = started.gameState.roles[other.id];
        const candidates = possibleRoles(local, other.id);
        check(candidates.includes(actual), true);
        check(options.includes('candidate'), false);
        if (candidates.length === 1) {
          check(options, []);
          check(knownPlayer(local, other, true).label, `avalon.roles.${actual}`);
          check(knownPlayer(local, other, false), null);
        } else check(options.includes(actual), true);
        if (local.self.knownEvil.includes(other.id)) {
          check(options.some(role => ['good', 'merlin', 'servant', 'percival'].includes(role)), false);
        }
        if (local.self.knownCandidates.includes(other.id)) {
          check(options.every(role => ['merlin', 'morgana'].includes(role)), true);
        }
        if (options.includes('good')) check(candidates.filter(role => !isEvil(role)).length > 1 && candidates.some(isEvil), true);
        if (options.includes('evil')) check(candidates.filter(isEvil).length > 1 && candidates.some(role => !isEvil(role)), true);
        check(options.includes('mordred') && !specialRoles.includes('mordred'), false);
        check(options.includes('oberon') && !specialRoles.includes('oberon'), false);
      }
    }
  }
}
// Speech is a public claim: it must never depend on the speaker's secret role.
check(new Set(QUICK_PHRASES.map(phrase => phrase.id)).size, QUICK_PHRASES.length);
for (const code of ['zh-CN', 'en', 'si']) {
  const items = JSON.parse(fs.readFileSync(`src/i18n/messages/${code}.json`, 'utf8')).avalon.phrases.items;
  check(Object.keys(items).sort(), QUICK_PHRASES.map(phrase => phrase.id).sort());
  for (const phrase of QUICK_PHRASES) {
    const expected = [...(phrase.player ? ['name'] : []), ...(phrase.role ? ['role'] : []), ...(phrase.quest ? ['quest'] : [])].sort();
    check([...items[phrase.id].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), expected);
  }
}
let talking = fixture(10, false, SPECIAL_ROLES);
let spokenAt = Date.now();
const speech = (phrase, payload = {}, id = talking.hostId) => ({ ...command(talking, 'say'), phraseId: phrase, ...payload });
const originalRules = structuredClone(talking.gameState);
const originalStage = talking.stage;
const originalReady = talking.players.map(player => player.ready);
for (const phrase of QUICK_PHRASES) {
  const request = speech(phrase.id, { targetId: talking.players[1].id, role: 'merlin', quest: 1, playerId: 'forged', params: { name: 'forged', role: 'secret' }, text: 'not allowed' });
  const result = applyAction(talking, talking.hostId, request, spokenAt);
  talking = result.room;
  const message = talking.messages.at(-1);
  check(message.nickname, talking.players[0].nickname);
  check(message.playerId, talking.hostId);
  check(message.phraseId, phrase.id);
  check(message.params, { ...(phrase.player ? { name: talking.players[1].nickname } : {}), ...(phrase.role ? { role: 'merlin' } : {}), ...(phrase.quest ? { quest: 1 } : {}) });
  check(message.text, undefined);
  check(applyAction(talking, talking.hostId, request, spokenAt).duplicate, true);
  check(talking.gameState, originalRules); check(talking.stage, originalStage); check(talking.players.map(player => player.ready), originalReady);
  for (const viewer of talking.players) check(playerView(talking, viewer.id).messages, talking.messages);
  spokenAt += MESSAGE_COOLDOWN;
}
rejects(() => applyAction(talking, talking.hostId, speech('pause'), spokenAt - MESSAGE_COOLDOWN + 1), 'CHAT_COOLDOWN');
rejects(() => applyAction(talking, talking.hostId, speech('__proto__'), spokenAt), 'CHAT_PHRASE');
rejects(() => applyAction(talking, talking.hostId, speech('suspicious', { targetId: 'missing' }), spokenAt), 'CHAT_TARGET');
rejects(() => applyAction(talking, talking.hostId, speech('claim', { role: 'not_a_role' }), spokenAt), 'CHAT_ROLE');
rejects(() => applyAction(talking, talking.hostId, speech('quest_review', { quest: 2 }), spokenAt), 'CHAT_QUEST');
rejects(() => applyAction(talking, talking.hostId, speech('quest_review', { quest: '1' }), spokenAt), 'CHAT_QUEST');
for (let i = 0; i < MESSAGE_LIMIT + 2; i++) {
  talking = applyAction(talking, talking.hostId, speech('pause'), spokenAt).room; spokenAt += MESSAGE_COOLDOWN;
}
check(talking.messages.length, MESSAGE_LIMIT);
check(talking.messages.every(message => message.phraseId === 'pause'), true);
const lastSpeech = talking.messages.at(-1).id;
talking = act(talking, talking.hostId, 'end');
check(talking.messages.at(-1).id, lastSpeech);
talking = applyAction(talking, talking.hostId, speech('well_played'), spokenAt).room;
check(talking.messages.at(-1).phraseId, 'well_played');
talking = act(talking, talking.hostId, 'quick_start'); check(talking.messages, []);
rejects(() => applyAction(talking, talking.hostId, speech('pause'), spokenAt), 'CHAT_PHASE');
talking = act(talking, talking.hostId, 'end'); talking = act(talking, talking.hostId, 'restart'); check(talking.messages, []);
rejects(() => applyAction(talking, talking.hostId, speech('pause'), spokenAt), 'PHASE');
const disabledRole = fixture(5, false, []);
rejects(() => applyAction(disabledRole, disabledRole.hostId, { ...command(disabledRole, 'say'), phraseId: 'claim', role: 'morgana' }), 'CHAT_ROLE');
const legacy = fixture(); delete legacy.messages;
check(playerView(legacy, legacy.hostId).messages, []);
check(applyAction(legacy, legacy.hostId, { ...command(legacy, 'say'), phraseId: 'pause' }).room.messages.length, 1);
// Timed discussions alternate; only the leader can end discussion early.
let paced = fixture();
paced = vote(propose(paced, paced.players.slice(0, 2).map(player => player.id)), false);
check(paced.gameState.discussion.mode, 'fast');
check(paced.gameState.discussion.endsAt - paced.gameState.discussion.startedAt, 15_000);
const pacedLeader = paced.players[paced.gameState.leaderIndex].id;
const pacedPartner = paced.players.find(player => player.id !== pacedLeader).id;
const observer = paced.players.find(player => ![pacedLeader, pacedPartner].includes(player.id)).id;
rejects(() => act(paced, pacedPartner, 'begin_team'), 'LEADER_ONLY');
check(act(paced, pacedLeader, 'begin_team').gameState.phase, 'team');
rejects(() => act(paced, pacedPartner, 'discussion_partner', { targetId: observer }), 'LEADER_ONLY');
rejects(() => act(paced, pacedLeader, 'discussion_partner', { targetId: pacedLeader }), 'DIALOGUE_TARGET');
rejects(() => act(paced, pacedLeader, 'say', { phraseId: 'pause' }), 'DISCUSSION_SPEAKER');
const invite = command(paced, 'discussion_partner', { targetId: pacedPartner });
const invitedAt = paced.gameState.discussion.startedAt + 1000;
paced = applyAction(paced, pacedLeader, invite, invitedAt).room;
check(paced.gameState.discussion.partnerId, pacedPartner);
check(paced.gameState.discussion.endsAt, invitedAt + 60_000);
check(applyAction(paced, pacedLeader, invite, invitedAt + 1000).duplicate, true);
rejects(() => act(paced, pacedLeader, 'discussion_partner', { targetId: observer }), 'PHASE');
paced = applyAction(paced, pacedLeader, command(paced, 'say', { phraseId: 'pause' }), invitedAt + 2000).room;
paced = applyAction(paced, pacedPartner, command(paced, 'say', { phraseId: 'pause' }), invitedAt + 2000).room;
rejects(() => applyAction(paced, observer, command(paced, 'say', { phraseId: 'pause' }), invitedAt + 2000), 'DISCUSSION_SPEAKER');
check(paced.messages.map(message => message.playerId), [pacedLeader, pacedPartner]);
check(act(paced, pacedLeader, 'begin_team').gameState.phase, 'team');
rejects(() => act(paced, pacedPartner, 'begin_team'), 'LEADER_ONLY');
check(advanceRoomTime(paced, paced.gameState.discussion.endsAt - 1).changed, false);
const duelDeadline = paced.gameState.discussion.endsAt;
paced = advanceRoomTime(paced, duelDeadline).room;
check(paced.gameState.phase, 'team'); check(advanceRoomTime(paced, duelDeadline).changed, false);
paced = vote(propose(paced, paced.players.slice(0, 2).map(player => player.id)), false);
check(paced.gameState.discussion.mode, 'slow');
check(paced.gameState.discussion.endsAt - paced.gameState.discussion.startedAt, 150_000);
const openAt = paced.gameState.discussion.startedAt + 5000;
for (const player of paced.players) paced = applyAction(paced, player.id, command(paced, 'say', { phraseId: 'pause' }), openAt).room;
check(paced.messages.slice(-5).map(message => message.playerId), paced.players.map(player => player.id));
paced = vote(propose(endDiscussion(paced), paced.players.slice(0, 2).map(player => player.id)), false);
const invitationDeadline = paced.gameState.discussion.endsAt;
const automaticPartner = paced.players[(paced.gameState.leaderIndex + 1) % paced.players.length].id;
const fallback = advanceRoomTime(paced, invitationDeadline).room;
check(fallback.gameState.discussion.partnerId, automaticPartner);
check(fallback.gameState.discussion.endsAt, invitationDeadline + 60_000);
check(fallback.gameState.history.at(-1).type, 'dialogue');
check(advanceRoomTime(paced, invitationDeadline + 60_000).room.gameState.phase, 'team');
const legacyDiscussion = structuredClone(paced); delete legacyDiscussion.gameState.discussion; delete legacyDiscussion.gameState.discussionCount;
const migrated = advanceRoomTime(legacyDiscussion, invitationDeadline).room;
check(migrated.gameState.discussion.mode, 'slow');
check(migrated.gameState.discussion.endsAt, invitationDeadline + 150_000);
console.log(`Avalon rules: ${checks} assertions passed.`);

