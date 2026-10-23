<template>
  <section id="sinhala-converter-examples" class="not-prose min-w-0">
    <div
      id="sinhala-converter-example-grid"
      class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch"
    >
      <article
        v-for="card in cards"
        :key="card.id"
        class="card card-border min-w-0 w-full border-base-300 bg-base-200/15 sm:w-auto sm:flex-[1_1_18rem]"
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
                    title-key="sinhala.info.touchingConjuncts"
                    term-key="sinhala.info.terms.touchingLetters"
                  />
                </h4>
                <p class="mt-1 text-xs leading-5 text-base-content/60">
                  {{ translate("sinhala.info.touchingDescription") }}
                </p>
                <p class="mt-2 text-xs text-base-content/55">
                  {{ translate("sinhala.info.touchingGlyph") }}（{{
                    translate("sinhala.info.expandedForm")
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
                      "sinhala.notes.touchingLetters",
                    )
                  }}
                </p>
              </section>

              <section class="min-w-0">
                <h4 class="text-sm font-medium">
                  <ExampleTitle
                    title-key="sinhala.info.paliVowelSpelling"
                    term-key="sinhala.info.terms.paliVowelSpelling"
                  />
                </h4>
                <p
                  class="mt-1 text-sm leading-6 text-pretty text-base-content/70"
                >
                  {{ translate("sinhala.info.paliVowelsDescription") }}
                </p>
                <p class="mt-2 text-xs text-base-content/55">
                  {{ translate("sinhala.info.unicodeSpelling") }} →
                  {{ translate("sinhala.info.paliSpelling") }}
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
                  {{ translate("sinhala.info.conjunctRules") }}
                </summary>
                <div
                  class="space-y-2 text-sm leading-6 text-pretty text-base-content/70"
                >
                  <p>
                    {{ translate("sinhala.info.optionsDescription") }}
                  </p>
                  <p>{{ translate("sinhala.info.conjunctAvailability") }}</p>
                </div>
              </details>

              <p class="text-xs leading-5 text-base-content/60">
                {{ translate("sinhala.info.classificationReference") }}
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
  titleKey: `sinhala.info.${titleKey}`,
  rows: examples.map((unicode) => rowFor(unicode, options)),
});
const mixedSourceSegments = unicodeToFmSegments("සිංහල English 2026");
const cards = [
  {
    id: "vowels",
    titleKey: "sinhala.info.vowelSigns",
    termKey: "sinhala.info.terms.vowelSigns",
    descriptionKey:
      "sinhala.info.vowelsDescription",
    groups: [
      groupFor("commonVowels", ["කා", "කැ", "කෙ", "කෝ", "කූ"]),
      {
        ...groupFor("variantsAndCombinations", ["ළූ", "දි", "ද්‍රු", "බ්‍රූ"]),
        footerNoteKey: "sinhala.notes.vowelCodes",
      },
    ],
  },
  {
    id: "dedicated",
    titleKey: "sinhala.info.specialGlyphs",
    descriptionKey: "sinhala.info.glyphsDescription",
    groups: [
      {
        ...groupFor("prenasalizedConsonants", ["ඟ", "ඦ", "ඬ", "ඳ", "ඹ"]),
        termKey: "sinhala.info.terms.prenasalizedConsonants",
      },
      {
        ...groupFor(
          "compactForms",
          ["දා", "දැ", "ඳා", "ඳැ", "න්‍දා"],
          { compactDaForms: true },
        ),
        targetClass: "font-features-['ss01']",
        termKey: "sinhala.info.compactHint",
      },
    ],
  },
  {
    id: "conjuncts",
    wide: true,
    titleKey: "sinhala.info.conjunctsTitle",
    termKey: "sinhala.info.terms.conjuncts",
    descriptionKey:
      "sinhala.info.conjunctsDescription",
    groups: Object.entries(SINHALA_CONJUNCT_CATEGORIES).map(
      ([category, pairs]) => ({
        titleKey: `sinhala.info.${category}Conjuncts`,
        termKey: `sinhala.info.terms.${category}Conjuncts`,
        noteKey: "sinhala.info.conjunctComparisonNote",
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
    titleKey: "sinhala.info.reducedForms",
    termKey: "sinhala.info.terms.reducedConsonantForms",
    descriptionKey:
      "sinhala.info.reducedDescription",
    groups: [
      {
        titleKey: "sinhala.info.reducedNames",
        compareForms: true,
        rows: ["ක්‍ය", "ක්‍ර", "ර්‍ක"].map((unicode) => ({
          ...rowFor(unicode),
          plain: unicode.replaceAll("\u200d", ""),
        })),
      },
    ],
  },
  {
    id: "order",
    titleKey: "sinhala.info.glyphOrder",
    descriptionKey:
      "sinhala.info.orderDescription",
    groups: [
      {
        titleKey: "sinhala.info.vowelOrder",
        rows: [{ legacyInputs: ["l%s", "ls%"], unicode: "ක්‍රි" }],
      },
      {
        titleKey: "sinhala.info.longVowelOrder",
        rows: [{ legacyInputs: ["fl%a", "fla%"], unicode: "ක්‍රේ" }],
      },
    ],
  },
  {
    id: "mixed",
    titleKey: "sinhala.info.mixedText",
    descriptionKey:
      "sinhala.info.mixedDescription",
    groups: [
      {
        titleKey: "sinhala.info.mixedExample",
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
        ? "sinhala.info.encodingVisible"
        : "sinhala.info.glyphsVisible",
    ),
  );
}
</script>
