<template>
  <header
    class="navbar bg-base-100 shadow-sm"
    :class="
      isNovelReaderRoute
        ? [
            'max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-[70] max-lg:bg-base-100/95 max-lg:backdrop-blur-md max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none',
            readerNavbarVisible
              ? 'max-lg:translate-y-0'
              : 'max-lg:pointer-events-none max-lg:-translate-y-full',
          ]
        : ''
    "
  >
    <nav class="navbar-start">
      <a
        @click="router.push('/')"
        class="max-lg:hidden lg:btn lg:btn-ghost lg:text-xl"
      >
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <MobileNav />
    </nav>
    <nav class="navbar-center">
      <a @click="router.push('/')" class="lg:hidden btn btn-ghost text-xl">
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <div class="hidden items-center lg:flex">
        <ul class="menu menu-horizontal px-1">
          <NavLinks />
        </ul>
        <ProjectMenu />
      </div>
    </nav>
    <nav class="navbar-end">
      <GlobalSearch />
      <ThemeController />
    </nav>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  MOBILE_READER_NAVBAR_HIDE_EVENT,
  MOBILE_READER_NAVBAR_SHOW_EVENT,
} from "@/constants/reader";

const router = useRouter();
const route = useRoute();

import NavLinks from "@/components/layout/NavLinks.vue";
import MobileNav from "@/components/layout/MobileNav.vue";
import ProjectMenu from "@/components/layout/ProjectMenu.vue";
import GlobalSearch from "@/components/layout/GlobalSearch.vue";
import ThemeController from "@/components/ui/theme/ThemeController.vue";

const readerNavbarVisible = ref(false);

const isNovelReaderRoute = computed(() => route.name === "novel-reader");

const hideReaderNavbar = () => {
  readerNavbarVisible.value = false;
};

const showReaderNavbar = () => {
  if (!isNovelReaderRoute.value) return;
  readerNavbarVisible.value = true;
};

watch(
  () => route.name,
  () => {
    readerNavbarVisible.value = false;
  },
);

onMounted(() => {
  window.addEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
  window.addEventListener(MOBILE_READER_NAVBAR_HIDE_EVENT, hideReaderNavbar);
});

onBeforeUnmount(() => {
  window.removeEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
  window.removeEventListener(MOBILE_READER_NAVBAR_HIDE_EVENT, hideReaderNavbar);
});
</script>
