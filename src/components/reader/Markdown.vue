<template>
  <Loading v-if="isLoading && showLoading" :size="`my-64`" />

  <article
    ref="articleRef"
    v-else-if="!isLoading"
    :id="contentId"
    :class="[
      {
        'opacity-60': markdownPreparing,
        'reader-colors': useReaderColors,
      },
      styleConfigs.fontStyle,
    ]"
    class="markdown-content prose prose-2xl min-w-0 w-full max-w-full"
    :style="{
      '--para-font-size': `${styleConfigs.fontSize}px`,
      '--para-letter-spacing': `${styleConfigs.fontGap * 0.25}rem`,
      '--para-line-height': styleConfigs.lineHeight,
      '--para-margin-inline': `${
        Math.max(0, Number(styleConfigs.paraHeight) || 0) *
        Math.max(1, Number(styleConfigs.fontSize) || 22) *
        Math.max(1, Number(styleConfigs.lineHeight) || 1.6)
      }px`,
      '--para-text-indent': `calc(${styleConfigs.fontSize * 2}px 
      + ${styleConfigs.fontGap * 0.7}rem)`,
      '--reader-text-color': resolvedTextColor || undefined,
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
import { loadMathJaxPlugin } from "@/utils/markdown/mathjax-svg";

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
    default: "markdown",
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

  // 外层已有完整加载遮罩时，只保留 Markdown 的加载状态，不重复显示指示器。
  showLoading: {
    type: Boolean,
    default: true,
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
  useReaderColors: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["refresh", "render-ready"]);
const resolvedTextColor = computed(() => {
  if (!props.useReaderColors) return "";
  const colorTheme = props.styleConfigs.colorTheme;
  return ["lemonade", "forest", "corporate", "dim"].includes(colorTheme)
    ? ""
    : props.styleConfigs.textColor || "";
});

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
import MarkdownItMermaid from "@markslides/markdown-it-mermaid";

// 引入自定义插件
import { anchorPlugin } from "@/utils/markdown/markdown-it-anchor";
import {
  alertPlugin,
  mountAlertBlocks,
  unmountAlertBlocks,
} from "@/utils/markdown/markdown-it-alert";
import {
  chatHeaderPlugin,
  chatContainerPlugin,
  mountChatBlocks,
  momentsPlugin,
  unmountChatBlocks,
} from "@/utils/markdown/markdown-it-chat";
import {
  codePlugin,
  mountCodeBlocks,
  unmountCodeBlocks,
} from "@/utils/markdown/markdown-it-code";
import {
  mountMermaidDiagrams,
  unmountMermaidDiagrams,
} from "@/utils/markdown/markdown-it-mermaid";
import { footnotePlugin } from "@/utils/markdown/markdown-it-footnote";
import { useParagraphComments } from "@/utils/markdown/markdown-it-giscus";
import {
  collectFenceLanguages,
  hasMathSyntax,
  highlightLazyPlugin,
  preloadHighlightLanguages,
} from "@/utils/markdown/load-markdown-features";
import {
  fetchDiscussionCountsBatch,
  fetchParagraphCountsBatch,
  hasParagraphCountsApi,
} from "@/services/api-paragraph-comments";

const paragraphPlugin = useParagraphComments();
const route = useRoute();
const articleRef = ref(null);
const latestBatchToken = ref(0);
const markdownRenderVersion = ref(0);
const markdownPreparing = ref(false);
const mathJaxPlugin = ref(null);
const MERMAID_GANTT_WIDTH = 720;
let markdownFeatureRequestId = 0;
let codeBlockRoot = null;
let renderMermaidDiagrams = null;
let mermaidRenderQueue = Promise.resolve();
const headerParagraphId = computed(() => {
  const uuid = String(props.headerData?.uuid || "").trim();
  return uuid ? `${uuid}-0` : "";
});
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

const syncMarkdownComponents = async () => {
  if (import.meta.env.SSR) {
    return;
  }

  await nextTick();

  const nextRoot = articleRef.value;
  if (!nextRoot) return;

  if (codeBlockRoot && codeBlockRoot !== nextRoot) {
    unmountAlertBlocks(codeBlockRoot);
    unmountChatBlocks(codeBlockRoot);
    unmountCodeBlocks(codeBlockRoot);
    unmountMermaidDiagrams(codeBlockRoot);
  }

  codeBlockRoot = nextRoot;
  // Alert 与聊天正文都可能继续包含另一种 Markdown 组件，重复两轮可让
  // 新插入的嵌套挂载点也完成初始化，再处理最内层代码块。
  mountAlertBlocks(codeBlockRoot);
  mountChatBlocks(codeBlockRoot);
  mountAlertBlocks(codeBlockRoot);
  mountChatBlocks(codeBlockRoot);
  mountCodeBlocks(codeBlockRoot);
  mountMermaidDiagrams(codeBlockRoot);

  if (renderMermaidDiagrams) {
    const renderer = renderMermaidDiagrams;
    mermaidRenderQueue = mermaidRenderQueue
      .catch(() => undefined)
      .then(() => renderer())
      .catch((error) => {
        console.warn("Mermaid 图表渲染失败", error);
      });
    await mermaidRenderQueue;
  }
  mountMermaidDiagrams(codeBlockRoot, { renderComplete: true });

  emit("render-ready");
};

onMounted(syncMarkdownComponents);
onBeforeUnmount(() => {
  unmountAlertBlocks(codeBlockRoot);
  unmountChatBlocks(codeBlockRoot);
  unmountCodeBlocks(codeBlockRoot);
  unmountMermaidDiagrams(codeBlockRoot);
});

watch(
  () => [
    combinedContent.value,
    props.isLoading,
    props.headerData.uuid,
    markdownRenderVersion.value,
  ],
  syncMarkdownComponents,
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

  const commentableNodes = articleRef.value.querySelectorAll(
    "[data-reader-paragraph-id]:not([data-reader-comment-scope='chapter'])",
  );
  const paragraphIds = Array.from(commentableNodes)
    .map(
      (node) => node.dataset.readerParagraphId || node.getAttribute("id") || "",
    )
    .filter(Boolean);

  if (
    headerParagraphId.value &&
    props.headerData?.commentScope !== "chapter" &&
    document.getElementById(headerParagraphId.value)
  ) {
    paragraphIds.unshift(headerParagraphId.value);
  }

  return [...new Set(paragraphIds)];
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

const loadHeaderDiscussionCount = async (token) => {
  const paragraphId = headerParagraphId.value;
  const discussionTerm = String(props.headerData?.commentTerm || "").trim();
  if (
    !hasParagraphCountsApi ||
    props.headerData?.commentScope !== "chapter" ||
    !paragraphId ||
    !discussionTerm
  ) {
    return false;
  }

  try {
    const counts = await fetchDiscussionCountsBatch({
      sourceType: props.headerData.sourceType,
      discussionTerms: [discussionTerm],
    });

    if (token !== latestBatchToken.value || !counts) return false;

    emitBatchCounts([paragraphId], {
      [paragraphId]: counts[discussionTerm] ?? 0,
    });
    return true;
  } catch (error) {
    console.error("本章说评论数量查询失败", error);
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
  const featureTasks = [];

  if (languages.length) {
    featureTasks.push(preloadHighlightLanguages(languages));
  }

  if (hasMathSyntax(markdownText) && !mathJaxPlugin.value) {
    featureTasks.push(
      loadMathJaxPlugin().then((plugin) => {
        mathJaxPlugin.value = plugin;
      }),
    );
  }

  try {
    await Promise.all(featureTasks);
  } catch (error) {
    console.warn("数学公式 SVG 渲染器加载失败，已跳过公式渲染", error);
  }
};

const rubyPlugin = (md) => {
  MarkdownItRuby(md, {
    rp: ["（", "）"],
  });
};

const mermaidPlugin = (md) => {
  MarkdownItMermaid(md, {
    startOnLoad: false,
    securityLevel: "strict",
    fontFamily: "var(--font-mono)",
    themeVariables: {
      fontSize: "14px",
    },
    flowchart: {
      diagramPadding: 8,
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
      htmlLabels: false,
      useMaxWidth: true,
    },
    class: {
      diagramPadding: 8,
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 8,
      htmlLabels: false,
    },
    state: {
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 8,
      miniPadding: 4,
      noteMargin: 10,
    },
    er: {
      diagramPadding: 20,
      entityPadding: 15,
      nodeSpacing: 140,
      rankSpacing: 80,
    },
    block: {
      padding: 8,
    },
    kanban: {
      padding: 8,
    },
    gantt: {
      useMaxWidth: true,
      useWidth: MERMAID_GANTT_WIDTH,
    },
    sequence: {
      diagramMarginX: 8,
      diagramMarginY: 8,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      useMaxWidth: true,
    },
  });

  const mermaidFenceRenderer = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const rendered = mermaidFenceRenderer(tokens, idx, options, env, self);
    const token = tokens[idx];

    if (token.info.trim() !== "mermaid") return rendered;

    const diagram = rendered.replace(
      "<pre ",
      `<pre aria-hidden="true" data-mermaid-source="${encodeURIComponent(token.content.trim())}" `,
    );

    return `<div data-mermaid-viewer aria-busy="true">
      ${diagram}
      <div data-mermaid-controls></div>
    </div>`;
  };
  renderMermaidDiagrams = md.mermaid?.renderAll || null;
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
  ...(mathJaxPlugin.value ? [mathJaxPlugin.value] : []),
  MarkdownItMark,
  mermaidPlugin,
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
    const requestId = ++markdownFeatureRequestId;

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
        if (requestId !== markdownFeatureRequestId) return;
        markdownRenderVersion.value += 1;
      });
      return;
    }

    markdownPreparing.value = true;

    await loadMarkdownFeaturePlugins(content);

    if (requestId !== markdownFeatureRequestId) {
      return;
    }

    // vue-markdown-render 只在创建实例时注册插件，需在异步插件加载完成后重建。
    markdownRenderVersion.value += 1;
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
    props.headerData.commentScope,
    props.headerData.commentTerm,
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
      await Promise.all([
        loadBatchCounts(paragraphIds, token),
        loadHeaderDiscussionCount(token),
      ]);

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

<style scoped src="@/assets/reader.css"></style>
