<template>
  <ContentPage :title="translate('home.hero.title')" :show-header="false">
    <div
      class="home-layout [--viewport-section-offset:calc(var(--navbar-height)+0.75rem)] md:[--viewport-section-offset:calc(var(--navbar-height)+1rem)]"
    >
      <div ref="opening" class="viewport-section flex flex-col">
        <div
          id="entrance"
          ref="entrance"
          class="flex flex-1 scroll-mt-(--navbar-scroll-offset) items-center py-4"
          :class="combineOpening ? '' : 'viewport-section'"
        >
          <Entrance
            class="w-full shrink-0"
            :article="articles[0]"
            @explore="scrollToRandomSection"
          />
        </div>
        <div ref="openingDivider" class="divider shrink-0"></div>
        <section
          id="about"
          ref="about"
          class="shrink-0 scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
          aria-labelledby="home-about-title"
        >
          <Profile />
        </section>
      </div>
      <div class="divider"></div>
      <section
        id="writing"
        class="scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
        aria-labelledby="home-writing-title"
      >
        <WritingDesk
          :articles="articles"
          :loading="loading"
          :refresh-articles="refreshArticles"
        />
      </section>
      <div class="divider"></div>
      <section
        id="workshop"
        class="scroll-mt-(--navbar-scroll-offset) py-8 md:py-10 xl:py-14"
        aria-labelledby="home-workshop-title"
      >
        <Workshop />
      </section>
    </div>
    <SectionNavigation
      :label="translate('home.navigation.label')"
      :sections="sections"
      :active-section="activeSection"
      :section-position="sectionPosition"
      :section-span="sectionSpan"
      @navigate="scrollToSection"
    />
  </ContentPage>
</template>

<script setup>
import { useLocale } from "@/i18n";
import ContentPage from "@/components/layout/ContentPage.vue";
import Entrance from "@/components/home/Entrance.vue";
import WritingDesk from "@/components/home/WritingDesk.vue";
import Workshop from "@/components/home/Workshop.vue";
import Profile from "@/components/home/Profile.vue";
import SectionNavigation from "@/components/interaction/navigation/SectionNavigation.vue";
import { useLatestArticles } from "@/composables/home/useLatestArticles";
import { useSectionNavigation } from "@/composables/layout/useSectionNavigation";
import { useOpeningHeight } from "@/composables/home/useOpeningHeight";

const { t: translate } = useLocale();
const { opening, entrance, openingDivider, about, combineOpening } =
  useOpeningHeight();
const { articles, loading, refresh: refreshArticles } = useLatestArticles(4);
const sections = [
  { id: "entrance", titleKey: "common.navigation.home" },
  { id: "about", titleKey: "home.navigation.about" },
  { id: "writing", titleKey: "home.writing.title" },
  { id: "workshop", titleKey: "home.workshop.title" },
];
const {
  activeSection,
  sectionPosition,
  sectionSpan,
  scrollToSection,
  scrollToRandomSection,
} = useSectionNavigation(sections);
</script>
