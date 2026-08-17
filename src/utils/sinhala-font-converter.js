import {
  FM_ABHAYA_LEGACY_ALIASES,
  FM_ABHAYA_MAPPINGS,
  FM_ABHAYA_UNICODE_ALIASES,
} from "./fm-abhaya-map.js";

// Conversion is performed with longest-match tries.  It is a single pass: text
// emitted by one mapping can never be consumed by a later mapping.

const SINHALA_VIRAMA = "්";
const SINHALA_PREBASE_SIGNS = new Set(["ෙ"]);
const SINHALA_JOINERS = new Set(["\u200c", "\u200d"]);
const SINHALA_DEPENDENT_SIGNS = new Set([
  "ං",
  "ඃ",
  "ා",
  "ැ",
  "ෑ",
  "ි",
  "ී",
  "ු",
  "ූ",
  "ෘ",
  "ෲ",
  "ෙ",
  "ේ",
  "ෛ",
  "ො",
  "ෝ",
  "ෞ",
  "ෟ",
]);
const MAX_DERIVED_LEGACY_SEQUENCE = 8;

function isSinhalaConsonant(character) {
  const cp = character?.codePointAt(0) ?? 0;
  return cp >= 0x0d9a && cp <= 0x0dc6;
}

function isSinhalaBaseCluster(target) {
  const chars = Array.from(target);
  if (!chars.length || !isSinhalaConsonant(chars[0])) return false;
  if (!isSinhalaConsonant(chars.at(-1))) return false;
  return chars.every(
    (character) =>
      isSinhalaConsonant(character) ||
      character === SINHALA_VIRAMA ||
      SINHALA_JOINERS.has(character),
  );
}

function isSinhalaModifier(target) {
  const first = Array.from(target)[0];
  return first === SINHALA_VIRAMA || SINHALA_DEPENDENT_SIGNS.has(first);
}

function deriveSemanticMappings(seedMappings) {
  const byLegacy = new Map(
    seedMappings.map(({ legacy, unicode }) => [legacy, unicode]),
  );
  const originalLegacy = new Set(byLegacy.keys());
  const modifiers = [...byLegacy].filter(([, target]) =>
    isSinhalaModifier(target),
  );

  let changed = true;
  while (changed) {
    changed = false;
    const bases = [...byLegacy].filter(([, target]) =>
      isSinhalaBaseCluster(target),
    );

    for (const [baseLegacy, baseTarget] of bases) {
      for (const [modifierLegacy, modifierTarget] of modifiers) {
        // A yansaya/rakar cluster may take a vowel sign, but recursively adding
        // another virama-led yansaya/rakar would create implausible chains.
        if (
          modifierTarget.startsWith(SINHALA_VIRAMA) &&
          (baseTarget.endsWith("ය") || baseTarget.endsWith("ර"))
        ) {
          continue;
        }

        const legacy = SINHALA_PREBASE_SIGNS.has(modifierTarget)
          ? modifierLegacy + baseLegacy
          : baseLegacy + modifierLegacy;
        if (
          legacy.length > MAX_DERIVED_LEGACY_SEQUENCE ||
          byLegacy.has(legacy)
        ) {
          continue;
        }

        byLegacy.set(legacy, baseTarget + modifierTarget);
        changed = true;
      }
    }
  }

  return [...byLegacy]
    .filter(([legacy]) => !originalLegacy.has(legacy))
    .map(([legacy, unicode]) => ({ legacy, unicode }));
}

function buildTrie(entries) {
  const root = { next: new Map(), value: undefined };

  for (const [source, target] of entries) {
    if (!source) continue;
    let node = root;
    for (const character of source) {
      let child = node.next.get(character);
      if (!child) {
        child = { next: new Map(), value: undefined };
        node.next.set(character, child);
      }
      node = child;
    }
    node.value = target;
  }

  return root;
}

function convertLongest(input, trie) {
  const characters = Array.from(String(input ?? ""));
  let output = "";

  for (let index = 0; index < characters.length; ) {
    let node = trie;
    let cursor = index;
    let matchedValue;
    let matchedEnd = index;

    while (cursor < characters.length) {
      node = node.next.get(characters[cursor]);
      if (!node) break;
      cursor += 1;
      if (node.value !== undefined) {
        matchedValue = node.value;
        matchedEnd = cursor;
      }
    }

    if (matchedValue !== undefined) {
      output += matchedValue;
      index = matchedEnd;
    } else {
      output += characters[index];
      index += 1;
    }
  }

  return output;
}

export const FM_ABHAYA_DERIVED_MAPPINGS =
  deriveSemanticMappings(FM_ABHAYA_MAPPINGS);

const legacyToUnicodeMap = new Map(
  FM_ABHAYA_MAPPINGS.map(({ unicode, legacy }) => [legacy, unicode]),
);
for (const { legacy, unicode } of FM_ABHAYA_DERIVED_MAPPINGS) {
  if (!legacyToUnicodeMap.has(legacy)) legacyToUnicodeMap.set(legacy, unicode);
}
for (const [legacy, unicode] of FM_ABHAYA_LEGACY_ALIASES) {
  const existing = legacyToUnicodeMap.get(legacy);
  if (existing !== undefined && existing !== unicode) {
    throw new Error(
      `FM Abhaya legacy alias collision for ${JSON.stringify(legacy)}: ` +
        `${JSON.stringify(existing)} vs ${JSON.stringify(unicode)}`,
    );
  }
  legacyToUnicodeMap.set(legacy, unicode);
}

const unicodeToLegacyMap = new Map(
  FM_ABHAYA_MAPPINGS.map(({ unicode, legacy }) => [unicode, legacy]),
);
// Derived mappings fill combinations absent from the explicit source table.
// Explicit mappings keep priority, preserving special glyph sequences such as
// .= for ගු instead of the generic .q decomposition.
for (const { legacy, unicode } of FM_ABHAYA_DERIVED_MAPPINGS) {
  if (!unicodeToLegacyMap.has(unicode)) unicodeToLegacyMap.set(unicode, legacy);
}
for (const [unicode, legacy] of FM_ABHAYA_UNICODE_ALIASES) {
  unicodeToLegacyMap.set(unicode, legacy);
}

export const FM_ABHAYA_LEGACY_MAPPINGS = [...legacyToUnicodeMap].map(
  ([legacy, unicode]) => ({ legacy, unicode }),
);

const unicodeTrie = buildTrie([...unicodeToLegacyMap]);
const legacyTrie = buildTrie([...legacyToUnicodeMap]);

export function unicodeToFm(input = "") {
  return convertLongest(input, unicodeTrie);
}

export function fmToUnicode(input = "") {
  return convertLongest(input, legacyTrie);
}

export {
  FM_ABHAYA_LEGACY_ALIASES,
  FM_ABHAYA_MAPPINGS,
  FM_ABHAYA_UNICODE_ALIASES,
};
