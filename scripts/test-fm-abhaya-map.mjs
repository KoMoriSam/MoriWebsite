import assert from "node:assert/strict";
import {
  FM_ABHAYA_DERIVED_MAPPINGS,
  FM_ABHAYA_MAPPINGS,
  fmToUnicode,
  unicodeToFm,
} from "../src/utils/sinhala-font-converter.js";

for (const { unicode, legacy } of FM_ABHAYA_MAPPINGS) {
  assert.equal(
    unicodeToFm(unicode),
    legacy,
    `Unicode -> FM mismatch for ${JSON.stringify(unicode)}`,
  );
  assert.equal(
    fmToUnicode(legacy),
    unicode,
    `FM -> Unicode mismatch for ${JSON.stringify(legacy)}`,
  );
}

for (const { unicode, legacy } of FM_ABHAYA_DERIVED_MAPPINGS) {
  assert.equal(fmToUnicode(legacy), unicode, `derived FM decode: ${legacy}`);
  assert.equal(
    fmToUnicode(unicodeToFm(unicode)),
    unicode,
    `derived Unicode round trip: ${unicode}`,
  );
  assert.equal(legacy.includes("\u200d"), false, "legacy output must not contain ZWJ");
  assert.equal(
    Array.from(legacy).some((character) => {
      const cp = character.codePointAt(0);
      return cp >= 0xff00 && cp <= 0xffef;
    }),
    false,
    "legacy output must not contain temporary fullwidth placeholders",
  );
}

const cases = [
  ["ගු", ".="],
  ["තු", ";="],
  ["කූ", "l+"],
  ["කි", "ls"],
  ["ක්‍රි", "l%s"],
  ["ක්‍රී", "l%S"],
  ["කෙ", "fl"],
  ["කො", "fld"],
  ["ඛෙ", "fL"],
  ["ඪේ", "fVa"],
  ["ඬො", "f~d"],
  ["ලු", "¨"],
  ["ඪී", "Ð"],
  ["ඞ්", "Ù"],
  ["ඡි", "ý"],
  ["ෆේ", "f*a"],
  ["ක්‍ෂ", "CI"],
  ["ක්‍ෂ්‍යෙ", "fCIH"],
  ["(", "^"],
  [")", "&"],
  ["‘", "z"],
  ["’", "Z"],
  ["“", "—"],
  ["”", "˜"],
];

for (const [unicode, legacy] of cases) {
  assert.equal(unicodeToFm(unicode), legacy, `${unicode} -> ${legacy}`);
  assert.equal(fmToUnicode(legacy), unicode, `${legacy} -> ${unicode}`);
}

// Straight quotes do not have distinct FM Abhaya slots; normalize them to the
// corresponding smart-quote slots instead of emitting hidden ZWJ placeholders.
assert.equal(unicodeToFm("'"), "z");
assert.equal(unicodeToFm('"'), "˜");

// Known unsupported FM Abhaya letters must remain untouched rather than being
// silently converted into another Sinhala character.
assert.equal(unicodeToFm("ඞී"), "ඞී");
assert.equal(unicodeToFm("ඞි"), "ඞි");
assert.equal(unicodeToFm("ඣ්"), "ඣ්");

const sentence = "(‘ගු’ සහ “තු”)";
assert.equal(fmToUnicode(unicodeToFm(sentence)), sentence);

console.log(`OK: ${FM_ABHAYA_MAPPINGS.length} canonical + ${FM_ABHAYA_DERIVED_MAPPINGS.length} derived mappings + regression cases.`);
