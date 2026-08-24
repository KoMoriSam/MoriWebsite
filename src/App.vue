<template>
  <NavBar />
  <router-view />
  <ToTop v-if="!route.meta.hideToTop" />
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useHead } from "@unhead/vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";

import NavBar from "@/components/layout/NavBar.vue";
import ToTop from "./components/base/ToTop.vue";
import { useNovelStore } from "@/stores/novelStore";
import { getBlogPagePath } from "@/constants/blog-pagination";

import { useSearchResultHighlight } from "@/composables/useSearchResultHighlight";

import { checkUpdateNotice } from "@/utils/update-notice";
import { useStorageMigration } from "@/utils/storage/migrate-storage";
import { useDiscardStorage } from "@/utils/storage/discard-storage";

const route = useRoute();
const novelStore = useNovelStore();
const { title: novelTitle } = storeToRefs(novelStore);
useSearchResultHighlight();

const SITE_URL = "https://komori.cc";
const SITE_NAME = "远方之森";
const DEFAULT_TITLE = "远方之森 | 个人博客与独立开发";
const DEFAULT_DESCRIPTION =
  "远方之森的个人网站，分享技术探索、随笔与读书笔记，平常也写点小说，提供一些实用小工具。";
const SOCIAL_IMAGE = `${SITE_URL}/assets/images/profile/me0.webp`;
const KEYWORDS = "远方之森,个人博客,技术博客,独立开发,原创小说,向远方";

const PAGE_DESCRIPTIONS = {
  licenses:
    "查看远方之森网站原创软件、生产依赖、字体、图标及其他第三方内容的许可证与权利声明。",
  blog: "阅读远方之森的技术探索、生活随笔与读书笔记。",
  "blog-article": "阅读远方之森的博客文章。",
  changelog: "查看远方之森个人网站的功能更新、修复与版本记录。",
  novel: "在线阅读远方之森创作的原创小说《向远方》。",
  "novel-reader": "在线阅读远方之森 创作的原创小说《向远方》。",
  tools: "使用远方之森制作的在线小工具与服务查询功能。",
  "server-status":
    "查询 Java 版或基岩版 Minecraft 服务器的在线状态与基础信息。",
  "sinhala-font-converter":
    "在标准 Unicode 与 ASCII 传统字体编码之间双向转换。",
  kaiming:
    "在线体验开明式中文标点字体，支持黑体、宋体与 100–900 连续可变字重。",
  NotFound: "未找到请求的页面。",
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
  if (routeName.value === "home") return DEFAULT_TITLE;
  if (routeName.value === "novel-reader") return novelTitle.value;
  if (route.meta.blogList) {
    return `博客 | 远方之森 | p.${blogPageNumber.value} `;
  }
  return String(route.meta.title || DEFAULT_TITLE);
});

const pageDescription = computed(() => {
  if (route.meta.blogList && blogPageNumber.value > 1) {
    return `阅读远方之森的技术探索、生活随笔与读书笔记。当前为第 ${blogPageNumber.value} 页。`;
  }

  const description =
    article.value?.summary ||
    PAGE_DESCRIPTIONS[routeName.value] ||
    DEFAULT_DESCRIPTION;

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
      inLanguage: "zh-CN",
      mainEntity: person,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle.value,
    description: pageDescription.value,
    url: canonicalUrl.value,
    inLanguage: "zh-CN",
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
      lang: "zh-CN",
    },
    link: headLinks.value,
    meta: [
      { name: "description", content: pageDescription.value },
      { name: "keywords", content: KEYWORDS },
      { name: "author", content: SITE_NAME },
      {
        name: "robots",
        content: isIndexable.value
          ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          : "noindex, nofollow",
      },
      { property: "og:locale", content: "zh_CN" },
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
        content: "KoMoriSam 的个人头像",
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
  if (isPrerenderBot) {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }

    return;
  }

  checkUpdateNotice();

  const { migrateStorage } = useStorageMigration();

  migrateStorage();

  useDiscardStorage();
});
</script>
