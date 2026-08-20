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
      :error="errorContent"
      @navigate="prepareArticleNavigation"
      @refresh="refreshCurrentArticle"
      @back="goToList"
    />
  </KeepAlive>
</template>

<script setup>
import { nextTick, ref, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useArticleApi } from "@/services/api-articles";
import { fetchBlogSearchArticles } from "@/services/search-content";

import { useScrollTo } from "@/composables/useScrollTo";
import { usePosTracker } from "@/composables/usePosTracker";

import ArticleList from "@/views/blog/ArticleList.vue";
import ArticleDetail from "@/views/blog/ArticleReader.vue";

const route = useRoute();
const router = useRouter();

const { scrollToTop } = useScrollTo();
const { fetchArticleContent } = useArticleApi();

// 静态文章路由在构建时把文章数据放进 route.meta。
// 服务端渲染和浏览器 hydration 使用完全相同的初始数据，避免 mismatch。
const initialArticle = route.meta.article || null;
const initialContent = route.meta.content || "";
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
const loadingContent = ref(false);
const errorContent = ref("");
const pendingNavigationArticleId = ref("");
const lastListRoute = ref(route.meta.blogList ? route.fullPath : "/blog");

const stopBlogPosTracker = ref(null);
const trackedArticleId = ref("");

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
    readPosKey: "BLOG_READ_POS",
    readContextKey: "BLOG_READ_ARTICLE_ID",
    getContextId: () => String(currentArticle.value?.id || getRouteArticleId()),
    isActive: () =>
      String(router.currentRoute.value.path || "").startsWith("/blog"),
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
  currentComponent.value = "ArticleList";
  router.push(lastListRoute.value);
  scrollToTop();
};

const prepareArticleNavigation = (articleId) => {
  pendingNavigationArticleId.value = String(articleId || "").trim();
};

const scrollToArticleStart = async (articleId) => {
  if (import.meta.env.SSR || typeof window === "undefined") return;

  await nextTick();
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });

  if (
    String(currentArticle.value?.id || "") !== articleId ||
    getRouteArticleId() !== articleId ||
    loadingContent.value
  ) {
    return;
  }

  const target = document.getElementById("blog-reading-start");
  if (!target) return;

  const targetTop = Math.max(
    0,
    window.scrollY + target.getBoundingClientRect().top - 96,
  );
  window.scrollTo({ top: targetTop, behavior: "auto" });
};

const loadArticleContent = async (id, { keepCurrentContent = false } = {}) => {
  const article = articles.value.find((item) => String(item.id) === String(id));

  if (!article) {
    errorContent.value = "文章不存在";
    return;
  }

  currentArticle.value = article;
  errorContent.value = "";

  if (!keepCurrentContent) {
    loadingContent.value = true;
  }

  try {
    articleContent.value = await fetchArticleContent(article.path);
  } catch (err) {
    console.error("加载文章内容失败:", err);
    errorContent.value = "加载文章内容失败";
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
  () => [route.params.articleId, route.meta.article?.id],
  async () => {
    const articleId = getRouteArticleId();

    if (!articleId) {
      pendingNavigationArticleId.value = "";
      currentComponent.value = "ArticleList";
      currentArticle.value = null;
      articleContent.value = "";
      errorContent.value = "";
      return;
    }

    currentComponent.value = "ArticleDetail";

    if (articles.value.length > 0) {
      await loadArticleContent(articleId);

      if (pendingNavigationArticleId.value === articleId) {
        pendingNavigationArticleId.value = "";
        await scrollToArticleStart(articleId);
      }
    }
  },
);

watch(
  () => [
    currentComponent.value,
    loadingContent.value,
    articleContent.value,
    currentArticle.value?.id,
  ],
  setupBlogPosTracker,
  { immediate: true },
);

onMounted(async () => {
  await loadArticles();

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
