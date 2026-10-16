// Conjunct categories from https://pitaka.lk/tools/unicode/pali_bandi.htm.
// Shared FM glyphs retain their prenasalized reading unless rare conjuncts
// are explicitly unified. Legacy encoding alone cannot distinguish both.
const makePair = ([first, second, legacy, replacement, sharedUnicode]) => Object.freeze({
  plain: first + "්" + second,
  touching: first + "‍්" + second,
  blocked: first + "්\u200c" + second,
  joined: first + "්‍" + second,
  unicode: replacement ?? first + "්‍" + second,
  legacy,
  sharedUnicode,
});

export const SINHALA_CONJUNCT_CATEGORIES = Object.freeze({
  common: Object.freeze([
    ["ක", "ව", "Cj"], ["ක", "ෂ", "CI"], ["ත", "ථ", "F:"], ["ත", "ව", "Fj"],
    ["න", "ව", "Jj"], ["න", "ථ", "J:"], ["න", "ද", "Jo"], ["න", "ධ", "JO"],
  ].map(makePair)),
  rare: Object.freeze([
    ["ඤ", "ච", "`p"], ["ඤ", "ජ", "`c", undefined, "ඦ"],
    ["ඤ", "ඡ", "`P"], ["ට", "ඨ", "`G"],
    ["ණ", "ඩ", "`v", undefined, "ඬ"], ["ද", "ධ", "Š"], ["ද", "ව", "„"],
    ["ම", "බ", "U", undefined, "ඹ"], // Sinhala, not Pali, in the reference.
    ["ඞ", "ග", "Õ", "ඟ"], // Prenasalized replacement, not a separate ligature.
  ].map(makePair)),
});
