import { DEFAULT_SPECIAL_ROLES, isEvil, roleRoster } from '../../shared/games/avalon.js';

export const ROLE_ICONS = {
  merlin: 'ri-magic-line', assassin: 'ri-sword-line', servant: 'ri-shield-star-line',
  minion: 'ri-skull-line', percival: 'ri-eye-line', morgana: 'ri-magic-line',
  mordred: 'ri-shield-keyhole-line', oberon: 'ri-user-unfollow-line',
};

export function possibleRoles(room, id) {
  if (id === room.selfId || room.phase === 'finished') return [];
  const self = room.self;
  if (!self?.role) return Object.keys(ROLE_ICONS);
  const roster = roleRoster(room.participants?.length ?? room.players.length, room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES).roles;
  let roles = [...new Set(roster)].filter(role => role !== self.role || roster.filter(value => value === role).length > 1);
  const seenEvil = self.knownEvil?.includes(id);
  const candidate = self.knownCandidates?.includes(id);
  if (self.role === 'percival') {
    roles = roles.filter(role => candidate ? ['merlin', 'morgana'].includes(role) : !['merlin', 'morgana'].includes(role));
  } else if (self.role === 'merlin') {
    roles = roles.filter(role => seenEvil ? isEvil(role) && role !== 'mordred' : !isEvil(role) || role === 'mordred');
  } else if (isEvil(self.role) && self.role !== 'oberon') {
    roles = roles.filter(role => seenEvil ? isEvil(role) && role !== 'oberon' : !isEvil(role) || role === 'oberon');
  }
  return roles;
}

export function knownPlayer(room, player, faceUp = false) {
  if (room.phase !== 'finished' && !faceUp) return null;
  const candidates = possibleRoles(room, player.id);
  const role = room.phase === 'finished' ? player.role : player.id === room.selfId ? room.self.role : candidates.length === 1 ? candidates[0] : null;
  if (role) return { label: `avalon.roles.${role}`, icon: ROLE_ICONS[role], tone: isEvil(role) ? 'evil' : 'good' };
  if (player.id === room.selfId) return null;
  if (room.self.knownCandidates?.includes(player.id)) return { label: 'avalon.knowledge.candidate', icon: 'ri-eye-line', tone: 'candidate' };
  if (room.self.knownEvil.includes(player.id)) return {
    label: room.self.role === 'merlin' ? 'avalon.knowledge.evil' : 'avalon.knowledge.ally',
    icon: 'ri-skull-line', tone: 'evil',
  };
  return null;
}
