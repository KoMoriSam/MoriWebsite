<template>
  <header
    ref="navbar"
    class="navbar relative z-40 h-(--navbar-height) min-h-(--navbar-height) bg-base-100/70 px-2 py-0 shadow-sm backdrop-blur-md"
    :class="
      overlayNavbar
        ? [
            'max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-70 max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none',
            overlayNavbarVisible
              ? 'max-lg:translate-y-0'
              : 'max-lg:pointer-events-none max-lg:-translate-y-full',
          ]
        : ''
    "
    :inert="mobileViewport && overlayNavbar && !overlayNavbarVisible"
  >
    <nav class="navbar-start">
      <SiteLogo class="hidden lg:inline-flex" />
      <MobileNav />
      <button
        ref="searchTriggerButton"
        type="button"
        class="btn btn-ghost max-lg:btn-square mx-2"
        :aria-label="translate('common.nav.openSearch')"
        aria-keyshortcuts="Control+K Meta+K"
        @click="activateSearch"
      >
        <i class="ri-search-line text-lg" aria-hidden="true"></i>
        <span class="hidden xl:inline">{{
          translate("common.nav.search")
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
    <nav class="navbar-center h-full max-lg:min-w-0 max-lg:shrink">
      <SiteLogo class="lg:hidden" />
      <div class="hidden h-full items-center lg:flex [&>.tabs>.tab]:gap-2">
        <div
          class="tabs tabs-border h-full flex-nowrap [--tab-height:var(--navbar-height)]"
        >
          <NavLinks />
        </div>
        <ProjectMenu />
      </div>
    </nav>
    <nav class="navbar-end">
      <AccountControl />
    </nav>
  </header>
</template>

<script setup>
import { useLocale } from "@/i18n";
import { gameNavbarMode, useMobileNavbar } from "@/composables/useMobileNavbar";
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
import { useRoute } from "vue-router";
import {
  MOBILE_READER_NAVBAR_HIDE_EVENT,
  MOBILE_READER_NAVBAR_SHOW_EVENT,
} from "@/constants/reader";

const route = useRoute();

import AccountControl from "@/components/auth/AccountControl.vue";
import NavLinks from "@/components/layout/NavLinks.vue";
import MobileNav from "@/components/layout/MobileNav.vue";
import ProjectMenu from "@/components/layout/ProjectMenu.vue";
import SiteLogo from "@/components/layout/SiteLogo.vue";

const navbar = ref(null);
const readerNavbarVisible = ref(false);
const isNovelReaderRoute = computed(
  () => route.name === "novel-reader" && githubSession.authenticated,
);
const overlayNavbar = computed(
  () => gameNavbarMode.value || isNovelReaderRoute.value,
);
const {
  mobile: mobileViewport,
  visible: mobileNavbarVisible,
  show: showMobileNavbar,
  hide: hideMobileNavbar,
} = useMobileNavbar(navbar, gameNavbarMode);
const overlayNavbarVisible = computed(() =>
  isNovelReaderRoute.value
    ? readerNavbarVisible.value
    : mobileNavbarVisible.value,
);
const hideReaderNavbar = () => {
  readerNavbarVisible.value = false;
};
const showReaderNavbar = () => {
  if (isNovelReaderRoute.value) readerNavbarVisible.value = true;
};
const searchTriggerButton = ref(null);
const searchRef = ref(null);
const searchComponent = shallowRef(null);
const searchShortcutLabel = ref("Ctrl");
let searchPromise;

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
  showMobileNavbar();
  await ensureSearch();
  await searchRef.value?.activate();
};

const restoreSearchTriggerFocus = () => {
  showMobileNavbar();
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
  () => route.path,
  () => {
    hideMobileNavbar();
    hideReaderNavbar();
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
