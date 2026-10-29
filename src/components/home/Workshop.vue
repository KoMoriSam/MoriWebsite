<template>
  <header class="mb-5">
    <p
      class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
      lang="en"
    >
      Tools &amp; experiments
    </p>
    <h2
      id="home-workshop-title"
      class="font-serif text-2xl font-bold leading-snug md:text-3xl"
    >
      {{ translate("home.workshop.title") }}
    </h2>
  </header>

  <div class="grid items-start gap-7 md:grid-cols-2 md:gap-6 xl:gap-8">
    <section class="min-w-0" aria-labelledby="home-tools-title">
      <h3
        id="home-tools-title"
        class="mb-3 inline-flex items-center gap-2 font-serif text-lg font-bold"
      >
        <i class="ri-tools-line text-primary" aria-hidden="true"></i
        >{{ translate("tools.title") }}
      </h3>
      <ProjectAccordion
        :items="tools"
        :limit="DISPLAY_LIMIT"
        default-open="sinhala-font-converter"
        action-key="tools.open"
        more-to="/tools"
      />
    </section>
    <section class="min-w-0" aria-labelledby="home-games-title">
      <h3
        id="home-games-title"
        class="mb-3 inline-flex items-center gap-2 font-serif text-lg font-bold"
      >
        <i class="ri-gamepad-line text-primary" aria-hidden="true"></i
        >{{ translate("games.title") }}
      </h3>
      <ProjectAccordion
        :items="GAMES"
        :limit="DISPLAY_LIMIT"
        default-open="avalon"
        action-key="games.play"
        more-to="/games"
      />
    </section>
  </div>

  <div class="divider" aria-hidden="true"></div>
  <section aria-labelledby="home-projects-title">
    <h3
      id="home-projects-title"
      class="mb-3 inline-flex items-center gap-2 font-serif text-lg font-bold"
    >
      <i class="ri-shapes-line text-primary" aria-hidden="true"></i
      >{{ translate("common.mobileNav.projects") }}
    </h3>
    <div class="grid gap-3 md:grid-cols-2">
      <ProjectLink
        v-for="project in PROJECTS"
        :key="project.name"
        :to="project.to"
        :href="project.href"
        :title="localizeText(project.name)"
        :description="localizeText(project.description)"
        :icon="project.icon"
        :meta="project.meta"
      />
    </div>
  </section>
</template>

<script setup>
import { useLocale } from "@/i18n";
import { GAMES } from "@/games/catalog";
import { TOOLS } from "@/constants/tools";
import { PROJECTS } from "@/constants/projects";
import ProjectAccordion from "@/components/home/ProjectAccordion.vue";
import ProjectLink from "@/components/home/ProjectLink.vue";

const { t: translate, text: localizeText } = useLocale();
const DISPLAY_LIMIT = 3;
const tools = [...TOOLS].sort(
  (a, b) =>
    Number(b.name === "sinhala-font-converter") -
    Number(a.name === "sinhala-font-converter"),
);
</script>
