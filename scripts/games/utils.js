export class GameError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function ensure(condition, code, status = 400) {
  if (!condition) throw new GameError(code, status);
}
export function randomInt(limit) {
  const ceiling = Math.floor(0x100000000 / limit) * limit;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= ceiling);
  return buffer[0] % limit;
}
