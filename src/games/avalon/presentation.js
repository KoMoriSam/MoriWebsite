import { DEFAULT_SPECIAL_ROLES, isEvil, roleRoster, roleAlignment, selfAlignment } from '../../../shared/games/avalon/index.js';

export const ROLE_ICONS = {
  merlin: 'ri-magic-line', assassin: 'ri-sword-line', servant: 'ri-shield-star-line',
  minion: 'ri-skull-line', percival: 'ri-eye-line', morgana: 'ri-magic-line',
  mordred: 'ri-shield-keyhole-line', oberon: 'ri-user-unfollow-line',
  cleric: 'ri-cross-line', lunatic: 'ri-emotion-unhappy-line', brute: 'ri-hammer-line',
  revealer: 'ri-eye-2-line', good_lancelot: 'ri-shield-line', evil_lancelot: 'ri-sword-line',
};

export const roleImage = role => `/assets/images/games/avalon/${role}.webp`;
const gameView = room => room.game && typeof room.game === 'object' ? room.game : room;
export const currentRoleAlignment = (room, role) => roleAlignment(role, gameView(room).lancelotSwitched ?? false);
export function playerAlignment(room, id) {
  const game = gameView(room);
  if (id === room.selfId) return selfAlignment(game.self);
  if (game.revealedAllegiances?.[id]) return game.revealedAllegiances[id];
  const roles = possibleRoles({ ...room, ...game, game: room.round ?? room.game }, id);
  const sides = new Set(roles.map(role => currentRoleAlignment(room, role)));
  return sides.size === 1 ? [...sides][0] : null;
}

export function possibleRoles(room, id) {
  if (id === room.selfId || room.phase === 'finished') return [];
  const self = room.self;
  const exactRole = room.publicRoles?.[id] ?? self?.knownRoles?.[id];
  if (exactRole) return [exactRole];
  if (!self?.role) return Object.keys(ROLE_ICONS);
  const roster = roleRoster(room.participants?.length ?? room.players.length, room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES).roles;
  let roles = [...new Set(roster)].filter(role => role !== self.role || roster.filter(value => value === role).length > 1);
  const seenEvil = self.knownEvil?.includes(id);
  const candidate = self.knownCandidates?.includes(id);
  // Deduction uses immutable night evidence; styling and permissions use current allegiance.
  if (self.role === 'percival') {
    roles = roles.filter(role => candidate ? ['merlin', 'morgana'].includes(role) : !['merlin', 'morgana'].includes(role));
  } else if (self.role === 'merlin') {
    roles = roles.filter(role => seenEvil ? isEvil(role) && role !== 'mordred' : !isEvil(role) || role === 'mordred');
  } else if (isEvil(self.role) && self.role !== 'oberon' && !(self.role === 'evil_lancelot' && self.lancelotMode === 'switching')) {
    roles = roles.filter(role => seenEvil ? isEvil(role) && role !== 'oberon' : !isEvil(role) || role === 'oberon');
  }
  const loyalty = self.knownLoyalties?.[id];
  if (loyalty) roles = roles.filter(role => isEvil(role) === (loyalty === 'evil'));
  return roles;
}

export function knownPlayer(room, player, faceUp = false) {
  if (room.phase !== 'finished' && !faceUp && !room.publicRoles?.[player.id]) return null;
  const candidates = possibleRoles(room, player.id);
  const role = room.phase === 'finished' ? player.role : room.publicRoles?.[player.id] ?? (player.id === room.selfId ? room.self.role : candidates.length === 1 ? candidates[0] : null);
  if (role) return { label: `avalon.roles.${role}`, icon: ROLE_ICONS[role], tone: playerAlignment(room, player.id) ?? currentRoleAlignment(room, role) };
  if (player.id === room.selfId) return null;
  if (room.self.knownLoyalties?.[player.id]) {
    const side = playerAlignment(room, player.id);
    if (!side) return { label: 'avalon.knowledge.openingLoyalty', icon: 'ri-eye-line', tone: 'candidate' };
    return { label: `avalon.knowledge.${side}`, icon: side === 'evil' ? 'ri-skull-line' : 'ri-shield-line', tone: side };
  }
  if (room.self.knownCandidates?.includes(player.id)) return { label: 'avalon.knowledge.candidate', icon: 'ri-eye-line', tone: 'candidate' };
  if (room.self.knownEvil.includes(player.id)) return {
    label: playerAlignment(room, player.id) === 'evil'
      ? room.self.role === 'merlin' ? 'avalon.knowledge.evil' : 'avalon.knowledge.ally'
      : 'avalon.knowledge.nightEvil',
    icon: playerAlignment(room, player.id) === 'evil' ? 'ri-skull-line' : 'ri-eye-line', tone: playerAlignment(room, player.id) ?? 'candidate',
  };
  return null;
}
