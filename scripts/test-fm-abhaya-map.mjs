import assert from "node:assert/strict";
import { SINHALA_CONJUNCT_CATEGORIES } from "../src/utils/sinhala/conjuncts.js";
import { hasEnglishWordForm } from "../src/utils/sinhala/lexicon.js";
import {
  detectSinhalaEncoding,
  FM_ABHAYA_DERIVED_MAPPINGS,
  FM_ABHAYA_MAPPINGS,
  fmToUnicode,
  fmToUnicodePreservingNonSinhala,
  fmToUnicodeSegments,
  unicodeToFm,
  unicodeToFmPreservingNonSinhala,
  unicodeToFmSegments,
} from "../src/utils/sinhala/converter.js";

const explicitFmForms = new Map(FM_ABHAYA_MAPPINGS.map(({ unicode, legacy }) => [unicode, legacy]));
for (const { unicode: base, legacy: baseLegacy } of FM_ABHAYA_MAPPINGS) {
  if (base === "ර" || Array.from(base).length !== 1 || !/[\u0d9a-\u0dc6]/u.test(base)) continue;
  for (const [sign, prefix, ending] of [["ි", "", "s"], ["ී", "", "S"], ["ේ", "f", "a"]]) {
    const core = explicitFmForms.get(base + sign);
    if (!core || core === prefix + baseLegacy + ending) continue;
    for (const [reduced, suffix] of [["්‍ය", "H"], ["්‍ර", "%"]]) {
      const unicode = base + reduced + sign;
      const legacy = explicitFmForms.get(unicode) ?? core + suffix;
      assert.equal(unicodeToFm(unicode), legacy, `${unicode}: dedicated vowel core must precede reduced suffix`);
      assert.equal(fmToUnicode(legacy), unicode, `${legacy}: dedicated reduced-vowel core must decode as one cluster`);
      assert.equal(fmToUnicodePreservingNonSinhala(legacy), unicode, `${legacy}: mixed reduced-vowel decoding`);
    }
  }
}

for (const { unicode, legacy } of FM_ABHAYA_MAPPINGS) {
  if (!unicode.startsWith("ඳ")) {
    assert.equal(
      unicodeToFm(unicode),
      legacy,
      `Unicode -> FM mismatch for ${JSON.stringify(unicode)}`,
    );
  }
  assert.equal(
    fmToUnicode(legacy),
    unicode,
    `FM -> Unicode mismatch for ${JSON.stringify(legacy)}`,
  );
}

for (const { unicode, legacy } of FM_ABHAYA_DERIVED_MAPPINGS) {
  const normalizedUnicode = unicode
    .replace(
      /(?<![්\u0dcf-\u0ddf\u0df2-\u0df3])ෝ(?![්\u0dcf-\u0ddf\u0df2-\u0df3])/gu,
      "ෝ",
    )
    .replace(
      /(?<![්\u0dcf-\u0ddf\u0df2-\u0df3])ො(?![්\u0dcf-\u0ddf\u0df2-\u0df3])/gu,
      "ො",
    );
  assert.equal(fmToUnicode(legacy), normalizedUnicode, `derived FM decode: ${legacy}`);
  assert.equal(
    fmToUnicode(unicodeToFm(unicode)),
    normalizedUnicode,
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

assert.ok(
  FM_ABHAYA_DERIVED_MAPPINGS.filter(({ shapeTargets }) => shapeTargets).length >= 1481,
  "all dedicated vowel-ending combinations must retain their shaped core",
);
assert.equal(
  FM_ABHAYA_DERIVED_MAPPINGS.some(({ legacy }) =>
    /[=+][qQ]|[qQ][=+]/u.test(legacy),
  ),
  false,
  "dedicated u/uu endings must not be combined with generic q/Q endings",
);

const cases = [
  ["ගු", ".="],
  ["තු", ";="],
  ["කූ", "l+"],
  ["කි", "ls"],
  ["ක්‍රි", "l%s"],
  ["ක්‍රී", "l%S"],
  ["ට්‍රි", "á%"],
  ["ට්‍රී", "à%"],
  ["ට්‍රේ", "fÜ%"],
  ["ක්‍ර්", "l%a"],
  ["ගෙු", "f.="],
  ["ගෙූ", "f.+"],
  ["කෙු", "fl="],
  ["තෙූ", "f;+"],
  ["දෙු", "fÿ"],
  ["රෙූ", "frE"],
  ["ලෙු", "f¨"],
  ["ළෙු", "f¿"],
  ["ළූ", "¿E"],
  ["ඛෙි", "fÅ"],
  ["ඛෙී", "fÇ"],
  ["ඛේා", "fÄd"],
  ["රෙැ", "f/"],
  ["රෙෑ", "f?"],
  ["ඟෛ", "ffÕ"],
  ["ඟෙෝ", "ffÕda"],
  ["කෙ", "fl"],
  ["කො", "fld"],
  ["ඛෙ", "fL"],
  ["ඪේ", "fVa"],
  ["ඬො", "f~d"],
  ["ලු", "¨"],
  ["ඪී", "Ð"],
  ["ඞ්", "Ù"],
  ["ඡි", "ý"],
  ["ඤූ", "ü"],
  ["ඪි", "Î"],
  ["ඎ", "RD"],
  ["ඏ", "Ì"],
  ["ද්‍ව", "„"],
  ["ද්‍ධ", "Š"],
  ["ද්‍ධි", "‹"],
  ["ද්‍වි", "‰"],
  ["ෆේ", "f*a"],
  ["ක්‍ව", "Cj"],
  ["ක්‍ෂ", "CI"],
  ["ත්‍ථ", "F:"],
  ["ත්‍ව", "Fj"],
  ["න්‍ථ", "J:"],
  ["න්‍ද", "Jo"],
  ["න්‍ධ", "JO"],
  ["න්‍ව", "Jj"],
  ["න්‍වි", "Jú"],
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

const noncanonicalLegacyCases = [
  ["\\", "ඳා"],
  ["œ", "\u0dca\u200d\u0dba\u0dbb\u0dca\u200d"],
  ["`.", "ඟ"],
  ["`c", "ඦ"],
  ["`v", "ඬ"],
  ["`o", "ඳ"],
  ["`j", "ද්‍ව"],
  ["`O", "ද්‍ධ"],
  ["`G", "ට්‍ඨ"],
  ["f`.", "ඟෙ"],
  ["`.s", "ඟි"],
  ["µ", "ද්‍ය"],
  ["μ", "ද්‍ය"],
  [")", "*"],
  ["_", "ර්‍"],
  ["–", "ර්‍"],
  ["‘", "ි"],
  ["’", "ී"],
  ["ls%", "ක්‍රි"],
  ["lS%", "ක්‍රී"],
  [";s%", "ත්‍රි"],
  [";S%", "ත්‍රී"],
  ["la%", "ක්‍ර්"],
  ["lA%", "ක්‍ර්"],
  [";a%", "ත්‍ර්"],
  [";A%", "ත්‍ර්"],
];

for (const [legacy, unicode] of noncanonicalLegacyCases) {
  assert.equal(fmToUnicode(legacy), unicode, `${legacy} -> ${unicode}`);
}

assert.equal(unicodeToFm("ර්‍ය"), "©");
assert.equal(unicodeToFm("ද්‍ය"), "oH");
assert.equal(unicodeToFm("ද්‍ය", { compactDaForms: true }), "µ");
assert.equal(fmToUnicode("µ"), "ද්‍ය");
assert.equal(fmToUnicode("μ"), "ද්‍ය");
assert.equal(unicodeToFm("‐"), "-");
assert.equal(fmToUnicode("- ‐"), "- -");
assert.equal(unicodeToFm("*"), ")");
assert.equal(fmToUnicode(")"), "*");
assert.equal(unicodeToFm("ෆ"), "*");
assert.equal(fmToUnicode("*"), "ෆ");
assert.equal(unicodeToFm("ඟ"), "Õ");
assert.equal(unicodeToFm("ඐ ඦ"), "Ï `c");
assert.equal(fmToUnicode("Ï `c"), "ඐ ඦ");
assert.equal(unicodeToFm("දා දැ"), "od oe");
assert.equal(unicodeToFm("ඤා ඥා"), "[d {d");
assert.equal(
  unicodeToFm("ඤා ඥා", { compactDaForms: true }),
  "Ø ×",
);
assert.equal(fmToUnicode("Ø ×"), "ඤා ඥා");
assert.equal(
  unicodeToFm("දු දූ න්‍දු න්‍දූ න්දු න්දූ"),
  "ÿ ¥ Jÿ J¥ kaÿ ka¥",
  "Da u/uu endings must use the dedicated FM Abhaya slots",
);
assert.equal(
  unicodeToFm("න්‍දු න්‍දූ", { compactDaForms: true }),
  "Jÿ J¥",
  "compact mode must preserve the dedicated Da u/uu endings",
);
assert.equal(
  unicodeToFm("ඳි ඳී ඳු ඳූ න්‍දි න්‍දී න්‍දු න්‍දූ"),
  "¢ £ ÷ ª Jos JoS Jÿ J¥",
  "i/ii/u/uu endings must not be controlled by compact Da mode",
);
assert.equal(
  unicodeToFm("ඳි ඳී ඳු ඳූ න්‍දි න්‍දී න්‍දු න්‍දූ", {
    compactDaForms: true,
  }),
  "¢ £ ÷ ª Jos JoS Jÿ J¥",
  "compact Da mode must leave i/ii/u/uu endings unchanged",
);
assert.equal(fmToUnicode("Jÿ J¥"), "න්‍දු න්‍දූ");
assert.equal(
  FM_ABHAYA_DERIVED_MAPPINGS.some(({ legacy }) =>
    ["Joq", "JoQ"].includes(legacy),
  ),
  false,
  "generic q/Q endings must not be generated for joined Nda",
);
assert.equal(
  unicodeToFm(
    "දා දැ ඳ ඳා ඳැ ඳෑ ඳි ඳී ඳු ඳූ ඳෙ ඳේ ඳෛ ඳො ඳෝ ඳෞ න්‍ද න්‍දා න්‍දැ න්‍දි න්‍දු න්‍දූ න්‍දෙ න්‍දේ න්‍දො න්‍දෝ ද්‍ය",
    { compactDaForms: true },
  ),
  "Þ ± | \\ ƒ |E ¢ £ ÷ ª fË f|a ff| f\\ f\\a f|! ‡ ˆ ‡e Jos Jÿ J¥ f‡ f‡a fˆ fˆa µ",
  "compact Da forms must use every dedicated FM slot",
);
assert.equal(
  unicodeToFm(
    "ඳ ඳා ඳැ ඳෑ ඳි ඳී ඳු ඳූ ඳෙ ඳේ ඳෛ ඳො ඳෝ ඳෞ න්‍ද න්‍දා න්‍දැ න්‍දි න්‍දු න්‍දූ න්‍දෙ න්‍දේ න්‍දො න්‍දෝ ද්‍ය",
  ),
  "| |d |e |E ¢ £ ÷ ª f| f|a ff| f|d f|da f|! Jo Jod Joe Jos Jÿ J¥ fJo fJoa fJod fJoda oH",
  "default Da forms must remain compositional",
);
assert.equal(unicodeToFm("ඳ"), "|");
assert.equal(unicodeToFm("ඳ", { compactDaForms: true }), "|");
assert.equal(unicodeToFm("ඳා ඳැ ඳි ඳු ඳො"), "|d |e ¢ ÷ f|d");
assert.equal(unicodeToFm("ඳු ඳූ"), "÷ ª");
assert.equal(
  unicodeToFm("ඳු ඳූ", { compactDaForms: true }),
  "÷ ª",
);
assert.equal(
  unicodeToFm("ක්‍ෂ ත්‍ථ", { preserveConjuncts: false }),
  "laI ;a:",
  "disabled conjunct preservation must emit decomposed FM sequences",
);
assert.equal(
  unicodeToFm("්‍රු ්‍රූ ද්‍රු ද්‍රූ ක්‍රු ක්‍රූ ත්‍රු ත්‍රූ"),
  "%e %E øe øE l%e l%E ;%e ;%E",
  "rakar u/uu forms must use the shared legacy ae/aae endings",
);
assert.equal(
  fmToUnicode("%e %E øe øE l%e l%E ;%e ;%E"),
  "්‍රැ ්‍රෑ ද්‍රැ ද්‍රෑ ක්‍රැ ක්‍රෑ ත්‍රැ ත්‍රෑ",
  "shared legacy endings must retain their canonical ae/aae reverse reading",
);
assert.equal(unicodeToFm("ක්‍රු ක්‍රූ ක්‍රැ ක්‍රෑ"), "l%e l%E l%e l%E");
assert.equal(unicodeToFm("ක්‍රු ක්‍රූ", { preserveRakaransaya: false }), "lare larE");
assert.equal(
  fmToUnicode("are arE oare oarE lare larE ;are ;arE"),
  "්‍රු ්‍රූ ද්‍රු ද්‍රූ ක්‍රු ක්‍රූ ත්‍රු ත්‍රූ",
  "non-ligated Legacy rakar u/uu components must restore joined Unicode",
);
assert.equal(
  unicodeToFm("ත්‍රෙු ත්‍රෙූ ක්‍රෙු ක්‍රෙූ"),
  "f;%e f;%E fl%e fl%E",
  "stacked rakar u/uu forms must also use shared legacy endings",
);
assert.equal(
  fmToUnicode(";afre ;afrE lafre lafrE"),
  "ත්‍රෙු ත්‍රෙූ ක්‍රෙු ක්‍රෙූ",
  "stacked non-ligated components must restore joined Unicode rakar forms",
);
for (const leadingSign of [
  "",
  "ා",
  "ැ",
  "ෑ",
  "ි",
  "ී",
  "ෘ",
  "ෲ",
  "ෙ",
  "ේ",
  "ෛ",
  "ො",
  "ෝ",
  "ෞ",
  "ෟ",
]) {
  for (const finalSign of ["ු", "ූ"]) {
    const joined = `ත්‍ර${leadingSign}${finalSign}`;
    const shared = `ත්‍ර${leadingSign}${finalSign === "ු" ? "ැ" : "ෑ"}`;
    const legacy = unicodeToFm(joined);
    assert.equal(
      legacy,
      unicodeToFm(shared),
      `${joined} must encode like its shared ae/aae spelling`,
    );
    assert.equal(
      /%[qQ]/u.test(legacy),
      false,
      `${joined} must not use a post-rakar q/Q sequence`,
    );
    const reverse = shared.replaceAll("ෝ", "ෝ").replaceAll("ො", "ො").replaceAll("ෞ", "ෞ");
    assert.equal(fmToUnicode(legacy), reverse, `${legacy} must use the unambiguous ae/aae reading`);
  }
}
assert.equal(
  fmToUnicode("l%q l%Q ;%q ;%Q"),
  "l%q l%Q ;%q ;%Q",
  "invalid post-rakar q/Q sequences must remain unchanged",
);
assert.equal(
  fmToUnicode("CI F:", { preserveConjuncts: false }),
  "ක්ෂ ත්ථ",
  "disabled conjunct preservation must omit Sinhala ZWJ characters",
);
assert.equal(
  unicodeToFm("👩‍💻 ක්‍ෂ", { preserveConjuncts: false }),
  "👩‍💻 laI",
  "conjunct decomposition must preserve non-Sinhala ZWJ sequences",
);
assert.equal(
  unicodeToFm("්‍රී ක්‍රී ත්‍රී ්‍ය ර්‍ක", { preserveConjuncts: false }),
  "%S l%S ;%S H l_",
  "standard yansaya, rakaransaya and repaya forms must remain joined",
);
assert.equal(
  unicodeToFm("ක්ෂ ත්ථ න්ද", { normalizeConjuncts: true }),
  "CI F: Jo",
  "normalization must encode recognized decomposed clusters as conjuncts",
);
assert.equal(
  fmToUnicode("laI ;a: kao", { normalizeConjuncts: true }),
  "ක්‍ෂ ත්‍ථ න්‍ද",
  "normalization must emit joined Unicode conjuncts",
);
assert.equal(
  unicodeToFm("ක්ෂ ක්‍ෂ ක්‍රී", {
    preserveConjuncts: false,
    normalizeConjuncts: true,
  }),
  "CI CI l%S",
  "normalization must take priority without changing standard rakaransaya",
);
assert.equal(unicodeToFm("්‍යර්‍ ර්‍ත ර්‍බ ර්‍ම"), "œ ;_ n– u–");
assert.equal(fmToUnicode("œ ;_ n– u–"), "්‍යර්‍ ර්‍ත ර්‍බ ර්‍ම");
const tallRepayaBases = new Set(Array.from("ඛචඡජඣටඨඩඪණඬථධඵබමඹරව"));
for (const base of [
  ...new Set(
    FM_ABHAYA_MAPPINGS.map(({ unicode }) => unicode).filter(
      (unicode) =>
        Array.from(unicode).length === 1 &&
        unicode >= "ක" &&
        unicode <= "ෆ",
    ),
  ),
]) {
  const unicode = `ර්‍${base}`;
  const legacy = unicodeToFm(unicode);
  assert.equal(
    /^[_–]/u.test(legacy),
    false,
    `${unicode} must place its Legacy consonant before the repaya mark`,
  );
  if (base !== "ණ" && base !== "ය") {
    assert.equal(
      legacy.at(-1),
      tallRepayaBases.has(base) ? "–" : "_",
      `${unicode} must use the reph height of its consonant`,
    );
  }
  assert.equal(fmToUnicode(legacy), unicode, `${legacy} must restore ${unicode}`);

  const yansaya = `${unicode}්‍ය`;
  const baseLegacy = unicodeToFm(base);
  assert.equal(unicodeToFm(yansaya), `${baseLegacy}œ`);
  assert.equal(fmToUnicode(`${baseLegacy}œ`), yansaya);
  assert.equal(fmToUnicode(`${baseLegacy}H_`), yansaya);
}
assert.equal(unicodeToFm("ර්‍ය්‍ය"), "hœ");
assert.equal(fmToUnicode("hH_"), "ර්‍ය්‍ය");
assert.equal(fmToUnicode("H_"), "්‍යර්‍");
assert.equal(unicodeToFm("ර්‍ක", { preserveRepaya: false }), "¾l");
assert.equal(fmToUnicode("l_", { preserveRepaya: false }), "ර්ක");
assert.equal(fmToUnicode("hœ", { preserveRepaya: false }), "ර්ය්‍ය");
assert.equal(unicodeToFm("ක්‍ය", { preserveYansaya: false }), "lah");
assert.equal(fmToUnicode("lH", { preserveYansaya: false }), "ක්ය");
assert.equal(unicodeToFm("ක්‍ර", { preserveRakaransaya: false }), "lar");
assert.equal(fmToUnicode("l%", { preserveRakaransaya: false }), "ක්ර");
assert.equal(
  unicodeToFm("ර්‍ක ක්‍ය ක්‍ර", {
    preserveRepaya: false,
    preserveRakaransaya: false,
  }),
  "¾l lH lar",
  "reduced forms must be independently configurable",
);
assert.equal(
  unicodeToFm("ක්‍ය ක්‍ර", { preserveConjuncts: false }),
  "lH l%",
  "yansaya and rakaransaya remain reduced independently of ligated conjuncts",
);
assert.equal(
  unicodeToFm("ද‍්ධ", { normalizeConjuncts: true }),
  "Š",
  "unifying classified touching forms must use the available FM ligature",
);
assert.equal(unicodeToFm("ද‍්ධ"), "oaO", "preserving touching forms must keep the FM split fallback");
for (const pairs of Object.values(SINHALA_CONJUNCT_CATEGORIES)) {
  for (const pair of pairs) {
    for (const source of [pair.plain, pair.touching, pair.blocked, pair.joined]) {
      for (const sign of ["", "ා", "ි", "ෙ", "ේ", "ො", "ෝ", "ෞ"]) {
        const options = { normalizeConjuncts: true };
        const legacy = unicodeToFm(source + sign, options);
        const target = pair.unicode + sign;
        assert.equal(fmToUnicode(legacy, options), target, `${source + sign}: classified normalization`);
        assert.equal(fmToUnicodePreservingNonSinhala(legacy, options), target, `${legacy}: mixed classified normalization`);
      }
    }
  }
}
for (const text of ["“ඤ්‍ච”", "“ඤ්‍ඡො”", "“ණ්‍ඩ”"]) {
  const options = { normalizeConjuncts: true };
  assert.equal(fmToUnicodePreservingNonSinhala(unicodeToFm(text, options), options), text);
}
assert.equal(unicodeToFm("ට්‍ඨ"), "`G", "an existing FM cluster alias must encode its base as well as its vowels");
assert.equal(
  unicodeToFm("ඤ්‍ච ඤ්‍ජ ඤ්‍ඡ ට්‍ඨ ණ්‍ඩ ද්‍ධ ද්‍ව ම්‍බ ඟ"),
  "`p `c `P `G `v Š „ U Õ",
  "all rare FM forms must use their existing glyph slots or braid combinations",
);
assert.equal(fmToUnicode("`c `v U Õ"), "ඦ ඬ ඹ ඟ", "shared codes retain their default prenasalized readings");
const commonOnly = { conjunctForms: { common: "normalize", rare: "decompose" } };
const rareOnly = { conjunctForms: { common: "decompose", rare: "normalize" } };
const neitherJoined = { conjunctForms: { common: "decompose", rare: "decompose" } };
const touchingOnly = { ...neitherJoined, touchingConjuncts: true };
assert.equal(fmToUnicode("iaiau iakaj", touchingOnly), "ස‍්ස‍්ම ස‍්න‍්ව", "touching chains must handle overlapping pairs");
assert.equal(fmToUnicode("CI Š", touchingOnly), "ක‍්ෂ ද‍්ධ");
assert.equal(fmToUnicode("CI Š", { ...commonOnly, touchingConjuncts: true }), "ක්‍ෂ ද‍්ධ");
assert.equal(fmToUnicode("CI Š", { ...rareOnly, touchingConjuncts: true }), "ක‍්ෂ ද්‍ධ");
assert.equal(unicodeToFm("ක්‍ෂ ද්‍ධ", touchingOnly), "laI oaO", "legacy touching forms must use split letters");
assert.equal(unicodeToFm("ක‍්ෂ ද‍්ධ", neitherJoined), "laI oaO");
assert.equal(
  fmToUnicode("lH l% l_", { ...touchingOnly, normalizeReducedForms: true }),
  "ක්‍ය ක්‍ර ර්‍ක",
  "touching normalization must respect independently enabled reduced forms",
);
const paliVowels = { removePaliHalForms: true };
assert.equal(
  fmToUnicode(unicodeToFm("ඒ ඕ කේ කෝ කේ කෝ ක්"), paliVowels),
  "එ ඔ කෙ කො කෙ කො ක්",
  "Pali hal removal must change long e/o vowels only, including decomposed signs",
);
assert.equal(unicodeToFm("ඒ ඕ කේ කෝ", paliVowels), unicodeToFm("එ ඔ කෙ කො"));
assert.equal(fmToUnicode(unicodeToFm("ඒ ඕ කේ කෝ")), "ඒ ඕ කේ කෝ", "Pali spelling remains opt-in");
assert.equal(
  fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala("English නමෝතස්ස භගවතෝ 2026", paliVowels), { ...touchingOnly, ...paliVowels }),
  "English නමොතස‍්ස භගවතො 2026",
);
for (const pair of Object.values(SINHALA_CONJUNCT_CATEGORIES).flat()) {
  for (const source of [pair.plain, pair.touching, pair.blocked, pair.joined]) {
    for (const sign of ["", "ා", "ි", "ෙ", "ේ", "ො", "ෝ", "ෞ"]) {
      const legacy = unicodeToFm(source + sign, touchingOnly);
      assert.equal(fmToUnicode(legacy, touchingOnly), pair.touching + sign);
      assert.equal(fmToUnicodePreservingNonSinhala(legacy, touchingOnly), pair.touching + sign);
    }
  }
}
assert.equal(unicodeToFm("ට්‍රේ"), "fÜ%");
assert.equal(fmToUnicode("fg%a fga% fÜ%").normalize("NFC"), "ට්‍රේ ට්‍රේ ට්‍රේ", "old generic spellings remain accepted");
assert.equal(unicodeToFm("ක්ෂ ද්ධ ඤ්ජ ම්බ", commonOnly), "CI oaO [ac ïn");
assert.equal(unicodeToFm("ක්ෂ ද්ධ ඤ්ජ ම්බ", rareOnly), "laI Š `c U");
assert.equal(fmToUnicode("CI Š `c U", commonOnly), "ක්‍ෂ ද්ධ ඦ ඹ");
assert.equal(fmToUnicode("CI Š `c U", rareOnly), "ක්ෂ ද්‍ධ ඤ්‍ජ ම්‍බ");
assert.equal(fmToUnicode("CI Š `p `P", neitherJoined), "ක්ෂ ද්ධ ඤ්ච ඤ්ඡ");
assert.equal(fmToUnicode("`c `v U", { normalizeConjuncts: true }), "ඤ්‍ජ ණ්‍ඩ ම්‍බ");
assert.equal(fmToUnicodePreservingNonSinhala("CI Š `c U", rareOnly), "ක්ෂ ද්‍ධ ඤ්‍ජ ම්‍බ");
assert.equal(unicodeToFm("ඞ්ග", commonOnly), "Ù.");
assert.equal(unicodeToFm("ඞ්ග", rareOnly), "Õ");
assert.equal(unicodeToFm("ක්‍ය ක්‍ර ර්‍ක", neitherJoined), "lH l% l_", "category choices must not change reduced forms");
assert.equal(unicodeToFm("බ‍්භ", rareOnly), "íN", "unclassified touching letters remain separated");
assert.equal(unicodeToFm("ඞ්ග", { normalizeConjuncts: true }), "Õ");
assert.equal(unicodeToFm("ඞ්ග"), "Ù.", "the prenasalized substitution must require explicit normalization");
assert.equal(
  fmToUnicode(unicodeToFm("න්ද්ව්", { normalizeConjuncts: true }), { normalizeConjuncts: true }),
  "න්‍ද්‍ව්",
  "overlapping consonant pairs must all normalize",
);
assert.equal(
  unicodeToFm("අර්ත්ථ ආර්ය්ය න්යාය බ්රූ", { normalizeConjuncts: true, normalizeReducedForms: true }),
  "wF:– wdhœ kHdh n%E",
  "custom reduced forms must compose reph, yansaya and rakaransaya",
);
assert.equal(
  unicodeToFm("අර‍්ත්‍ථ ආර‍්ය‍්ය න‍්යාය බ‍්රූ", { normalizeConjuncts: true, normalizeReducedForms: true }),
  "wF:– wdhœ kHdh n%E",
  "touching reduced forms must normalize before the FM split fallback",
);
assert.equal(
  fmToUnicode(
    unicodeToFm("අර්ත්ථ ආර්ය්ය න්යාය බ්රූ", { normalizeConjuncts: true, normalizeReducedForms: true, preserveYansaya: false }),
    { normalizeConjuncts: true, normalizeReducedForms: true, preserveYansaya: false },
  ),
  "අර්‍ත්‍ථ ආර්‍ය්ය න්යාය බ්‍රෑ",
  "expanding yansaya must preserve an independently enabled reph",
);
assert.equal(fmToUnicode("oaO"), "ද්ධ");
assert.equal(unicodeToFm("දො දො"), "fod fod");
assert.equal(
  unicodeToFm("දො දො", { compactDaForms: true }),
  "fÞ fÞ",
);
assert.equal(fmToUnicode("`"), "`");
assert.equal(fmToUnicode("Co"), "ක්‍ද", "the braid must change the complete visual core, not the unbraided spelling");
for (const [legacy, unicode] of [
  ["`Co", "ඤ"], ["`CÞ", "ඤා"], ["`C±", "ඤැ"],
  ["`CÈ", "ඤි"], ["`C§", "ඤී"], ["`Cÿ", "ඤු"], ["`C¥", "ඤූ"],
  ["`Ñ", "ඤ්‍චි"], ["`Ö", "ඤ්‍චී"], ["`É", "ඤ්‍ච්"],
  ["`ý", "ඤ්‍ඡි"], ["`Â", "ඤ්‍ඡී"], ["`þ", "ඤ්‍ඡ්"],
  ["`ð", "ඦි"], ["`Ô", "ඦී"], ["`Ê", "ඦ්"],
  ["`ä", "ඬි"], ["`ã", "ඬී"], ["`â", "ඬ්"],
  ["`À", "ට්‍ඨි"], ["`Á", "ට්‍ඨී"],
  ["`ú", "ද්‍වි"], ["`ù", "ද්‍වී"],
  ["`ê", "ද්‍ධි"], ["`ë", "ද්‍ධී"], ["`è", "ද්‍ධ්"],
  ["f`CÞ", "ඤො"], ["f`CÞa", "ඤෝ"],
  ["f`Cÿ", "ඤෙු"], ["f`C¥", "ඤෙූ"], ["f`CÈ", "ඤෙි"],
  ["f`Ê", "ඦේ"], ["f`É", "ඤ්‍චේ"],
]) {
  assert.equal(fmToUnicode(legacy), unicode, `${legacy}: dedicated braided visual alternate`);
  assert.equal(fmToUnicodePreservingNonSinhala(legacy), unicode);
  assert.equal(fmToUnicodePreservingNonSinhala(`^${legacy}&`), `(${unicode})`);
  assert.equal(detectSinhalaEncoding(legacy), "legacy");
}
for (const [sign, prefix, suffix, canonical] of [
  ["", "", "", "["], ["ා", "", "d", "[d"], ["ැ", "", "e", "[e"],
  ["ෑ", "", "E", "[E"], ["ි", "", "s", "[s"], ["ී", "", "S", "[S"],
  ["ු", "", "q", "û"], ["ූ", "", "Q", "ü"], ["ෘ", "", "D", "[D"],
  ["ෲ", "", "DD", "[DD"], ["ෙ", "f", "", "f["], ["ේ", "f", "a", "f[a"],
  ["ෛ", "ff", "", "ff["], ["ො", "f", "d", "f[d"], ["ෝ", "f", "da", "f[da"],
  ["ෞ", "f", "!", "f[!"], ["්", "", "a", "[a"],
]) {
  const legacy = prefix + "`Co" + suffix;
  assert.equal(fmToUnicode(legacy), "ඤ" + sign);
  assert.equal(fmToUnicodePreservingNonSinhala(legacy), "ඤ" + sign);
  assert.equal(unicodeToFm("ඤ" + sign), canonical, "new input aliases must preserve dedicated output slots");
}
assert.equal(fmToUnicode("`ð `ä", { normalizeConjuncts: true }), "ඤ්‍ජි ණ්‍ඩි", "braided alternates must obey the rare-conjunct reading option");
assert.equal(unicodeToFm("ඤා", { compactDaForms: true }), "Ø");
assert.equal(fmToUnicode("`l"), "`ක", "an unrecognized braid combination must not acquire an invented letter mapping");
assert.equal(fmToUnicode("f`.d"), "ඟො");
assert.equal(fmToUnicode("ff`.d"), "ඟෛා");
assert.equal(unicodeToFm("ඟෛා"), "ffÕd");
assert.equal(
  fmToUnicode("`Þ `± `È `§ `ÿ `¥"),
  "ඳා ඳැ ඳි ඳී ඳු ඳූ",
  "the universal braid must support every dedicated Da vowel slot",
);
assert.equal(
  fmToUnicode("f`Þ f`± f`È f`§ f`ÿ f`¥"),
  "ඳො ඳෙැ ඳෙි ඳෙී ඳෙු ඳෙූ",
  "prebase vowels must remain outside every dedicated braided Nda slot",
);
assert.equal(
  fmToUnicode("Ÿ ¤ ¡ ¶ · ∙ » ¼ ½ ¸ ¹ º Ã ” • \u00a0"),
  "° _ ﹒ ¶ § § Ⅰ Ⅴ Ⅹ ⅰ ⅴ ⅹ ▲ ❏ ■ ▪",
);
assert.equal(
  unicodeToFm("° _ ﹒ ¶ § Ⅰ Ⅴ Ⅹ ⅰ ⅴ ⅹ ▲ ❏ ■ ▪"),
  "Ÿ ¤ ¡ ¶ · » ¼ ½ ¸ ¹ º Ã ” • \u00a0",
);
assert.equal(
  fmToUnicode("» »» »»» »¼ ¼ ¼» ¼»» ¼»»» »½ ½ ½» ½»»"),
  "Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ",
);
assert.equal(
  unicodeToFm("Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ"),
  "» »» »»» »¼ ¼ ¼» ¼»» ¼»»» »½ ½ ½» ½»»",
);
assert.equal(
  fmToUnicode("¸ ¸¸ ¸¸¸ ¸¹ ¹ ¹¸ ¹¸¸ ¹¸¸¸ ¸º º º¸ º¸¸"),
  "ⅰ ⅱ ⅲ ⅳ ⅴ ⅵ ⅶ ⅷ ⅸ ⅹ ⅺ ⅻ",
);
assert.equal(
  unicodeToFm("ⅰ ⅱ ⅲ ⅳ ⅴ ⅵ ⅶ ⅷ ⅸ ⅹ ⅺ ⅻ"),
  "¸ ¸¸ ¸¸¸ ¸¹ ¹ ¹¸ ¹¸¸ ¹¸¸¸ ¸º º º¸ º¸¸",
);
assert.equal(
  [...FM_ABHAYA_MAPPINGS, ...FM_ABHAYA_DERIVED_MAPPINGS].some(({ legacy }) =>
    legacy.includes("Û"),
  ),
  false,
  "contextual Û glyph must not be reused as the ඟ base in derived forms",
);

const stackedVowelForms = [
  ["ා", "", "d", "", "ා"],
  ["ැ", "", "e", "", "ැ"],
  ["ෑ", "", "E", "", "ෑ"],
  ["ි", "", "s", "", "ි"],
  ["ී", "", "S", "", "ී"],
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

for (const [, prefix, suffix, shapePrefix, shapeSuffix] of stackedVowelForms) {
  for (const [finalSign, specialEnding] of [
    ["ු", ".="],
    ["ූ", ".+"],
  ]) {
    const unicode = `ග${shapePrefix}${finalSign}${shapeSuffix}`;
    const legacy = `${prefix}${specialEnding}${suffix}`;
    assert.equal(unicodeToFm(unicode), legacy, `${unicode} -> ${legacy}`);
    assert.equal(fmToUnicode(legacy), unicode, `${legacy} -> ${unicode}`);
  }
}
for (const { unicode: base } of FM_ABHAYA_MAPPINGS) {
  if (Array.from(base).length !== 1 || !/[\u0d9a-\u0dc6]/u.test(base)) {
    continue;
  }
  const unicode = base + "ෞ";
  const legacy = unicodeToFm(unicode);
  assert.equal(
    /[\u0d80-\u0dff]/u.test(legacy),
    false,
    `${unicode} must not leave a Unicode vowel sign in FM output`,
  );
  assert.equal(fmToUnicode(legacy), unicode, `${legacy} -> ${unicode}`);
}
assert.equal(unicodeToFm("යෞ"), "fh!");

for (const [unicode, legacy] of [
  ["ය්‍යො", "fhHd"],
  ["ක්‍වො", "fCjd"],
  ["ත්‍ථො", "fF:d"],
  ["ත්‍වො", "fFjd"],
  ["න්‍වො", "fJjd"],
  ["න්‍ථො", "fJ:d"],
  ["න්‍දො", "fJod"],
  ["න්‍ධො", "fJOd"],
  ["අර්‍ත්‍ථ", "wF:–"],
  ["බ්‍රූ", "n%E"],
  ["බ්‍රහ්මචර්‍ය්‍යාව", "n%yauphœdj"],
  ["ඕස්ට්‍රේලියාවේ", "´iafÜ%,shdfõ"],
]) {
  assert.equal(unicodeToFm(unicode), legacy, `${unicode} must encode completely`);
  const reverse = unicode.replace(/්‍රු/gu, "්‍රැ").replace(/්‍රූ/gu, "්‍රෑ");
  assert.equal(fmToUnicode(legacy), reverse, `${legacy} must preserve its cluster and shared-vowel reading`);
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    reverse,
    `${legacy} must not be mistaken for Latin text`,
  );
}
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala("බ‍්භො ම‍්පො ම‍්ඵො ම‍්හො ස‍්සො හ‍්වො"),
  ),
  "බ්භො ම්පො ම්ඵො ම්හො ස්සො හ්වො",
  "touching letters must keep their consonants and vowels when split for FM",
);
assert.equal(unicodeToFm("සම්‍බුද්‍ධස්ස"), "iUqŠiai");
assert.equal(fmToUnicode("iïnqŠiai"), "සම්බුද්‍ධස්ස");
assert.equal(
  unicodeToFm("ක්‍වො න්‍දො", { preserveConjuncts: false }),
  "lafjd kafod",
  "compositional vowels must respect the non-ligated option",
);
assert.equal(
  unicodeToFm("ක්වො න්දො", { normalizeConjuncts: true }),
  "fCjd fJod",
  "conjunct normalization must include vowels around the complete cluster",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("fidaodyrK"),
  "සෝදාහරණ",
  "a valid prebase vowel must outweigh superficial Latin casing",
);

assert.equal(fmToUnicode("f;=a f;a="), "තෙු් තේු");
assert.equal(fmToUnicode("f.=da f.a=da"), "ගෙුා් ගේුා්");
for (const legacy of ["f;=a", "f;a=", "f.=da", "f.a=da"]) {
  const unicode = fmToUnicode(legacy);
  assert.equal(unicodeToFm(unicode), legacy, `${legacy} must keep its vowel order`);
  assert.equal(
    unicodeToFmPreservingNonSinhala(fmToUnicodePreservingNonSinhala(legacy)),
    legacy,
    `${legacy} must round trip through the mixed-text converter`,
  );
}

const repayaPassage = `“කරණීයං” යනු කළ යුතුය, කිරීමට සුදුසුය යන අර්‍ථයයි.
මහණෙනි, මේ ලෝකයෙහි ඇතැම් ධර්‍ම කථිකයෙක් අර්‍ථ සහිතව ස්වල්පයක් කියයි.
මාර්‍ග අතුරෙන් අෂ්ටාඞ්ගිකමාර්‍ගය ... උතුම් ය.
ආචාර්‍ය්‍ය පරම්පරාවෙන් ගෙනෙන ලද ඒ මේ (මඞ්ගල සූත්‍රය) අද දක්වා පවතී.
භවත් සෝණදණ්ඩ තෙමේ ... උතුම් වර්‍ණසෞන්‍දර්‍ය්‍යයෙන් සමන්‍විත ය, උතුම් රන්වන් පැහැත්තෙක.
බ්‍රාහ්මණය, භාවිත වූ බහුලීකෘත වූ යම් ධර්‍මයෙක් දිටුදැම් අර්‍ථ හා යම් සාම්පරායික අර්‍ථයෙක් වේ නම් ...`;
const repayaLegacy = unicodeToFmPreservingNonSinhala(repayaPassage);
assert.equal(
  /[\u0d80-\u0dff]/u.test(repayaLegacy),
  false,
  "repaya prose must not leave Sinhala Unicode in Legacy output",
);
assert.equal(
  fmToUnicodePreservingNonSinhala(repayaLegacy),
  repayaPassage,
  "repaya prose must preserve logical Unicode order on return",
);
for (const unicode of ["ර්‍කෙ", "ර්‍කේ", "ර්‍කො", "ර්‍බෙ", "ර්‍ණෝ", "ර්‍යෛ"]) {
  const legacy = unicodeToFm(unicode);
  assert.equal(
    /[\u0d80-\u0dff]/u.test(legacy),
    false,
    `${unicode} must encode its vowel sign into Legacy text`,
  );
  assert.equal(fmToUnicode(legacy), unicode, `${legacy} must restore ${unicode}`);
}

// Straight quotes do not have distinct FM Abhaya slots; normalize them to the
// corresponding smart-quote slots instead of emitting hidden ZWJ placeholders.
assert.equal(unicodeToFm("'"), "z");
assert.equal(unicodeToFm('"'), "˜");

// Known unsupported FM Abhaya letters must remain untouched rather than being
// silently converted into another Sinhala character.
assert.equal(unicodeToFm("ඞී"), "ඞී");
assert.equal(unicodeToFm("ඞි"), "ඞි");
assert.equal(unicodeToFm("ඣ්"), "Cè");
assert.equal(fmToUnicode("Cè"), "ඣ්");

assert.equal(
  unicodeToFmPreservingNonSinhala("English 中文 සිංහල *"),
  "English 中文 isxy, )",
  "Unicode conversion must leave non-Sinhala writing systems unchanged",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("hello bkaÈhka 中文"),
  "hello ඉන්දියන් 中文",
  "Legacy conversion must preserve ordinary non-Sinhala text",
);
assert.equal(
  fmToUnicodePreservingNonSinhala(
    "› ,xldj bkaÈhka id.rfha msysá ¥m;ls'\nSri Lanka is an island located in the Indian Ocean'",
  ),
  "ශ්‍රී ලංකාව ඉන්දියන් සාගරයේ පිහිටි දූපතකි.\nSri Lanka is an island located in the Indian Ocean.",
  "Legacy token structure must recover ASCII-only Sinhala words without converting the English line",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("› English bkaÈhka"),
  "ශ්‍රී English ඉන්දියන්",
  "an English word between two Legacy Sinhala words must remain unchanged",
);
assert.equal(
  fmToUnicodePreservingNonSinhala(
    "› ,xldj Indian Ocean ys msysá ¥m;ls'\nSri Lanka is an island located in the Indian Ocean'",
  ),
  "ශ්‍රී ලංකාව Indian Ocean හි පිහිටි දූපතකි.\nSri Lanka is an island located in the Indian Ocean.",
  "dictionary-backed token detection must distinguish ambiguous ASCII Legacy words from Latin prose",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("is ys"),
  "is හි",
  "an English dictionary hit must win over an otherwise valid FM decoding",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("TT l%uhg re ì,shk FCID"),
  "TT ක්‍රමයට රු බිලියන FCID",
  "a short FM syllable between confirmed Sinhala words must not be mistaken for Latin",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("English re English › go bkaÈhka"),
  "English re English ශ්‍රී go ඉන්දියන්",
  "Latin words must remain Latin outside the short-syllable context",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("wêm;s Lu Lei uy;d"),
  "අධිපති Lu Lei මහතා",
  "a short title-case name must remain Latin beside a confirmed Latin name",
);
const mixedBankExcerpt = `ඉදිරියේදී එය වඩාත් \u200dකාර්යක්ෂම කරමින් QR කේත භාවිත කරනු ඇත.
චීන අන්තර් දේශසීමා \u00a0RMB ගනුදෙනු ගැන Lu Lei මහතා පැවසීය.
සේවා කාලය පැය 22.5ක් දක්වා දීර්ඝ කෙරේ.`;
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedBankExcerpt),
  ),
  mixedBankExcerpt,
  "mixed bank prose must retain Latin names, acronyms, decimals, joiners and nonbreaking spaces",
);
const malformedMarket = "වෙ‍ෙළඳපොළට";
const normalizedMarket = "වෙළෙඳපොළට";
assert.equal(
  unicodeToFmPreservingNonSinhala(malformedMarket),
  unicodeToFmPreservingNonSinhala(normalizedMarket),
  "an orphan joiner beside vowel signs must not survive in FM output",
);
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(malformedMarket),
  ),
  normalizedMarket,
);
const mixedAiExcerpt = `AI නිසා ඔබේ රැකියාව අනතුරේ ද?
ChatGPT සමග යෞවනයන්ගේ රැකියා නියුක්තිය 2.7%කින් පහත වැටී ඇත.`;
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedAiExcerpt),
  ),
  mixedAiExcerpt,
  "AI prose must retain Latin names and percentages while encoding au vowels",
);
assert.equal(
  fmToUnicodePreservingNonSinhala('wnq *,d" fudfyduâ'),
  "අබු ෆලා, මොහොමඩ්",
  "FM consonant punctuation inside a name must not split its final vowel as Latin",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("fudfyduâ róIa fudfyduâ idßla id*s"),
  "මොහොමඩ් රමීෂ් මොහොමඩ් සාරික් සාෆි",
  "FM-encoded names must not be mistaken for extended Latin or symbolic text",
);
for (const unicode of [
  "TT ක්‍රමයට රු බිලියන 24කට අධික මුදලක් රටින් යැවූ පුද්ගලයෙකු FCID අත්අඩංගුවට",
  "මොහොමඩ් අබ්දුල් හක් හෙවත් අබු ෆලා, මොහොමඩ් අන්වර්",
  "මොහොමඩ් රමීෂ් මොහොමඩ් සාරික්, අබ්දුල් ලතීෆ් මොහොමඩ් සාෆි හෙවත් සාෆි මවුලවි",
]) {
  assert.equal(
    fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala(unicode)),
    unicode,
    "mixed news excerpts must round trip with Latin acronyms and FM punctuation",
  );
}
for (const [legacy, unicode] of [
  ["zfndahsx 747-8Z", "‘බෝයිං 747-8’"],
  ["zfydxÑZ", "‘හොංචි’"],
  ["frdaâ ^Tughlak Road&", "රෝඩ් (Tughlak Road)"],
]) {
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    unicode,
    "mixed quoted FM text and transliterated place names must decode completely",
  );
  assert.equal(unicodeToFmPreservingNonSinhala(unicode), legacy);
}
assert.equal(
  fmToUnicodePreservingNonSinhala(
    "Hormuz iy ^Strait of Hormuz&\nzebra iy zfndahsx 747-8Z",
  ),
  "Hormuz සහ (Strait of Hormuz)\nzebra සහ ‘බෝයිං 747-8’",
  "Latin words containing z must not start or span an FM quote pair",
);
const mixedTravelExcerpt = `Sep 13, 2026 02:55 PM
චීන ජනාධිපතිවරයාගේ 'හොංචි' (Hongqi) රාජ්‍ය රථය සහ 'බෝයිං 747-8' යානය.
තුග්ලක් රෝඩ් (Tughlak Road) පොලිස් ස්ථානය.`;
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedTravelExcerpt),
  ),
  `Sep 13, 2026 02:55 PM
චීන ජනාධිපතිවරයාගේ ‘හොංචි’ (Hongqi) රාජ්‍ය රථය සහ ‘බෝයිං 747-8’ යානය.
තුග්ලක් රෝඩ් (Tughlak Road) පොලිස් ස්ථානය.`,
  "news dates, mixed Sinhala quotes and Latin place names must round trip",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("wo"),
  "අද",
  "short bilingual dictionary collisions must default to Legacy Sinhala",
);
assert.equal(
  unicodeToFmPreservingNonSinhala("අද (19)"),
  "wo ^19&",
  "Arabic digits and their parentheses must use the Legacy punctuation slots",
);
assert.equal(
  unicodeToFmPreservingNonSinhala("\u200d2025 👩‍💻 ක්‍ෂ"),
  "2025 👩‍💻 CI",
  "orphan joiners must be removed without changing emoji or Sinhala conjuncts",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("wo ^19& ^video&"),
  "අද (19) (video)",
  "Legacy punctuation around digits and Latin words must still be decoded",
);
for (const [unicode, legacy] of [
  ["(19)", "^19&"],
  ["‘video’", "zvideoZ"],
  ["“video”", "—video˜"],
]) {
  assert.equal(
    unicodeToFmPreservingNonSinhala(unicode),
    legacy,
    `${unicode} must encode its punctuation around Latin text`,
  );
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    unicode,
    `${legacy} must decode its punctuation around Latin text`,
  );
}

const unicodePunctuationOrSymbol = /^[\p{P}\p{S}]+$/u;
for (const { unicode, legacy } of FM_ABHAYA_MAPPINGS.filter(({ unicode }) =>
  unicodePunctuationOrSymbol.test(unicode),
)) {
  assert.equal(
    unicodeToFmPreservingNonSinhala(unicode),
    legacy,
    `${unicode} must retain its canonical Legacy punctuation slot`,
  );
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    unicode,
    `${legacy} must decode from its canonical Legacy punctuation slot`,
  );
}

const mixedLegacyDocument = `3 la uerE uÜglal=,sh wk;=r zBYD Tfgda f¾ia jqKdZ ßhÿre lshk l;dj yd Tyq .xcd .eiQ l;dj ^video&
wo ^19& Beijing ys kj l%Svd /lshdjla Ndr .;af;ah'
Sri Lanka is an island located in the Indian Ocean'
› ,xldj Indian Ocean ys msysá ¥m;ls'`;
assert.equal(
  fmToUnicodePreservingNonSinhala(mixedLegacyDocument),
  `3 ක් මැරූ මට්ටක්කුලිය අනතුර ‘BYD ඔටෝ රේස් වුණා’ රියදුරු කියන කතාව හා ඔහු ගංජා ගැසූ කතාව (video)
අද (19) Beijing හි නව ක්‍රීඩා රැකියාවක් භාර ගත්තේය.
Sri Lanka is an island located in the Indian Ocean.
ශ්‍රී ලංකාව Indian Ocean හි පිහිටි දූපතකි.`,
  "mixed Legacy documents must convert Sinhala, digits and punctuation while preserving confirmed Latin words",
);

const mixedRoundTripExcerpt = `ගූගල් සමාගමේ 'ජෙමිනි' (Gemini) AI පද්ධතියක් 'Capture the Flag' පරීක්ෂණයකදී සිය ක්‍රියාව නතර කළේය.
OpenAI සමාගම හැක් කිරීමෙන් පසුව (The Wall Street Journal) (model misalignment) Anthropic, RubyGems සහ SpaceX පිළිබඳ පරිසරයන්ගෙන් සමාගම්ද පරීක්ෂණයේදීය. මෘදුකාංගවලින් විමසා ඇත.`;
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedRoundTripExcerpt),
  ),
  `ගූගල් සමාගමේ ‘ජෙමිනි’ (Gemini) AI පද්ධතියක් ‘Capture the Flag’ පරීක්ෂණයකදී සිය ක්‍රියාව නතර කළේය.
OpenAI සමාගම හැක් කිරීමෙන් පසුව (The Wall Street Journal) (model misalignment) Anthropic, RubyGems සහ SpaceX පිළිබඳ පරිසරයන්ගෙන් සමාගම්ද පරීක්ෂණයේදීය. මෘදුකාංගවලින් විමසා ඇත.`,
  "mixed Unicode round trips must preserve Sinhala inflections, acronyms, proper names and multiword Latin wrappers",
);
const mixedNewsNames = "ගුවැන්ෂෝ, ෆොෂාන්, ෂුහායි සහ Apple, RubyGems";
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedNewsNames),
  ),
  mixedNewsNames,
  "FM spelling structure must retain Sinhala place names without treating Latin names as Sinhala",
);
assert.equal(
  fmToUnicodePreservingNonSinhala('f*dIdka" Iqydhs'),
  "ෆොෂාන්, ෂුහායි",
  "FM punctuation and vowel patterns must identify unlisted Sinhala names",
);
const mixedSlashText = "පවර් / ලොක් (Power/lock) Apple iPhone 18 Pro";
assert.equal(
  unicodeToFmPreservingNonSinhala(mixedSlashText).includes("$"),
  true,
  "a slash between Sinhala words must retain its FM punctuation slot",
);
assert.equal(
  fmToUnicodePreservingNonSinhala(
    unicodeToFmPreservingNonSinhala(mixedSlashText),
  ),
  mixedSlashText,
  "a slash inside a Latin word must not become an FM punctuation slot",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("f,i hIa o\""),
  "ලෙස යෂ් ද,",
  "a case-coded FM consonant with a final halant must decode beside Sinhala text",
);
for (const latinPhrase of [
  "(Prime Focus Studios / DNEG)",
  "(Power / lock)",
]) {
  assert.equal(
    fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala(latinPhrase)),
    latinPhrase,
    "a slash between Latin words must remain Latin punctuation even with spaces",
  );
}
assert.equal(
  fmToUnicodePreservingNonSinhala("^Prime Focus Studios $ DNEG&"),
  "(Prime Focus Studios / DNEG)",
  "an existing FM slash slot inside a Latin wrapper must still decode",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("^Price $ 20&"),
  "(Price $ 20)",
  "a dollar sign before a number must not be mistaken for a Latin-word slash",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("café naïve"),
  "café naïve",
  "unconfirmed extended-Latin words must remain unchanged",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("WoEikla"),
  "උදෑසනක්",
  "Sinhala inflections must be recognized from their dictionary stem",
);
for (const [legacy, unicode] of [
  ["WoEikls", "උදෑසනකි"],
  ["WoEiklS", "උදෑසනකී"],
  ["WoEikld", "උදෑසනකා"],
  ["WoEiklD", "උදෑසනකෘ"],
  ["WoEiklE", "උදෑසනකෑ"],
]) {
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    unicode,
    `${legacy} must be recognized through its terminal Sinhala inflection`,
  );
}
assert.equal(
  fmToUnicodePreservingNonSinhala("WoEiklaæ"),
  "උදෑසනක්!",
  "Legacy punctuation must remain attached to a recognized Sinhala inflection",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("iïnkaOfhkao"),
  "සම්බන්ධයෙන්ද",
  "a bare Sinhala consonant particle must remain attached to a dictionary stem",
);
assert.equal(
  fmToUnicodePreservingNonSinhala("øeùlrKh"),
  "ද්‍රැවීකරණය",
  "distinctive Legacy letters must outweigh their superficial Latin casing",
);
for (const [legacy, unicode] of [
  ["B - n%iS,h ^Brazil&", "B - බ්‍රසීලය (Brazil)"],
  ["R - reishdj ^Russia&", "R - රුසියාව (Russia)"],
  ["I - bkaÈhdj ^India&", "I - ඉන්දියාව (India)"],
  ["C - Ökh ^China&", "C - චීනය (China)"],
  ["S - ol=Kq wm%sldj ^South Africa&", "S - දකුණු අප්‍රිකාව (South Africa)"],
]) {
  assert.equal(
    fmToUnicodePreservingNonSinhala(legacy),
    unicode,
    "a Latin initial before a dash must remain outside the Legacy conversion",
  );
}
assert.equal(
  fmToUnicodePreservingNonSinhala("example.com foo.bar"),
  "example.com foo.bar",
  "Latin dotted tokens that do not form valid Sinhala spelling must remain unchanged",
);
assert.equal(
  fmToUnicodePreservingNonSinhala('f.=da" ff.+\'\'\''),
  "ගෙුා්, ගෛූ...",
  "strong FM structure must take priority over dotted-token ambiguity",
);
assert.equal(detectSinhalaEncoding('f.=da" ff.+\'\'\''), "legacy");
assert.equal(
  fmToUnicodePreservingNonSinhala(")"),
  "*",
  "known standalone legacy symbols must remain convertible",
);
assert.deepEqual(
  unicodeToFmSegments("English සිංහල").map(
    ({ text, useLegacyFont }) => [text, useLegacyFont],
  ),
  [
    ["English", false],
    [" isxy,", true],
  ],
  "only converted Sinhala segments should use the Legacy font",
);
assert.deepEqual(
  fmToUnicodeSegments("hello bkaÈhka").map(
    ({ source, useLegacyFont }) => [source, useLegacyFont],
  ),
  [
    ["hello ", false],
    ["bkaÈhka", true],
  ],
  "Legacy preview must keep ordinary Latin text out of the Legacy font",
);
assert.equal(detectSinhalaEncoding("සිංහල"), "unicode");
assert.equal(detectSinhalaEncoding("bkaÈhka"), "legacy");
assert.equal(detectSinhalaEncoding("WoEikla"), "legacy");
assert.equal(detectSinhalaEncoding("WoEikls"), "legacy");
assert.equal(detectSinhalaEncoding("WoEiklaæ"), "legacy");
assert.equal(detectSinhalaEncoding("iïnkaOfhkao"), "legacy");
assert.equal(detectSinhalaEncoding("hello 中文"), null);

const sentence = "(‘ගු’ සහ “තු”)";
assert.equal(fmToUnicode(unicodeToFm(sentence)), sentence);

for (const [legacy, unicode] of [
  ["oGd", "දඨා"], ["oGdla", "දඨාක්"], ["^oGd&", "(දඨා)"], ["zoGdZ", "‘දඨා’"],
  ["Wvrxpduvu", "උඩරංචාමඩම"], ["NglKavdhula", "භටකණ්ඩායමක්"],
  ["pkaouqL", "චන්දමුඛ"], ["pkaouqLs", "චන්දමුඛි"],
  ["pkaouqLla", "චන්දමුඛක්"], ["iqKs", "සුණි"], ["iqKl", "සුණක"],
  ["^u:qrd-uOQrd&", "(මථුරා-මධූරා)"],
]) {
  assert.equal(fmToUnicodePreservingNonSinhala(legacy), unicode, `${legacy}: FM spelling must outweigh superficial Latin casing`);
  assert.equal(detectSinhalaEncoding(legacy), "legacy");
}
for (const stem of ["oG", "mG", "nG", "iG", "gL", "vK"]) {
  for (const ending of ["", "d", "s", "S", "e", "E", "q", "Q", "a", "la"]) {
    const legacy = stem + ending;
    if (hasEnglishWordForm(legacy)) continue;
    assert.equal(fmToUnicodePreservingNonSinhala(legacy), fmToUnicode(legacy), `${legacy}: unknown FM words must not be rejected for mixed case`);
    assert.equal(fmToUnicodePreservingNonSinhala(`^${legacy}&`), `(${fmToUnicode(legacy)})`);
  }
}
assert.equal(fmToUnicodePreservingNonSinhala("English oGd English"), "English දඨා English", "a nearby English word alone must not override an FM token");
for (const english of [
  "Where did they come?", "Where did they come?!", "unearthing", "urns",
  "urns!", "unearthings", "Unearthing urns.", "iPhone OpenAI RubyGems ChatGPT FaceTime AirPods iPad",
]) {
  assert.equal(fmToUnicodePreservingNonSinhala(english), english, "English word forms and ordinary punctuation must remain Latin");
  assert.equal(fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala(english)), english);
}
assert.equal(fmToUnicodePreservingNonSinhala("come@ urnsæ"), "come? urns!", "FM punctuation attached to an English word must decode without changing the word");
assert.equal(
  fmToUnicodePreservingNonSinhala("Wvrxpduvu Where did they come? ^u:qrd-uOQrd& unearthing urns iqKs"),
  "උඩරංචාමඩම Where did they come? (මථුරා-මධූරා) unearthing urns සුණි",
  "mixed runs must classify FM names, English sentences and hyphenated wrappers independently",
);
assert.deepEqual(
  fmToUnicodeSegments("iqKs urns?").map(({ text, useLegacyFont }) => [text, useLegacyFont]),
  [["සුණි", true], [" urns?", false]],
);
for (const [legacy, unicode] of [
  ["fm%a", "ප්‍රේ"], ["fma%", "ප්‍රේ"], ["fmHa", "ප්‍යේ"],
  ["f;%a", "ත්‍රේ"], ["f;a%", "ත්‍රේ"], ["fg%a", "ට්‍රේ"], ["fÜ%", "ට්‍රේ"],
]) {
  assert.equal(fmToUnicode(legacy), unicode, "ordinary long-e output must use U+0DDA, not e + virama");
  assert.equal(fmToUnicodePreservingNonSinhala(legacy), unicode);
  assert.ok(unicode.includes("\u0dda"));
  assert.equal(unicodeToFm(fmToUnicode(legacy)), unicodeToFm(unicode));
}
assert.equal(fmToUnicode("f;a= f.a=da"), "තේු ගේුා්", "nonstandard stacked sign order must not be normalized away");

for (const compactDaForms of [false, true]) {
  const options = { compactDaForms };
  for (const [unicode, legacy] of [
    ["ද්‍ර", "ø"], ["ද්‍රා", "ød"], ["ද්‍රැ", "øe"], ["ද්‍රෑ", "øE"],
    ["ද්‍රි", "øs"], ["ද්‍රී", "øS"], ["ද්‍ර්", "øa"],
    ["ද්‍රෘ", "øD"], ["ද්‍රෲ", "øDD"], ["ද්‍රෙ", "fø"],
    ["ද්‍රේ", "føa"], ["ද්‍රෛ", "ffø"], ["ද්‍රො", "fød"],
    ["ද්‍රෝ", "føda"], ["ද්‍රෞ", "fø!"],
  ]) {
    assert.equal(unicodeToFm(unicode, options), legacy, `${unicode}: dedicated da-rakar core`);
    assert.equal(fmToUnicode(legacy, options), unicode);
    assert.equal(fmToUnicodePreservingNonSinhala(legacy, options), unicode);
    assert.equal(unicodeToFm(unicode.normalize("NFD"), options), legacy);
  }
}
assert.equal(fmToUnicode("È% §%"), "ද්‍රි ද්‍රී", "older generic da-rakar vowel spellings remain accepted");
for (const [legacy, unicode] of [["mySkx", "පහීනං"], ["wixySrx", "අසංහීරං"], ["mySkxls", "පහීනංකි"]]) {
  assert.equal(fmToUnicodePreservingNonSinhala(legacy), unicode, "FM vowel casing must not imply a Latin word");
}

const paliPassage = `නමොතස‍්ස භගවතො අරහතො සම‍්මා සම්‍බුද්‍ධස‍්ස
බ‍්භො ම‍්පො ම‍්ඵො ම‍්හො ය්‍යො ය‍්හො ල‍්ලො ල‍්හො ව‍්හො ස‍්මො ස‍්වො ස‍්සො හ‍්මො හ‍්වො
ක්‍වො ක්‍ෂො ත්‍ථො ත්‍වො න්‍වො න්‍ථො න්‍දො න්‍ධො
අර්‍ත්‍ථ ආර්‍ය්‍ය න්‍යාය බ්‍රූ බ්‍රහ‍්මචර්‍ය්‍යාව

අතීතං නාන‍්වාගමෙය්‍ය, නප‍්පටිකඞ‍්ඛෙ අනාගතං; යදතීතං පහීනං තං, අප‍්පත‍්තඤ්‍ච අනාගතං.

පච‍්චුප‍්පන‍්නඤ්‍ච යො ධම‍්මං, තත්‍ථ තත්‍ථ විපස‍්සති; අසංහීරං අසංකුප‍්පං, තං විද්‍වා මනුබ්‍රූහයෙ.

“සම‍්මා සම‍්බුද‍්ධස‍්ස” - “සීගිරි පර්‍වත මස්තකාරූඪ මනුෂ්‍යයෙකුට සෝදාහරණ සහිත ව හෙළයා ගේ ශෛල, වාරි, ගෘහ නිර්මාණ ශක්‍යතාව ද සෙල්බිතෙහි තැවරූ මඩස්තරයක ඇඳි නාරි චිත්‍රයන් ගෙන් සහ කැටපත්පවුරෙහි ලිඛිත කුරුටු ගීවලින් හෙළයා ගේ සෞන්දර්ය හැකියාව දු මනා සේ දැකගත හැක.”

ආර්‍ය්‍ය. වජ්‍රාසන ආරූඪ වූ ශ්‍රී ශක්‍ර දිව්‍ය
බුද්‍ධි “සම‍්මා සම‍්බුද‍්ධස‍්ස” ආර්‍ය්‍ය. වජ්‍රාසන ආරූඪ වූ ශ්‍රී ශක්‍ර දිව්‍ය රාජයා.
සීගිරි පර්‍වත මස්තකාරූඪ මනුෂ්‍යයෙකුට සෝදාහරණ සහිත ව හෙළයා ගේ ශෛල, වාරි, ගෘහ නිර්මාණ ශක්‍යතාව ඕස්ට්‍රේලියාවේ මජ්ඣිම ඉන්ද්‍රිය ඇඳි නාරි චිත්‍රයන්`;
const expectedPaliPassage = paliPassage
  .replaceAll("‍්", "්") // Touching spacing has no legacy slot.
  .replaceAll("ම්‍බ", "ඹ") // Shared legacy slot defaults to prenasalized reading.
  .replaceAll("්‍රූ", "්‍රෑ"); // Shared legacy vowel shape.
assert.equal(
  fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala(paliPassage)),
  expectedPaliPassage,
  "Pali passage round trip must retain spelling apart from documented legacy ambiguities",
);
for (const options of [
  {}, { compactDaForms: true }, { normalizeConjuncts: true },
  { conjunctForms: { common: "decompose", rare: "decompose" }, touchingConjuncts: true },
]) {
  const legacy = unicodeToFmPreservingNonSinhala(paliPassage, options);
  assert.equal(fmToUnicodePreservingNonSinhala(legacy, options), fmToUnicode(legacy, options));
  const mixed = `Pali ${paliPassage}\nDeepSeek ChatGPT Linux SpaceX 2026`;
  const result = fmToUnicodePreservingNonSinhala(unicodeToFmPreservingNonSinhala(mixed, options), options);
  assert.ok(result.startsWith("Pali ") && result.endsWith("DeepSeek ChatGPT Linux SpaceX 2026"));
}

console.log(`OK: ${FM_ABHAYA_MAPPINGS.length} canonical + ${FM_ABHAYA_DERIVED_MAPPINGS.length} derived mappings + regression cases.`);
