<template>
  <NavBar />
  <SessionProbe />
  <NoticeDialog
    :mode="overlayMode"
    :selected-announcement="selectedAnnouncement"
    :summary-announcements="summaryAnnouncements"
    :can-go-back="canReturnToSummary"
    @acknowledge="announcementStore.acknowledgeSummary"
    @acknowledge-detail="announcementStore.acknowledgeAnnouncement"
    @back="announcementStore.returnToSummary"
    @close="announcementStore.closeOverlay"
    @open="announcementStore.openAnnouncement"
  />
  <router-view />
  <BackToTop v-if="!route.meta.hideToTop" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { loadImageManifest } from "@/utils/images/responsive-images";
import { useHead } from "@unhead/vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import SessionProbe from '@/components/auth/SessionProbe.vue';
import { useGithubSession } from '@/composables/auth/useGithubSession';
import NavBar from "@/components/layout/NavBar.vue";
import NoticeDialog from "@/components/announcement/interaction/NoticeDialog.vue";
import BackToTop from "./components/interaction/navigation/BackToTop.vue";
import { useNovelStore } from "@/stores/novel";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { getBlogPagePath } from "@/constants/blog-pagination";

import { useSearchResultHighlight } from "@/composables/useSearchResultHighlight";

import { useStorageMigration } from "@/composables/storage/useStorageMigration";
import { useDiscardStorage } from "@/composables/storage/useDiscardStorage";
import { useLocale } from "@/i18n";
import { useGlobalStorage } from "@/composables/storage/useGlobalStorage";
import { useToast } from "@/composables/useToast";
import { findRouteGame } from '@/games/catalog';

const { t: translate, locale, text: localizeText, restoreLocale } = useLocale();
const { GLOBAL_INFO } = useGlobalStorage();
const localeToast = useToast();

const route = useRoute();
const auth = useGithubSession();
const stopAuth = auth.start(useRouter());
onBeforeUnmount(() => stopAuth?.());
const novelStore = useNovelStore();
const analyticsStore = useAnalyticsStore();
const announcementStore = useAnnouncementStore();
const { title: novelTitle } = storeToRefs(novelStore);
const {
  canReturnToSummary,
  overlayMode,
  selectedAnnouncement,
  summaryAnnouncements,
} = storeToRefs(announcementStore);
let stopAnalyticsRouteWatch = null;
useSearchResultHighlight();

const SITE_URL = "https://komori.cc";
const SITE_NAME = "远方之森";
const DEFAULT_TITLE = "远方之森 | 个人博客与独立开发";
const DEFAULT_DESCRIPTION =
  "远方之森的个人网站，分享技术探索、随笔与读书笔记，平常也写点小说，提供一些实用小工具。";
const SOCIAL_IMAGE = `${SITE_URL}/assets/images/profile/me0.webp`;
const KEYWORDS = "远方之森,个人博客,技术博客,独立开发,原创小说,向远方";

const PAGE_DESCRIPTIONS = {
  get games() { return translate('games.description'); },
  get licenses() { return translate('pages.app.licensesAndRightsNoticesForOriginalSoftwareDependenciesFontsIcons'); },
  get blog() { return translate('pages.app.readKomoriSTechnologyExplorationsEssaysAndReadingNotes'); },
  get "blog-article"() { return translate('pages.app.readKomoriSBlogArticles'); },
  get changelog() { return translate('pages.app.featureUpdatesFixesAndReleasesForKomoriSWebsite'); },
  get announcements() { return translate('pages.app.currentAndPastWebsiteAnnouncements'); },
  get novel() { return translate('pages.app.readKomoriSOriginalNovelOnline'); },
  get "novel-reader"() { return translate('pages.app.readKomoriSOriginalNovelOnline2'); },
  get tools() { return translate('pages.app.onlineToolsAndServiceLookupsByKomori'); },
  get "server-status"() { return translate('pages.app.checkTheStatusAndDetailsOfJavaOrBedrockMinecraft'); },
  get "sinhala-font-converter"() { return translate('pages.app.convertBetweenStandardUnicodeAndAsciiLegacyFontEncodings'); },
  get kaiming() { return translate('pages.app.tryKaimingChinesePunctuationWithSansSerifSerifAndVariable'); },
  get NotFound() { return translate('pages.app.theRequestedPageWasNotFound'); },
  test: "远方之森网站的组件测试页面。",
};

const routeName = computed(() => String(route.name || ""));
const article = computed(() => route.meta.article || null);
const isArticle = computed(() => Boolean(article.value));
const blogPageNumber = computed(() => {
  if (!route.meta.blogList) return 1;

  const page = Number(route.params.page);
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
});
const hasBlogFilters = computed(() => {
  if (!route.meta.blogList) return false;

  return ["q", "tag", "year"].some((key) => {
    const values = Array.isArray(route.query[key])
      ? route.query[key]
      : [route.query[key]];

    return values.some((value) => String(value || "").trim());
  });
});
const isIndexable = computed(
  () => !["NotFound", "test"].includes(routeName.value),
);

const pageTitle = computed(() => {
  const game = findRouteGame(routeName.value);
  if (game) return `${translate(game.titleKey)} | ${SITE_NAME}`;
  if (routeName.value === 'games') return `${translate('games.title')} | ${SITE_NAME}`;
  if (routeName.value === "home") return localizeText(DEFAULT_TITLE);
  if (routeName.value === "novel-reader") return novelTitle.value;
  if (route.meta.blogList) {
    return translate('pages.app.blogP', { p0: blogPageNumber.value });
  }
  return article.value?.title
    ? `${article.value.title} | ${SITE_NAME}`
    : `${localizeText(String(route.meta.title || DEFAULT_TITLE).replace(/ \| 远方之森$/, ""))} | ${SITE_NAME}`;
});

const pageDescription = computed(() => {
  if (route.meta.blogList && blogPageNumber.value > 1) {
    return translate('pages.app.readKomoriSTechnologyExplorationsEssaysAndReadingNotesPage', { p0: blogPageNumber.value });
  }

  const description =
    article.value?.summary ||
    (findRouteGame(routeName.value) ? translate(findRouteGame(routeName.value).descriptionKey) : '') ||
    PAGE_DESCRIPTIONS[routeName.value] ||
    localizeText(DEFAULT_DESCRIPTION);

  return String(description).replace(/\s+/g, " ").trim().slice(0, 160);
});

const canonicalUrl = computed(() => {
  const path = routeName.value === "home" ? "/" : route.path;
  return new URL(path, `${SITE_URL}/`).href;
});

const headLinks = computed(() => {
  if (!isIndexable.value) return [];

  const links = [{ rel: "canonical", href: canonicalUrl.value }];

  if (!route.meta.blogList || hasBlogFilters.value) return links;

  const totalPages = Math.max(
    1,
    Math.trunc(Number(route.meta.blogTotalPages) || 1),
  );
  const currentPage = Math.min(totalPages, blogPageNumber.value);

  if (currentPage > 1) {
    links.push({
      rel: "prev",
      href: new URL(getBlogPagePath(currentPage - 1), `${SITE_URL}/`).href,
    });
  }

  if (currentPage < totalPages) {
    links.push({
      rel: "next",
      href: new URL(getBlogPagePath(currentPage + 1), `${SITE_URL}/`).href,
    });
  }

  return links;
});

const structuredData = computed(() => {
  const person = {
    "@type": "Person",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    sameAs: [
      "https://github.com/KoMoriSam",
      "https://space.bilibili.com/71104942",
      "https://weibo.com/u/5281976456",
    ],
  };

  if (isArticle.value) {
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.value?.title || pageTitle.value,
      description: pageDescription.value,
      url: canonicalUrl.value,
      mainEntityOfPage: canonicalUrl.value,
      inLanguage: "zh-CN",
      datePublished: article.value?.date || article.value?.created,
      dateModified: article.value?.modified || article.value?.date,
      author: person,
    };
  }

  if (routeName.value === "home") {
    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: pageTitle.value,
      description: pageDescription.value,
      url: canonicalUrl.value,
      inLanguage: locale.value,
      mainEntity: person,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle.value,
    description: pageDescription.value,
    url: canonicalUrl.value,
    inLanguage: routeName.value.startsWith("novel") ? "zh-CN" : locale.value,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    author: person,
  };
});

useHead(() => {
  const articleMeta = [];

  if (isArticle.value && article.value?.date) {
    articleMeta.push({
      property: "article:published_time",
      content: String(article.value.date),
    });
  }

  if (isArticle.value && article.value?.modified) {
    articleMeta.push({
      property: "article:modified_time",
      content: String(article.value.modified),
    });
  }

  return {
    title: pageTitle.value,
    htmlAttrs: {
      lang: locale.value,
    },
    link: headLinks.value,
    meta: [
      { name: "description", content: pageDescription.value },
      { name: "keywords", content: localizeText(KEYWORDS) },
      { name: "author", content: SITE_NAME },
      {
        name: "robots",
        content: isIndexable.value
          ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          : "noindex, nofollow",
      },
      { property: "og:locale", content: { 'zh-CN': 'zh_CN', en: 'en_US', si: 'si_LK' }[locale.value] },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: pageTitle.value },
      { property: "og:description", content: pageDescription.value },
      {
        property: "og:type",
        content: isArticle.value ? "article" : "website",
      },
      { property: "og:url", content: canonicalUrl.value },
      { property: "og:image", content: SOCIAL_IMAGE },
      {
        property: "og:image:alt",
        get content() { return translate('pages.app.komorisamSAvatar'); },
      },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle.value },
      { name: "twitter:description", content: pageDescription.value },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      ...articleMeta,
    ],
    script: [
      {
        key: "structured-data",
        type: "application/ld+json",
        textContent: JSON.stringify(structuredData.value),
      },
    ],
  };
});

const isPrerenderBot =
  typeof navigator !== "undefined" &&
  /HeadlessChrome|Prerender/i.test(navigator.userAgent);

onMounted(() => {
  void loadImageManifest(import.meta.env.VITE_BLOG_RAW);
  void loadImageManifest(import.meta.env.VITE_NOVEL_RAW);
  if (isPrerenderBot) {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }

    return;
  }

  void restoreLocale(GLOBAL_INFO).catch(() => localeToast.error(translate('common.languageLoadFailed')));

  const { migrateStorage } = useStorageMigration();

  try {
    migrateStorage();
    useDiscardStorage();
  } catch {
    // Storage restrictions must not prevent session language selection.
  }

  announcementStore.migrateLegacyUpdateState();
  void announcementStore.fetchAnnouncements().then((announcements) => {
    if (announcements) announcementStore.showImportantSummary();
  });

  analyticsStore.startTracking();
  stopAnalyticsRouteWatch = watch(
    () => route.fullPath,
    () => {
      void analyticsStore.trackVisit();
    },
  );
});

onBeforeUnmount(() => {
  stopAnalyticsRouteWatch?.();
  analyticsStore.stopTracking();
});
</script>
