<template>
  <main
    class="mx-auto w-full max-w-7xl flex-1 px-6 pt-3 pb-6 md:px-12 md:pt-4 md:pb-8 lg:px-16 xl:px-20"
    aria-labelledby="kaiming-title"
  >
    <section
      id="kaiming-opening"
      ref="opening"
      class="viewport-section relative isolate flex scroll-mt-(--navbar-scroll-offset) flex-col justify-center py-8 md:my-6 md:py-10"
      aria-labelledby="kaiming-title"
    >
      <PunctuationBackdrop />
      <Opening @try="scrollToSection('kaiming-specimen')" />
    </section>

    <div class="divider" aria-hidden="true"></div>
    <section
      id="kaiming-specimen"
      class="min-w-0 scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
      aria-labelledby="specimen-title"
    >
      <header class="mb-5 md:mb-6">
        <p
          class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
          lang="en"
        >
          Type playground
        </p>
        <h2
          id="specimen-title"
          class="font-serif text-2xl leading-snug font-bold text-balance md:text-3xl"
        >
          {{ translate("kaiming.specimen") }}
        </h2>
      </header>
      <TypeSpecimen
        v-model:family="family"
        v-model:weight="weight"
        :demo-style="demoStyle"
        :base-style="baseStyle"
        :family-options="familyOptions"
        :active-family-label="activeFamilyLabel"
      />
    </section>

    <div class="divider" aria-hidden="true"></div>
    <section
      id="kaiming-features"
      class="min-w-0 scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
      aria-labelledby="features-title"
    >
      <header class="mb-5 md:mb-6">
        <p
          class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
          lang="en"
        >
          Typography features
        </p>
        <h2
          id="features-title"
          class="max-w-2xl font-serif text-2xl leading-snug font-bold text-balance md:text-3xl"
        >
          {{ translate("kaiming.rhythmTitle") }}
        </h2>
      </header>
      <FeatureComparison
        :features="features"
        :demo-style="demoStyle"
        :base-style="baseStyle"
      />
    </section>

    <div class="divider" aria-hidden="true"></div>
    <section
      id="kaiming-usage"
      class="min-w-0 scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
      aria-labelledby="usage-title"
    >
      <header class="mb-5 md:mb-6">
        <p
          class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
          lang="en"
        >
          Use on the web
        </p>
        <h2
          id="usage-title"
          class="font-serif text-2xl leading-snug font-bold text-balance md:text-3xl"
        >
          {{ translate("kaiming.importTitle") }}
        </h2>
      </header>
      <WebUsage :code="usageCode" :downloads="downloads" />
    </section>
    <SectionNavigation
      :label="translate('kaiming.navigation')"
      :sections="sections"
      :active-section="activeSection"
      :section-position="sectionPosition"
      :section-span="sectionSpan"
      @navigate="scrollToSection"
    />
  </main>
  <Footer />
</template>
<script setup>
import { useLocale } from "@/i18n";
const { t: translate } = useLocale();

import { computed, ref } from "vue";

import Footer from "@/components/layout/Footer.vue";
import Opening from "@/components/kaiming/Opening.vue";
import PunctuationBackdrop from "@/components/kaiming/PunctuationBackdrop.vue";
import TypeSpecimen from "@/components/kaiming/TypeSpecimen.vue";
import FeatureComparison from "@/components/kaiming/FeatureComparison.vue";
import WebUsage from "@/components/kaiming/WebUsage.vue";
import SectionNavigation from "@/components/interaction/navigation/SectionNavigation.vue";
import { useViewportSection } from "@/composables/layout/useViewportSection";
import { useSectionNavigation } from "@/composables/layout/useSectionNavigation";
const opening = useViewportSection();
const sections = [
  { id: "kaiming-opening", titleKey: "kaiming.title" },
  { id: "kaiming-specimen", titleKey: "kaiming.specimen" },
  { id: "kaiming-features", titleKey: "kaiming.rhythmTitle" },
  { id: "kaiming-usage", titleKey: "kaiming.downloads" },
];
const { activeSection, sectionPosition, sectionSpan, scrollToSection } =
  useSectionNavigation(sections);

const weight = ref(400);
const family = ref("serif");

const familyOptions = [
  {
    get label() {
      return translate("kaiming.sansSerif");
    },
    value: "sans",
  },
  {
    get label() {
      return translate("kaiming.serif");
    },
    value: "serif",
  },
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

const baseStyle = computed(() => ({
  ...demoStyle.value,
  fontFamily: demoStyle.value.fontFamily.replace(
    /^'Kaiming Punctuation (Serif|Sans)', /,
    "",
  ),
}));

const features = [
  {
    index: "01",
    get title() {
      return translate("kaiming.halfWidthTitle");
    },
    sample: "「开」「明」",
    get description() {
      return translate("kaiming.halfWidthHint");
    },
  },
  {
    index: "02",
    get title() {
      return translate("kaiming.compactTitle");
    },
    sample: "真的？！",
    get description() {
      return translate("kaiming.compactHint");
    },
  },
  {
    index: "03",
    get title() {
      return translate("kaiming.dashTitle");
    },
    sample: "上篇——下篇",
    get description() {
      return translate("kaiming.dashHint");
    },
  },
];

const usageCode = computed(
  () => `@import url("https://raw.komori.cc/kaiming/index.css");

article {
  font-family:
    "Kaiming Punctuation ${family.value === "serif" ? "Serif" : "Sans"}",
    "Noto ${family.value === "serif" ? "Serif" : "Sans"} SC Variable",
    ${family.value === "serif" ? "serif" : "sans-serif"};
  font-weight: ${weight.value};
}`,
);
const downloads = [
  {
    get label() {
      return translate("kaiming.webImport");
    },
    icon: "ri-file-code-line",
    meta: "CSS",
    href: "https://raw.komori.cc/kaiming/index.css",
    external: true,
  },
  {
    get label() {
      return translate("kaiming.releases");
    },
    icon: "ri-download-line",
    meta: "Releases",
    href: "https://github.com/KoMoriSam/Kaiming/releases",
    external: true,
  },
  {
    get label() {
      return translate("kaiming.sourceRepository");
    },
    icon: "ri-github-fill",
    meta: "GitHub",
    href: "https://github.com/KoMoriSam/Kaiming",
    external: true,
  },
  {
    get label() {
      return translate("kaiming.openSourceLicense");
    },
    icon: "ri-creative-commons-by-line",
    meta: "OFL 1.1",
    href: "https://raw.komori.cc/kaiming/LICENSE",
    external: true,
  },
];
</script>
