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

const englishWordForms = new Map();

// Resolve productive English inflections against the existing dictionary,
// rather than extending it with every word encountered in mixed documents.
export function hasEnglishWordForm(input) {
  const word = String(input ?? "").normalize("NFKC").toLocaleLowerCase("en");
  if (englishWordForms.has(word)) return englishWordForms.get(word);
  let found = hasEnglishLexeme(word);
  if (!found && /^[a-z]{4,}$/u.test(word)) {
    const roots = new Set([word]);
    const prefix = word.match(/^(?:under|over|non|dis|mis|un|re)(?=[a-z]{3,}$)/u);
    if (prefix) roots.add(word.slice(prefix[0].length));
    // Two bounded inflection passes also cover a plural gerund, while the
    // prefix is removed at most once and every result still needs a word root.
    for (let pass = 0; pass < 2; pass += 1) {
      for (const root of [...roots]) {
        if (/ies$/u.test(root)) roots.add(root.slice(0, -3) + "y");
        if (/ves$/u.test(root)) {
          roots.add(root.slice(0, -3) + "f");
          roots.add(root.slice(0, -3) + "fe");
        }
        if (/es$/u.test(root)) roots.add(root.slice(0, -2));
        if (/s$/u.test(root) && !/ss$/u.test(root)) roots.add(root.slice(0, -1));
        const ending = root.match(/(?:ing|ed)$/u);
        if (ending) {
          const stem = root.slice(0, -ending[0].length);
          roots.add(stem);
          roots.add(stem + "e");
          if (/([b-df-hj-np-tv-z])\1$/u.test(stem)) roots.add(stem.slice(0, -1));
          if (/ied$/u.test(root)) roots.add(root.slice(0, -3) + "y");
        }
      }
    }
    found = [...roots].some((root) => root.length >= 3 && hasEnglishLexeme(root));
  }
  if (englishWordForms.size >= 2048) englishWordForms.clear();
  englishWordForms.set(word, found);
  return found;
}
