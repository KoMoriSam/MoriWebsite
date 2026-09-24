import { SINHALA_CONVERSION_LEXICON } from "./lexicon.generated.js";

const decodedFilters = new WeakMap();

function hashLexeme(value, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function decodeFilter(filter) {
  const cached = decodedFilters.get(filter);
  if (cached) return cached;

  const binary = globalThis.atob(filter.chunks.join(""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  decodedFilters.set(filter, bytes);
  return bytes;
}

function filterHas(filter, value) {
  const bits = decodeFilter(filter);
  const firstHash = hashLexeme(value, 0x811c9dc5);
  const secondHash = hashLexeme(value, 0x9e3779b9) | 1;

  for (let index = 0; index < filter.hashCount; index += 1) {
    const bit =
      ((firstHash + Math.imul(index, secondHash)) >>> 0) % filter.bitCount;
    if ((bits[bit >>> 3] & (1 << (bit & 7))) === 0) return false;
  }
  return true;
}

export function hasEnglishLexeme(input) {
  const lexeme = String(input ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en");
  return Boolean(lexeme) && filterHas(SINHALA_CONVERSION_LEXICON.english, lexeme);
}

export function hasSinhalaLexeme(input) {
  const lexeme = String(input ?? "").normalize("NFC");
  return Boolean(lexeme) && filterHas(SINHALA_CONVERSION_LEXICON.sinhala, lexeme);
}
