<template>
  <Loading :size="`my-64`" v-if="isLoading || markdownPreparing" />

  <article
    ref="articleRef"
    v-else
    id="markdown-content"
    class="prose prose-2xl min-w-0 w-full max-w-full prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-2xl prose-h4:text-2xl prose-p:text-justify quotes-none prose-blockquote:prose-p:not-italic prose-blockquote:prose-p:indent-0 prose-blockquote:ps-4 lg:prose-blockquote:ps-8 prose-blockquote:prose-p:text-left"
    :class="styleConfigs.fontStyle"
    :style="{
      '--para-font-size': `${styleConfigs.fontSize}px`,
      '--para-letter-spacing': `${styleConfigs.fontGap * 0.25}rem`,
      '--para-line-height': styleConfigs.lineHeight,
      '--para-margin-inline': `${
        styleConfigs.paraHeight *
        ((styleConfigs.fontSize * styleConfigs.lineHeight * 0.5) / 36)
      }rem`,
      '--para-text-indent': `calc(${styleConfigs.fontSize * 2}px 
      + ${styleConfigs.fontGap * 0.7}rem)`,
    }"
  >
    <vue-markdown
      v-if="content"
      :key="`${headerData.uuid}-${headerData.page}`"
      :source="content"
      :options="options"
      :plugins="plugins"
    />
    <h1 v-else>加载失败，请稍后重试。</h1>
  </article>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";

import VueMarkdown from "vue-markdown-render";
import Loading from "@/components/base/Loading.vue";

const props = defineProps({
  // 内容数据
  content: {
    type: String,
    default: "",
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

  // 样式配置
  styleConfigs: {
    type: Object,
    default: () => ({
      fontStyle: "font-kai", // 字体样式类名
      fontSize: 22, // 字体大小(px)
      fontGap: 0, // 字间距
      lineHeight: 1.6, // 行间距
      paraHeight: 1, // 段间距
    }),
  },
});

const emit = defineEmits(["refresh"]);

// Markdown 渲染选项
const options = {
  html: true,
  typographer: true,
};

// 引入常用插件
import MarkdownItAbbr from "markdown-it-abbr";
import { full as emojiPlugin } from "markdown-it-emoji";
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
import { codePlugin } from "@/utils/markdown/markdown-it-code";
import { footnotePlugin } from "@/utils/markdown/markdown-it-footnote";
import { useParagraphComments } from "@/utils/markdown/markdown-it-giscus";
import {
  collectFenceLanguages,
  hasMathSyntax,
  highlightLazyPlugin,
  preloadHighlightLanguages,
} from "@/utils/markdown/markdown-feature-loader";
import {
  fetchParagraphCountsBatch,
  hasParagraphCountsApi,
} from "@/services/api-paragraph-comments";

const paragraphPlugin = useParagraphComments();
const articleRef = ref(null);
const latestBatchToken = ref(0);
const markdownRenderVersion = ref(0);
const markdownPreparing = ref(false);
const katexPlugin = ref(null);

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

const plugins = computed(() => [
  paragraphPlugin(
    props.headerData.uuid,
    props.headerData.page,
    props.headerData.sourceType,
  ),
  MarkdownItAbbr,
  highlightLazyPlugin,
  anchorPlugin,
  alertPlugin,
  chatHeaderPlugin,
  chatContainerPlugin,
  momentsPlugin,
  codePlugin,
  emojiPlugin,
  footnotePlugin,
  MarkdownItSub,
  MarkdownItSup,
  MarkdownItTaskLists,
  ...(katexPlugin.value ? [katexPlugin.value] : []),
  MarkdownItMark,
  tableWrapperPlugin,
]);

watch(
  () => props.content,
  async (content) => {
    if (!content) {
      markdownPreparing.value = false;
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
    props.content,
    props.headerData.uuid,
    props.headerData.page,
    props.headerData.sourceType,
  ],
  async ([isLoading, isPreparing]) => {
    if (isLoading) {
      return;
    }

    if (isPreparing) {
      return;
    }

    if (!hasParagraphCountsApi) {
      console.warn("未配置 VITE_PARAGRAPH_COUNTS_API，已禁用段评批量查询");
      return;
    }

    const token = latestBatchToken.value + 1;
    latestBatchToken.value = token;

    await nextTick();
    requestAnimationFrame(async () => {
      const paragraphIds = collectPrefetchParagraphIds();
      await loadBatchCounts(paragraphIds, token);

      if (token !== latestBatchToken.value) {
        return;
      }
    });
  },
  { immediate: true },
);
</script>
