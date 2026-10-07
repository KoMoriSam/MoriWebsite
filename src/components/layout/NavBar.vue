<template>
  <header
    class="navbar bg-base-100 shadow-sm"
    :class="
      isNovelReaderRoute
        ? [
            'max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-70 max-lg:bg-base-100/95 max-lg:backdrop-blur-md max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none',
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
        <img v-bind="getImageAttrs('/assets/images/icons/logo.webp', '128px')" alt="KoMoriSam" class="h-8" />
      </a>
      <MobileNav />
      <button
        ref="searchTriggerButton"
        type="button"
        class="btn btn-ghost max-lg:btn-square mx-2"
        :aria-label="translate('common.navBar.openSiteSearch')"
        aria-keyshortcuts="Control+K Meta+K"
        @click="activateSearch"
      >
        <i class="ri-search-line text-lg" aria-hidden="true"></i>
        <span class="hidden xl:inline">{{
          translate("common.navBar.search")
        }}</span>
        <kbd class="kbd kbd-sm hidden xl:inline-flex">
          {{ searchShortcutLabel }} K
        </kbd>
      </button>
      <component
        :is="searchComponent"
        v-if="searchComponent"
        ref="searchRef"
        @restore-focus="restoreSearchTriggerFocus"
      />
    </nav>
    <nav class="navbar-center max-lg:min-w-0 max-lg:shrink">
      <a
        @click="router.push('/')"
        class="lg:hidden btn btn-ghost min-w-0 max-w-full text-xl"
      >
        <img
          v-bind="getImageAttrs('/assets/images/icons/logo.webp', '152px')"
          alt="KoMoriSam"
          class="h-10 min-w-0 object-contain"
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
      <AccountControl />
    </nav>
  </header>
</template>

<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
import { githubSession } from "@/composables/auth/useGithubSession";
const { t: translate } = useLocale();

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  MOBILE_READER_NAVBAR_HIDE_EVENT,
  MOBILE_READER_NAVBAR_SHOW_EVENT,
} from "@/constants/reader";

const router = useRouter();
const route = useRoute();

import AccountControl from "@/components/auth/AccountControl.vue";
import NavLinks from "@/components/layout/NavLinks.vue";
import MobileNav from "@/components/layout/MobileNav.vue";
import ProjectMenu from "@/components/layout/ProjectMenu.vue";

const readerNavbarVisible = ref(false);
const searchTriggerButton = ref(null);
const searchRef = ref(null);
const searchComponent = shallowRef(null);
const searchShortcutLabel = ref("Ctrl");
let searchPromise;

const isNovelReaderRoute = computed(
  () => route.name === "novel-reader" && githubSession.authenticated,
);

const hideReaderNavbar = () => {
  readerNavbarVisible.value = false;
};

const showReaderNavbar = () => {
  if (!isNovelReaderRoute.value) return;
  readerNavbarVisible.value = true;
};

const ensureSearch = async () => {
  if (!searchPromise) {
    searchPromise = import("@/components/interaction/overlay/SiteSearch.vue")
      .then(({ default: component }) => {
        searchComponent.value = component;
      })
      .catch((error) => {
        searchPromise = null;
        throw error;
      });
  }

  await searchPromise;
  await nextTick();
};

const activateSearch = async () => {
  await ensureSearch();
  await searchRef.value?.activate();
};

const restoreSearchTriggerFocus = () => {
  nextTick(() => searchTriggerButton.value?.focus());
};

const handleSearchShortcut = (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
    return;
  }

  event.preventDefault();
  void activateSearch();
};

watch(
  () => route.name,
  () => {
    readerNavbarVisible.value = false;
  },
);

watch(
  () => route.query.search,
  (search) => {
    if (!import.meta.env.SSR && search === "1") void activateSearch();
  },
  { immediate: true },
);

onMounted(() => {
  searchShortcutLabel.value = /Mac|iPhone|iPad/i.test(navigator.platform)
    ? "⌘"
    : "Ctrl";
  window.addEventListener("keydown", handleSearchShortcut);
  window.addEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
  window.addEventListener(MOBILE_READER_NAVBAR_HIDE_EVENT, hideReaderNavbar);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSearchShortcut);
  window.removeEventListener(MOBILE_READER_NAVBAR_SHOW_EVENT, showReaderNavbar);
  window.removeEventListener(MOBILE_READER_NAVBAR_HIDE_EVENT, hideReaderNavbar);
});
</script>
