<template>
  <article
    ref="articleRef"
    :id="contentId"
    :class="[
      {
        'markdown-content': isReaderMode,
        'markdown-standard': isStandardMode,
        'max-w-full': isReaderMode,
        'opacity-50': isReaderMode && markdownPreparing,
        'reader-colors': isReaderMode && useReaderColors,
      },
      isReaderMode ? styleConfigs.fontClass || styleConfigs.fontStyle : '',
      proseSizeClass,
    ]"
    class="prose min-w-0 w-full transition-opacity prose-blockquote:[quotes:none] prose-blockquote:font-serif prose-blockquote:font-light prose-blockquote:not-italic prose-a:text-primary prose-a:no-underline prose-a:hover:underline"
    :style="articleStyle"
    @click="isReaderMode && handleArticleClick($event)"
    @keydown="isReaderMode && handleArticleKeydown($event)"
  >
    <slot name="before" />

    <template v-if="isLoading">
      <Loading v-if="showLoading" :size="`my-64`" />

      <slot v-else name="loading" />
    </template>

    <template v-else>
      <RenderedContent
        v-for="page in renderedPages"
        :key="`${headerData.uuid}-v${markdownRenderVersion}`"
        :html="page.html"
        :resolver="markdownComponentResolver"
      />

      <h1 v-if="isReaderMode && !renderedPages.length">
        加载失败，请稍后重试。
      </h1>
    </template>

    <slot name="after" />

    <ImagePreview v-if="isReaderMode" ref="imagePreviewRef" />
  </article>
</template>

<script setup>
import { computed, h, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import Loading from "@/components/base/Loading.vue";
import Alert from "@/components/markdown/Alert.vue";
import Chat from "@/components/markdown/Chat.vue";
import CodeBlock from "@/components/markdown/CodeBlock.vue";
import LinkIcon from "@/components/markdown/LinkIcon.vue";
import Mermaid from "@/components/markdown/Mermaid.vue";
import Moment from "@/components/markdown/Moment.vue";
import ImagePreview from "@/components/ui/ImagePreview.vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";
import {
  MARKDOWN_MODES,
  MARKDOWN_MODE_READER,
  MARKDOWN_MODE_STANDARD,
  renderMarkdown,
} from "@/utils/markdown/render-markdown";
import { injectMarkdownSearchAnchors } from "@/utils/markdown/search-anchors";
import { loadMathJaxPlugin } from "@/utils/markdown/mathjax-svg";
import { projectMarkdownComponentProps } from "@/utils/markdown/markdown-component-props";

const props = defineProps({
  mode: {
    type: String,
    default: MARKDOWN_MODE_READER,
    validator: (value) => MARKDOWN_MODES.includes(value),
  },
  proseSize: {
    type: String,
    default: "",
  },

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
      fontClass: "font-kai",
      fontFamily: "",
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
const isReaderMode = computed(() => props.mode === MARKDOWN_MODE_READER);
const isStandardMode = computed(() => props.mode === MARKDOWN_MODE_STANDARD);
const PROSE_SIZE_CLASSES = {
  sm: "prose-sm",
  base: "prose-base",
  lg: "prose-lg",
  xl: "prose-xl",
  "2xl": "prose-2xl",
};
const proseSizeClass = computed(() => {
  if (!isStandardMode.value) return "";

  const size = String(props.proseSize || "")
    .trim()
    .replace(/^prose-/, "");
  if (!size || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(size)) return "";

  return PROSE_SIZE_CLASSES[size] || `prose-${size}`;
});
const resolvedTextColor = computed(() => {
  if (!isReaderMode.value || !props.useReaderColors) return "";
  return props.styleConfigs.textColor || "";
});
const articleStyle = computed(() => {
  if (!isReaderMode.value) return undefined;

  return {
    "--para-font-size": `${props.styleConfigs.fontSize}px`,
    "--para-letter-spacing": `${props.styleConfigs.fontGap * 0.25}rem`,
    "--para-line-height": props.styleConfigs.lineHeight,
    "--para-margin-inline": `${
      Math.max(0, Number(props.styleConfigs.paraHeight) || 0) *
      Math.max(1, Number(props.styleConfigs.fontSize) || 22) *
      Math.max(1, Number(props.styleConfigs.lineHeight) || 1.6)
    }px`,
    "--para-text-indent": `calc(${props.styleConfigs.fontSize * 2}px
      + ${props.styleConfigs.fontGap * 0.7}rem)`,
    "--reader-text-color": resolvedTextColor.value || undefined,
    fontFamily: props.styleConfigs.fontFamily || undefined,
  };
});
const PREVIEW_SVG_FILTER = "invert(1) hue-rotate(180deg)";
const FALLBACK_IMAGE_WIDTH = 1200;
const FALLBACK_IMAGE_HEIGHT = 800;

// 引入常用插件
import MarkdownItAbbr from "markdown-it-abbr";
import MarkdownItAttrs from "markdown-it-attrs";
import { full as emojiPlugin } from "markdown-it-emoji";
import MarkdownItRuby from "markdown-it-ruby";
import MarkdownItSub from "markdown-it-sub";
import MarkdownItSup from "markdown-it-sup";
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
import { linkIconPlugin } from "@/utils/markdown/markdown-it-link-icon";
import { mermaidPlugin } from "@/utils/markdown/markdown-it-mermaid";
import { footnotePlugin } from "@/utils/markdown/markdown-it-footnote";
import { figurePlugin } from "@/utils/markdown/markdown-it-figure";
import { useParagraphComments } from "@/utils/markdown/markdown-it-giscus";
import { taskStatusPlugin } from "@/utils/markdown/markdown-it-task-status";
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
const imagePreviewRef = ref(null);
const latestBatchToken = ref(0);
const markdownRenderVersion = ref(0);
const markdownPreparing = ref(false);
const mathJaxPlugin = ref(null);
let markdownFeatureRequestId = 0;
const headerParagraphId = computed(() => {
  const uuid = String(props.headerData?.uuid || "").trim();
  return uuid ? `${uuid}-0` : "";
});
const combinedContent = computed(() => {
  if (String(props.content || "").trim()) return props.content;

  return props.pages.filter((page) => String(page || "").trim()).join("\n");
});

const isPreviewImage = (image) => {
  if (!(image instanceof HTMLImageElement)) return false;
  if (image.closest("[data-reader-link-icon]")) return false;

  return Boolean(
    image.matches("img.preview-image") ||
    image.closest("[data-markdown-chat], [data-markdown-moment]"),
  );
};

const getPreviewImages = (root = articleRef.value) =>
  root ? Array.from(root.querySelectorAll("img")).filter(isPreviewImage) : [];

const syncPreviewImages = (root = articleRef.value) => {
  getPreviewImages(root).forEach((image) => {
    image.classList.add("preview-image");
    image.setAttribute("role", "button");
    image.setAttribute("tabindex", "0");

    if (!image.hasAttribute("aria-label")) {
      const alt = image.getAttribute("alt")?.trim();
      image.setAttribute("aria-label", alt ? `预览图片：${alt}` : "预览图片");
    }
  });
};

const getPreviewImage = (target) => {
  const image = target instanceof Element ? target.closest("img") : null;
  return isPreviewImage(image) ? image : null;
};

const getPreviewCaption = (image) => {
  const figure = image.closest("figure.markdown-figure");
  return (
    figure?.querySelector(":scope > figcaption")?.textContent?.trim() ||
    image.getAttribute("alt")?.trim() ||
    ""
  );
};

const getPreviewDimensions = (image) => {
  if (image.naturalWidth && image.naturalHeight) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  const width = Number(image.getAttribute("width"));
  const height = Number(image.getAttribute("height"));
  if (width > 0 && height > 0) return { width, height };

  const bounds = image.getBoundingClientRect();
  if (bounds.width >= 160 && bounds.height >= 120) {
    return {
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };
  }

  return {
    width: FALLBACK_IMAGE_WIDTH,
    height: FALLBACK_IMAGE_HEIGHT,
  };
};

const createPreviewSlide = (image, index) => {
  const src = image.currentSrc || image.src;
  const imageStyle = window.getComputedStyle(image);
  const inheritedFilter = imageStyle.filter;
  const isSvg =
    image.classList.contains("markdown-svg-image") ||
    /\.svg(?:[?#]|$)/iu.test(src);
  const sourceFilterFrom =
    inheritedFilter && inheritedFilter !== "none" ? inheritedFilter : "none";
  const sourceFilter = isSvg
    ? PREVIEW_SVG_FILTER
    : inheritedFilter && inheritedFilter !== "none"
      ? inheritedFilter
      : "";

  return {
    id: image.id || `${src}-${index}`,
    src,
    msrc: src,
    ...getPreviewDimensions(image),
    alt: image.getAttribute("alt") || "",
    caption: getPreviewCaption(image),
    thumbCropped: imageStyle.objectFit === "cover",
    sourceFilter,
    sourceFilterFrom:
      isSvg && sourceFilterFrom !== sourceFilter ? sourceFilterFrom : "",
    element: image,
  };
};

const openImagePreview = (image, pointer = null) => {
  const root = articleRef.value;
  if (!image || !root?.contains(image)) return;

  const images = getPreviewImages(root);
  const index = images.indexOf(image);
  if (index < 0) return;

  const slides = images.map(createPreviewSlide);
  imagePreviewRef.value?.open({ slides, index, pointer });
};

const handleArticleClick = (event) => {
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return;
  }

  const image = getPreviewImage(event.target);
  if (!image) return;

  event.preventDefault();
  event.stopPropagation();
  openImagePreview(image, { x: event.clientX, y: event.clientY });
};

const handleArticleKeydown = (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const image = getPreviewImage(event.target);
  if (!image || image !== event.target) return;

  event.preventDefault();
  event.stopPropagation();
  openImagePreview(image);
};
const anchoredPages = computed(() =>
  combinedContent.value
    ? [
        {
          source: isReaderMode.value
            ? injectMarkdownSearchAnchors(combinedContent.value)
            : combinedContent.value,
        },
      ]
    : [],
);

let renderReadyCycle = 0;
let emittedRenderReadyCycle = -1;

const syncRenderReady = async (cycle = renderReadyCycle) => {
  if (import.meta.env.SSR || props.isLoading) return;

  await nextTick();
  if (cycle !== renderReadyCycle || emittedRenderReadyCycle === cycle) return;

  const root = articleRef.value;
  if (!root) return;
  if (isReaderMode.value) {
    syncPreviewImages(root);
    if (root.querySelector('[data-mermaid-viewer][aria-busy="true"]')) return;
  }

  emittedRenderReadyCycle = cycle;
  emit("render-ready");
};

const handleMermaidRenderComplete = () => syncRenderReady(renderReadyCycle);

const resolveMarkdownComponent = ({
  tagName,
  props: nodeProps,
  children,
  key,
}) => {
  if (!tagName.startsWith("markdown-")) return undefined;

  const componentProps = projectMarkdownComponentProps(
    tagName,
    nodeProps["data-markdown-props"],
  );
  if (!componentProps) return false;

  if (tagName === "markdown-alert") {
    return h(Alert, { ...componentProps, key }, { default: () => children });
  }
  if (tagName === "markdown-chat") {
    return h(Chat, { ...componentProps, key });
  }
  if (tagName === "markdown-moment") {
    return h(Moment, { ...componentProps, key });
  }
  if (tagName === "markdown-code") {
    return h(CodeBlock, { ...componentProps, key });
  }
  if (tagName === "markdown-link-icon") {
    return h(LinkIcon, { ...componentProps, key });
  }
  if (tagName === "markdown-mermaid") {
    return h(Mermaid, {
      ...componentProps,
      key,
      onRenderComplete: handleMermaidRenderComplete,
    });
  }

  return undefined;
};

const resolveStandardMarkdownComponent = (context) => {
  const { tagName } = context;
  if (!tagName.startsWith("markdown-")) return undefined;
  if (!["markdown-alert", "markdown-code"].includes(tagName)) return false;
  return resolveMarkdownComponent(context);
};

const markdownComponentResolver = computed(() =>
  isReaderMode.value
    ? resolveMarkdownComponent
    : resolveStandardMarkdownComponent,
);

const beginRenderReadyCycle = () => {
  renderReadyCycle += 1;
  emittedRenderReadyCycle = -1;
  syncRenderReady(renderReadyCycle);
};

onMounted(() => syncRenderReady(renderReadyCycle));

watch(
  () => [
    combinedContent.value,
    props.isLoading,
    props.headerData.uuid,
    markdownRenderVersion.value,
    props.mode,
  ],
  beginRenderReadyCycle,
  { flush: "post", immediate: true },
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
    !isReaderMode.value ||
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
      '<section class="markdown-table-wrapper">' +
      defaultTableOpen(tokens, idx, options, env, self)
    );
  };

  md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return defaultTableClose(tokens, idx, options, env, self) + "</section>";
  };
};

const loadMarkdownFeaturePlugins = async (content = "") => {
  if (!isReaderMode.value) return;

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

const sharedPlugins = computed(() => [
  MarkdownItAbbr,
  [MarkdownItAttrs, { allowedAttributes: ["id", "class"] }],
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
  taskStatusPlugin,
  ...(mathJaxPlugin.value ? [mathJaxPlugin.value] : []),
  MarkdownItMark,
  mermaidPlugin,
  figurePlugin,
  tableWrapperPlugin,
  linkIconPlugin,
]);

// 正文只创建一个 Markdown 渲染实例，段落序号在整篇内容内连续递增。
const renderedPages = computed(() => {
  markdownRenderVersion.value;

  return anchoredPages.value.map((page) => {
    const plugins = isReaderMode.value
      ? [
          paragraphPlugin(props.headerData.uuid, props.headerData.sourceType),
          ...sharedPlugins.value,
        ]
      : [alertPlugin, codePlugin];

    return {
      ...page,
      html: renderMarkdown(page.source, { mode: props.mode, plugins }),
    };
  });
});

// 运行时 content 变化：异步加载特性插件后渲染
watch(
  () => [combinedContent.value, props.mode],
  async ([content]) => {
    const requestId = ++markdownFeatureRequestId;

    if (!content) {
      markdownPreparing.value = false;
      return;
    }

    if (!isReaderMode.value) {
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

    // 异步插件加载完成后重建 MarkdownIt 输出。
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
    props.mode,
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

    if (!isReaderMode.value) {
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
    props.mode,
  ],
  scrollToRouteAnchor,
  { immediate: true, flush: "post" },
);
</script>

<style scoped src="@/assets/reader.css"></style>

<style scoped>
.markdown-standard :deep(details.alert),
.markdown-standard :deep([data-markdown-code-block]) {
  font-size: 1em;
  line-height: inherit;
  margin-block: 1em;
}

.markdown-standard :deep(details.alert) {
  gap: 1em;
  padding-block: 0.75em;
  padding-inline: 1em;
}

.markdown-standard :deep(details.alert > summary.alert-title) {
  gap: 0.5em;
}

.markdown-standard :deep(details.alert p),
.markdown-standard :deep(details.alert ul li),
.markdown-standard :deep(details.alert ol li) {
  margin-block-start: 0.5em;
  margin-block-end: 0.25em;
}

.markdown-standard :deep([data-markdown-code-block] header hgroup),
.markdown-standard :deep([data-markdown-code-block] .mockup-code) {
  font-size: 0.875em;
}

.markdown-standard :deep([data-markdown-code-block] header hgroup) {
  line-height: 1.25;
}

.markdown-standard :deep([data-markdown-code-block] > header) {
  gap: 0.5em;
  padding-block: 0.25em;
  padding-inline-start: 0.75em;
  padding-inline-end: 0.25em;
}

.markdown-standard :deep([data-markdown-code-block] .mockup-code) {
  padding-block: 0.5em;
}

.markdown-standard :deep([data-markdown-code-block] .mockup-code code) {
  font-size: 1em;
  line-height: 1.5;
}
</style>
