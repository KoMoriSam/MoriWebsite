import { possibleRoles } from './presentation.js';
import { isEvil } from '../../../shared/games/avalon/index.js';
export function possibleMarks(room, id) {
  const roles = possibleRoles(room, id);
  if (roles.length <= 1) return [];
  const good = roles.filter(role => !isEvil(role));
  const evil = roles.filter(isEvil);
  const mixed = good.length > 0 && evil.length > 0;
  return [
    ...(mixed && good.length > 1 ? ['good'] : []),
    ...(mixed && evil.length > 1 ? ['evil'] : []),
    ...roles,
  ];
}
export const notesKey = room => `mori:avalon:notes:${room.code}:${room.selfId}`;
export function readNotes(storage, room) {
  try {
    const saved = JSON.parse(storage?.getItem(notesKey(room)) ?? 'null');
    if (!saved) return {};
    if (room.phase === 'finished' || saved.round !== room.game || !saved.marks || typeof saved.marks !== 'object' || Array.isArray(saved.marks)) {
      storage?.removeItem(notesKey(room)); return {};
    }
    return Object.fromEntries(Object.entries(saved.marks).filter(([id, mark]) => id !== room.selfId && room.players.some(player => player.id === id) && possibleMarks(room, id).includes(mark)));
  } catch { return {}; }
}
export function writeNotes(storage, room, marks) {
  try {
    if (room.phase === 'finished' || !Object.keys(marks).length) storage?.removeItem(notesKey(room));
    else storage?.setItem(notesKey(room), JSON.stringify({ round: room.game, marks }));
  } catch { /* Denied storage still allows notes for the current page. */ }
}
