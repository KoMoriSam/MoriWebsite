<template>
  <div class="lg:hidden">
    <button
      class="btn btn-ghost btn-square"
      type="button"
      popovertarget="mobile-navigation"
      style="anchor-name: --mobile-navigation-anchor"
      :aria-label="isOpen ? '关闭导航菜单' : '打开导航菜单'"
    >
      <i
        class="text-xl transition-transform duration-200"
        :class="isOpen ? 'ri-close-line rotate-90' : 'ri-menu-line'"
      ></i>
    </button>

    <div
      id="mobile-navigation"
      ref="mobilePopover"
      popover="auto"
      class="dropdown dropdown-start bg-base-100 border-base-300 mt-2 max-h-[min(78dvh,42rem)] w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-box border p-3 shadow-xl"
      style="position-anchor: --mobile-navigation-anchor"
      aria-label="移动端导航"
      @toggle="handleToggle"
    >
      <section aria-labelledby="mobile-primary-navigation">
        <ul class="grid grid-cols-4 gap-2">
          <li v-for="link in NAV_LINKS" :key="link.to.name">
            <RouterLink
              :to="link.to"
              class="btn h-fit flex-col sm:flex-row gap-0 sm:gap-2 py-2 w-full"
              :class="
                isNavigationLinkActive(route, link)
                  ? 'btn-primary'
                  : 'btn-ghost border border-base-300'
              "
              @click="closeMenu"
            >
              <i
                class="text-lg font-normal"
                :class="`${link.icon}-${
                  isNavigationLinkActive(route, link) ? 'fill' : 'line'
                }`"
              ></i>
              {{ link.name }}
            </RouterLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="mobile-project-navigation">
        <div class="divider my-3 justify-between">
          <h2 class="text-base-content/55 text-xs font-bold">
            项目
            <span class="badge badge-ghost badge-xs">
              {{ PROJECTS.length }}
            </span>
          </h2>
          <a
            :href="PROJECTS_GITHUB_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-ghost btn-sm"
            @click="closeMenu"
          >
            <i class="ri-github-fill text-base"></i>
            <span>查看全部仓库</span>
            <i class="ri-arrow-right-up-line"></i>
          </a>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <component
            :is="project.to ? RouterLink : 'a'"
            v-for="project in PROJECTS"
            :key="project.name"
            v-bind="projectLinkProps(project)"
            class="border-base-300 hover:bg-base-200 focus-visible:outline-primary group flex min-h-16 items-center gap-3 rounded-box border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            :class="
              isProjectActive(project) ? 'border-primary/50 bg-primary/10' : ''
            "
            @click="closeMenu"
          >
            <span
              class="bg-base-200 group-hover:bg-primary group-hover:text-primary-content grid size-10 shrink-0 place-items-center rounded-field transition-colors"
              :class="
                isProjectActive(project)
                  ? 'bg-primary text-primary-content'
                  : ''
              "
            >
              <i :class="project.icon" class="text-xl"></i>
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 font-semibold">
                <span class="truncate">{{ project.name }}</span>
                <i
                  v-if="project.href"
                  class="ri-arrow-right-up-line text-base-content/45 ml-auto shrink-0"
                ></i>
              </span>
              <span class="text-base-content/60 mt-0.5 block text-xs">
                {{ project.category }} · {{ project.meta }}
              </span>
            </span>
          </component>
        </div>
      </section>

      <ThemeController embedded />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { NAV_LINKS, isNavigationLinkActive } from "@/constants/navigation.js";
import { PROJECTS, PROJECTS_GITHUB_URL } from "@/constants/projects.js";
import ThemeController from "@/components/ui/theme/ThemeController.vue";

const route = useRoute();
const emit = defineEmits(["open-change"]);
const mobilePopover = ref(null);
const isOpen = ref(false);

const isProjectActive = (project) =>
  project.routeNames?.includes(route.name) ?? false;

const projectLinkProps = (project) =>
  project.to
    ? { to: project.to }
    : {
        href: project.href,
        target: "_blank",
        rel: "noopener noreferrer",
      };

const handleToggle = (event) => {
  isOpen.value = event.newState === "open";
  emit("open-change", isOpen.value);
};

const closeMenu = () => {
  if (mobilePopover.value?.matches?.(":popover-open")) {
    mobilePopover.value.hidePopover();
  }
};
</script>
