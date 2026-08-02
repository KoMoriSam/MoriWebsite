<template>
  <div class="megamenu megamenu-full">
    <button
      :class="isKaimingActive ? 'btn btn-primary' : 'btn btn-ghost'"
      popovertarget="projects-megamenu"
      type="button"
    >
      <i
        class="text-xl font-normal"
        :class="isKaimingActive ? 'ri-shapes-fill' : 'ri-shapes-line'"
      ></i>
      项目
    </button>

    <div
      id="projects-megamenu"
      popover="auto"
      class="shadow-xl"
      aria-label="项目导航"
    >
      <div class="mx-auto w-full max-w-5xl px-6 py-7">
        <div class="mb-5 flex items-end justify-between gap-6">
          <div>
            <p
              class="text-primary mb-1 text-xs font-bold tracking-[0.16em] uppercase"
            >
              Projects
            </p>
            <h2 class="font-serif text-2xl font-semibold">我的项目</h2>
          </div>
          <a
            :href="PROJECTS_GITHUB_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-ghost btn-sm"
            @click="closeMenus"
          >
            <i class="ri-github-fill text-lg"></i>
            全部仓库
            <i class="ri-arrow-right-up-line"></i>
          </a>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <component
            :is="project.to ? RouterLink : 'a'"
            v-for="project in PROJECTS"
            :key="project.name"
            v-bind="projectLinkProps(project)"
            class="border-base-300 hover:border-primary/40 hover:bg-base-200 focus-visible:outline-primary group flex min-w-0 gap-4 rounded-box border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="closeMenus"
          >
            <span
              class="bg-base-200 group-hover:bg-primary group-hover:text-primary-content grid size-11 shrink-0 place-items-center rounded-field transition-colors"
            >
              <i :class="project.icon" class="text-xl"></i>
            </span>
            <span class="min-w-0 flex-1">
              <span class="mb-1 flex items-center gap-2">
                <strong class="font-serif text-lg">{{ project.name }}</strong>
                <span class="badge badge-ghost badge-sm">{{
                  project.category
                }}</span>
                <i
                  v-if="project.href"
                  class="ri-arrow-right-up-line text-base-content/45 ml-auto"
                ></i>
              </span>
              <span class="text-base-content/65 block text-sm leading-relaxed">
                {{ project.description }}
              </span>
              <span class="text-primary mt-2 block text-xs font-semibold">
                {{ project.meta }}
              </span>
            </span>
          </component>
        </div>
      </div>
    </div>

    <span class="megamenu-active"></span>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { PROJECTS, PROJECTS_GITHUB_URL } from "@/constants/projects.js";

const route = useRoute();

const isKaimingActive = computed(() => route.name === "kaiming");

const projectLinkProps = (project) =>
  project.to
    ? { to: project.to }
    : {
        href: project.href,
        target: "_blank",
        rel: "noopener noreferrer",
      };

const closeMenus = () => {
  if (typeof document === "undefined") return;

  const popover = document.getElementById("projects-megamenu");
  if (popover?.matches?.(":popover-open")) popover.hidePopover();

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
</script>
