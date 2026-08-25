<template>
  <Reader ref="readerRef" toc :aside="showReaderAside">
    <!-- 文章内容 -->
    <article
      v-if="article && (loading || content)"
      :ref="scrollRef"
      class="min-w-0 w-full max-w-full"
      @pointerdown.capture="handleArticlePointerDown"
      @pointermove.capture="handleArticlePointerMove"
      @pointerup.capture="handleArticlePointerUp"
      @pointercancel.capture="handleArticlePointerCancel"
      @contextmenu.capture="handleArticleTextContextMenu"
    >
      <!-- 文章正文：保留头图、标签、别名和阅读时长 -->
      <!-- 文章头图 -->
      <header
        id="blog-reading-start"
        class="relative min-h-72 overflow-hidden rounded-lg bg-base-200 shadow-lg sm:min-h-80"
      >
        <!-- Banner -->
        <template v-if="bannerUrl && !bannerFailed">
          <!-- Skeleton -->
          <div
            v-if="!bannerLoaded"
            class="skeleton absolute inset-0 rounded-none"
          ></div>

          <!-- 图片 -->
          <img
            v-fade-in
            :key="bannerUrl"
            :ref="setBannerImageRef"
            :src="bannerUrl"
            :alt="article.title"
            loading="eager"
            decoding="async"
            draggable="false"
            class="absolute inset-0 size-full object-cover object-center transition-opacity duration-700"
            @load="handleBannerLoad"
            @error="handleBannerError"
          />

          <!-- 遮罩 -->
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 transition-opacity duration-700"
            :class="bannerLoaded ? 'opacity-100' : 'opacity-0'"
          ></div>
        </template>

        <!-- 无 Banner / 加载失败背景 -->
        <div
          v-else
          class="absolute inset-0 bg-gradient-to-br from-accent/25 to-primary/20"
        >
          <div
            class="absolute -top-20 -right-16 size-64 rounded-full bg-primary/15 blur-3xl"
          ></div>

          <div
            class="absolute -bottom-24 -left-16 size-72 rounded-full bg-accent/20 blur-3xl"
          ></div>

          <i
            class="ri-article-line absolute top-6 right-6 text-8xl text-base-content/5 sm:top-8 sm:right-8 sm:text-9xl"
          ></i>

          <div
            class="absolute inset-0 opacity-[0.04]"
            style="
              background-image: radial-gradient(
                currentColor 1px,
                transparent 1px
              );
              background-size: 18px 18px;
            "
          ></div>
        </div>

        <!-- 头图内容 -->
        <div
          class="relative flex min-h-72 flex-col justify-end p-5 sm:min-h-80 sm:p-8"
          :class="hasVisibleBanner ? 'text-white' : 'text-base-content'"
        >
          <!-- 标签 -->
          <div
            v-if="article?.tags?.length"
            class="mb-3 flex flex-wrap gap-2 items-center"
          >
            <div class="tooltip tooltip-right" data-tip="返回文章列表">
              <RouterLink
                class="btn btn-xs lg:btn-sm btn-circle"
                :class="
                  hasVisibleBanner
                    ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                    : 'btn-primary btn-soft'
                "
                :to="listRoute"
              >
                <i class="ri-arrow-left-line"></i>
              </RouterLink>
            </div>
            <span
              v-for="tag in article.tags"
              :key="tag"
              data-pagefind-body
              data-pagefind-filter="tag"
              class="badge max-lg:badge-sm"
              :class="
                hasVisibleBanner
                  ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                  : 'badge-primary badge-soft'
              "
            >
              {{ tag }}
            </span>
          </div>

          <!-- 标题 -->
          <h1
            data-pagefind-body
            data-pagefind-meta="title"
            data-pagefind-weight="10"
            class="max-w-4xl text-3xl leading-tight font-black font-serif tracking-tight sm:text-4xl lg:text-5xl text-balance"
            :class="hasVisibleBanner ? 'drop-shadow-sm' : ''"
          >
            {{ article?.title }}
          </h1>

          <p
            v-if="article?.summary"
            data-pagefind-body
            data-pagefind-meta="summary"
            data-pagefind-weight="2"
            class="sr-only"
          >
            {{ article.summary }}
          </p>

          <span
            v-if="articleTagsText"
            data-pagefind-meta="tags"
            class="sr-only"
          >
            {{ articleTagsText }}
          </span>

          <span
            v-if="publicationYear"
            data-pagefind-filter="year"
            class="sr-only"
          >
            {{ publicationYear }}
          </span>

          <time
            v-if="publicationDate"
            :datetime="publicationDate"
            data-pagefind-meta="date"
            data-pagefind-sort="date"
            class="sr-only"
          >
            {{ publicationDate }}
          </time>

          <!-- 别名或副标题 -->
          <p
            v-if="aliasList.length"
            class="mt-3 flex max-w-3xl flex-wrap text-sm leading-relaxed sm:text-base"
          >
            <span
              v-for="alias in aliasList"
              :key="alias"
              :title="alias"
              class="mr-2 mb-2 inline-flex max-w-full items-center justify-start overflow-x-auto whitespace-nowrap text-left font-bold badge scrollbar-none px-2"
              :class="
                hasVisibleBanner
                  ? 'border-white/15 bg-white/10 text-white/85'
                  : 'border-base-300 bg-base-100 text-base-content/75'
              "
            >
              <span class="min-w-max">{{ alias }}</span>
            </span>
          </p>

          <!-- 元数据 -->
          <div
            class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
            :class="hasVisibleBanner ? 'text-white/70' : 'text-base-content/55'"
          >
            <time v-if="article?.date" class="inline-flex items-center gap-1">
              <i class="ri-calendar-line"></i>
              {{ useDateFormat(article.date, "YYYY/M/D") }}
            </time>

            <span v-if="article?.length" class="inline-flex items-center gap-1">
              <i class="ri-file-text-line"></i>
              约 {{ article.length }} 字
            </span>

            <span v-if="article?.length" class="inline-flex items-center gap-1">
              <i class="ri-time-line"></i>
              {{ estimateReadingTime(article.length) }} 分钟阅读
            </span>

            <span
              v-if="analyticsAvailable && articleReadStatus !== 'error'"
              class="inline-flex items-center gap-1"
            >
              <i class="ri-eye-line" aria-hidden="true"></i>
              <template v-if="Number.isFinite(articleReads)">
                {{ formatReadCount(articleReads) }} 阅读
              </template>
              <span
                v-else
                class="loading loading-dots loading-xs"
                aria-label="正在读取文章阅读次数"
              ></span>
            </span>

            <span
              v-if="commentCountsAvailable && articleCommentStatus !== 'error'"
              class="inline-flex items-center gap-1"
            >
              <i class="ri-chat-3-line" aria-hidden="true"></i>
              <template v-if="Number.isFinite(articleComments)">
                {{ formatReadCount(articleComments) }} 评论
              </template>
              <span
                v-else
                class="loading loading-dots loading-xs"
                aria-label="正在读取文章评论量"
              ></span>
            </span>
          </div>
        </div>
      </header>

      <!-- Markdown 正文 -->
      <div class="mt-8 min-w-0">
        <!-- 加载状态仅替换正文阅读区 -->
        <section
          v-if="loading"
          class="min-w-0 w-full max-w-full"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="文章正文加载中"
        >
          <span class="sr-only">文章正文加载中</span>

          <div class="mx-auto max-w-4xl space-y-7" aria-hidden="true">
            <div class="skeleton h-8 w-2/5"></div>

            <div v-for="index in 4" :key="index" class="space-y-3">
              <div class="skeleton h-5 w-full"></div>
              <div class="skeleton h-5 w-11/12"></div>
              <div
                class="skeleton h-5"
                :class="index % 2 === 0 ? 'w-3/4' : 'w-4/5'"
              ></div>
            </div>
          </div>
        </section>

        <Markdown
          v-else
          :content="content"
          :is-loading="false"
          :header-data="headerData"
          :style-configs="styleConfigs"
        />
      </div>

      <nav
        v-if="previousArticle || nextArticle"
        class="mt-12 flex min-w-0 flex-col items-start gap-2 border-t border-base-300 pt-6 md:flex-row md:items-stretch md:justify-between"
        aria-label="文章翻页"
      >
        <RouterLink
          v-if="previousArticle"
          :to="getArticleRoute(previousArticle)"
          class="btn btn-sm md:btn-md h-fit min-w-0 max-w-full gap-2 py-1 justify-start lg:gap-3 md:max-w-[calc(50%-0.25rem)]"
          :aria-label="`上一篇：${previousArticle.title}`"
          @click="handleArticleNavigation(previousArticle, $event)"
        >
          <i class="ri-arrow-left-s-line shrink-0 text-lg md:text-xl"></i>

          <div
            class="flex min-w-0 flex-1 flex-col items-start gap-0.5 leading-[1.1]"
          >
            <span
              class="text-base-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
            >
              上一篇
            </span>

            <span class="max-w-full truncate text-left">
              {{ previousArticle.title }}
            </span>

            <time
              v-if="getArticleDate(previousArticle)"
              :datetime="getArticleDate(previousArticle)"
              class="text-base-content/50 text-[0.5625rem] font-semibold tracking-wide"
            >
              发布于 {{ formatArticleDate(previousArticle) }}
            </time>
          </div>
        </RouterLink>

        <RouterLink
          v-if="nextArticle"
          :to="getArticleRoute(nextArticle)"
          class="btn btn-neutral btn-sm md:btn-md h-fit min-w-0 max-w-full self-end gap-2 py-1 justify-end lg:gap-3 md:ml-auto md:self-auto md:max-w-[calc(50%-0.25rem)]"
          :aria-label="`下一篇：${nextArticle.title}`"
          @click="handleArticleNavigation(nextArticle, $event)"
        >
          <div
            class="flex min-w-0 flex-1 flex-col items-end gap-0.5 leading-[1.1]"
          >
            <span
              class="text-neutral-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
            >
              下一篇
            </span>

            <span class="max-w-full truncate text-right">
              {{ nextArticle.title }}
            </span>

            <time
              v-if="getArticleDate(nextArticle)"
              :datetime="getArticleDate(nextArticle)"
              class="text-neutral-content/50 text-[0.5625rem] font-semibold tracking-wide"
            >
              发布于 {{ formatArticleDate(nextArticle) }}
            </time>
          </div>

          <i class="ri-arrow-right-s-line shrink-0 text-lg md:text-xl"></i>
        </RouterLink>
      </nav>
    </article>

    <!-- 错误状态 -->
    <div v-else-if="error" class="alert alert-error my-16">
      <i class="ri-error-warning-line text-3xl"></i>

      <div>
        <h2 class="font-bold">文章加载失败</h2>
        <p class="text-sm">{{ error }}</p>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="my-32 text-center text-base-content/50">
      <i class="ri-file-unknow-line mb-4 block text-5xl"></i>
      <p>文章不存在或加载失败</p>
    </div>

    <TextContextMenu
      v-model="articleTextContextOpen"
      :context="articleTextContext"
      :share-meta="articleShareMeta"
      @search="openArticleContextSearch"
    />

    <template #floating>
      <aside class="max-lg:dock shadow-sm">
        <FloatingActionButton :actions="fabActions" main-icon="ri-menu-line" />
      </aside>
    </template>

    <template #format-setting>
      <FormatSetting />
    </template>

    <template #aside v-if="content && article?.id != null">
      <Giscus
        :key="`article-comments-${article.id}`"
        :repo="GISCUS.blogRepo.name"
        :repo-id="GISCUS.blogRepo.id"
        :category="GISCUS.categories.announcements.name"
        :category-id="GISCUS.categories.announcements.id"
        mapping="specific"
        :term="String(article.id)"
        strict="0"
        reactions-enabled="1"
        emit-metadata="0"
        input-position="bottom"
        :theme="giscusTheme"
        lang="zh-CN"
        loading="lazy"
      />
    </template>
  </Reader>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import Giscus from "@giscus/vue";
import { useRoute, useRouter } from "vue-router";

import { useDateFormat } from "@vueuse/core";

import { useReaderStore } from "@/stores/readerStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useScrollTo } from "@/composables/useScrollTo";
import { useReaderTextContext } from "@/composables/novel/useReaderTextContext";
import { useContentReadTracking } from "@/composables/useContentReadTracking";
import { normalizeArticleDate } from "@/composables/useArticleFilter";
import CONFIG from "@/constants/config";

import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";
import Reader from "@/components/reader/Reader.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import Markdown from "@/components/reader/Markdown.vue";
import TextContextMenu from "@/components/reader/TextContextMenu.vue";

const readerRef = ref(null);

const props = defineProps({
  article: {
    type: Object,
    default: null,
  },
  articles: {
    type: Array,
    default: () => [],
  },
  content: {
    type: String,
    default: "",
  },
  listRoute: {
    type: String,
    default: "/blog",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["back", "refresh", "navigate"]);

const articleId = computed(() => String(props.article?.id || "").trim());
const commentCountsStore = useCommentCountsStore();
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const articleComments = computed(() =>
  commentCountsStore.getContentCommentTotal("article", articleId.value),
);
const articleCommentStatus = computed(() =>
  commentCountsStore.getContentCommentStatus("article", articleId.value),
);
const articleReady = computed(
  () =>
    Boolean(articleId.value) &&
    Boolean(props.content) &&
    !props.loading &&
    !props.error,
);
const {
  analyticsAvailable,
  contentReads: articleReads,
  contentReadStatus: articleReadStatus,
} = useContentReadTracking({
  contentType: "article",
  contentId: articleId,
  ready: articleReady,
});
const readCountFormatter = new Intl.NumberFormat("zh-CN");
const formatReadCount = (value) => readCountFormatter.format(Number(value));

watch(
  articleId,
  (contentId) => {
    if (!contentId) return;
    void commentCountsStore.loadContentCommentTotals("article", [
      { contentId, discussionTerm: contentId },
    ]);
  },
  { immediate: true },
);

const { GISCUS } = CONFIG;
const route = useRoute();
const router = useRouter();

const readerStore = useReaderStore();
const { styleConfigs } = storeToRefs(readerStore);

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

const { scrollRef, scrollToTop, scrollToBottom } = useScrollTo();
const articleTextContextOpen = ref(false);
const articleTextContext = ref({});
const openArticleTextContextMenu = (context) => {
  if (!context) {
    articleTextContextOpen.value = false;
    articleTextContext.value = {};
    return;
  }

  articleTextContext.value = context;
  articleTextContextOpen.value = true;
};
const {
  handleContextMenu: handleArticleTextContextMenu,
  handlePointerCancel: handleArticlePointerCancel,
  handlePointerDown: handleArticlePointerDown,
  handlePointerMove: handleArticlePointerMove,
  handlePointerUp: handleArticlePointerUp,
} = useReaderTextContext({
  getRoot: () => scrollRef.value,
  emit: (_eventName, context) => openArticleTextContextMenu(context),
});
const openArticleContextSearch = (keyword) => {
  void router.replace({
    query: {
      ...route.query,
      search: "1",
      q: String(keyword || "").trim() || undefined,
    },
  });
};

// 右栏评论区：SSG 预渲染时保留右栏空位作为宽屏下的左右边距
// （Giscus 为客户端懒加载，预渲染 HTML 中右侧仅留空列充当边距）
const showReaderAside = computed(
  () =>
    typeof window === "undefined" || // 预渲染阶段保留右栏空位
    (Boolean(props.content) && props.article?.id != null),
);

const bannerUrl = computed(() => String(props.article?.banner || "").trim());
const bannerImageRef = ref(null);
// SSG 预渲染阶段视为已加载，确保预渲染 HTML 中遮罩默认可见
const bannerLoaded = ref(typeof window === "undefined");
const bannerFailed = ref(false);
const hasVisibleBanner = computed(
  () => Boolean(bannerUrl.value) && !bannerFailed.value,
);

function handleBannerLoad() {
  bannerFailed.value = false;
  bannerLoaded.value = true;
}

function handleBannerError() {
  bannerFailed.value = true;
  bannerLoaded.value = false;
}

function syncBannerImageState() {
  if (!bannerImageRef.value) return;

  const image = bannerImageRef.value;

  if (!image?.complete) return;

  if (image.naturalWidth > 0) {
    handleBannerLoad();
  } else {
    handleBannerError();
  }
}

// 函数式 ref：图片绑定到 DOM 时立即同步加载状态，
// 覆盖预渲染/缓存图片不再触发 load 事件的情况
function setBannerImageRef(element) {
  bannerImageRef.value = element;
  syncBannerImageState();
}

watch(
  bannerUrl,
  async () => {
    // SSR 预渲染阶段保持 bannerLoaded 初始值，遮罩默认可见
    if (typeof window === "undefined") return;

    bannerLoaded.value = false;
    bannerFailed.value = false;

    await nextTick();
    syncBannerImageState();
  },
  { immediate: true, flush: "post" },
);

const estimateReadingTime = (length) => {
  const characterCount = Number(length);

  if (!Number.isFinite(characterCount) || characterCount <= 0) {
    return 1;
  }

  // 中文文章按照每分钟约 400 字估算
  return Math.max(1, Math.ceil(characterCount / 400));
};

const aliasList = computed(() => {
  const aliases = props.article?.aliases;

  if (Array.isArray(aliases)) {
    return aliases.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof aliases === "string") {
    return aliases
      .split(/[\n，,；;]/)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
});

const articleShareMeta = computed(() => {
  const date = normalizeArticleDate(props.article?.date);
  const length = Number(props.article?.length);
  const tags = Array.isArray(props.article?.tags)
    ? props.article.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const tagsText = tags.join(" · ");
  const displayDate = date
    ? useDateFormat(props.article?.date, "YYYY/M/D").value
    : "";
  const lengthText =
    Number.isFinite(length) && length > 0 ? `${length} 字` : "";
  const readingTimeText = lengthText
    ? `${estimateReadingTime(length)} 分钟阅读`
    : "";
  const aliasesText = aliasList.value.join(" ");
  const renderedMetadata = [displayDate, lengthText, readingTimeText].filter(
    Boolean,
  );
  const publicationInfo = date ? `${displayDate} 发布` : "";
  const contentInfo = [
    Number.isFinite(length) && length > 0
      ? `约 ${length.toLocaleString("zh-CN")} 字`
      : "",
    tagsText ? tagsText : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const engagementItems = [
    analyticsAvailable.value && Number.isFinite(articleReads.value)
      ? `${formatReadCount(articleReads.value)} 阅读`
      : "",
    commentCountsAvailable.value && Number.isFinite(articleComments.value)
      ? `${formatReadCount(articleComments.value)} 评论`
      : "",
  ].filter(Boolean);
  const engagementInfo = engagementItems.join(" · ");
  const detailLines = [publicationInfo, contentInfo, engagementInfo].filter(
    Boolean,
  );

  return {
    sourceLabel: "远方之森 · 博客",
    title: props.article?.title || "",
    detail: detailLines.join(" · "),
    detailLines,
    detailLineLimit: 3,
    excludeFromContent: [
      ...aliasList.value,
      aliasesText,
      ...tags,
      tags.join(" "),
      ...renderedMetadata,
      renderedMetadata.join(" "),
      publicationInfo,
      contentInfo,
      ...engagementItems,
      engagementInfo,
    ].filter(Boolean),
    path: route.path,
  };
});

const articleTagsText = computed(() => {
  const tags = Array.isArray(props.article?.tags) ? props.article.tags : [];

  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .join(" · ");
});

const publicationDate = computed(() => {
  return normalizeArticleDate(props.article?.date);
});

const publicationYear = computed(() => {
  return publicationDate.value.slice(0, 4);
});

const getArticleDate = (article) => normalizeArticleDate(article?.date);

const getArticleTimestamp = (article) => {
  const date = getArticleDate(article);
  if (!date) return null;

  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const chronologicalArticles = computed(() => {
  const sourceArticles = Array.isArray(props.articles) ? props.articles : [];

  return sourceArticles
    .map((article, index) => ({
      article,
      index,
      timestamp: getArticleTimestamp(article),
    }))
    .filter(({ article }) => article?.id != null)
    .sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) {
        return a.index - b.index;
      }
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;

      return a.timestamp - b.timestamp || a.index - b.index;
    })
    .map(({ article }) => article);
});

const currentArticleIndex = computed(() => {
  const currentId = String(props.article?.id ?? "");
  if (!currentId) return -1;

  return chronologicalArticles.value.findIndex(
    (article) => String(article.id) === currentId,
  );
});

const previousArticle = computed(() => {
  if (currentArticleIndex.value <= 0) return null;
  return chronologicalArticles.value[currentArticleIndex.value - 1] || null;
});

const nextArticle = computed(() => {
  const nextIndex = currentArticleIndex.value + 1;
  if (currentArticleIndex.value < 0) return null;
  return chronologicalArticles.value[nextIndex] || null;
});

const getArticleRoute = (article) => {
  const generatedPath = String(article?.routePath || "").trim();
  if (generatedPath) return generatedPath;

  const articleId = String(article?.id || "").trim();
  return articleId ? `/blog/${encodeURIComponent(articleId)}` : "/blog";
};

const formatArticleDate = (article) => {
  return getArticleDate(article).replaceAll("-", "/");
};

const handleArticleNavigation = (article, event) => {
  if (
    event?.button !== 0 ||
    event?.metaKey ||
    event?.ctrlKey ||
    event?.shiftKey ||
    event?.altKey
  ) {
    return;
  }

  const articleId = String(article?.id || "").trim();
  if (articleId) emit("navigate", articleId);
};

const handleRefresh = () => {
  emit("refresh");
};

const handleBack = () => {
  emit("back");
};

// 从 article 构建 headerData，传给 Markdown 组件
const headerData = computed(() => {
  if (!props.article) return null;

  return {
    title: props.article.title || "",
    uuid: props.article.id || "",
    page: 1,
    sourceType: "article",
    meta: props.article.tags || [],
    stats: [
      {
        icon: "ri-calendar-line",
        text: props.article.date || "",
      },
    ],
  };
});

const fabActions = computed(() => {
  const actions = [
    {
      key: "bottom",
      label: "至底部",
      icon: "ri-skip-down-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToBottom,
    },
    {
      key: "top",
      label: "至顶部",
      icon: "ri-skip-up-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToTop,
    },
    {
      key: "settings",
      label: "阅读排版",
      icon: "ri-settings-3-line",
      buttonClass: "btn-primary btn-soft",
      onClick: () => readerRef.value?.openFormatSetting(),
    },
    {
      key: "refresh",
      label: "刷新文章",
      icon: props.loading ? "ri-loader-4-line animate-spin" : "ri-refresh-line",
      buttonClass: "btn-success btn-soft",
      onClick: handleRefresh,
    },
    {
      key: "back",
      label: "返回文章列表",
      icon: "ri-arrow-go-back-line",
      buttonClass: "btn-secondary btn-soft",
      onClick: handleBack,
    },
  ];

  return actions;
});
</script>
