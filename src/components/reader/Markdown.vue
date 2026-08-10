<template>
  <Loading :size="`my-64`" v-if="isLoading" />

  <article
    ref="articleRef"
    v-else
    :id="contentId"
    :class="[{ 'opacity-60': markdownPreparing }, styleConfigs.fontStyle]"
    class="markdown-content prose prose-2xl min-w-0 w-full max-w-full"
    :style="{
      '--para-font-size': `${styleConfigs.fontSize}px`,
      '--para-letter-spacing': `${styleConfigs.fontGap * 0.25}rem`,
      '--para-line-height': styleConfigs.lineHeight,
      '--para-margin-inline': `${
        styleConfigs.paraHeight *
        ((styleConfigs.fontSize * styleConfigs.lineHeight) / 36)
      }em`,
      '--para-text-indent': `calc(${styleConfigs.fontSize * 2}px 
      + ${styleConfigs.fontGap * 0.7}rem)`,
    }"
  >
    <slot name="before" />
    <vue-markdown
      v-for="page in renderedPages"
      :key="`${headerData.uuid}-v${markdownRenderVersion}`"
      :source="page.source"
      :options="options"
      :plugins="page.plugins"
    />
    <slot name="after" />
    <h1 v-if="!renderedPages.length">加载失败，请稍后重试。</h1>
  </article>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import VueMarkdown from "vue-markdown-render";
import Loading from "@/components/base/Loading.vue";
import { injectMarkdownSearchAnchors } from "@/utils/markdown/search-anchors";

const props = defineProps({
  // 内容数据
  content: {
    type: String,
    default: "",
  },

  // 兼容旧缓存中的分页数组；渲染前会合并为一个完整 Markdown 内容块。
  pages: {
    type: Array,
    default: () => [],
  },

  contentId: {
    type: String,
    default: "markdown-content",
  },

  // 头部数据
  headerData: {
    type: Object,
    default: () => ({
      title: "",
      uuid: "",
      page: 1,
      meta: "",
      sourceType: "article",
    }),
  },

  // 是否显示加载状态
  isLoading: {
    type: Boolean,
    default: false,
  },

  // 是否显示刷新按钮
  showRefresh: {
    type: Boolean,
    default: false,
  },

  manageRouteAnchor: {
    type: Boolean,
    default: true,
  },

  // 样式配置
  styleConfigs: {
    type: Object,
    default: () => ({
      fontStyle: "font-kai", // 字体样式类名
      fontSize: 22, // 字体大小(px)
      fontGap: 0, // 字间距
      lineHeight: 1.6, // 行间距
      paraHeight: 0.5, // 段间距
    }),
  },
});

const emit = defineEmits(["refresh", "render-ready"]);

// Markdown 渲染选项
const options = {
  html: true,
  typographer: true,
};

// 引入常用插件
import MarkdownItAbbr from "markdown-it-abbr";
import MarkdownItAttrs from "markdown-it-attrs";
import { full as emojiPlugin } from "markdown-it-emoji";
import MarkdownItRuby from "markdown-it-ruby";
import MarkdownItSub from "markdown-it-sub";
import MarkdownItSup from "markdown-it-sup";
import MarkdownItTaskLists from "markdown-it-task-lists";
import MarkdownItMark from "markdown-it-mark";

// 引入自定义插件
import { anchorPlugin } from "@/utils/markdown/markdown-it-anchor";
import { alertPlugin } from "@/utils/markdown/markdown-it-alert";
import {
  chatHeaderPlugin,
  chatContainerPlugin,
  momentsPlugin,
} from "@/utils/markdown/markdown-it-chat";
import {
  codePlugin,
  mountCodeBlocks,
  unmountCodeBlocks,
} from "@/utils/markdown/markdown-it-code";
import { footnotePlugin } from "@/utils/markdown/markdown-it-footnote";
import { useParagraphComments } from "@/utils/markdown/markdown-it-giscus";
import {
  collectFenceLanguages,
  hasMathSyntax,
  highlightLazyPlugin,
  preloadHighlightLanguages,
} from "@/utils/markdown/load-markdown-features";
import {
  fetchParagraphCountsBatch,
  hasParagraphCountsApi,
} from "@/services/api-paragraph-comments";

const paragraphPlugin = useParagraphComments();
const route = useRoute();
const articleRef = ref(null);
const latestBatchToken = ref(0);
const markdownRenderVersion = ref(0);
const markdownPreparing = ref(false);
const katexPlugin = ref(null);
let codeBlockRoot = null;
const combinedContent = computed(() => {
  if (String(props.content || "").trim()) return props.content;

  return props.pages.filter((page) => String(page || "").trim()).join("\n");
});
const anchoredPages = computed(() =>
  combinedContent.value
    ? [
        {
          source: injectMarkdownSearchAnchors(combinedContent.value),
        },
      ]
    : [],
);

const syncCodeBlocks = async () => {
  if (import.meta.env.SSR) {
    return;
  }

  await nextTick();

  const nextRoot = articleRef.value;
  if (!nextRoot) return;

  if (codeBlockRoot && codeBlockRoot !== nextRoot) {
    unmountCodeBlocks(codeBlockRoot);
  }

  codeBlockRoot = nextRoot;
  mountCodeBlocks(codeBlockRoot);
  emit("render-ready");
};

onMounted(syncCodeBlocks);
onBeforeUnmount(() => unmountCodeBlocks(codeBlockRoot));

watch(
  () => [
    combinedContent.value,
    props.isLoading,
    props.headerData.uuid,
    markdownRenderVersion.value,
  ],
  syncCodeBlocks,
  { flush: "post" },
);

const getRouteAnchorId = () => {
  const rawHash = String(route.hash || "").replace(/^#/, "");
  if (!rawHash) return "";

  try {
    return decodeURIComponent(rawHash);
  } catch {
    return rawHash;
  }
};

const scrollToRouteAnchor = async () => {
  if (
    import.meta.env.SSR ||
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !props.manageRouteAnchor ||
    props.isLoading ||
    markdownPreparing.value
  ) {
    return;
  }

  const anchorId = getRouteAnchorId();
  if (!anchorId) return;

  await nextTick();
  window.requestAnimationFrame(() => {
    const target = document.getElementById(anchorId);
    if (!target || !articleRef.value?.contains(target)) return;

    target.scrollIntoView({ block: "start" });
  });
};

const collectPrefetchParagraphIds = () => {
  if (!articleRef.value) {
    return [];
  }

  const triggerNodes = articleRef.value.querySelectorAll(
    "button.comment-trigger[data-paragraph-id]",
  );

  return Array.from(triggerNodes)
    .map((node) => node.dataset.paragraphId)
    .filter(Boolean);
};

const emitBatchCounts = (paragraphIds, counts) => {
  paragraphIds.forEach((paragraphId) => {
    const totalCommentCount = Number(counts?.[paragraphId] ?? 0);

    document.dispatchEvent(
      new CustomEvent("paragraph-comment-metadata", {
        detail: {
          paragraphId,
          sourceType: props.headerData.sourceType,
          totalCommentCount: Number.isFinite(totalCommentCount)
            ? Math.max(0, totalCommentCount)
            : 0,
        },
      }),
    );
  });
};

const loadBatchCounts = async (paragraphIds, token) => {
  if (!hasParagraphCountsApi || !paragraphIds.length) {
    return false;
  }

  try {
    const counts = await fetchParagraphCountsBatch({
      sourceType: props.headerData.sourceType,
      paragraphIds,
    });

    if (token !== latestBatchToken.value || !counts) {
      return false;
    }

    emitBatchCounts(paragraphIds, counts);
    return true;
  } catch (error) {
    console.error("段评批量查询失败（未回退元数据模式）", error);
    return false;
  }
};

const tableWrapperPlugin = (md) => {
  const defaultTableOpen =
    md.renderer.rules.table_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
  const defaultTableClose =
    md.renderer.rules.table_close ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    return (
      '<div class="markdown-table-wrapper">' +
      defaultTableOpen(tokens, idx, options, env, self)
    );
  };

  md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return defaultTableClose(tokens, idx, options, env, self) + "</div>";
  };
};

const loadMarkdownFeaturePlugins = async (content = "") => {
  const markdownText = String(content || "");
  const languages = collectFenceLanguages(markdownText);

  if (languages.length) {
    await preloadHighlightLanguages(languages);
  }

  if (katexPlugin.value || !hasMathSyntax(markdownText)) {
    return;
  }

  try {
    const katexModule = await import("@vscode/markdown-it-katex");
    katexPlugin.value = katexModule?.default || katexModule;
  } catch (error) {
    console.warn("KaTeX 插件加载失败，已跳过数学公式渲染", error);
  }
};

const rubyPlugin = (md) => {
  MarkdownItRuby(md, {
    rp: ["（", "）"],
  });
};

const sharedPlugins = computed(() => [
  MarkdownItAbbr,
  MarkdownItAttrs,
  highlightLazyPlugin,
  anchorPlugin,
  alertPlugin,
  chatHeaderPlugin,
  chatContainerPlugin,
  momentsPlugin,
  codePlugin,
  emojiPlugin,
  footnotePlugin,
  rubyPlugin,
  MarkdownItSub,
  MarkdownItSup,
  MarkdownItTaskLists,
  ...(katexPlugin.value ? [katexPlugin.value] : []),
  MarkdownItMark,
  tableWrapperPlugin,
]);

// 正文只创建一个 Markdown 渲染实例，段落序号在整篇内容内连续递增。
const renderedPages = computed(() =>
  anchoredPages.value.map((page) => ({
    ...page,
    plugins: [
      paragraphPlugin(props.headerData.uuid, props.headerData.sourceType),
      ...sharedPlugins.value,
    ],
  })),
);

// 运行时 content 变化：异步加载特性插件后渲染
watch(
  combinedContent,
  async (content) => {
    if (!content) {
      markdownPreparing.value = false;
      return;
    }

    // SSG 构建时无法执行异步加载，直接渲染基础 Markdown
    if (import.meta.env.SSR) {
      markdownPreparing.value = false;
      return;
    }

    // 客户端初次水合：立即显示 SSG 预渲染内容，后台加载特性插件
    if (!markdownRenderVersion.value) {
      markdownPreparing.value = false;
      loadMarkdownFeaturePlugins(content).then(() => {
        markdownRenderVersion.value += 1;
      });
      return;
    }

    const currentVersion = markdownRenderVersion.value + 1;
    markdownRenderVersion.value = currentVersion;
    markdownPreparing.value = true;

    await loadMarkdownFeaturePlugins(content);

    if (currentVersion !== markdownRenderVersion.value) {
      return;
    }

    markdownPreparing.value = false;
  },
  { immediate: true },
);

watch(
  () => [
    props.isLoading,
    markdownPreparing.value,
    combinedContent.value,
    props.headerData.uuid,
    props.headerData.sourceType,
  ],
  async ([isLoading, isPreparing]) => {
    // immediate watch 在 SSG 阶段也会执行；段评统计依赖浏览器 DOM 和 RAF。
    if (
      import.meta.env.SSR ||
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (isPreparing) {
      return;
    }

    if (!hasParagraphCountsApi) {
      console.warn("未配置 VITE_COMMENT_COUNTS_API，已禁用段评批量查询");
      return;
    }

    const token = latestBatchToken.value + 1;
    latestBatchToken.value = token;

    await nextTick();
    window.requestAnimationFrame(async () => {
      const paragraphIds = collectPrefetchParagraphIds();
      await loadBatchCounts(paragraphIds, token);

      if (token !== latestBatchToken.value) {
        return;
      }
    });
  },
  { immediate: true },
);

watch(
  () => [
    route.hash,
    props.isLoading,
    markdownPreparing.value,
    combinedContent.value,
    markdownRenderVersion.value,
  ],
  scrollToRouteAnchor,
  { immediate: true, flush: "post" },
);
</script>
