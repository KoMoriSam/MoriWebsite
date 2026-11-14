<template>
  <PageShell section-id="markdown">
    <section aria-label="Markdown 渲染测试" class="min-w-0">
      <div
        ref="sampleTabs"
        role="tablist"
        aria-label="Markdown 示例"
        class="tabs tabs-sm tabs-border mb-3 flex-nowrap overflow-x-auto overscroll-x-contain"
      >
        <router-link
          v-for="sample in markdownSamples"
          :key="sample.slug"
          :to="{
            name: sample.slug,
          }"
          role="tab"
          class="tab shrink-0 whitespace-nowrap"
          :class="{ 'tab-active': currentSample.slug === sample.slug }"
          :aria-selected="currentSample.slug === sample.slug"
        >
          {{ sample.name }}
        </router-link>
      </div>

      <div
        class="grid h-dvh grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-3 md:grid-cols-[clamp(14rem,24vw,18rem)_minmax(0,1fr)] md:grid-rows-1 md:gap-4"
      >
        <aside
          aria-label="Markdown 预览设置"
          class="min-h-0 space-y-3 overflow-y-auto overscroll-contain scrollbar-thin"
          tabindex="0"
        >
          <fieldset
            class="fieldset gap-3 rounded-box border border-base-300 p-3"
          >
            <legend class="fieldset-legend">预览条件</legend>
            <div
              role="tablist"
              aria-label="渲染模式"
              class="tabs tabs-box tabs-sm grid grid-cols-3"
            >
              <label
                v-for="{ value, label } in modeOptions"
                :key="value"
                class="tab"
                :class="{ 'tab-active': previewMode === value }"
              >
                <input
                  v-model="previewMode"
                  type="radio"
                  name="markdown-preview-mode"
                  :value="value"
                  class="sr-only"
                />
                {{ label }}
              </label>
            </div>

            <div class="grid gap-1.5">
              <div class="flex items-center justify-between gap-2">
                <label for="markdown-preview-width">
                  {{ isReaderPreview ? "阅读器最大宽度" : "预览最大宽度" }}
                </label>
                <label class="tabular-nums"> {{ previewWidth }} px </label>
              </div>
              <input
                id="markdown-preview-width"
                v-model.number="previewWidth"
                type="range"
                :min="minPreviewWidth"
                :max="maxPreviewWidth"
                step="1"
                class="range range-xs w-full"
              />
            </div>

            <label
              v-if="isCustomPreview"
              class="flex items-center justify-between gap-2"
            >
              正文排版
              <select v-model="customLayout" class="select select-xs w-30">
                <option value="standard">标准排版</option>
                <option value="reading">阅读器排版</option>
              </select>
            </label>

            <label v-if="!isReaderPreview" class="grid gap-1.5">
              正文尺寸
              <input
                v-model.number="proseSizeIndex"
                type="range"
                min="0"
                :max="sizeOptions.length - 1"
                step="1"
                :aria-valuetext="sizeOptions[proseSizeIndex].label"
                class="range range-xs w-full"
              />
              <span
                class="flex justify-between px-1 text-xs leading-none"
                aria-hidden="true"
              >
                <span
                  v-for="option in sizeOptions"
                  :key="option.value"
                  :class="{ 'font-bold': proseSize === option.value }"
                >
                  {{ option.label }}
                </span>
              </span>
            </label>
          </fieldset>

          <fieldset
            v-if="isCustomPreview"
            class="fieldset grid-cols-2 gap-2 rounded-box border border-base-300 p-3"
          >
            <legend class="fieldset-legend">解析规则</legend>
            <label
              v-for="[key, label] in parserOptions"
              :key="key"
              class="flex cursor-pointer items-center gap-2"
            >
              <input
                v-model="customOptions[key]"
                type="checkbox"
                class="checkbox checkbox-sm shrink-0"
              />
              {{ label }}
            </label>
          </fieldset>

          <fieldset
            v-if="isCustomPreview"
            class="fieldset gap-2 rounded-box border border-base-300 p-3"
          >
            <legend class="fieldset-legend">挂载扩展</legend>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn btn-xs"
                @click="customExtensions = extensionOptions.map(([key]) => key)"
              >
                全选
              </button>
              <button
                type="button"
                class="btn btn-xs btn-ghost"
                @click="customExtensions = []"
              >
                清空
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="[key, label] in extensionOptions"
                :key="key"
                class="flex cursor-pointer items-center gap-2"
              >
                <input
                  v-model="customExtensions"
                  type="checkbox"
                  class="checkbox checkbox-sm shrink-0"
                  :value="key"
                />
                {{ label }}
              </label>
            </div>
          </fieldset>

          <fieldset
            v-if="isReaderPreview"
            class="fieldset rounded-box border border-base-300 bg-base-100"
          >
            <legend class="fieldset-legend mx-3 p-0">排版设置</legend>
            <FormatSetting controls-only />
          </fieldset>

          <fieldset
            v-if="showParagraphControls"
            class="fieldset rounded-box border border-base-300 bg-base-100 p-3 pb-4"
          >
            <legend class="fieldset-legend p-0">段评测试</legend>
            <div class="flex justify-between gap-2">
              <button
                class="btn btn-sm flex-1"
                type="button"
                @click="seedCommentCounts"
              >
                模拟计数
              </button>
              <button
                class="btn btn-sm btn-ghost flex-1"
                type="button"
                @click="clearCommentCounts"
              >
                清除计数
              </button>
            </div>
          </fieldset>

          <fieldset
            class="fieldset gap-3 rounded-box border border-base-300 p-3"
          >
            <legend class="fieldset-legend">Markdown 源文</legend>
            <textarea
              v-model="markdownContent"
              aria-label="Markdown 源文"
              class="textarea w-full font-mono"
              rows="8"
            ></textarea>
            <button
              type="button"
              class="btn btn-sm justify-self-start"
              @click="resetMarkdownContent"
            >
              恢复当前示例
            </button>
          </fieldset>
        </aside>

        <ReadingLayout
          ref="previewLayout"
          aria-label="Markdown 预览"
          class="mx-auto min-h-0 overflow-auto overscroll-contain scrollbar-thin"
          :page-style="{ maxWidth: `${previewWidth}px` }"
          tabindex="0"
          :toc="isReaderPreview"
          :aside="false"
          scroll-within
          root-tag="section"
          :show-footer="false"
          page-class=""
          container-class=""
          toc-class="max-h-[45dvh]"
          sticky-top="0"
        >
          <Renderer
            ref="markdownPreviewRef"
            :mode="previewMode"
            :layout="previewLayoutMode"
            :custom-markdown="customMarkdown"
            :content="markdownContent"
            :header-data="markdownHeaderData"
            :prose-size="proseSize"
            :fetch-paragraph-counts="false"
            :style-configs="readerStore.styleConfigs"
            :class="{ 'max-w-none': !isReaderPreview }"
            @pointerdown.capture="
              isReaderPreview && handleMarkdownPointerDown($event)
            "
            @pointermove.capture="
              isReaderPreview && handleMarkdownPointerMove($event)
            "
            @pointerup.capture="
              isReaderPreview && handleMarkdownPointerUp($event)
            "
            @pointercancel.capture="
              isReaderPreview && handleMarkdownPointerCancel($event)
            "
            @contextmenu.capture="
              isReaderPreview && handleMarkdownContextMenu($event)
            "
          />
        </ReadingLayout>
      </div>

      <ContextMenu
        v-if="ContextMenuMounted"
        v-model="textContextOpen"
        :context="textContext"
        :share-meta="shareMeta"
        @search="openContextSearch"
      />
    </section>
  </PageShell>
</template>

<script setup>
import {
  computed,
  defineAsyncComponent,
  provide,
  reactive,
  ref,
  shallowRef,
  watch,
  watchPostEffect,
} from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { useReaderStore } from "@/stores/readerStore";
import { useReaderTextContext } from "@/composables/reader/useReaderTextContext";
import Renderer from "@/components/markdown/Renderer.vue";
import FormatSetting from "@/components/reader/interaction/FormatSetting.vue";
import ReadingLayout from "@/components/reader/layout/ReadingLayout.vue";
import { useParagraphCommentsStorage } from "@/composables/storage/useParagraphCommentsStorage";
import { useArticleApi } from "@/services/api-articles";
import { createArticleWikiLinkResolver } from "@/utils/blog/article-wiki-links";
import { WIKI_LINK_RESOLVER } from "@/utils/markdown/markdown-it-wikilink";
import {
  MARKDOWN_MODE_CUSTOM,
  MARKDOWN_MODE_READER,
  MARKDOWN_MODE_STANDARD,
} from "@/utils/markdown/render-markdown";

import PageShell from "./PageShell.vue";
import { MARKDOWN_SAMPLES as markdownSamples } from "./markdown-samples";

const ContextMenu = defineAsyncComponent(
  () => import("@/components/reader/interaction/ContextMenu.vue"),
);

const readerStore = useReaderStore();
const route = useRoute();
const router = useRouter();
const { setCount } = useParagraphCommentsStorage();
const markdownPreviewRef = ref(null);
const sampleTabs = ref(null);
const previewLayout = ref(null);
const ContextMenuMounted = ref(false);
const textContextOpen = ref(false);
const textContext = ref({});
const modeOptions = [
  { value: MARKDOWN_MODE_STANDARD, label: "标准" },
  { value: MARKDOWN_MODE_READER, label: "阅读器" },
  { value: MARKDOWN_MODE_CUSTOM, label: "自定义" },
];
const previewMode = ref(MARKDOWN_MODE_READER);
const customLayout = ref("standard");

// 正文尺寸档位：range 用下标，业务值仍是 'sm' | 'base' | ...
const sizeOptions = [
  { value: "sm", label: "小" },
  { value: "base", label: "常规" },
  { value: "lg", label: "大" },
  { value: "xl", label: "特大" },
  { value: "2xl", label: "超大" },
];
const proseSize = ref("base");
const proseSizeIndex = computed({
  get: () =>
    Math.max(
      0,
      sizeOptions.findIndex((o) => o.value === proseSize.value),
    ),
  set: (i) => {
    proseSize.value = sizeOptions[i].value;
  },
});

const minPreviewWidth = 280;
const maxPreviewWidth = 1000;
const previewWidth = ref(800);
const actualPreviewWidth = ref(0);
const readingProgressLayout = ref("");
const previewElement = computed(() => previewLayout.value?.layoutElement);

function setPreviewWidth(event) {
  const input = event.currentTarget;
  const value = input.valueAsNumber;
  if (Number.isFinite(value)) {
    previewWidth.value = Math.min(
      maxPreviewWidth,
      Math.max(minPreviewWidth, Math.round(value)),
    );
  }
  input.value = previewWidth.value;
}

function updatePreviewDimensions() {
  const element = previewElement.value;
  if (!element) return;

  actualPreviewWidth.value = element.clientWidth;
  const mobileToc = element.querySelector("[data-reader-mobile-toc]");
  readingProgressLayout.value = mobileToc?.offsetWidth
    ? "顶部进度条"
    : "侧边目录";
}

useResizeObserver(previewElement, updatePreviewDimensions);

const parserOptions = [
  ["html", "原生 HTML"],
  ["linkify", "裸网址自动链接"],
  ["breaks", "单换行转为换行标签"],
  ["typographer", "排印替换"],
];
const extensionOptions = [
  ["alerts", "提示块"],
  ["code", "代码块组件"],
  ["headingAnchors", "标题锚点"],
  ["footnotes", "脚注"],
  ["wikiLinks", "Wiki 链接"],
  ["linkCards", "链接卡片"],
  ["linkIcons", "链接图标"],
  ["figures", "图注和图片预览"],
  ["tables", "表格横向滚动"],
  ["tasks", "任务状态"],
  ["emoji", "Emoji 短码"],
  ["attributes", "行内属性"],
  ["abbreviations", "缩写"],
  ["ruby", "注音"],
  ["mark", "高亮标记"],
  ["subscript", "下标"],
  ["superscript", "上标"],
  ["math", "LaTeX 公式"],
  ["mermaid", "Mermaid 图表"],
  ["social", "聊天和动态块"],
  ["paragraphComments", "段评标记"],
];
const customOptions = reactive({
  html: true,
  linkify: true,
  breaks: false,
  typographer: true,
});
const customExtensions = ref(["alerts", "code", "wikiLinks", "tables"]);
const isCustomPreview = computed(() => previewMode.value === MARKDOWN_MODE_CUSTOM);
const previewLayoutMode = computed(() =>
  isCustomPreview.value
    ? customLayout.value
    : previewMode.value === MARKDOWN_MODE_READER ? "reading" : "standard",
);
const isReaderPreview = computed(
  () => previewLayoutMode.value === "reading",
);
watch(isReaderPreview, updatePreviewDimensions, { flush: "post" });
const customMarkdown = computed(() =>
  isCustomPreview.value
    ? {
        parserOptions: { ...customOptions },
        extensions: customExtensions.value,
      }
    : null,
);
const showParagraphControls = computed(() =>
  isCustomPreview.value
    ? customExtensions.value.includes("paragraphComments")
    : isReaderPreview.value,
);
const testCommentCounts = {
  "markdown-test-1": 3,
  "markdown-test-2": 12,
  "markdown-test-3": 108,
  "markdown-test-4": 25,
  "markdown-test-5": 64,
  "markdown-test-6": 99,
};

function updateCommentCounts(counts) {
  Object.entries(counts).forEach(([paragraphId, count]) => {
    setCount(paragraphId, count, "article");
    document.dispatchEvent(
      new CustomEvent("paragraph-comment-metadata", {
        detail: {
          paragraphId,
          sourceType: "article",
          totalCommentCount: count,
        },
      }),
    );
  });
}

function seedCommentCounts() {
  updateCommentCounts(testCommentCounts);
}

function clearCommentCounts() {
  updateCommentCounts(
    Object.fromEntries(Object.keys(testCommentCounts).map((id) => [id, 0])),
  );
}

const currentSample = computed(
  () =>
    markdownSamples.find((sample) => sample.slug === route.name) ||
    markdownSamples[0],
);
const markdownContent = ref("");
function resetMarkdownContent() {
  markdownContent.value = currentSample.value.content;
}
watch(
  currentSample,
  () => {
    resetMarkdownContent();
    previewLayout.value?.layoutElement?.scrollTo({ top: 0 });
  },
  { immediate: true },
);
watchPostEffect(() => {
  const tabs = sampleTabs.value;
  const selected = tabs?.children[markdownSamples.indexOf(currentSample.value)];
  if (!selected) return;

  const tabBounds = selected.getBoundingClientRect();
  const railBounds = tabs.getBoundingClientRect();
  if (tabBounds.left < railBounds.left) {
    tabs.scrollLeft += tabBounds.left - railBounds.left;
  } else if (tabBounds.right > railBounds.right) {
    tabs.scrollLeft += tabBounds.right - railBounds.right;
  }
});

const { fetchArticleList } = useArticleApi();
const wikiLinkResolver = shallowRef(null);
provide(WIKI_LINK_RESOLVER, wikiLinkResolver);

let loadingWikiLinks = false;
watch(
  () =>
    markdownContent.value.includes("[[") &&
    (!customMarkdown.value || customExtensions.value.includes("wikiLinks")),
  async (hasWikiLinks) => {
    if (!hasWikiLinks || wikiLinkResolver.value || loadingWikiLinks) return;
    loadingWikiLinks = true;
    try {
      wikiLinkResolver.value = createArticleWikiLinkResolver(
        await fetchArticleList(),
      );
    } catch (error) {
      console.warn("加载 Wikilink 示例文章失败", error);
    } finally {
      loadingWikiLinks = false;
    }
  },
  { immediate: true },
);

const markdownHeaderData = computed(() => ({
  title: `Markdown 渲染测试：${currentSample.value?.name || ""}`,
  uuid: "markdown-test",
  page: markdownSamples.indexOf(currentSample.value) + 1,
  meta: "",
  sourceType: "article",
}));
const shareMeta = computed(() => ({
  sourceLabel: "远方之森 · Markdown 测试",
  title: markdownHeaderData.value.title,
  detail: "Markdown 组件上下文菜单测试",
  path: route.path,
}));

function openContextMenu(context) {
  if (!context) {
    textContextOpen.value = false;
    textContext.value = {};
    return;
  }

  ContextMenuMounted.value = true;
  textContext.value = context;
  textContextOpen.value = true;
}

const {
  handleContextMenu: handleMarkdownContextMenu,
  handlePointerCancel: handleMarkdownPointerCancel,
  handlePointerDown: handleMarkdownPointerDown,
  handlePointerMove: handleMarkdownPointerMove,
  handlePointerUp: handleMarkdownPointerUp,
} = useReaderTextContext({
  getRoot: () => (isReaderPreview.value ? markdownPreviewRef.value : null),
  emit: (_eventName, context) =>
    openContextMenu(isReaderPreview.value ? context : null),
});

watch(isReaderPreview, (active) => {
  if (!active) {
    handleMarkdownPointerCancel();
    openContextMenu(null);
  }
});

function openContextSearch(keyword) {
  void router.replace({
    query: {
      ...route.query,
      search: "1",
      q: String(keyword || "").trim() || undefined,
    },
  });
}
</script>
