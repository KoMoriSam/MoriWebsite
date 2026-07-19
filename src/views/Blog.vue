<template>
  <KeepAlive>
    <ArticleList
      v-if="currentComponent === 'ArticleList'"
      :articles="articles"
      :loading="loadingList"
      @select="goToDetail"
    />
    <ArticleDetail
      v-else-if="currentComponent === 'ArticleDetail'"
      :article="currentArticle"
      :content="articleContent"
      :loading="loadingContent"
      :error="errorContent"
      @refresh="refreshCurrentArticle"
      @back="goToList"
    />
  </KeepAlive>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useArticleApi } from "@/services/api-articles";

import { useScrollTo } from "@/composables/useScrollTo";
import { usePosTracker } from "@/composables/usePosTracker";

import ArticleList from "@/components/blog/ArticleList.vue";
import ArticleDetail from "@/components/blog/ArticleReader.vue";

const route = useRoute();
const router = useRouter();

const { scrollToTop } = useScrollTo();

const { fetchArticleList, fetchArticleContent } = useArticleApi();

// 当前显示组件
const currentComponent = ref("ArticleList");

// 列表数据
const articles = ref([]);
const loadingList = ref(false);

// 详情数据
const currentArticle = ref(null);
const articleContent = ref("");
const loadingContent = ref(false);
const errorContent = ref("");
const stopBlogPosTracker = ref(null);
const trackedArticleId = ref("");

const disposeBlogPosTracker = () => {
  if (typeof stopBlogPosTracker.value === "function") {
    stopBlogPosTracker.value();
  }

  stopBlogPosTracker.value = null;
  trackedArticleId.value = "";
};

const setupBlogPosTracker = () => {
  const articleId = String(
    currentArticle.value?.id || route.params.articleId || "",
  );
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
    getContextId: () =>
      String(currentArticle.value?.id || route.params.articleId || ""),
    getPage: () => 1,
    isActive: () =>
      String(router.currentRoute.value.path || "").startsWith("/blog"),
  });
  trackedArticleId.value = articleId;
};

// 加载文章列表
const loadArticles = async () => {
  loadingList.value = true;
  try {
    articles.value = await fetchArticleList();
  } catch (err) {
    console.error("加载文章列表失败:", err);
  } finally {
    loadingList.value = false;
  }
};

// 进入文章详情
const goToDetail = (id) => {
  currentComponent.value = "ArticleDetail";
  router.push({ name: "blog", params: { articleId: id } });
  scrollToTop();
};

// 返回文章列表
const goToList = () => {
  currentComponent.value = "ArticleList";
  router.push({ name: "blog", params: { articleId: undefined } });
  scrollToTop();
};

// 加载文章内容
const loadArticleContent = async (id) => {
  const article = articles.value.find((a) => a.id === id);
  if (!article) {
    errorContent.value = "文章不存在";
    return;
  }

  currentArticle.value = article;
  loadingContent.value = true;
  errorContent.value = "";

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
  const id = route.params.articleId || currentArticle.value?.id;

  if (!id) return;

  await loadArticleContent(String(id));
};

// 监听路由 params 参数
watch(
  () => route.params.articleId,
  (newId) => {
    if (newId) {
      currentComponent.value = "ArticleDetail";
      loadArticleContent(String(newId));
    } else {
      currentComponent.value = "ArticleList";
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
  () => {
    setupBlogPosTracker();
  },
  { immediate: true },
);

// 初始加载
onMounted(async () => {
  await loadArticles();

  // 恢复上次阅读的文章
  const articleId = route.params.articleId;
  if (articleId) {
    currentComponent.value = "ArticleDetail";
    await loadArticleContent(String(articleId));
  }
});

onBeforeUnmount(() => {
  disposeBlogPosTracker();
});
</script>
