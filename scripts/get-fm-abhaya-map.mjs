import {
  FM_ABHAYA_LEGACY_MAPPINGS,
  fmToUnicode,
} from "../src/utils/sinhala/converter.js";

// Complete semantic sequences are produced by the same converter module used
// by the application, so text conversion and font GSUB generation cannot drift.
const byLegacy = new Map(
  FM_ABHAYA_LEGACY_MAPPINGS.filter(
    // Backtick is a universal independently positioned braid in the display
    // fonts. Its semantic combinations belong to text conversion only and
    // must not become font ligatures.
    ({ legacy }) => !legacy.includes("`") || legacy.length === 1,
  ).map(({ legacy, unicode }) => [legacy, unicode]),
);
const shapeTargetsByLegacy = new Map(
  FM_ABHAYA_LEGACY_MAPPINGS.filter(({ shapeTargets }) => shapeTargets).map(
    ({ legacy, shapeTargets }) => [legacy, shapeTargets],
  ),
);

function add(legacy, unicode) {
  if (!legacy || byLegacy.has(legacy)) return;
  byLegacy.set(legacy, unicode);
}

// Keep printable ASCII usable. FM slots carrying Sinhala/punctuation decode via
// the canonical converter; untouched slots remain ordinary ASCII.
for (let codePoint = 32; codePoint <= 126; codePoint += 1) {
  const legacy = String.fromCodePoint(codePoint);
  add(legacy, fmToUnicode(legacy));
}

// Include every individual Windows-1252-style character used by a sequence so
// the Python generator can build cmap inputs for all GSUB rules.
for (const sequence of [...byLegacy.keys()]) {
  for (const character of sequence) add(character, fmToUnicode(character));
}

const mapping = [...byLegacy]
  .map(([legacy, unicode]) => ({
    legacy,
    unicode,
    ...(shapeTargetsByLegacy.has(legacy)
      ? { shapeTargets: shapeTargetsByLegacy.get(legacy) }
      : {}),
  }))
  .sort((left, right) => {
    if (left.legacy.length !== right.legacy.length) {
      return right.legacy.length - left.legacy.length;
    }
    return left.legacy.localeCompare(right.legacy, "en");
  });

process.stdout.write(JSON.stringify(mapping));
