<template>
  <KeepAlive>
    <ArticleList
      v-if="currentComponent === 'ArticleList'"
      :articles="articles"
      :loading="loadingList"
    />
    <ArticleDetail
      v-else
      :article="currentArticle"
      :articles="articles"
      :content="articleContent"
      :list-route="lastListRoute"
      :loading="loadingContent"
      :error="localizeText(errorContent)"
      @navigate="prepareArticleNavigation"
      @ready="handleArticleReady"
      @refresh="refreshCurrentArticle"
      @back="goToList"
    />
  </KeepAlive>
</template>

<script setup>
import { useLocale } from "@/i18n";
const {
  t: translate,
  text: localizeText,
  message: localeMessage,
} = useLocale();

import {
  defineAsyncComponent,
  nextTick,
  ref,
  onBeforeUnmount,
  onMounted,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useArticleApi } from "@/services/api-articles";
import { fetchBlogSearchArticles } from "@/services/search-content";

import { usePosTracker } from "@/composables/usePosTracker";
import { useReadingProgress } from '@/composables/blog/useReadingProgress';
import { useToast } from '@/composables/useToast';

import ArticleList from "@/views/blog/ArticleList.vue";
import LoadingPlaceholder from "@/components/reader/feedback/LoadingPlaceholder.vue";

const ArticleDetail = defineAsyncComponent({
  loader: () => import("@/views/blog/ArticleReader.vue"),
  loadingComponent: LoadingPlaceholder,
  delay: 0,
});

const route = useRoute();
const router = useRouter();

const { fetchArticleContent } = useArticleApi();
const readingProgress = useReadingProgress();
const toast = useToast({ position: 'center-top' });
let restoredArticleId = '';

// 路由保留文章元数据，当前文章正文来自该页的 SSG initialState。
// SSR 与浏览器 hydration 使用同一份正文，不加载其他文章快照。
const initialArticle = route.meta.article || null;
const initialContent = route.meta.pageData?.article?.content || "";
const initialArticleId = String(
  route.params.articleId || initialArticle?.id || "",
).trim();

const currentComponent = ref(
  initialArticleId ? "ArticleDetail" : "ArticleList",
);

const initialArticles = Array.isArray(route.meta.articles)
  ? route.meta.articles
  : [];
const articles = ref(initialArticles);
const loadingList = ref(initialArticles.length === 0);

const currentArticle = ref(initialArticle);
const articleContent = ref(initialContent);
const loadingContent = ref(Boolean(initialArticleId && !initialContent));
const errorContent = ref("");
const pendingNavigationArticleId = ref(route.hash ? '' : initialArticleId);
const lastListRoute = ref(route.meta.blogList ? route.fullPath : "/blog");

const stopBlogPosTracker = ref(null);
const trackedArticleId = ref("");
const renderedArticleId = ref("");

const getRouteArticleId = () =>
  String(route.params.articleId || route.meta.article?.id || "").trim();

const disposeBlogPosTracker = () => {
  if (typeof stopBlogPosTracker.value === "function") {
    stopBlogPosTracker.value();
  }

  stopBlogPosTracker.value = null;
  trackedArticleId.value = "";
};

const setupBlogPosTracker = () => {
  if (typeof window === "undefined") return;

  const articleId = String(currentArticle.value?.id || getRouteArticleId());
  const shouldTrack =
    currentComponent.value === "ArticleDetail" &&
    !loadingContent.value &&
    Boolean(articleContent.value) &&
    renderedArticleId.value === articleId &&
    Boolean(articleId);

  if (!shouldTrack) {
    disposeBlogPosTracker();
    return;
  }

  if (trackedArticleId.value === articleId && stopBlogPosTracker.value) {
    return;
  }

  disposeBlogPosTracker();

  stopBlogPosTracker.value = usePosTracker(router, undefined, {
    ...readingProgress.getOptions(articleId),
    getContextId: () => String(currentArticle.value?.id || getRouteArticleId()),
    posSelector: "#markdown :is(h1, h2, h3, h4, h5, h6, p)[id]",
    onStoredRestore: () => {
      if (restoredArticleId === articleId) return;
      restoredArticleId = articleId;
      toast.info(translate('pages.blog.restoredReadingProgress'));
    },
    isActive: () =>
      !loadingContent.value &&
      currentComponent.value === "ArticleDetail" &&
      getRouteArticleId() === articleId,
  });
  trackedArticleId.value = articleId;
};

const loadArticles = async () => {
  loadingList.value = true;

  try {
    articles.value = await fetchBlogSearchArticles();
  } catch (err) {
    console.error("加载文章列表失败:", err);
  } finally {
    loadingList.value = false;
  }
};

const goToList = () => {
  pendingNavigationArticleId.value = "";
  router.push(lastListRoute.value);
};

const prepareArticleNavigation = (articleId) => {
  pendingNavigationArticleId.value = String(articleId || "").trim();
};

const scrollToArticleStart = async (articleId) => {
  if (import.meta.env.SSR || typeof window === "undefined") return;

  await nextTick();

  if (
    String(currentArticle.value?.id || "") !== articleId ||
    getRouteArticleId() !== articleId ||
    loadingContent.value
  ) {
    return;
  }

  window.scrollTo({ left: 0, top: 0, behavior: "instant" });
};

const handleArticleReady = async (articleId) => {
  if (getRouteArticleId() !== articleId || loadingContent.value) return;

  if (pendingNavigationArticleId.value === articleId) {
    pendingNavigationArticleId.value = "";
    if (!route.hash && !readingProgress.hasProgress(articleId)) {
      await scrollToArticleStart(articleId);
    }
  }

  if (getRouteArticleId() !== articleId || loadingContent.value) return;
  renderedArticleId.value = articleId;
  setupBlogPosTracker();
};

const loadArticleContent = async (id, { keepCurrentContent = false } = {}) => {
  const article =
    articles.value.find((item) => String(item.id) === String(id)) ||
    (String(currentArticle.value?.id) === String(id)
      ? currentArticle.value
      : null);

  if (!article) {
    errorContent.value = localeMessage("pages.blog.articleNotFound");
    loadingContent.value = false;
    return;
  }

  currentArticle.value = article;
  errorContent.value = "";

  if (!keepCurrentContent) {
    renderedArticleId.value = "";
    loadingContent.value = true;
  }

  try {
    articleContent.value = await fetchArticleContent(article.path);
  } catch (err) {
    console.error("加载文章内容失败:", err);
    errorContent.value = localeMessage("pages.blog.failedToLoadArticleContent");
  } finally {
    loadingContent.value = false;
  }
};

const refreshCurrentArticle = async () => {
  const id = getRouteArticleId() || currentArticle.value?.id;

  if (!id) return;

  await loadArticleContent(String(id));
};

watch(
  () => [route.name, route.fullPath],
  () => {
    if (route.meta.blogList) {
      lastListRoute.value = route.fullPath;
    }
  },
  { immediate: true },
);

watch(
  [() => route.params.articleId, () => route.meta.article?.id],
  async () => {
    const articleId = getRouteArticleId();
    restoredArticleId = '';
    renderedArticleId.value = "";
    disposeBlogPosTracker();

    if (!articleId) {
      pendingNavigationArticleId.value = "";
      currentComponent.value = "ArticleList";
      currentArticle.value = null;
      articleContent.value = "";
      errorContent.value = "";
      loadingContent.value = false;
      return;
    }

    currentComponent.value = "ArticleDetail";
    pendingNavigationArticleId.value = route.hash ? "" : articleId;
    loadingContent.value = true;

    if (articles.value.length > 0) {
      await loadArticleContent(articleId);
    }
  },
);

watch(
  () => [
    currentComponent.value,
    loadingContent.value,
    articleContent.value,
    currentArticle.value?.id,
    renderedArticleId.value,
  ],
  setupBlogPosTracker,
  { immediate: true },
);

onMounted(async () => {
  const listRequest = loadArticles();

  // 静态页面已有文章元数据时，正文刷新不必等待整个索引。
  if (!currentArticle.value?.path) await listRequest;

  const articleId = getRouteArticleId();
  if (!articleId) return;

  currentComponent.value = "ArticleDetail";

  // 刷新静态文章页时保留已经渲染出的 SSG 内容，后台请求最新数据后覆盖。
  await loadArticleContent(articleId, {
    keepCurrentContent: Boolean(initialArticle && initialContent),
  });
});

onBeforeUnmount(() => {
  disposeBlogPosTracker();
});
</script>
