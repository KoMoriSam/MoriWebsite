<template>
  <ContentPage
    eyebrow="Kaiming Punctuation"
    :title="translate('pages.kaiming.kaimingPunctuation')"
    :description="translate('pages.kaiming.punctuationFontsForChineseWebTypographyWithSansSerifAnd')"
    :metasLabel="translate('pages.kaiming.fontSpecifications')"
  >
    <template #meta>
      <li class="inline-flex items-center gap-1">
        <i class="ri-font-sans-serif"></i>
        wght 100–900
      </li>
      <li class="inline-flex items-center gap-1">
        <i class="ri-font-serif"></i>
        Sans / Serif
      </li>
      <li class="inline-flex items-center gap-1">
        <i class="ri-file-line"></i>
        WOFF2 Variable
      </li>
      <li class="inline-flex items-center gap-1">
        <i class="ri-creative-commons-by-line"></i>
        SIL OFL 1.1
      </li>
      <a
        class="link link-primary link-hover"
        href="https://github.com/KoMoriSam/Kaiming"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ri-github-fill"></i>
        {{ translate('pages.kaiming.viewSource') }}
        <i class="ri-arrow-right-up-line"></i>
      </a>
    </template>

    <section
      class="card overflow-hidden border border-base-200 bg-base-200/10"
      aria-labelledby="specimen-title"
    >
      <div
        class="flex flex-col gap-4 border-b border-base-200 bg-base-200/60 p-4 md:flex-row md:items-start md:justify-between"
      >
        <fieldset class="fieldset">
          <legend class="fieldset-legend">{{ translate('pages.kaiming.punctuationFontFamily') }}</legend>
          <select
            class="select w-full max-w-xs md:w-48"
            :style="demoStyle"
            v-model="family"
            :aria-label="translate('pages.kaiming.punctuationFontFamily')"
            @change="family = $event.target.value"
          >
            <option disabled selected>{{ translate('pages.kaiming.chooseFontFamily') }}</option>
            <option
              v-for="option in familyOptions"
              :key="option.value"
              :value="option.value"
              :class="{
                'font-serif': option.value === 'serif',
                'font-sans': option.value === 'sans',
              }"
              :selected="family === option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </fieldset>
        <fieldset class="fieldset flex-1">
          <legend class="fieldset-legend">
            {{ translate('pages.kaiming.variableWeight') }}
            <output
              class="badge badge-primary badge-sm font-mono"
              for="kaiming-weight"
            >
              {{ weight }}
            </output>
          </legend>
          <input
            id="kaiming-weight"
            v-model.number="weight"
            class="range range-primary max-md:range-sm w-full mt-1"
            type="range"
            min="100"
            max="900"
            step="1"
            :aria-valuetext="translate('pages.kaiming.weight', { p0: weight })"
          />
        </fieldset>
      </div>

      <div class="p-6">
        <h2 id="specimen-title" class="sr-only">{{ translate('pages.kaiming.liveFontSpecimen') }}</h2>
        <div
          class="text-justify mx-auto min-h-64 w-[11em] md:w-[17em] lg:w-[18em] xl:w-[19em] rounded-box p-3 leading-snug outline-none transition-colors hover:bg-base-200/40 focus:bg-base-200/60 md:min-h-80 md:p-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
          contenteditable="true"
          role="textbox"
          :aria-label="translate('pages.kaiming.editableFontSpecimen')"
          aria-multiline="true"
          spellcheck="false"
          :style="demoStyle"
        >
          　　潋城，清晨。老街传来消息：“《重返地平线（克里斯·莫蒂著）》已出版，首批
          100 万册！”——真让人惊喜！但我想问：它会被更多人读到吗？
        </div>
      </div>

      <div
        class="flex flex-wrap justify-between gap-2 border-t border-base-200 bg-base-200/60 px-4 py-2 text-xs text-base-content/60"
      >
        <span>{{ translate('pages.kaiming.clickTheSpecimenToEdit') }}</span>
        <span>{{ translate('pages.kaiming.currentFont') }}{{ activeFamilyLabel }}</span>
      </div>
    </section>

    <section class="py-16" aria-labelledby="features-title">
      <header class="mb-8 text-center">
        <p
          class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase"
        >{{ translate('common.sections.typographyFeatures') }}</p>
        <h2
          id="features-title"
          class="font-serif text-2xl font-bold md:text-3xl"
        >
          {{ translate('pages.kaiming.refiningPunctuationRhythmInChineseText') }}
        </h2>
      </header>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article
          v-for="feature in features"
          :key="feature.index"
          class="card card-dash border border-base-200 bg-base-200/10"
        >
          <div class="card-body">
            <aside class="card-icon font-mono text-sm">
              {{ feature.index }}
            </aside>
            <h3 class="card-title font-serif font-bold">{{ feature.title }}</h3>
            <p
              class="my-4 text-4xl leading-none md:text-5xl"
              :class="demoStyle.fontFamily"
              :style="demoStyle"
            >
              {{ feature.sample }}
            </p>
            <p class="text-sm text-base-content/70">
              {{ feature.description }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="pb-12" aria-labelledby="usage-title">
      <header class="mb-8 text-center">
        <p
          class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase"
        >{{ translate('common.sections.useOnWeb') }}</p>
        <h2 id="usage-title" class="font-serif text-2xl font-bold md:text-3xl">
          {{ translate('pages.kaiming.oneLineImportWithFontFallback') }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-base-content/70">
          {{ translate('pages.kaiming.preciseCssUnicodeRangeLoadsAndReplacesOnlyTheIncluded') }}
        </p>
      </header>

      <div
        class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <article class="card overflow-hidden">
          <CodeBlock class="my-2" :code="usageCode" language="css" />
        </article>

        <article class="card border border-base-200 bg-base-200/10">
          <div class="card-body">
            <h3 class="card-title font-serif font-bold">{{ translate('pages.kaiming.downloadsSource') }}</h3>
            <p class="text-sm text-base-content/70">
              {{ translate('pages.kaiming.useTheWebFontsDirectlyOrGetOtherFormatsAnd') }}
            </p>
            <div class="mt-2 grid gap-2">
              <a
                v-for="download in downloads"
                :key="download.href"
                class="btn btn-ghost justify-between border-base-200"
                :href="download.href"
                :target="download.external ? '_blank' : undefined"
                :rel="download.external ? 'noopener noreferrer' : undefined"
              >
                <span>{{ download.label }}</span>
                <span class="text-xs font-normal opacity-60">
                  {{ download.meta }}
                </span>
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed, ref } from "vue";

import ContentPage from "@/components/layout/ContentPage.vue";
import CodeBlock from "@/components/markdown/code/CodeBlock.vue";

const weight = ref(400);
const family = ref("serif");

const familyOptions = [
  { get label() { return translate('pages.kaiming.sansSerif'); }, value: "sans" },
  { get label() { return translate('pages.kaiming.serif'); }, value: "serif" },
];

const activeFamilyLabel = computed(
  () => familyOptions.find((option) => option.value === family.value)?.label,
);

const demoStyle = computed(() => ({
  fontFamily:
    family.value === "serif"
      ? "'Kaiming Punctuation Serif', 'Petrona Variable', 'Petrona', 'Noto Serif SC Variable', 'Noto Serif SC', 'Source Han Serif SC Variable', 'Source Han Serif SC', 'Noto Serif Sinhala Variable', 'Noto Serif Sinhala', ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
      : "'Kaiming Punctuation Sans', 'Inter Variable', 'Inter', 'Noto Sans SC Variable', 'Noto Sans SC', 'Noto Sans Sinhala Variable', 'Noto Sans Sinhala', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  fontWeight: weight.value,
  fontVariationSettings: `"wght" ${weight.value}`,
}));

const features = [
  {
    index: "01",
    get title() { return translate('pages.kaiming.halfWidthPunctuation'); },
    sample: "「开」「明」",
    get description() { return translate('pages.kaiming.bracketsQuotesAndCommasUseHalfWidthSpacingForA'); },
  },
  {
    index: "02",
    get title() { return translate('pages.kaiming.compactSentenceEndings'); },
    sample: "真的？！",
    get description() { return translate('pages.kaiming.consecutiveEndingMarksAreCompactedPreservingEmphasisWithoutExcessSpacing'); },
  },
  {
    index: "03",
    get title() { return translate('pages.kaiming.dashLigature'); },
    sample: "上篇——下篇",
    get description() { return translate('pages.kaiming.doubleDashesFormAContinuousTwoCharacterWideLigatureThat'); },
  },
];

const usageCode = `@import url("https://raw.komori.cc/kaiming/index.css");

article {
  font-family:
    "Kaiming Punctuation Sans",
    "Noto Sans SC Variable",
    sans-serif;
  font-weight: 400;
}`;

const downloads = [
  {
    get label() { return translate('pages.kaiming.webImport'); },
    meta: "CSS",
    href: "https://raw.komori.cc/kaiming/index.css",
    external: true,
  },
  {
    get label() { return translate('pages.kaiming.releases'); },
    meta: "Releases",
    href: "https://github.com/KoMoriSam/Kaiming/releases",
    external: true,
  },
  {
    get label() { return translate('pages.kaiming.sourceRepository'); },
    meta: "GitHub",
    href: "https://github.com/KoMoriSam/Kaiming",
    external: true,
  },
  {
    get label() { return translate('pages.kaiming.openSourceLicense'); },
    meta: "OFL 1.1",
    href: "https://raw.komori.cc/kaiming/LICENSE",
    external: true,
  },
];
</script>
