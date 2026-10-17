<template>
  <section id="sinhala-converter-examples" class="not-prose min-w-0">
    <div
      id="sinhala-converter-example-grid"
      class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch"
    >
      <article
        v-for="card in cards"
        :key="card.id"
        class="card card-border min-w-0 w-full bg-base-100 sm:w-auto sm:flex-[1_1_18rem]"
        :class="{ 'sm:basis-full': card.wide }"
        :aria-labelledby="`sinhala-example-${card.id}`"
      >
        <div class="card-body @container min-w-0 gap-3 p-3 sm:p-4">
          <header>
            <h3
              :id="`sinhala-example-${card.id}`"
              class="card-title font-serif text-base"
            >
              <ExampleTitle
                :title-key="card.titleKey"
                :term-key="card.termKey"
              />
            </h3>
            <p class="mt-1 text-sm leading-6 text-pretty text-base-content/70">
              {{ translate(card.descriptionKey) }}
            </p>
          </header>

          <div
            class="grid min-w-0 grid-cols-1 gap-3"
            :class="
              card.id === 'conjuncts'
                ? '@xl:grid-cols-2 @4xl:grid-cols-3'
                : 'sm:grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]'
            "
          >
            <ExampleGroup
              v-for="group in card.groups"
              :key="group.titleKey"
              :title-key="group.titleKey"
              :term-key="group.termKey"
              :note-key="group.noteKey"
              :footer-note-key="group.footerNoteKey"
              :compare-forms="group.compareForms"
              :rows="group.rows"
              :show-encodings="showExampleEncodings"
              :target-class="group.targetClass"
              @toggle-encoding="toggleExampleEncodings"
            />
            <div
              v-if="card.id === 'conjuncts'"
              class="grid min-w-0 grid-cols-1 content-start gap-3 @xl:col-span-2 @xl:grid-cols-2 @4xl:col-span-1 @4xl:grid-cols-1"
            >
              <section class="min-w-0">
                <h4 class="text-sm font-medium">
                  <ExampleTitle
                    title-key="tools.info.touchingConjuncts"
                    term-key="tools.info.terms.touchingLetters"
                  />
                </h4>
                <p class="mt-1 text-xs leading-5 text-base-content/60">
                  {{ translate("tools.info.touchingSequenceDescription") }}
                </p>
                <p class="mt-2 text-xs text-base-content/55">
                  {{ translate("tools.info.touchingGlyph") }}（{{
                    translate("tools.info.plainForm")
                  }}）
                </p>
                <div
                  class="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-abhaya text-2xl leading-normal"
                  lang="si"
                >
                  <span
                    v-for="pair in touchingExamples"
                    :key="pair.plain"
                    class="inline-flex flex-wrap items-center gap-x-3"
                  >
                    <span class="whitespace-nowrap">{{ pair.touching }}</span>
                    <span class="whitespace-nowrap text-base-content/55"
                      >({{ pair.plain }})</span
                    >
                  </span>
                </div>
                <p class="mt-1 text-xs leading-5 text-base-content/60">
                  {{
                    translate(
                      "tools.notes.touchingLettersHaveNoDedicatedLegacyCodesConversionExpandsThem",
                    )
                  }}
                </p>
              </section>

              <section class="min-w-0">
                <h4 class="text-sm font-medium">
                  <ExampleTitle
                    title-key="tools.info.paliVowelSpelling"
                    term-key="tools.info.terms.paliVowelSpelling"
                  />
                </h4>
                <p
                  class="mt-1 text-sm leading-6 text-pretty text-base-content/70"
                >
                  {{ translate("tools.info.paliHalFormsDescription") }}
                </p>
                <p class="mt-2 text-xs text-base-content/55">
                  {{ translate("tools.info.unicodeSpelling") }} →
                  {{ translate("tools.info.paliSpelling") }}
                </p>
                <div class="mt-1 flex min-w-0 flex-wrap gap-x-5 gap-y-1">
                  <div
                    v-for="pair in paliVowelExamples"
                    :key="pair.from"
                    class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-abhaya text-xl leading-normal"
                    lang="si"
                  >
                    <span>{{ pair.from }}</span>
                    <span
                      class="text-sm text-base-content/40"
                      aria-hidden="true"
                      >→</span
                    >
                    <span>{{ pair.to }}</span>
                  </div>
                </div>
              </section>
              <details class="collapse collapse-arrow">
                <summary
                  class="collapse-title min-h-0 py-2 text-sm font-semibold after:start-0 after:inset-e-auto pe-0 ps-5"
                >
                  {{ translate("tools.info.conjunctRules") }}
                </summary>
                <div
                  class="space-y-2 text-sm leading-6 text-pretty text-base-content/70"
                >
                  <p>
                    {{ translate("tools.info.conjunctOptionsDescription") }}
                  </p>
                  <p>{{ translate("tools.info.conjunctAvailability") }}</p>
                </div>
              </details>

              <p class="text-xs leading-5 text-base-content/60">
                {{ translate("tools.info.classificationReference") }}
                <a
                  href="https://pitaka.lk/tools/unicode/pali_bandi.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link link-hover"
                  >Pali bandi Akuru Generator</a
                >
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { useLocale } from "@/i18n";
import ExampleGroup from "./ExampleGroup.vue";
import ExampleTitle from "./ExampleTitle.vue";
import {
  FM_ABHAYA_MAPPINGS,
  FM_ABHAYA_LEGACY_ALIASES,
  unicodeToFm,
  unicodeToFmSegments,
} from "@/utils/sinhala/converter";
import { SINHALA_CONJUNCT_CATEGORIES } from "@/utils/sinhala/conjuncts";

const { t: translate } = useLocale();
const emit = defineEmits(["announcement"]);
const showExampleEncodings = ref(false);
const legacyAliasExamples = [...FM_ABHAYA_LEGACY_ALIASES].map(
  ([legacy, unicode]) => ({ legacy, unicode }),
);
const legacyExamples = [...FM_ABHAYA_MAPPINGS, ...legacyAliasExamples];

function legacyInputsFor(unicode, preferred, options = {}) {
  const targets = new Set(
    [unicode, options.sharedUnicode]
      .filter(Boolean)
      .map((target) => target.normalize("NFC")),
  );
  // Use declared glyph mappings, not generic decoding fallbacks (e.g. <Q
  // decodes as ළූ but does not render like the dedicated ¿E glyph).
  // Compact examples retain their dedicated aliases rather than expanded forms.
  const candidates = options.compactDaForms
    ? legacyAliasExamples
    : legacyExamples;
  return [
    ...new Set([
      preferred,
      ...candidates
        .filter((entry) => targets.has(entry.unicode.normalize("NFC")))
        .map((entry) => entry.legacy),
    ]),
  ];
}

const rowFor = (unicode, options = {}) => ({
  legacyInputs: legacyInputsFor(
    unicode,
    unicodeToFm(unicode, options),
    options,
  ),
  unicode,
});
const groupFor = (titleKey, examples, options) => ({
  titleKey: `tools.info.${titleKey}`,
  rows: examples.map((unicode) => rowFor(unicode, options)),
});
const mixedSourceSegments = unicodeToFmSegments("සිංහල English 2026");
const cards = [
  {
    id: "vowels",
    titleKey: "tools.info.vowelSigns",
    termKey: "tools.info.terms.vowelSigns",
    descriptionKey:
      "tools.info.reorderLegacyVowelSignsIntoUnicodeCharacterOrder",
    groups: [
      groupFor("commonVowels", ["කා", "කැ", "කෙ", "කෝ", "කූ"]),
      {
        ...groupFor("variantsAndCombinations", ["ළූ", "දි", "ද්‍රු", "බ්‍රූ"]),
        footerNoteKey: "tools.notes.rakarVowelFormsShareLegacyCodes",
      },
    ],
  },
  {
    id: "dedicated",
    titleKey: "tools.info.specialGlyphs",
    descriptionKey: "tools.info.dedicatedGlyphsDescription",
    groups: [
      {
        ...groupFor("prenasalizedConsonants", ["ඟ", "ඦ", "ඬ", "ඳ", "ඹ"]),
        termKey: "tools.info.terms.prenasalizedConsonants",
      },
      {
        ...groupFor(
          "compactFormsEnableTheOption",
          ["දා", "දැ", "ඳා", "ඳැ", "න්‍දා"],
          { compactDaForms: true },
        ),
        targetClass: "font-features-['ss01']",
        termKey: "tools.info.compactFormsOptionNote",
      },
    ],
  },
  {
    id: "conjuncts",
    wide: true,
    titleKey: "tools.info.conjunctsAndSpecialGlyphs",
    termKey: "tools.info.terms.conjuncts",
    descriptionKey:
      "tools.info.recognizeConjunctsAndPrenasalizedConsonantsWithDedicatedGlyphsWhenCompact",
    groups: Object.entries(SINHALA_CONJUNCT_CATEGORIES).map(
      ([category, pairs]) => ({
        titleKey: `tools.info.${category}Conjuncts`,
        termKey: `tools.info.terms.${category}Conjuncts`,
        noteKey: "tools.info.conjunctComparisonNote",
        compareForms: true,
        rows: pairs.map((pair) => ({
          legacyInputs: legacyInputsFor(pair.unicode, pair.legacy, {
            sharedUnicode: pair.sharedUnicode,
          }),
          plain: pair.plain,
          unicode: pair.unicode,
        })),
      }),
    ),
  },
  {
    id: "reduced",
    titleKey: "tools.info.consonantAbbreviationsAndJoining",
    termKey: "tools.info.terms.reducedConsonantForms",
    descriptionKey:
      "tools.info.recognizeFormsSuchAsTrailingLowerAndUpperBuiltWith",
    groups: [groupFor("trailingLowerUpper", ["ක්‍ය", "ක්‍ර", "ර්‍ක"])],
  },
  {
    id: "order",
    titleKey: "tools.info.nonstandardGlyphOrderInOldDocuments",
    descriptionKey:
      "tools.info.differentLegacyInputOrdersForTheSameGlyphNormalizeTo",
    groups: [
      {
        titleKey: "tools.info.orderOfLowerAndVowelSigns",
        rows: [{ legacyInputs: ["l%s", "ls%"], unicode: "ක්‍රි" }],
      },
      {
        titleKey: "tools.info.orderOfLowerAndLongVowelMarker",
        rows: [{ legacyInputs: ["fl%a", "fla%"], unicode: "ක්‍රේ" }],
      },
    ],
  },
  {
    id: "mixed",
    titleKey: "tools.info.mixedSinhalaAndNonSinhalaLegacyText",
    descriptionKey:
      "tools.info.convertOnlySinhalaSegmentsPreservingEnglishNumbersAndOtherText",
    groups: [
      {
        titleKey: "tools.info.sinhalaEnglishAndNumbers",
        rows: [
          {
            legacyInputs: [
              mixedSourceSegments.map((segment) => segment.text).join(""),
            ],
            sourceSegments: mixedSourceSegments,
            unicode: "සිංහල English 2026",
          },
        ],
      },
    ],
  },
];
// Touching forms place ZWJ before the virama; ligated forms place it after.
const touchingExamples = [
  { plain: "ස්ස", touching: "ස\u200d්ස" },
  { plain: "ම්ම", touching: "ම\u200d්ම" },
  { plain: "බ්භ", touching: "බ\u200d්භ" },
  { plain: "හ්ම", touching: "හ\u200d්ම" },
];
const paliVowelExamples = [
  { from: "ඒ", to: "එ" },
  { from: "ඕ", to: "ඔ" },
  { from: "කේ", to: "කෙ" },
  { from: "කෝ", to: "කො" },
];

function toggleExampleEncodings() {
  showExampleEncodings.value = !showExampleEncodings.value;
  emit(
    "announcement",
    translate(
      showExampleEncodings.value
        ? "tools.info.legacyExampleEncodingIsNowVisible"
        : "tools.info.legacyExampleGlyphsAreNowVisible",
    ),
  );
}
</script>
