import {
  FM_ABHAYA_LEGACY_ALIASES,
  FM_ABHAYA_MAPPINGS,
  FM_ABHAYA_UNICODE_ALIASES,
} from "./fm-map.js";
import {
  hasEnglishLexeme,
  hasSinhalaLexeme,
} from "./lexicon.js";

// Conversion is performed with longest-match tries.  It is a single pass: text
// emitted by one mapping can never be consumed by a later mapping.

const SINHALA_VIRAMA = "්";
const ZERO_WIDTH_JOINER = "\u200d";
const SINHALA_PREBASE_SIGNS = new Set(["ෙ"]);
const SINHALA_JOINERS = new Set(["\u200c", "\u200d"]);
const COMPACT_DA_FORMS = new Map([
  ["දා", "Þ"],
  ["දැ", "±"],
  ["ඤා", "Ø"],
  ["ඥා", "×"],
  ["ඳා", "\\"],
  ["ඳැ", "ƒ"],
  ["න්‍ද", "‡"],
  ["න්‍දා", "ˆ"],
  ["ද්‍ය", "µ"],
]);
const NONCOMPACT_DA_BASES = [
  { unicode: "ඳ", legacy: "|" },
  { unicode: "න්‍ද", legacy: "Jo" },
];
const COMPACT_DA_BASES = [
  { unicode: "ඳ", legacy: "|" },
  { unicode: "න්‍ද", legacy: "‡" },
];
const FM_STACKED_VOWEL_FORMS = [
  ["ා", "", "d", "", "ා"],
  ["ැ", "", "e", "", "ැ"],
  ["ෑ", "", "E", "", "ෑ"],
  ["ි", "", "s", "", "ි"],
  ["ී", "", "S", "", "ී"],
  ["ු", "", "q", "", "ු"],
  ["ූ", "", "Q", "", "ූ"],
  ["ෘ", "", "D", "", "ෘ"],
  ["ෲ", "", "DD", "", "ෲ"],
  ["ෙ", "f", "", "ෙ", ""],
  ["ේ", "f", "a", "ෙ", "්"],
  ["ෛ", "ff", "", "ෛ", ""],
  ["ො", "f", "d", "ෙ", "ා"],
  ["ෝ", "f", "da", "ෙ", "ා්"],
  ["ෞ", "f", "!", "ෙ", "ෟ"],
  ["ෟ", "", "!", "", "ෟ"],
];
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
const SINHALA_RAKAR = "්‍ර";
const SINHALA_REPAYA = "ර්‍";
const LEGACY_REPAYA_MARKER = "\u{f0000}";
const DEDICATED_REPAYA_BASES = new Set(["ණ", "ය"]);
// In both Libre source families these consonants rise above the ordinary
// consonant height, so the raised FM reph slot is needed after them.
const TALL_REPAYA_BASES = new Set(Array.from("ඛචඡජඣටඨඩඪණඬථධඵබමඹරව"));
const REORDERED_RAKAR_SUFFIXES = [
  ["%s", "s%"],
  ["%S", "S%"],
];
const ALWAYS_DEDICATED_NDA_SIGNS = new Set(["ි", "ී", "ු", "ූ"]);
const COMPACT_DA_SUFFIX_SIGNS = new Set([
  "ා",
  "ැ",
  "ෑ",
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
const FM_DA_U_ENDINGS = new Map([
  ["ු", "ÿ"],
  ["ූ", "¥"],
]);

function combineLegacyModifier(
  baseLegacy,
  baseTarget,
  modifierLegacy,
  modifierTarget,
) {
  const dedicatedEnding = FM_DA_U_ENDINGS.get(modifierTarget);
  if (
    dedicatedEnding &&
    baseTarget.endsWith("ද") &&
    baseLegacy.endsWith("o")
  ) {
    return baseLegacy.slice(0, -1) + dedicatedEnding;
  }

  return SINHALA_PREBASE_SIGNS.has(modifierTarget)
    ? modifierLegacy + baseLegacy
    : baseLegacy + modifierLegacy;
}

function combineStackedVowel(baseLegacy, baseTarget, sign, prefix, suffix) {
  const dedicatedEnding = FM_DA_U_ENDINGS.get(sign);
  if (
    dedicatedEnding &&
    baseTarget.endsWith("ද") &&
    baseLegacy.endsWith("o")
  ) {
    return baseLegacy.slice(0, -1) + dedicatedEnding;
  }

  return prefix + baseLegacy + suffix;
}

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

        // FM Abhaya has no usable post-base rakar + u/uu sequence. Let these
        // Unicode forms pass through instead of inventing broken %q/%Q forms.
        if (
          baseTarget.endsWith("ර") &&
          (modifierTarget === "ු" || modifierTarget === "ූ")
        ) {
          continue;
        }

        const legacy = combineLegacyModifier(
          baseLegacy,
          baseTarget,
          modifierLegacy,
          modifierTarget,
        );
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

function deriveVisualVowelMappings(baseMappings, seedMappings) {
  const byLegacy = new Map(
    seedMappings.map(({ legacy, unicode }) => [legacy, unicode]),
  );
  const derived = [];

  for (const { legacy: baseLegacy, unicode: baseUnicode } of baseMappings) {
    for (const [sign, prefix, suffix] of FM_STACKED_VOWEL_FORMS) {
      const legacy = prefix + baseLegacy + suffix;
      if (byLegacy.has(legacy)) continue;

      const unicode = baseUnicode + sign;
      byLegacy.set(legacy, unicode);
      derived.push({ legacy, unicode });
    }
  }

  return derived;
}

function deriveSpecialVowelCombinations(seedMappings, legacyAliases) {
  const byLegacy = new Map(
    seedMappings.map(({ legacy, unicode }) => [legacy, unicode]),
  );
  for (const [legacy, unicode] of legacyAliases) {
    if (!byLegacy.has(legacy)) byLegacy.set(legacy, unicode);
  }
  const bases = seedMappings.filter(({ unicode }) => {
    const chars = Array.from(unicode);
    return chars.length === 1 && isSinhalaConsonant(chars[0]);
  });
  const baseLegacyByUnicode = new Map(
    bases.map(({ legacy, unicode }) => [unicode, legacy]),
  );
  const formBySign = new Map(
    FM_STACKED_VOWEL_FORMS.map((form) => [form[0], form]),
  );
  const sourceEntries = [
    ...FM_ABHAYA_MAPPINGS.map((entry, index) => ({
      ...entry,
      sourceRank: 0,
      sourceIndex: index,
    })),
    ...[...legacyAliases].map(([legacy, unicode], index) => ({
      legacy,
      unicode,
      sourceRank: 1,
      sourceIndex: index,
    })),
  ];
  const specialEndings = sourceEntries
    .map(({ legacy, unicode, ...source }) => {
      const [baseUnicode, finalSign, ...rest] = Array.from(unicode);
      const baseLegacy = baseLegacyByUnicode.get(baseUnicode);
      const form = formBySign.get(finalSign);
      if (!baseLegacy || !form || rest.length) return null;

      const [, prefix, suffix] = form;
      const genericLegacy = prefix + baseLegacy + suffix;
      // The historical ඟෙ/ඟෝ cores also seed deliberately stacked vowel
      // signs, even though their spelling now uses the ordinary Õ base slot.
      const isContextualNgaEnding = unicode === "ඟෙ" || unicode === "ඟෝ";
      if (legacy === genericLegacy && !isContextualNgaEnding) return null;

      return {
        legacy,
        unicode,
        ...source,
        combinationLegacy: legacy,
      };
    })
    .filter(Boolean)
    // A visually ordered FM sequence can represent more than one unusual
    // Unicode mark order. Prefer the longest known core when resolving it.
    .sort(
      (left, right) =>
        right.legacy.length - left.legacy.length ||
        left.sourceRank - right.sourceRank ||
        left.sourceIndex - right.sourceIndex,
    );
  const derived = [];

  for (const specialEnding of specialEndings) {
    const [baseUnicode, finalSign] = Array.from(specialEnding.unicode);

    for (const [
      leadingSign,
      prefix,
      suffix,
      shapePrefix,
      shapeSuffix,
    ] of FM_STACKED_VOWEL_FORMS) {
      if (
        ["ු", "ූ"].includes(finalSign) &&
        ["ු", "ූ"].includes(leadingSign)
      ) {
        continue;
      }
      const legacy = prefix + specialEnding.combinationLegacy + suffix;
      const unicode =
        baseUnicode + shapePrefix + finalSign + shapeSuffix;
      if (legacy.length > MAX_DERIVED_LEGACY_SEQUENCE) continue;

      const existing = byLegacy.get(legacy);
      if (existing !== undefined) continue;

      byLegacy.set(legacy, unicode);
      derived.push({
        legacy,
        unicode,
        shapeTargets: [
          shapePrefix,
          baseUnicode + finalSign,
          shapeSuffix,
        ].filter(Boolean),
      });
    }
  }

  return derived;
}

function addNoncanonicalRakarMappings(byLegacy) {
  const canonicalEntries = [...byLegacy];

  // Add complete aliases so a shorter base-plus-vowel match cannot consume the
  // input before the reordered rakar sequence is considered.
  for (const [canonicalSuffix, noncanonicalSuffix] of
    REORDERED_RAKAR_SUFFIXES) {
    for (const [legacy, unicode] of canonicalEntries) {
      if (!legacy.endsWith(canonicalSuffix)) continue;

      const alias =
        legacy.slice(0, -canonicalSuffix.length) + noncanonicalSuffix;
      const existing = byLegacy.get(alias);
      if (existing !== undefined && existing !== unicode) {
        throw new Error(
          `FM Abhaya reordered rakar collision for ${JSON.stringify(alias)}: ` +
            `${JSON.stringify(existing)} vs ${JSON.stringify(unicode)}`,
        );
      }
      byLegacy.set(alias, unicode);
    }
  }

  // Scope a/A aliases to valid base clusters. A global a% swap would corrupt
  // canonical long-vowel forms such as fla% and f;a%.
  for (const [legacy, unicode] of canonicalEntries) {
    if (!isSinhalaBaseCluster(unicode)) continue;
    if (unicode.endsWith("ය") || unicode.endsWith("ර")) continue;

    const target = unicode + SINHALA_RAKAR + SINHALA_VIRAMA;
    for (const virama of ["a", "A"]) {
      const alias = legacy + virama + "%";
      const existing = byLegacy.get(alias);
      if (existing !== undefined && existing !== target) {
        throw new Error(
          `FM Abhaya reordered rakar collision for ${JSON.stringify(alias)}: ` +
            `${JSON.stringify(existing)} vs ${JSON.stringify(target)}`,
        );
      }
      byLegacy.set(alias, target);
    }
  }
}

function preserveInvalidPostRakarUSequences(legacyMap) {
  const rakarBases = [...legacyMap].filter(([, unicode]) =>
    unicode.endsWith(SINHALA_RAKAR),
  );

  for (const [legacy] of rakarBases) {
    for (const suffix of ["q", "Q"]) {
      const legacySequence = legacy + suffix;
      legacyMap.set(legacySequence, legacySequence);
    }
  }
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

function decomposeSinhalaConjuncts(input) {
  const characters = Array.from(String(input ?? ""));

  return characters
    .filter((character, index) => {
      if (
        character !== ZERO_WIDTH_JOINER ||
        characters[index - 1] !== SINHALA_VIRAMA
      ) {
        return true;
      }

      const precedingConsonant = characters[index - 2];
      const followingConsonant = characters[index + 1];
      return (
        precedingConsonant === "ර" ||
        followingConsonant === "ය" ||
        followingConsonant === "ර" ||
        followingConsonant === undefined
      );
    })
    .join("");
}

function decomposeSinhalaTouchingLetters(input) {
  // Unicode writes touching letters as C + ZWJ + virama + C. FM has no
  // separate touching-letter slots, so retain the letters and virama only.
  return String(input ?? "").replace(
    /([\u0d9a-\u0dc6])\u200d(?=්[\u0d9a-\u0dc6])/gu,
    "$1",
  );
}

function applyReducedFormOptions(input, options) {
  let output = String(input ?? "");
  if (options.preserveRepaya === false) {
    output = output.replaceAll(SINHALA_REPAYA, "ර්");
  }
  if (options.preserveYansaya === false) {
    output = output.replaceAll("්‍ය", "්ය");
  }
  if (options.preserveRakaransaya === false) {
    output = output.replaceAll(SINHALA_RAKAR, "්ර");
  }
  return output;
}

function decomposeRakarUForms(input) {
  const characters = Array.from(String(input ?? ""));
  return characters
    .filter((character, index) => {
      if (
        character !== ZERO_WIDTH_JOINER ||
        characters[index - 1] !== SINHALA_VIRAMA ||
        characters[index + 1] !== "ර"
      ) {
        return true;
      }
      return !hasRakarUFormTail(characters, index + 2);
    })
    .join("");
}

function composeRakarUForms(input) {
  const characters = Array.from(String(input ?? ""));
  return characters
    .map((character, index) => {
      if (
        character === SINHALA_VIRAMA &&
        characters[index + 1] === "ර" &&
        hasRakarUFormTail(characters, index + 2)
      ) {
        return character + ZERO_WIDTH_JOINER;
      }
      return character;
    })
    .join("");
}

function hasRakarUFormTail(characters, startIndex) {
  for (let index = startIndex; index < characters.length; index += 1) {
    const character = characters[index];
    if (!isSinhalaStackedSign(character)) return false;
    if (character === "ු" || character === "ූ") return true;
  }
  return false;
}

function isSinhalaStackedSign(character) {
  return character === SINHALA_VIRAMA || SINHALA_DEPENDENT_SIGNS.has(character);
}

function decomposeStackedSinhalaVowelSigns(input) {
  const characters = Array.from(String(input ?? ""));
  return characters
    .map((character, index) => {
      if (
        !["ේ", "ො", "ෝ", "ෞ"].includes(character) ||
        !hasUOrUuInDependentSignRun(characters, index) ||
        (!isSinhalaStackedSign(characters[index - 1]) &&
          !isSinhalaStackedSign(characters[index + 1]))
      ) {
        return character;
      }
      return character.normalize("NFD");
    })
    .join("");
}

function hasUOrUuInDependentSignRun(characters, index) {
  let start = index;
  while (isSinhalaStackedSign(characters[start - 1])) start -= 1;
  for (
    let cursor = start;
    isSinhalaStackedSign(characters[cursor]);
    cursor += 1
  ) {
    if (characters[cursor] === "ු" || characters[cursor] === "ූ") return true;
  }
  return false;
}

function restoreLogicalRepayaFromLegacy(input) {
  const characters = Array.from(String(input ?? ""));
  const output = [];
  for (const character of characters) {
    if (character !== LEGACY_REPAYA_MARKER) {
      output.push(character);
      continue;
    }

    let baseIndex = output.length - 1;
    while (isSinhalaStackedSign(output[baseIndex])) baseIndex -= 1;
    if (
      output[baseIndex] === "ය" &&
      output[baseIndex - 1] === ZERO_WIDTH_JOINER &&
      output[baseIndex - 2] === SINHALA_VIRAMA
    ) {
      baseIndex -= 3;
    }
    if (isSinhalaConsonant(output[baseIndex])) {
      output.splice(baseIndex, 0, ...SINHALA_REPAYA);
    } else {
      output.push(...SINHALA_REPAYA);
    }
  }
  return output.join("");
}

const backtickBaseMappings = [...FM_ABHAYA_LEGACY_ALIASES]
  .filter(
    ([legacy, unicode]) =>
      legacy.startsWith("`") && isSinhalaBaseCluster(unicode),
  )
  .map(([legacy, unicode]) => ({ legacy, unicode }));

const contextualBaseMappings = [
  ...FM_ABHAYA_MAPPINGS.filter(({ unicode }) =>
    ["ඟ", "ඳ"].includes(unicode),
  ),
  ...backtickBaseMappings,
];

const visualVowelMappings = deriveVisualVowelMappings(
  contextualBaseMappings,
  [...FM_ABHAYA_MAPPINGS, ...backtickBaseMappings],
);

const semanticMappings = deriveSemanticMappings([
  ...FM_ABHAYA_MAPPINGS,
  ...backtickBaseMappings,
  ...visualVowelMappings,
]);

export const FM_ABHAYA_DERIVED_MAPPINGS = [
  ...visualVowelMappings,
  ...semanticMappings,
  ...deriveSpecialVowelCombinations(
    [
      ...FM_ABHAYA_MAPPINGS,
      ...visualVowelMappings,
      ...semanticMappings,
    ],
    FM_ABHAYA_LEGACY_ALIASES,
  ),
].map((entry) => ({
  ...entry,
  unicode: decomposeStackedSinhalaVowelSigns(entry.unicode),
}));

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
addNoncanonicalRakarMappings(legacyToUnicodeMap);

const unicodeToLegacyMap = new Map(
  FM_ABHAYA_MAPPINGS.map(({ unicode, legacy }) => [unicode, legacy]),
);
const explicitUnicodeToLegacyMap = new Map(unicodeToLegacyMap);
// Derived mappings fill combinations absent from the explicit source table.
// Explicit mappings keep priority, preserving special glyph sequences such as
// .= for ගු instead of the generic .q decomposition.
for (const { legacy, unicode } of FM_ABHAYA_DERIVED_MAPPINGS) {
  if (!unicodeToLegacyMap.has(unicode)) unicodeToLegacyMap.set(unicode, legacy);
}
for (const [unicode, legacy] of FM_ABHAYA_UNICODE_ALIASES) {
  unicodeToLegacyMap.set(unicode, legacy);
}
// Compose au from existing FM vowel slots only when no dedicated spelling is
// mapped. These text-only fallbacks do not become generated font ligatures.
const compositionalAuMappings = [];
for (const { unicode: base, legacy: baseLegacy } of FM_ABHAYA_MAPPINGS) {
  if (Array.from(base).length !== 1 || !isSinhalaConsonant(base)) continue;
  const target = base + "ෞ";
  if (unicodeToLegacyMap.has(target)) continue;
  const legacy = `f${baseLegacy}!`;
  if (legacyToUnicodeMap.has(legacy)) continue;
  unicodeToLegacyMap.set(target, legacy);
  compositionalAuMappings.push([legacy, target]);
}

const shapeTargetsByLegacy = new Map(
  FM_ABHAYA_DERIVED_MAPPINGS.filter(({ shapeTargets }) => shapeTargets).map(
    ({ legacy, shapeTargets }) => [legacy, shapeTargets],
  ),
);

export const FM_ABHAYA_LEGACY_MAPPINGS = [...legacyToUnicodeMap].map(
  ([legacy, unicode]) => {
    const shapeTargets = shapeTargetsByLegacy.get(legacy);
    return {
      legacy,
      unicode,
      ...(shapeTargets ? { shapeTargets } : {}),
    };
  },
);

const nonCompactDaUnicodeToLegacyMap = new Map(unicodeToLegacyMap);
for (const base of NONCOMPACT_DA_BASES) {
  nonCompactDaUnicodeToLegacyMap.set(base.unicode, base.legacy);
  for (const [sign, prefix, suffix] of FM_STACKED_VOWEL_FORMS) {
    const unicode = base.unicode + sign;
    const dedicatedNdaEnding =
      base.unicode === "ඳ" && ALWAYS_DEDICATED_NDA_SIGNS.has(sign)
        ? explicitUnicodeToLegacyMap.get(unicode)
        : undefined;
    nonCompactDaUnicodeToLegacyMap.set(
      unicode,
      dedicatedNdaEnding ??
        combineStackedVowel(base.legacy, base.unicode, sign, prefix, suffix),
    );
  }
}
const compactDaUnicodeToLegacyMap = new Map(
  nonCompactDaUnicodeToLegacyMap,
);
for (const base of COMPACT_DA_BASES) {
  compactDaUnicodeToLegacyMap.set(base.unicode, base.legacy);
  for (const [sign, prefix, suffix] of FM_STACKED_VOWEL_FORMS) {
    if (!COMPACT_DA_SUFFIX_SIGNS.has(sign)) continue;
    const unicode = base.unicode + sign;
    compactDaUnicodeToLegacyMap.set(
      unicode,
      explicitUnicodeToLegacyMap.get(unicode) ??
        prefix + base.legacy + suffix,
    );
  }
}
for (const [unicode, legacy] of COMPACT_DA_FORMS) {
  compactDaUnicodeToLegacyMap.set(unicode, legacy);
}
for (const [unicode, compactLegacy] of COMPACT_DA_FORMS) {
  const characters = Array.from(unicode);
  const finalSign = characters.at(-1);
  if (!SINHALA_DEPENDENT_SIGNS.has(finalSign)) continue;

  const baseUnicode = characters.slice(0, -1).join("");
  const nonCompactLegacy = nonCompactDaUnicodeToLegacyMap.get(unicode);
  if (!nonCompactLegacy) continue;

  const stackedUnicode = baseUnicode + "ෙ" + finalSign;
  nonCompactDaUnicodeToLegacyMap.set(
    stackedUnicode,
    "f" + nonCompactLegacy,
  );
  compactDaUnicodeToLegacyMap.set(stackedUnicode, "f" + compactLegacy);

  if (finalSign === "ා") {
    nonCompactDaUnicodeToLegacyMap.set(
      baseUnicode + "ෝ",
      "f" + nonCompactLegacy + "a",
    );
    compactDaUnicodeToLegacyMap.set(
      baseUnicode + "ෝ",
      "f" + compactLegacy + "a",
    );
    nonCompactDaUnicodeToLegacyMap.set(
      baseUnicode + "ො",
      "f" + nonCompactLegacy,
    );
    nonCompactDaUnicodeToLegacyMap.set(
      baseUnicode + "ෝ",
      "f" + nonCompactLegacy + "a",
    );
    compactDaUnicodeToLegacyMap.set(
      baseUnicode + "ො",
      "f" + compactLegacy,
    );
    compactDaUnicodeToLegacyMap.set(
      baseUnicode + "ෝ",
      "f" + compactLegacy + "a",
    );
  }
}
preserveInvalidPostRakarUSequences(legacyToUnicodeMap);
const legacyDecodeMap = new Map(legacyToUnicodeMap);
legacyDecodeMap.set("_", LEGACY_REPAYA_MARKER);
legacyDecodeMap.set("–", LEGACY_REPAYA_MARKER);
legacyDecodeMap.set("œ", "්‍ය" + LEGACY_REPAYA_MARKER);
for (const [legacy, target] of compositionalAuMappings) {
  legacyDecodeMap.set(legacy, target);
}
let legacyTrie = buildTrie([...legacyDecodeMap]);

function addSeparatedSpecialUEndingAliases(unicodeMap) {
  const baseLegacyByUnicode = new Map(
    FM_ABHAYA_MAPPINGS.filter(({ unicode }) =>
      Array.from(unicode).length === 1 && isSinhalaConsonant(unicode),
    ).map(({ unicode, legacy }) => [unicode, legacy]),
  );

  for (const { unicode, legacy } of FM_ABHAYA_MAPPINGS) {
    const [base, finalSign, ...rest] = Array.from(unicode);
    if (rest.length || !["ු", "ූ"].includes(finalSign)) continue;
    const baseLegacy = baseLegacyByUnicode.get(base);
    if (!baseLegacy || !legacy.startsWith(baseLegacy)) continue;
    const specialEnding = legacy.slice(baseLegacy.length);
    if (specialEnding !== "=" && specialEnding !== "+") continue;

    for (const [leadingSign, prefix, suffix, shapePrefix, shapeSuffix] of
      FM_STACKED_VOWEL_FORMS) {
      if (["ු", "ූ"].includes(leadingSign)) continue;
      const target = base + shapePrefix + SINHALA_VIRAMA + finalSign + shapeSuffix;
      const source = prefix + baseLegacy + "a" + specialEnding + suffix;
      if (fmToUnicode(source) === target) unicodeMap.set(target, source);
    }
    const target = base + SINHALA_VIRAMA + finalSign;
    const source = baseLegacy + "a" + specialEnding;
    if (fmToUnicode(source) === target) unicodeMap.set(target, source);
  }
}

addSeparatedSpecialUEndingAliases(nonCompactDaUnicodeToLegacyMap);
addSeparatedSpecialUEndingAliases(compactDaUnicodeToLegacyMap);

function addRepayaVowelMappings(unicodeMap) {
  const baseLegacyByUnicode = new Map(
    FM_ABHAYA_MAPPINGS.filter(({ unicode }) =>
      Array.from(unicode).length === 1 && isSinhalaConsonant(unicode),
    ).map(({ unicode, legacy }) => [unicode, legacy]),
  );

  for (const [base, baseLegacy] of baseLegacyByUnicode) {
    const dedicatedLegacy = DEDICATED_REPAYA_BASES.has(base)
      ? unicodeMap.get(SINHALA_REPAYA + base)
      : undefined;
    const mark = TALL_REPAYA_BASES.has(base) ? "–" : "_";

    for (const [sign, prefix, suffix] of [["", "", ""], ...FM_STACKED_VOWEL_FORMS]) {
      const target = SINHALA_REPAYA + base + sign;
      const genericLegacy = prefix + baseLegacy + suffix;
      const syllableLegacy = unicodeMap.get(base + sign) ?? genericLegacy;
      const source = dedicatedLegacy
        ? prefix + dedicatedLegacy + suffix
        : syllableLegacy === genericLegacy
          ? prefix + baseLegacy + mark + suffix
          : syllableLegacy + mark;
      const existing = legacyDecodeMap.get(source);
      if (existing !== undefined && existing !== target) continue;
      unicodeMap.set(target, source);
      legacyDecodeMap.set(source, target);
    }
  }
}

addRepayaVowelMappings(nonCompactDaUnicodeToLegacyMap);
addRepayaVowelMappings(compactDaUnicodeToLegacyMap);
for (const { unicode: base, legacy } of FM_ABHAYA_MAPPINGS) {
  if (Array.from(base).length !== 1 || !isSinhalaConsonant(base)) continue;
  const target = SINHALA_REPAYA + base + "්‍ය";
  nonCompactDaUnicodeToLegacyMap.set(target, legacy + "œ");
  compactDaUnicodeToLegacyMap.set(target, legacy + "œ");
}
legacyTrie = buildTrie([...legacyDecodeMap]);
const unicodeTrie = buildTrie([...nonCompactDaUnicodeToLegacyMap]);
const compactDaUnicodeTrie = buildTrie([...compactDaUnicodeToLegacyMap]);
const conjunctNormalizationMap = new Map();
const conjunctCandidates = [
  ...FM_ABHAYA_MAPPINGS.map(({ unicode }) => unicode),
  ...FM_ABHAYA_DERIVED_MAPPINGS.map(({ unicode }) => unicode),
  ...[...FM_ABHAYA_LEGACY_ALIASES].map(([, unicode]) => unicode),
];
for (const unicode of conjunctCandidates) {
  if (!isSinhalaBaseCluster(unicode)) continue;

  const decomposed = decomposeSinhalaConjuncts(unicode);
  if (decomposed === unicode || conjunctNormalizationMap.has(decomposed)) {
    continue;
  }
  conjunctNormalizationMap.set(decomposed, unicode);
}
const conjunctNormalizationTrie = buildTrie([...conjunctNormalizationMap]);

function normalizeSinhalaConjuncts(input) {
  return convertLongest(input, conjunctNormalizationTrie);
}

export function unicodeToFm(input = "", options = {}) {
  let source =
    options.preserveConjuncts === false
      ? decomposeSinhalaConjuncts(input)
      : input;
  if (options.normalizeConjuncts) {
    source = normalizeSinhalaConjuncts(source);
  }
  source = decomposeSinhalaTouchingLetters(source);
  source = applyReducedFormOptions(source, options);
  source = decomposeRakarUForms(source);
  const trie = options.compactDaForms ? compactDaUnicodeTrie : unicodeTrie;
  return convertLongest(source, trie);
}

export function fmToUnicode(input = "", options = {}) {
  let output = decomposeStackedSinhalaVowelSigns(
    convertLongest(input, legacyTrie),
  );
  output = composeRakarUForms(output);
  output = restoreLogicalRepayaFromLegacy(output);
  if (options.preserveConjuncts === false) {
    output = decomposeSinhalaConjuncts(output);
  }
  output = options.normalizeConjuncts
    ? normalizeSinhalaConjuncts(output)
    : output;
  return applyReducedFormOptions(output, options);
}

const SINHALA_BLOCK_RE = /[\u0d80-\u0dff]/u;
const SINHALA_INDEPENDENT_VOWEL_RE = /[\u0d85-\u0d96]/u;
const SINHALA_CONSONANT_RE = /[\u0d9a-\u0dc6]/u;
const SINHALA_DEPENDENT_VOWEL_RE = /[\u0dcf-\u0ddf\u0df2-\u0df3]/u;
const SINHALA_MODIFIER_RE = /[\u0d82\u0d83]/u;
const UNICODE_LETTER_RE = /\p{L}/u;
const LATIN_LEXEME_RE = /\p{Script=Latin}+(?:['’.-]\p{Script=Latin}+)*/gu;
const LATIN_WORD_RE = /\p{Script=Latin}+(?:['’]\p{Script=Latin}+)*/gu;
const SINHALA_LEXEME_RE = /[\u0d80-\u0dff\u200c\u200d]+/gu;
const COMMON_SHORT_LATIN_WORDS = new Set([
  "a",
  "i",
  "am",
  "an",
  "as",
  "at",
  "be",
  "by",
  "do",
  "go",
  "he",
  "hi",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "no",
  "of",
  "oh",
  "ok",
  "on",
  "or",
  "re",
  "so",
  "to",
  "up",
  "us",
  "vs",
  "we",
]);
const LEGACY_LATIN_WRAPPER_PAIRS = [
  ["^", "&"],
  ["z", "Z"],
  ["—", "˜"],
];
const FM_STRUCTURAL_SIGNAL_RE = /[`%_=+\\|;<>]/u;
const FM_POSITIONAL_PUNCTUATION_LETTER_RE = /(?:^,|\.(?=.))/u;
const FM_STRUCTURAL_ASCII_SEQUENCES = new Set([
  "Cj",
  "CI",
  "Cè",
  "F:",
  "Fj",
  "J:",
  "Jo",
  "JO",
  "Jj",
]);
const FM_STANDALONE_LEGACY_SYMBOLS = new Set([
  ")",
  "Ÿ",
  "¤",
  "¡",
  "¶",
  "·",
  "∙",
  "»",
  "¼",
  "½",
  "¸",
  "¹",
  "º",
  "Ã",
  "”",
  "•",
]);

function containsSinhala(text) {
  return Array.from(String(text ?? "")).some((character) =>
    SINHALA_BLOCK_RE.test(character),
  );
}

function isNonSinhalaLetter(character) {
  return UNICODE_LETTER_RE.test(character) &&
    !SINHALA_BLOCK_RE.test(character);
}

function isDistinctiveLegacyCharacter(character) {
  const target = legacyToUnicodeMap.get(character);
  return (
    target !== undefined &&
    character.codePointAt(0) > 0x7f &&
    target !== character
  );
}

function hasDistinctiveLegacyCharacter(input) {
  return Array.from(String(input ?? "")).some(isDistinctiveLegacyCharacter);
}

function hasLegacyTerminalPunctuation(input) {
  const terminal = Array.from(String(input ?? "")).at(-1);
  if (!terminal) return false;
  const target = legacyToUnicodeMap.get(terminal);
  return (
    target !== undefined &&
    target !== terminal &&
    /^[\p{P}\p{S}]+$/u.test(target)
  );
}

function hasLatinCaseSignal(word) {
  return (
    /^\p{Lu}{2,}$/u.test(word) ||
    /^\p{Lu}\p{Ll}{2,}$/u.test(word) ||
    /\p{Ll}\p{Lu}/u.test(word)
  );
}

function isSinhalaTerminalInflection(input) {
  const characters = Array.from(input);
  if (!characters.length) return false;
  const startsWithConsonant = SINHALA_CONSONANT_RE.test(characters[0]);
  if (startsWithConsonant) characters.shift();
  if (!characters.length) return startsWithConsonant;
  return (
    characters.every(
      (character) =>
        SINHALA_DEPENDENT_VOWEL_RE.test(character) ||
        character === "්" ||
        character === "\u200c" ||
        character === "\u200d" ||
        SINHALA_MODIFIER_RE.test(character),
    )
  );
}

function countSinhalaBaseLetters(input) {
  return Array.from(input).filter(
    (character) =>
      SINHALA_INDEPENDENT_VOWEL_RE.test(character) ||
      SINHALA_CONSONANT_RE.test(character),
  ).length;
}

function hasStrongDecodedSinhalaStructure(input, isKnownLatin) {
  let core = input;
  while (hasLegacyTerminalPunctuation(core)) core = core.slice(0, -1);
  const decoded = fmToUnicode(core);
  const mappedConsonantPunctuationCount = Array.from(core).filter((character) => {
    const target = legacyToUnicodeMap.get(character);
    return (
      /^[\p{P}\p{S}]$/u.test(character) &&
      Array.from(target ?? "").length === 1 &&
      isSinhalaConsonant(target)
    );
  }).length;
  const dependentVowelCount = Array.from(decoded).filter((character) =>
    SINHALA_DEPENDENT_VOWEL_RE.test(character),
  ).length;
  const baseLetterCount = countSinhalaBaseLetters(decoded);
  const hasDistinctiveCharacter = hasDistinctiveLegacyCharacter(core);
  const hasShortFmStructure =
    mappedConsonantPunctuationCount >= 2 ||
    (mappedConsonantPunctuationCount > 0 && dependentVowelCount >= 2) ||
    (hasDistinctiveCharacter &&
      (dependentVowelCount >= 2 ||
        (decoded.endsWith("්") && dependentVowelCount > 0)));
  return (
    isWellFormedSinhalaToken(decoded) &&
    (baseLetterCount >= 3 || (baseLetterCount >= 2 && hasShortFmStructure)) &&
    (hasDistinctiveCharacter ||
      mappedConsonantPunctuationCount > 0 ||
      (!isKnownLatin &&
        !/\p{Ll}\p{Lu}/u.test(core) &&
        dependentVowelCount >= 2))
  );
}

function classifySinhalaLexeme(lexeme) {
  if (hasSinhalaLexeme(lexeme)) return "exact";

  const characters = Array.from(lexeme);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const stem = characters.slice(0, index).join("");
    const ending = characters.slice(index).join("");
    const stemBaseCount = countSinhalaBaseLetters(stem);
    if (
      stemBaseCount >= 2 &&
      isSinhalaTerminalInflection(ending) &&
      hasSinhalaLexeme(stem)
    ) {
      return stemBaseCount >= 3 ? "inflected" : "weakly-inflected";
    }
  }
  return null;
}

function classifyDecodedSinhalaToken(token) {
  const sinhalaLexemes = fmToUnicode(token).match(SINHALA_LEXEME_RE) ?? [];
  if (!sinhalaLexemes.length) return null;

  let confidence = "exact";
  for (const lexeme of sinhalaLexemes) {
    if (!isWellFormedSinhalaToken(lexeme)) return null;
    const classification = classifySinhalaLexeme(lexeme);
    if (!classification) return null;
    if (classification === "weakly-inflected") {
      confidence = "weakly-inflected";
    } else if (classification === "inflected" && confidence === "exact") {
      confidence = "inflected";
    }
  }
  return confidence;
}

function isKnownDecodedSinhalaToken(token) {
  return classifyDecodedSinhalaToken(token) !== null;
}

function isLikelyLatinPhrase(input) {
  const source = String(input ?? "");
  const words = source.match(LATIN_WORD_RE) ?? [];
  if (!words.length || hasDistinctiveLegacyCharacter(source)) return false;
  if (FM_STRUCTURAL_SIGNAL_RE.test(source)) return false;

  const decodedSinhalaLexemes =
    fmToUnicode(source).match(SINHALA_LEXEME_RE) ?? [];
  const knownDecodedSinhalaCount = decodedSinhalaLexemes.filter(
    (lexeme) =>
      isWellFormedSinhalaToken(lexeme) && hasSinhalaLexeme(lexeme),
  ).length;
  if (
    knownDecodedSinhalaCount >= 2 ||
    (knownDecodedSinhalaCount > 0 &&
      knownDecodedSinhalaCount === decodedSinhalaLexemes.length)
  ) {
    return false;
  }

  const remainder = source.replace(LATIN_WORD_RE, "");
  if (!/^[\p{N}\p{P}\p{S}\s]*$/u.test(remainder)) return false;
  if (words.every(isKnownDecodedSinhalaToken)) return false;

  return words.some(
    (word) => hasEnglishLexeme(word) || hasLatinCaseSignal(word),
  );
}

function isWellFormedSinhalaToken(input) {
  let state = "start";
  for (const character of Array.from(String(input ?? ""))) {
    if (SINHALA_INDEPENDENT_VOWEL_RE.test(character)) {
      if (state === "halant" || state === "joiner") return false;
      state = "independent-vowel";
    } else if (SINHALA_CONSONANT_RE.test(character)) {
      state = "consonant";
    } else if (SINHALA_DEPENDENT_VOWEL_RE.test(character)) {
      if (state !== "consonant") return false;
      state = "vowel-sign";
    } else if (character === "්") {
      if (state !== "consonant") return false;
      state = "halant";
    } else if (character === "\u200c" || character === "\u200d") {
      if (state !== "halant") return false;
      state = "joiner";
    } else if (SINHALA_MODIFIER_RE.test(character)) {
      if (
        state !== "consonant" &&
        state !== "vowel-sign" &&
        state !== "independent-vowel"
      ) {
        return false;
      }
      state = "modifier";
    } else {
      return false;
    }
  }
  return state !== "start" && state !== "joiner";
}

function classifyLexiconToken(token) {
  const latinLexemes = token.match(LATIN_LEXEME_RE) ?? [];
  const isSingleLatinLexeme =
    latinLexemes.length === 1 && latinLexemes[0] === token;
  const isKnownLatin = isSingleLatinLexeme && hasEnglishLexeme(token);
  if (
    isSingleLatinLexeme &&
    /^\p{Lu}{2,}$/u.test(token) &&
    !FM_STRUCTURAL_ASCII_SEQUENCES.has(token)
  ) {
    return "latin";
  }

  const decodedSinhalaClassification = classifyDecodedSinhalaToken(token);
  const isKnownSinhala = decodedSinhalaClassification !== null;
  const normalizedLatin = token.toLocaleLowerCase("en");
  const isAmbiguousShortLatin =
    isSingleLatinLexeme &&
    Array.from(token).length <= 2 &&
    !COMMON_SHORT_LATIN_WORDS.has(normalizedLatin);
  if (
    isKnownSinhala &&
    isKnownLatin &&
    (COMMON_SHORT_LATIN_WORDS.has(normalizedLatin) ||
      decodedSinhalaClassification !== "exact")
  ) {
    return "latin";
  }
  if (
    decodedSinhalaClassification === "weakly-inflected" &&
    isSingleLatinLexeme &&
    !hasLegacyTerminalPunctuation(token) &&
    !(hasDistinctiveLegacyCharacter(token) &&
      fmToUnicode(token).endsWith("්")) &&
    Array.from(token).some((character) => character.codePointAt(0) > 0x7f)
  ) {
    return "latin";
  }
  if (isKnownSinhala) return "legacy";
  if (isAmbiguousShortLatin) return "legacy";
  if (isKnownLatin) return "latin";
  if (hasStrongDecodedSinhalaStructure(token, isKnownLatin)) return "legacy";

  const legacyWrappedLatin = splitLegacyWrappedLatin(token);
  if (legacyWrappedLatin) return "latin-wrapped";
  if (token.startsWith("z")) return null;

  const wrappedLatinWords = token.match(LATIN_WORD_RE) ?? [];
  if (
    wrappedLatinWords.length > 0 &&
    !hasDistinctiveLegacyCharacter(token) &&
    !FM_POSITIONAL_PUNCTUATION_LETTER_RE.test(token) &&
    !FM_STRUCTURAL_SIGNAL_RE.test(token) &&
    wrappedLatinWords.every(
      (word) => hasEnglishLexeme(word) || hasLatinCaseSignal(word),
    )
  ) {
    if (/^["']|["']$/u.test(token)) return "latin-wrapped";
    return "latin";
  }

  // Extended Latin words are preserved unless their FM decoding was already
  // confirmed above. Plain ASCII remains Legacy-by-default in the Legacy box.
  if (
    isSingleLatinLexeme &&
    !FM_POSITIONAL_PUNCTUATION_LETTER_RE.test(token) &&
    !FM_STRUCTURAL_SIGNAL_RE.test(token) &&
    Array.from(token).some((character) => character.codePointAt(0) > 0x7f)
  ) {
    return "latin";
  }
  return null;
}

function splitLegacyWrappedLatin(token) {
  for (const [opening, closing] of LEGACY_LATIN_WRAPPER_PAIRS) {
    if (!token.startsWith(opening) || !token.endsWith(closing)) continue;
    const content = token.slice(opening.length, -closing.length);
    if (content && hasEnglishLexeme(content)) {
      return { opening, content, closing };
    }
  }
  return null;
}

export function isLikelyFmSinhalaToken(input = "") {
  const token = String(input ?? "");
  if (!token || /^\s+$/u.test(token) || containsSinhala(token)) return false;
  if (
    Array.from(token).some(
      (character) =>
        isNonSinhalaLetter(character) &&
        character.codePointAt(0) > 0x7f &&
        !isDistinctiveLegacyCharacter(character),
    )
  ) {
    return false;
  }
  const lexiconClassification = classifyLexiconToken(token);
  if (lexiconClassification !== null) {
    return lexiconClassification !== "latin";
  }
  if (Array.from(token).some(isDistinctiveLegacyCharacter)) return true;
  if (FM_STRUCTURAL_SIGNAL_RE.test(token)) {
    return containsSinhala(fmToUnicode(token));
  }
  if (FM_POSITIONAL_PUNCTUATION_LETTER_RE.test(token)) {
    return isWellFormedSinhalaToken(fmToUnicode(token));
  }
  if (
    FM_STRUCTURAL_ASCII_SEQUENCES.has(token) ||
    (FM_STANDALONE_LEGACY_SYMBOLS.has(token) &&
      fmToUnicode(token) !== token)
  ) {
    return true;
  }
  return true;
}

function mergeConversionSegments(segments) {
  const merged = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous?.useLegacyFont === segment.useLegacyFont) {
      previous.source += segment.source;
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function normalizeStraightQuotePairs(input) {
  const characters = Array.from(String(input ?? ""));
  for (const [straight, opening, closing] of [
    ["'", "‘", "’"],
    ['"', "“", "”"],
  ]) {
    let openingIndex = null;
    for (let index = 0; index < characters.length; index += 1) {
      if (characters[index] !== straight) continue;

      const previous = characters[index - 1] ?? "";
      const next = characters[index + 1] ?? "";
      if (
        straight === "'" &&
        /\p{Script=Latin}/u.test(previous) &&
        /\p{Script=Latin}/u.test(next)
      ) {
        continue;
      }

      if (openingIndex === null) {
        openingIndex = index;
      } else {
        characters[openingIndex] = opening;
        characters[index] = closing;
        openingIndex = null;
      }
    }
  }
  return characters.join("");
}

function removeOrphanJoiners(input) {
  const characters = Array.from(String(input ?? ""));
  return characters
    .filter((character, index) => {
      if (character !== "\u200c" && character !== "\u200d") return true;
      if (
        SINHALA_DEPENDENT_SIGNS.has(characters[index - 1]) ||
        (SINHALA_DEPENDENT_SIGNS.has(characters[index + 1]) &&
          characters[index - 1] !== SINHALA_VIRAMA)
      ) {
        return false;
      }
      const neighborRe = /[\p{L}\p{M}\p{S}]/u;
      return (
        neighborRe.test(characters[index - 1] ?? "") ||
        neighborRe.test(characters[index + 1] ?? "")
      );
    })
    .join("");
}

export function unicodeToFmSegments(input = "", options = {}) {
  const segments = [];
  let source = "";
  let shouldConvert = null;

  const flush = () => {
    if (!source) return;
    const text = shouldConvert ? unicodeToFm(source, options) : source;
    segments.push({
      source,
      text,
      useLegacyFont:
        Boolean(shouldConvert) &&
        (text !== source || containsSinhala(source)),
    });
    source = "";
  };

  const normalizedInput = normalizeStraightQuotePairs(
    removeOrphanJoiners(input),
  );
  const characters = Array.from(normalizedInput);
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    let beforeSlash = index - 1;
    let afterSlash = index + 1;
    if (character === "/") {
      while (beforeSlash >= 0 && /[\p{Zs}\t]/u.test(characters[beforeSlash])) {
        beforeSlash -= 1;
      }
      while (afterSlash < characters.length && /[\p{Zs}\t]/u.test(characters[afterSlash])) {
        afterSlash += 1;
      }
    }
    const isLatinWordSlash =
      character === "/" &&
      /\p{Script=Latin}/u.test(characters[beforeSlash] ?? "") &&
      /\p{Script=Latin}/u.test(characters[afterSlash] ?? "");
    const nextShouldConvert =
      !isNonSinhalaLetter(character) && !isLatinWordSlash;
    if (shouldConvert !== null && shouldConvert !== nextShouldConvert) {
      flush();
    }
    shouldConvert = nextShouldConvert;
    source += character;
  }
  flush();
  return mergeConversionSegments(segments);
}

function decodeLegacySlashesInLatinContent(input) {
  return input.replace(
    /(?<=\p{Script=Latin})([\p{Zs}\t]*)\$([\p{Zs}\t]*)(?=\p{Script=Latin})/gu,
    (_, before, after) => `${before}/${after}`,
  );
}

function convertWrappedLatinToken(source, options) {
  const legacyWrapper = splitLegacyWrappedLatin(source);
  if (legacyWrapper) {
    return [
      {
        source: legacyWrapper.opening,
        text: fmToUnicode(legacyWrapper.opening, options),
        useLegacyFont: true,
      },
      {
        source: legacyWrapper.content,
        text: decodeLegacySlashesInLatinContent(legacyWrapper.content),
        useLegacyFont: false,
      },
      {
        source: legacyWrapper.closing,
        text: fmToUnicode(legacyWrapper.closing, options),
        useLegacyFont: true,
      },
    ];
  }

  const segments = [];
  let offset = 0;

  for (const match of source.matchAll(LATIN_WORD_RE)) {
    if (match.index > offset) {
      const wrapper = source.slice(offset, match.index);
      segments.push({
        source: wrapper,
        text: fmToUnicode(wrapper, options),
        useLegacyFont: true,
      });
    }
    segments.push({
      source: match[0],
      text: match[0],
      useLegacyFont: false,
    });
    offset = match.index + match[0].length;
  }
  if (offset < source.length) {
    const wrapper = source.slice(offset);
    segments.push({
      source: wrapper,
      text: fmToUnicode(wrapper, options),
      useLegacyFont: true,
    });
  }
  return segments;
}

const LEGACY_SPANNING_WRAPPERS = [
  { opening: "^", closing: "&" },
  { opening: "z", closing: "Z" },
  { opening: "—", closing: "˜" },
  { opening: "z", closing: "z", closingText: "’" },
];

function findNextLegacyWrapper(source, offset) {
  for (let index = offset; index < source.length; index += 1) {
    for (const wrapper of LEGACY_SPANNING_WRAPPERS) {
      if (!source.startsWith(wrapper.opening, index)) continue;
      if (wrapper.opening === "z") {
        const latinWord = source.slice(index).match(/^\p{Script=Latin}+/u)?.[0];
        if (
          /\p{Script=Latin}/u.test(source[index - 1] ?? "") ||
          (latinWord && hasEnglishLexeme(latinWord))
        ) {
          continue;
        }
      }

      const closingIndex = source.indexOf(
        wrapper.closing,
        index + wrapper.opening.length,
      );
      const lineEnd = source.indexOf("\n", index + wrapper.opening.length);
      if (closingIndex >= 0 && (lineEnd < 0 || closingIndex < lineEnd)) {
        const content = source.slice(
          index + wrapper.opening.length,
          closingIndex,
        );
        return {
          ...wrapper,
          index,
          closingIndex,
          content,
          preserveContent: isLikelyLatinPhrase(content),
        };
      }
    }
  }
  return null;
}

function convertUnwrappedLegacyText(input, options) {
  const parts = String(input ?? "").match(/\s+|[^\s]+/gu) ?? [];
  return parts.flatMap((source, index) => {
    const previousToken = /^\s+$/u.test(parts[index - 1] ?? "")
      ? parts[index - 2]
      : parts[index - 1];
    const nextToken = /^\s+$/u.test(parts[index + 1] ?? "")
      ? parts[index + 2]
      : parts[index + 1];
    if (/^[A-Z]$/u.test(source) && nextToken === "-") {
      return { source, text: source, useLegacyFont: false };
    }
    const classification = classifyLexiconToken(source);
    if (classification === "latin-wrapped") {
      return convertWrappedLatinToken(source, options);
    }
    let useLegacyFont = isLikelyFmSinhalaToken(source);
    if (
      useLegacyFont &&
      /^\p{Lu}\p{Ll}{1,2}$/u.test(source) &&
      /^\p{Lu}\p{Ll}{2,}$/u.test(nextToken ?? "") &&
      !isLikelyFmSinhalaToken(nextToken)
    ) {
      useLegacyFont = false;
    }
    if (
      !useLegacyFont &&
      classification === "latin" &&
      source.length <= 4 &&
      /^\p{Script=Latin}+$/u.test(source)
    ) {
      const decoded = fmToUnicode(source);
      // A short Latin word may also be a complete FM syllable. Resolve that
      // collision only inside an otherwise confirmed Sinhala run.
      const isShortFmSyllable =
        isWellFormedSinhalaToken(decoded) &&
        countSinhalaBaseLetters(decoded) === 1 &&
        SINHALA_DEPENDENT_VOWEL_RE.test(decoded) &&
        hasSinhalaLexeme(decoded);
      const isCaseEncodedHalant =
        /^[a-z][A-Z]a$/u.test(source) &&
        isWellFormedSinhalaToken(decoded) &&
        countSinhalaBaseLetters(decoded) === 2 &&
        decoded.endsWith("්");
      const previousIsLegacy = Boolean(
        previousToken && isLikelyFmSinhalaToken(previousToken),
      );
      const nextIsLegacy = Boolean(
        nextToken && isLikelyFmSinhalaToken(nextToken),
      );
      useLegacyFont =
        (isShortFmSyllable && previousIsLegacy && nextIsLegacy) ||
        (isCaseEncodedHalant && (previousIsLegacy || nextIsLegacy));
    }
    return {
      source,
      text: useLegacyFont ? fmToUnicode(source, options) : source,
      useLegacyFont,
    };
  });
}

export function fmToUnicodeSegments(input = "", options = {}) {
  const source = String(input ?? "");
  const segments = [];
  let offset = 0;
  let wrapper = findNextLegacyWrapper(source, offset);

  while (wrapper) {
    segments.push(
      ...convertUnwrappedLegacyText(source.slice(offset, wrapper.index), options),
      {
        source: wrapper.opening,
        text: fmToUnicode(wrapper.opening, options),
        useLegacyFont: true,
      },
      ...(wrapper.preserveContent
        ? [{
            source: wrapper.content,
            text: decodeLegacySlashesInLatinContent(wrapper.content),
            useLegacyFont: false,
          }]
        : convertUnwrappedLegacyText(wrapper.content, options)),
      {
        source: wrapper.closing,
        text:
          wrapper.closingText ?? fmToUnicode(wrapper.closing, options),
        useLegacyFont: true,
      },
    );
    offset = wrapper.closingIndex + wrapper.closing.length;
    wrapper = findNextLegacyWrapper(source, offset);
  }

  segments.push(...convertUnwrappedLegacyText(source.slice(offset), options));
  return mergeConversionSegments(segments);
}

export function unicodeToFmPreservingNonSinhala(input = "", options = {}) {
  return unicodeToFmSegments(input, options)
    .map(({ text }) => text)
    .join("");
}

export function fmToUnicodePreservingNonSinhala(input = "", options = {}) {
  return fmToUnicodeSegments(input, options)
    .map(({ text }) => text)
    .join("");
}

export function detectSinhalaEncoding(input = "") {
  const text = String(input ?? "");
  if (containsSinhala(text)) return "unicode";
  return fmToUnicodeSegments(text).some(({ useLegacyFont }) => useLegacyFont)
    ? "legacy"
    : null;
}

export {
  FM_ABHAYA_LEGACY_ALIASES,
  FM_ABHAYA_MAPPINGS,
  FM_ABHAYA_UNICODE_ALIASES,
};
