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
    @pointerdown="scheduleReaderNavbarHide"
    @touchstart.passive="handleReaderNavbarSwipeStart"
    @touchmove.passive="handleReaderNavbarSwipeMove"
    @touchend="resetReaderNavbarSwipe"
    @touchcancel="resetReaderNavbarSwipe"
    @focusin="scheduleReaderNavbarHide"
  >
    <nav class="navbar-start">
      <a
        @click="router.push('/')"
        class="max-lg:hidden lg:btn lg:btn-ghost lg:text-xl"
      >
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <MobileNav @open-change="handleMobileMenuOpenChange" />
    </nav>
    <client-only>
      <nav class="navbar-center">
        <a @click="router.push('/')" class="lg:hidden btn btn-ghost text-xl">
          <img
            src="/assets/images/icons/logo.webp"
            alt="KoMoriSam"
            class="h-8"
          />
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
    </client-only>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MOBILE_READER_NAVBAR_SHOW_EVENT } from "@/constants/reader";

const router = useRouter();
const route = useRoute();

import NavLinks from "@/components/layout/NavLinks.vue";
import MobileNav from "@/components/layout/MobileNav.vue";
import ProjectMenu from "@/components/layout/ProjectMenu.vue";
import GlobalSearch from "@/components/layout/GlobalSearch.vue";
import ThemeController from "@/components/ui/theme/ThemeController.vue";

const READER_NAVBAR_VISIBLE_DURATION = 3000;
const READER_NAVBAR_SWIPE_DISTANCE = 36;
const READER_NAVBAR_SWIPE_MAX_HORIZONTAL_DRIFT = 64;
const readerNavbarVisible = ref(false);
const mobileMenuOpen = ref(false);
let readerNavbarHideTimer;

const readerNavbarSwipe = {
  x: 0,
  y: 0,
  active: false,
};

const isNovelReaderRoute = computed(() => route.name === "novel-reader");

const clearReaderNavbarHideTimer = () => {
  window.clearTimeout(readerNavbarHideTimer);
};

const scheduleReaderNavbarHide = () => {
  if (!readerNavbarVisible.value || mobileMenuOpen.value) return;
  clearReaderNavbarHideTimer();
  readerNavbarHideTimer = window.setTimeout(() => {
    if (mobileMenuOpen.value) return;
    readerNavbarVisible.value = false;
  }, READER_NAVBAR_VISIBLE_DURATION);
};

const hideReaderNavbar = () => {
  if (mobileMenuOpen.value) return;
  clearReaderNavbarHideTimer();
  readerNavbarVisible.value = false;
};

const resetReaderNavbarSwipe = () => {
  readerNavbarSwipe.active = false;
};

const handleReaderNavbarSwipeStart = (event) => {
  const touch = event.touches?.[0];
  if (
    !touch ||
    !isNovelReaderRoute.value ||
    !readerNavbarVisible.value ||
    mobileMenuOpen.value
  ) {
    resetReaderNavbarSwipe();
    return;
  }

  readerNavbarSwipe.x = touch.clientX;
  readerNavbarSwipe.y = touch.clientY;
  readerNavbarSwipe.active = true;
};

const handleReaderNavbarSwipeMove = (event) => {
  if (!readerNavbarSwipe.active || mobileMenuOpen.value) return;
  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = Math.abs(touch.clientX - readerNavbarSwipe.x);
  const deltaY = touch.clientY - readerNavbarSwipe.y;
  if (deltaX > READER_NAVBAR_SWIPE_MAX_HORIZONTAL_DRIFT) {
    resetReaderNavbarSwipe();
    return;
  }

  if (deltaY <= -READER_NAVBAR_SWIPE_DISTANCE) {
    resetReaderNavbarSwipe();
    hideReaderNavbar();
  }
};

const handleMobileMenuOpenChange = (open) => {
  mobileMenuOpen.value = open;
  clearReaderNavbarHideTimer();
  if (!open) scheduleReaderNavbarHide();
};

const showReaderNavbar = () => {
  if (!isNovelReaderRoute.value) return;
  readerNavbarVisible.value = true;
  scheduleReaderNavbarHide();
};

watch(
  () => route.name,
  () => {
    clearReaderNavbarHideTimer();
    resetReaderNavbarSwipe();
    mobileMenuOpen.value = false;
    readerNavbarVisible.value = false;
  },
);

onMounted(() => {
  window.addEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
});

onBeforeUnmount(() => {
  clearReaderNavbarHideTimer();
  window.removeEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
});
</script>
