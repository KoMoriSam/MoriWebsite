<template>
  <section
    ref="sectionRef"
    class="relative flex h-full min-h-0 flex-col overflow-hidden"
    aria-label="分页阅读器"
    :aria-busy="showChapterLoadingOverlay"
    :style="readerTypographyStyle"
    @touchstart.passive="handleTopPullStart"
    @touchmove="handleTopPullMove"
    @touchend.passive="resetTopPullGesture"
    @touchcancel.passive="resetTopPullGesture"
  >
    <div
      ref="viewportRef"
      class="mobile-page-viewport relative min-h-0 shrink-0 overflow-hidden overscroll-none"
      :class="{
        'opacity-60': isMeasuring && !hasMeasured && !chapterSnapshotVisible,
        'chapter-transition-preparing':
          chapterSnapshotVisible && !chapterSnapshotLeaving,
      }"
      :style="{
        '--reader-page-gap': `${PAGE_GAP}px`,
        '--reader-page-width': `${pageWidth}px`,
        '--reader-page-height': `${pageHeight}px`,
        '--reader-page-line-height': `${pageLineHeight}px`,
        '--reader-paragraph-gap': `${paragraphGap}px`,
        '--reader-footnote-reserve': `${footnoteReserve}px`,
        '--reader-page-font-size': `${styleConfigs.fontSize}px`,
        '--reader-page-padding-block':
          'var(--mobile-reader-content-padding-block)',
        '--reader-page-offset': `${pageOffset}px`,
        '--reader-chapter-offset': `${chapterEnterOffset}px`,
        height: `${pageHeight}px`,
      }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="resetPointer"
      @click="handleViewportClick"
    >
      <Markdown
        :content="content"
        :is-loading="isLoading"
        :header-data="headerData"
        :style-configs="styleConfigs"
        :manage-route-anchor="false"
        class="mobile-page-article"
        @render-ready="scheduleMeasure"
      >
        <template #before>
          <ChapterHeader
            v-if="chapter"
            :chapter="chapter"
            :stats="chapterStats"
            class="mobile-chapter-header not-prose break-inside-avoid-column"
          />
        </template>
        <template #after>
          <span
            ref="endMarkerRef"
            class="mobile-pagination-end"
            aria-hidden="true"
          ></span>
        </template>
      </Markdown>

      <PageFootnotes
        v-show="!chapterSnapshotVisible"
        :notes="currentPageFootnotes"
      />

      <div
        v-show="chapterSnapshotVisible"
        ref="chapterSnapshotRef"
        class="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-base-100 transition-[transform,opacity] duration-[220ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        :class="{
          'opacity-0':
            chapterSnapshotLeaving && chapterTransitionDirection === 0,
        }"
        :style="{ transform: chapterSnapshotTransform }"
        aria-hidden="true"
      ></div>

      <div
        v-if="isMeasuring && !hasMeasured && !isLoading"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-base-100/70"
        role="status"
        aria-label="正在按屏幕大小排版"
      >
        <span class="loading loading-spinner loading-sm"></span>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <button
          v-if="showNavigationHint"
          type="button"
          data-reader-interactive
          aria-label="阅读操作提示：轻触两侧或左右滑动翻页，可在底部阅读控制切换为上下滚动，从顶部下滑调出导航栏，在导航栏区域上滑可收起，点击提示关闭"
          class="alert alert-soft absolute bottom-3 left-1/2 z-20 block w-[calc(100%_-_1.5rem)] max-w-sm -translate-x-1/2 cursor-pointer border border-base-300 bg-base-100/95 p-3 text-left text-sm shadow-lg backdrop-blur-md"
          @pointerdown.stop
          @click.stop="dismissReaderHint"
        >
          <span class="block w-full">
            <span class="flex items-baseline justify-between gap-3">
              <span class="text-sm font-semibold">阅读操作</span>
              <span class="text-[0.6875rem] text-base-content/45">
                轻触提示可关闭
              </span>
            </span>

            <span
              class="mt-2 flex items-center justify-center gap-2 rounded-box bg-base-200/75 px-2.5 py-2"
            >
              <i
                class="ri-arrow-down-line text-xl leading-none text-base-content/75"
                aria-hidden="true"
              ></i>
              <span class="text-left">
                <span class="block text-xs font-semibold"
                  >从最顶部下滑可唤出本站导航栏</span
                >
                <span
                  class="mt-0.5 block text-[0.6875rem] text-base-content/55"
                >
                  唤出后，可通过上滑导航栏收起；
                  <br />
                  你可以通过导航栏调整页面主题
                </span>
              </span>
            </span>

            <span class="mt-2.5 grid grid-cols-2 gap-2">
              <span class="rounded-box bg-base-200/75 px-2.5 py-2 text-center">
                <i
                  class="ri-arrow-left-right-line block text-xl leading-none text-base-content/75"
                  aria-hidden="true"
                ></i>
                <span class="mt-1.5 block text-xs font-semibold">
                  轻触翻页
                </span>
                <span
                  class="mt-0.5 block text-[0.6875rem] text-base-content/55"
                >
                  页面左侧 / 右侧
                </span>
              </span>

              <span class="rounded-box bg-base-200/75 px-2.5 py-2 text-center">
                <i
                  class="ri-drag-move-line block text-xl leading-none text-base-content/75"
                  aria-hidden="true"
                ></i>
                <span class="mt-1.5 block text-xs font-semibold">
                  滑动翻页
                </span>
                <span
                  class="mt-0.5 block text-[0.6875rem] text-base-content/55"
                >
                  正文区域左右滑动
                </span>
              </span>
            </span>

            <span
              class="mt-2.5 flex items-baseline gap-2 border-t border-base-300 pt-2 text-xs"
            >
              <span class="shrink-0 font-semibold">更多控制</span>
              <span class="text-base-content/60">
                点击底部页码可切换上下滚动，或打开目录、排版与跳页
              </span>
            </span>
          </span>
        </button>
      </Transition>
    </div>

    <ChapterToc
      mobile
      progress-only
      viewport-pagination
      :page-progress="pageProgress"
      @progress-change="handleReadingProgressChange"
    />

    <div
      ref="footnoteMeasureRef"
      class="pointer-events-none invisible fixed top-0 -left-[10000px]"
      :style="{
        width: `${pageWidth}px`,
      }"
      aria-hidden="true"
    >
      <PageFootnotes :notes="measuringFootnotes" measure />
    </div>

    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showChapterLoadingOverlay"
        class="absolute inset-0 z-30 grid place-items-center bg-base-100/80 backdrop-blur-[1px]"
        role="status"
        aria-live="assertive"
        aria-label="正在加载章节"
        @pointerdown.stop
        @click.stop
      >
        <div class="flex flex-col items-center gap-3 text-base-content/70">
          <span class="loading loading-spinner loading-lg"></span>
          <span class="text-sm font-medium">正在加载章节…</span>
        </div>
      </div>
    </Transition>
  </section>
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

import ChapterHeader from "@/components/novel/ChapterHeader.vue";
import PageFootnotes from "./PageFootnotes.vue";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import Markdown from "@/components/reader/Markdown.vue";
import { useChapters } from "@/composables/useChapters";
import { MOBILE_READER_NAVBAR_SHOW_EVENT } from "@/constants/reader";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import { alignMobileChapterHeaderBlock } from "@/utils/reader/align-header.js";

const PAGE_GAP = 32;
const PAGE_DOCK_GAP = 16;
const PAGE_VERTICAL_PADDING = 8;
const MIN_BODY_LINES_WITH_FOOTNOTES = 3;
const MAX_FOOTNOTE_LAYOUT_PASSES = 64;
const MAX_EMPTY_PAGE_RECOVERY_PASSES = 3;
const MIN_PAGE_HEIGHT = 160;
const SWIPE_DISTANCE = 44;
const TAP_EDGE_RATIO = 0.18;
const COMMENT_EXCLUSION_RADIUS = 24;
const NAVBAR_PULL_START_ZONE = 72;
const NAVBAR_PULL_DISTANCE = 48;
const NAVBAR_PULL_DIRECTION_RATIO = 1.25;
const VIEWPORT_SETTLE_DELAY = 120;
const KEYBOARD_MIN_HEIGHT_DELTA = 80;
const CHAPTER_REVEAL_DURATION = 150;
const CHAPTER_SLIDE_DURATION = 220;
const LEGACY_PARAGRAPH_ID_PATTERN =
  /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-\d+-(\d+)$/i;

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  chapter: {
    type: Object,
    default: null,
  },
  chapterStats: {
    type: Array,
    default: () => [],
  },
  headerData: {
    type: Object,
    required: true,
  },
  styleConfigs: {
    type: Object,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  controlsOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "progress",
  "controls-open-change",
  "controller-state",
]);
const route = useRoute();
const { getState, setState } = useReadingStateStorage();
const { hasPrevious, hasNext, handlePrev, handleNext } = useChapters();

const sectionRef = ref(null);
const viewportRef = ref(null);
const endMarkerRef = ref(null);
const chapterSnapshotRef = ref(null);
const footnoteMeasureRef = ref(null);
const totalReadingProgress = ref(0);
const pendingReadingProgress = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageWidth = ref(1);
const pageHeight = ref(MIN_PAGE_HEIGHT);
const pageLineHeight = ref(35.2);
const isMeasuring = ref(true);
const hasMeasured = ref(false);
const measuredChapterUuid = ref("");
const restoredChapterUuid = ref("");
const showNavigationHint = ref(false);
const chapterSnapshotVisible = ref(false);
const chapterSnapshotLeaving = ref(false);
const chapterTransitionDirection = ref(0);
const chapterNavigationPending = ref(false);
const chapterLoadingOverlayVisible = ref(false);
const footnotesByPage = ref({});
const footnoteReservesByPage = ref({});
const measuringFootnotes = ref([]);

let resizeObserver;
let mutationObserver;
let measureFrame = 0;
let measureToken = 0;
let persistTimer;
let hintTimer;
let viewportResizeTimer;
let keyboardReleaseTimer;
let chapterRevealTimer;
let chapterNavigationTimer;
let keyboardBaselineHeight = 0;
let keyboardPaginationFrozen = false;
let footnotePaginationDepth = 0;
let footnoteSplitSequence = 0;
let measureInProgress = false;
let measureQueued = false;
let emptyPageRecoveryPasses = 0;

const pageStride = computed(() => pageWidth.value + PAGE_GAP);
const pageOffset = computed(() => (currentPage.value - 1) * pageStride.value);
const paragraphGapHalfSteps = computed(() => {
  const configuredGap = Math.max(0, Number(props.styleConfigs.paraHeight) || 0);
  return Math.round(configuredGap * 2);
});
const paragraphGap = computed(
  () => paragraphGapHalfSteps.value * (pageLineHeight.value / 2),
);
const readerTypographyStyle = computed(() => ({
  "--para-font-size": `${props.styleConfigs.fontSize}px`,
  "--para-letter-spacing": `${props.styleConfigs.fontGap * 0.25}rem`,
  "--para-line-height": props.styleConfigs.lineHeight,
  "--para-margin-inline": `${
    props.styleConfigs.paraHeight *
    ((props.styleConfigs.fontSize * props.styleConfigs.lineHeight) / 36)
  }em`,
  "--para-text-indent": `calc(${props.styleConfigs.fontSize * 2}px + ${
    props.styleConfigs.fontGap * 0.7
  }rem)`,
}));
const footnoteReserve = computed(
  () => footnoteReservesByPage.value[currentPage.value] || 0,
);
const currentPageFootnotes = computed(
  () => footnotesByPage.value[currentPage.value] || [],
);
const showChapterLoadingOverlay = computed(
  () => props.isLoading || chapterLoadingOverlayVisible.value,
);
const chapterEnterOffset = computed(() => {
  if (
    !chapterSnapshotVisible.value ||
    chapterSnapshotLeaving.value ||
    chapterTransitionDirection.value === 0
  ) {
    return 0;
  }

  return chapterTransitionDirection.value * pageStride.value;
});
const chapterSnapshotTransform = computed(() => {
  if (!chapterSnapshotLeaving.value) return "translate3d(0, 0, 0)";
  if (chapterTransitionDirection.value > 0) {
    return `translate3d(${-pageStride.value}px, 0, 0)`;
  }
  if (chapterTransitionDirection.value < 0) {
    return `translate3d(${pageStride.value}px, 0, 0)`;
  }
  return "translate3d(0, 0, 0)";
});
const paginationReady = computed(
  () =>
    hasMeasured.value &&
    !isMeasuring.value &&
    measuredChapterUuid.value === String(props.chapter?.uuid || ""),
);
const pageProgress = computed(() =>
  totalPages.value <= 1
    ? 100
    : ((currentPage.value - 1) / (totalPages.value - 1)) * 100,
);

const waitForLayout = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });

const normalizePage = (page) =>
  Math.min(totalPages.value, Math.max(1, Math.trunc(Number(page) || 1)));

const getArticleElement = () =>
  viewportRef.value?.querySelector(":scope > .markdown-content");

const captureChapterSnapshot = () => {
  const snapshotLayer = chapterSnapshotRef.value;
  const article = getArticleElement();

  if (chapterSnapshotVisible.value) {
    window.clearTimeout(chapterRevealTimer);
    chapterSnapshotLeaving.value = false;
    return;
  }
  if (!snapshotLayer || !article || !hasMeasured.value) return;

  const snapshot = article.cloneNode(true);
  snapshot.removeAttribute("id");
  snapshot.querySelectorAll("[id]").forEach((element) => {
    element.removeAttribute("id");
  });

  snapshotLayer.style.setProperty("--reader-page-gap", `${PAGE_GAP}px`);
  snapshotLayer.style.setProperty(
    "--reader-page-width",
    `${pageWidth.value}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-page-height",
    `${pageHeight.value}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-page-line-height",
    `${pageLineHeight.value}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-paragraph-gap",
    `${paragraphGap.value}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-footnote-reserve",
    `${footnoteReserve.value}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-page-font-size",
    `${props.styleConfigs.fontSize}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-page-padding-block",
    `${PAGE_VERTICAL_PADDING}px`,
  );
  snapshotLayer.style.setProperty(
    "--reader-page-offset",
    `${pageOffset.value}px`,
  );
  snapshotLayer.style.setProperty("--reader-chapter-offset", "0px");
  snapshotLayer.replaceChildren(snapshot);
  chapterSnapshotLeaving.value = false;
  chapterSnapshotVisible.value = true;
};

const revealMeasuredChapter = async () => {
  chapterLoadingOverlayVisible.value = false;
  if (!chapterSnapshotVisible.value || chapterSnapshotLeaving.value) {
    chapterNavigationPending.value = false;
    chapterTransitionDirection.value = 0;
    return;
  }

  await nextTick();
  // 先提交新章节在屏幕外的初始位置，再启动双页位移动画。
  getArticleElement()?.getBoundingClientRect();
  window.requestAnimationFrame(() => {
    totalReadingProgress.value = pendingReadingProgress.value;
    chapterSnapshotLeaving.value = true;
    window.clearTimeout(chapterRevealTimer);
    chapterRevealTimer = window.setTimeout(
      () => {
        chapterSnapshotVisible.value = false;
        chapterSnapshotLeaving.value = false;
        chapterTransitionDirection.value = 0;
        chapterNavigationPending.value = false;
        chapterSnapshotRef.value?.replaceChildren();
      },
      chapterTransitionDirection.value === 0
        ? CHAPTER_REVEAL_DURATION
        : CHAPTER_SLIDE_DURATION,
    );
  });
};

const getLastTextRect = (article) => {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  let lastTextNode = null;
  let node = walker.nextNode();

  while (node) {
    if (
      node.textContent?.trim() &&
      !node.parentElement?.closest(".footnotes")
    ) {
      lastTextNode = node;
    }
    node = walker.nextNode();
  }

  if (!lastTextNode) return null;

  const range = document.createRange();
  const endOffset = lastTextNode.textContent.length;
  range.setStart(lastTextNode, Math.max(0, endOffset - 1));
  range.setEnd(lastTextNode, endOffset);
  const rects = range.getClientRects();
  const rect = rects[rects.length - 1] || null;
  range.detach?.();
  return rect;
};

const getPageLayout = (viewport) => {
  const dock = document.querySelector("[data-mobile-reader-dock]");
  const viewportTop = viewport.getBoundingClientRect().top;
  const visualViewport = window.visualViewport;
  const visualBottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : window.innerHeight;
  const dockTop = dock?.getBoundingClientRect().top ?? visualBottom;

  const availableHeight = Math.max(
    MIN_PAGE_HEIGHT,
    Math.floor(Math.min(dockTop, visualBottom) - viewportTop - PAGE_DOCK_GAP),
  );
  const fontSize = Math.max(1, Number(props.styleConfigs.fontSize) || 22);
  const preferredLineHeight = Math.max(
    1,
    fontSize * (Number(props.styleConfigs.lineHeight) || 1.6),
  );
  const contentHeight = Math.max(
    preferredLineHeight,
    availableHeight - PAGE_VERTICAL_PADDING * 2,
  );
  const lineCount = Math.max(
    1,
    Math.floor(contentHeight / preferredLineHeight),
  );

  return {
    height: availableHeight,
    // 让完整页恰好容纳整数行：首行和末行始终落在同一组上下基线上。
    lineHeight: contentHeight / lineCount,
  };
};

const getMeasuredPageCount = (article, viewport) => {
  const stride = pageStride.value;
  if (!stride) return 1;

  const viewportRect = viewport.getBoundingClientRect();
  const lastTextRect = getLastTextRect(article);
  const markerRect = endMarkerRef.value?.getBoundingClientRect();
  const lastTextLogicalLeft = lastTextRect
    ? lastTextRect.left -
      viewportRect.left +
      pageOffset.value -
      chapterEnterOffset.value
    : 0;
  const markerLogicalLeft = markerRect
    ? markerRect.left -
      viewportRect.left +
      pageOffset.value -
      chapterEnterOffset.value
    : 0;
  const lastTextPage =
    Math.floor(Math.max(0, lastTextLogicalLeft) / stride) + 1;
  const markerPage = Math.floor(Math.max(0, markerLogicalLeft) / stride) + 1;

  // scrollWidth 在部分移动浏览器的多栏布局中只会返回第一栏宽度；最后一个
  // 正文字符和末尾定位点能直接指出内容最终落在哪一栏。
  const scrollWidthPages = Math.ceil(
    (article.scrollWidth + PAGE_GAP - 1) / stride,
  );

  // 末尾定位点恰好换栏时会落到一个没有正文的额外列；有文本时以最后一个
  // 实际字符为准，避免生成可翻入的空白末页。
  if (lastTextRect) return Math.max(1, lastTextPage);

  return Math.max(1, markerPage, scrollWidthPages);
};

const getElementPage = (element) => {
  const viewport = viewportRef.value;
  if (!viewport || !element) return 1;

  const rect = element.getClientRects()[0] || element.getBoundingClientRect();
  return getRectPage(rect, viewport);
};

const getRectPage = (rect, viewport = viewportRef.value) => {
  if (!viewport || !rect) return 1;

  const viewportRect = viewport.getBoundingClientRect();
  const logicalLeft =
    rect.left - viewportRect.left + pageOffset.value - chapterEnterOffset.value;
  return normalizePage(
    Math.floor(Math.max(0, logicalLeft) / pageStride.value) + 1,
  );
};

const collectPageFootnotes = (article) => {
  const definitions = new Map(
    Array.from(article.querySelectorAll(".footnotes .footnote-item[id]")).map(
      (item) => [`#${item.id}`, item],
    ),
  );
  const grouped = {};

  article.querySelectorAll(".footnote-ref a[href^='#fn']").forEach((link) => {
    const definitionId = link.getAttribute("href") || "";
    const definition = definitions.get(definitionId);
    if (!definition) return;

    const page = getElementPage(link.closest(".footnote-ref") || link);
    const notes = (grouped[page] ||= []);
    if (notes.some((note) => note.id === definitionId)) return;

    const clone = definition.cloneNode(true);
    clone
      .querySelectorAll(".footnote-backref, [data-footnote-backref]")
      .forEach((element) => element.remove());
    clone
      .querySelectorAll("[id]")
      .forEach((element) => element.removeAttribute("id"));
    const textBlocks = Array.from(clone.children)
      .map((element) => element.textContent?.trim())
      .filter(Boolean);

    notes.push({
      id: definitionId,
      label: link.textContent?.trim() || String(notes.length + 1),
      text: textBlocks.join("\n") || clone.textContent?.trim() || "",
    });
  });

  return grouped;
};

const removeFootnotePageBreaks = (article) => {
  const parents = new Set();
  article.querySelectorAll(".mobile-footnote-page-break").forEach((element) => {
    if (element.parentNode) parents.add(element.parentNode);
    element.remove();
  });
  parents.forEach((parent) => parent.normalize?.());
};

const restoreFootnoteParagraphSplits = (article) => {
  article
    .querySelectorAll(".mobile-footnote-split-source")
    .forEach((source) => {
      const splitToken = source.dataset.mobileFootnoteSplit;
      let sibling = source.nextElementSibling;

      while (
        splitToken &&
        sibling?.classList.contains("mobile-footnote-continuation") &&
        sibling.dataset.mobileFootnoteSplit === splitToken
      ) {
        const nextSibling = sibling.nextElementSibling;
        while (sibling.firstChild) source.appendChild(sibling.firstChild);
        sibling.remove();
        sibling = nextSibling;
      }

      source.classList.remove(
        "mobile-footnote-split-source",
        "mobile-footnote-split-empty",
      );
      delete source.dataset.mobileFootnoteSplit;
      delete source.dataset.readerFullParagraphText;
      source.normalize?.();
    });
};

const clearPageBaselineAdjustments = (article) => {
  article
    .querySelectorAll(".mobile-page-baseline-adjusted")
    .forEach((element) => {
      element.style.removeProperty("--reader-page-baseline-adjust");
      element.style.removeProperty("--reader-page-baseline-base-margin");
      element.classList.remove("mobile-page-baseline-adjusted");
    });
};

const alignChapterHeaderBlock = async (article, token) => {
  return alignMobileChapterHeaderBlock({
    article,
    // Header 与正文首段之间的节奏应由用户设置的原始行高决定，不能使用
    // 分页器为了填满屏幕而轻微拉伸后的 pageLineHeight。
    lineHeight:
      (Number(props.styleConfigs.fontSize) || 20) *
      (Number(props.styleConfigs.lineHeight) || 1.6),
    waitForLayout,
    isCurrent: () => token === measureToken,
  });
};

const getFootnoteLayoutSignature = (grouped) =>
  Object.entries(grouped)
    .map(([page, notes]) => `${page}:${notes.map((note) => note.id).join(",")}`)
    .join("|");

const getPageBodyTextRects = (article, viewport, page) => {
  const contentRoot = article.querySelector(":scope > div");
  if (!contentRoot) return [];

  const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest(
          ".footnotes, .footnote-ref, .mobile-footnote-page-break, button, [aria-hidden='true']",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const range = document.createRange();
  const rects = [];
  let node = walker.nextNode();

  while (node) {
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach((rect) => {
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        getRectPage(rect, viewport) === page
      ) {
        rects.push(rect);
      }
    });
    node = walker.nextNode();
  }

  range.detach?.();
  return rects.sort(
    (left, right) => left.top - right.top || left.left - right.left,
  );
};

const pageHasVisibleContent = (article, viewport, page) => {
  if (getPageBodyTextRects(article, viewport, page).length) return true;

  const header = article.querySelector(":scope > .mobile-chapter-header");
  if (
    header &&
    Array.from(header.getClientRects()).some(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        getRectPage(rect, viewport) === page,
    )
  ) {
    return true;
  }

  return Array.from(
    article.querySelectorAll(
      ":scope > div img, :scope > div video, :scope > div svg, :scope > div canvas, :scope > div table, :scope > div pre",
    ),
  ).some((element) =>
    Array.from(element.getClientRects()).some(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        getRectPage(rect, viewport) === page,
    ),
  );
};

const findNearestContentPage = (article, viewport, requestedPage) => {
  const requested = normalizePage(requestedPage);
  if (pageHasVisibleContent(article, viewport, requested)) return requested;

  for (let distance = 1; distance < totalPages.value; distance += 1) {
    const after = requested + distance;
    if (
      after <= totalPages.value &&
      pageHasVisibleContent(article, viewport, after)
    ) {
      return after;
    }

    const before = requested - distance;
    if (before >= 1 && pageHasVisibleContent(article, viewport, before)) {
      return before;
    }
  }

  return requested;
};

const getPageBlockGapCandidates = (article, viewport, page, firstRect) => {
  const contentRoot = article.querySelector(":scope > div");
  if (!contentRoot) return [];

  return Array.from(contentRoot.children).filter((element) => {
    if (
      !element.previousElementSibling ||
      element.matches(
        ".footnotes, .footnotes-sep, .mobile-footnote-continuation, .mobile-footnote-split-empty, [aria-hidden='true']",
      )
    ) {
      return false;
    }

    const computedStyle = window.getComputedStyle(element);
    if (
      computedStyle.display === "none" ||
      computedStyle.display === "inline" ||
      computedStyle.position === "absolute" ||
      computedStyle.position === "fixed"
    ) {
      return false;
    }

    const firstElementRect = element.getClientRects()[0];
    return (
      firstElementRect &&
      getRectPage(firstElementRect, viewport) === page &&
      firstElementRect.top > firstRect.top + 1
    );
  });
};

// CSS 多栏会在每栏顶部重新排正文，但段距和脚注会留下不足一行的剩余空间。
// 把剩余空间平均补入页内已有块间距，不移动首行，也不制造额外页或改变脚注归属。
const alignPageEdgeBaselines = async (article, viewport, reserves, token) => {
  const lineHeight = pageLineHeight.value;
  if (lineHeight <= 0) return;

  const pageCount = getMeasuredPageCount(article, viewport);
  for (let page = 1; page <= pageCount; page += 1) {
    if (token !== measureToken) return;

    const rects = getPageBodyTextRects(article, viewport, page);
    if (!rects.length) continue;

    const firstRect = rects[0];
    const lastRect = rects.reduce((lowest, rect) =>
      rect.bottom > lowest.bottom ? rect : lowest,
    );
    const bodyBottom =
      viewport.getBoundingClientRect().top +
      pageHeight.value -
      PAGE_VERTICAL_PADDING -
      (reserves[page] || 0);
    const availableGridHeight = bodyBottom - firstRect.bottom;
    if (availableGridHeight < 0) continue;

    const targetLastBottom =
      firstRect.bottom +
      Math.floor((availableGridHeight + 0.5) / lineHeight) * lineHeight;
    const missingHeight = targetLastBottom - lastRect.bottom;
    const adjustment = missingHeight;

    if (adjustment < 1 || adjustment > lineHeight * 1.05) {
      continue;
    }

    const candidates = getPageBlockGapCandidates(
      article,
      viewport,
      page,
      firstRect,
    );
    if (!candidates.length) continue;

    const pageCountBefore = getMeasuredPageCount(article, viewport);
    const footnotesBefore = getFootnoteLayoutSignature(
      collectPageFootnotes(article),
    );
    const distributedAdjustment = adjustment / candidates.length;
    candidates.forEach((candidate) => {
      const baseMargin =
        Number.parseFloat(
          window.getComputedStyle(candidate).marginBlockStart,
        ) || 0;
      candidate.classList.add("mobile-page-baseline-adjusted");
      candidate.style.setProperty(
        "--reader-page-baseline-base-margin",
        `${baseMargin}px`,
      );
      candidate.style.setProperty(
        "--reader-page-baseline-adjust",
        `${distributedAdjustment}px`,
      );
    });
    await nextTick();
    await waitForLayout();

    const adjustedRects = getPageBodyTextRects(article, viewport, page);
    const adjustedLastRect = adjustedRects.reduce(
      (lowest, rect) => (rect.bottom > lowest.bottom ? rect : lowest),
      adjustedRects[0],
    );
    const invalidAdjustment =
      !adjustedLastRect ||
      Math.abs(adjustedLastRect.bottom - targetLastBottom) > 2.5 ||
      adjustedLastRect.bottom > bodyBottom + 1 ||
      getMeasuredPageCount(article, viewport) !== pageCountBefore ||
      getFootnoteLayoutSignature(collectPageFootnotes(article)) !==
        footnotesBefore;

    if (invalidAdjustment) {
      candidates.forEach((candidate) => {
        candidate.style.removeProperty("--reader-page-baseline-adjust");
        candidate.style.removeProperty("--reader-page-baseline-base-margin");
        candidate.classList.remove("mobile-page-baseline-adjusted");
      });
      await nextTick();
      await waitForLayout();
    }
  }
};

const measureFootnoteReserve = async (notes) => {
  if (!notes.length) return 0;

  measuringFootnotes.value = notes;
  await nextTick();
  await waitForLayout();

  const measuredHeight = footnoteMeasureRef.value?.scrollHeight || 0;
  const lineHeight = pageLineHeight.value;
  const contentLines = Math.max(
    1,
    Math.floor((pageHeight.value - PAGE_VERTICAL_PADDING * 2) / lineHeight),
  );
  const maxFootnoteLines = Math.max(
    1,
    contentLines - MIN_BODY_LINES_WITH_FOOTNOTES,
  );
  const maxFootnoteHeight = maxFootnoteLines * lineHeight;

  // 正文按实际脚注高度避让；不再向上取整成完整正文行，避免紧凑脚注仍浪费近一行空间。
  return Math.min(Math.max(1, measuredHeight), maxFootnoteHeight);
};

const findFootnoteBreakPosition = (article, viewport, page, reserve) => {
  const footerTop =
    viewport.getBoundingClientRect().top +
    pageHeight.value -
    PAGE_VERTICAL_PADDING -
    reserve;
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest(
          ".footnotes, .mobile-footnote-page-break, button, [aria-hidden='true']",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const range = document.createRange();
  let node = walker.nextNode();

  while (node) {
    range.selectNodeContents(node);
    const hasOverflowingRect = Array.from(range.getClientRects()).some(
      (rect) => getRectPage(rect, viewport) === page && rect.bottom > footerTop,
    );

    if (hasOverflowingRect) {
      for (let offset = 0; offset < node.textContent.length; offset += 1) {
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getClientRects()[0];
        if (
          rect &&
          getRectPage(rect, viewport) === page &&
          rect.bottom > footerTop
        ) {
          range.detach?.();
          return { node, offset };
        }
      }
    }

    node = walker.nextNode();
  }

  range.detach?.();
  return null;
};

const getParagraphTextForComments = (paragraph) => {
  const clone = paragraph.cloneNode(true);
  clone
    .querySelectorAll(
      ".comment-trigger, .paragraph-comment-count, .footnote-ref, [data-footnote-ref]",
    )
    .forEach((element) => element.remove());
  return clone.textContent || "";
};

const splitParagraphAtFootnoteBreak = ({ node, offset }) => {
  const footnoteReference = node.parentElement?.closest(".footnote-ref");
  const paragraph = (footnoteReference || node.parentElement)?.closest("p");
  if (!paragraph?.parentNode || !node.parentNode) return false;
  const articleRoot = paragraph.closest(".mobile-page-article");
  const contentRoot = articleRoot?.querySelector(":scope > div");
  if (paragraph.parentElement !== contentRoot) return false;
  const sourceWasContinuation = paragraph.classList.contains(
    "mobile-footnote-continuation",
  );
  const paragraphStartIndent = window.getComputedStyle(paragraph).textIndent;

  let splitToken = paragraph.dataset.mobileFootnoteSplit;
  if (!splitToken) {
    splitToken = `footnote-split-${(footnoteSplitSequence += 1)}`;
    paragraph.dataset.mobileFootnoteSplit = splitToken;
    paragraph.classList.add("mobile-footnote-split-source");
    if (paragraph.id) {
      paragraph.dataset.readerFullParagraphText =
        getParagraphTextForComments(paragraph);
    }
  }

  const range = document.createRange();
  if (footnoteReference) {
    range.setStartBefore(footnoteReference);
  } else {
    range.setStart(node, offset);
  }
  range.setEndAfter(paragraph.lastChild);
  const trailingContent = range.extractContents();
  range.detach?.();

  if (!trailingContent.hasChildNodes()) return false;

  const continuation = paragraph.cloneNode(false);
  continuation.removeAttribute("id");
  continuation.classList.remove(
    "mobile-footnote-split-source",
    "mobile-footnote-split-empty",
    "mobile-footnote-paragraph-start",
    "mobile-page-baseline-adjusted",
  );
  continuation.classList.add("mobile-footnote-continuation");
  continuation.style.removeProperty("--reader-page-baseline-adjust");
  continuation.style.removeProperty("--reader-page-baseline-base-margin");
  continuation.style.removeProperty("--reader-footnote-continuation-indent");
  continuation.dataset.mobileFootnoteSplit = splitToken;
  delete continuation.dataset.readerFullParagraphText;
  continuation.appendChild(trailingContent);
  paragraph.after(continuation);

  const sourceHasBodyText = Boolean(
    getParagraphTextForComments(paragraph).trim(),
  );
  if (!sourceHasBodyText) {
    paragraph.classList.add("mobile-footnote-split-empty");
    // 切点落在原段段首时，迁移到下一页的是完整段落而非续写片段，
    // 应保留该段原有的首行缩进。已经拆过的续段再次整体迁移则仍不缩进。
    if (!sourceWasContinuation) {
      continuation.classList.add("mobile-footnote-paragraph-start");
      continuation.style.setProperty(
        "--reader-footnote-continuation-indent",
        paragraphStartIndent,
      );
    }
  }
  return true;
};

const insertFootnotePageBreak = (breakPosition) => {
  if (splitParagraphAtFootnoteBreak(breakPosition)) return;

  const { node, offset } = breakPosition;
  const footnoteReference = node.parentElement?.closest(".footnote-ref");
  const breakElement = document.createElement("span");
  breakElement.className = "mobile-footnote-page-break";
  breakElement.setAttribute("aria-hidden", "true");

  if (footnoteReference?.parentNode) {
    footnoteReference.parentNode.insertBefore(breakElement, footnoteReference);
    return;
  }

  if (!node.parentNode) return;
  if (offset <= 0) {
    node.parentNode.insertBefore(breakElement, node);
    return;
  }

  const trailingText = node.splitText(offset);
  trailingText.parentNode?.insertBefore(breakElement, trailingText);
};

const rollbackIncompleteFootnoteLayout = (article) => {
  if (!article?.isConnected) return;
  clearPageBaselineAdjustments(article);
  removeFootnotePageBreaks(article);
  restoreFootnoteParagraphSplits(article);
  footnotesByPage.value = {};
  footnoteReservesByPage.value = {};
  measuringFootnotes.value = [];
};

const paginatePageFootnotes = async (article, viewport, token) => {
  footnotePaginationDepth += 1;
  let completed = false;
  try {
    clearPageBaselineAdjustments(article);
    removeFootnotePageBreaks(article);
    restoreFootnoteParagraphSplits(article);
    const headerReady = await alignChapterHeaderBlock(article, token);
    if (!headerReady) return false;
    footnotesByPage.value = {};
    footnoteReservesByPage.value = {};
    measuringFootnotes.value = [];
    await nextTick();
    await waitForLayout();

    const reserveCache = new Map();
    let page = 1;
    let insertedBreaks = 0;

    while (insertedBreaks < MAX_FOOTNOTE_LAYOUT_PASSES) {
      if (token !== measureToken) return false;

      totalPages.value = getMeasuredPageCount(article, viewport);
      if (page > totalPages.value) break;

      const grouped = collectPageFootnotes(article);
      const notes = grouped[page] || [];
      if (notes.length) {
        const cacheKey = notes.map((note) => note.id).join("|");
        let reserve = reserveCache.get(cacheKey);
        if (reserve == null) {
          reserve = await measureFootnoteReserve(notes);
          reserveCache.set(cacheKey, reserve);
        }
        if (token !== measureToken) return false;

        const breakPosition = findFootnoteBreakPosition(
          article,
          viewport,
          page,
          reserve,
        );
        if (breakPosition) {
          insertFootnotePageBreak(breakPosition);
          insertedBreaks += 1;
          await nextTick();
          await waitForLayout();
        }
      }

      page += 1;
    }

    totalPages.value = getMeasuredPageCount(article, viewport);
    const finalFootnotes = collectPageFootnotes(article);
    const finalReserves = {};
    for (const [pageNumber, notes] of Object.entries(finalFootnotes)) {
      const cacheKey = notes.map((note) => note.id).join("|");
      let reserve = reserveCache.get(cacheKey);
      if (reserve == null) {
        reserve = await measureFootnoteReserve(notes);
        reserveCache.set(cacheKey, reserve);
      }
      finalReserves[pageNumber] = reserve;
    }

    if (token !== measureToken) return false;
    await alignPageEdgeBaselines(article, viewport, finalReserves, token);
    if (token !== measureToken) return false;

    totalPages.value = getMeasuredPageCount(article, viewport);
    footnotesByPage.value = collectPageFootnotes(article);
    footnoteReservesByPage.value = finalReserves;
    measuringFootnotes.value = [];
    completed = true;
    return true;
  } finally {
    // 字体、字号等设置或键盘状态可能在异步测量途中变化。未完成的
    // 脚注布局不能留在可见 DOM 中，否则隐藏源段和强制换栏续段会制造空白首页。
    if (!completed) rollbackIncompleteFootnoteLayout(article);
    // MutationObserver 的回调晚于当前异步分页执行。这里主动丢弃本轮脚注
    // 拆分和基线校正产生的记录，避免分页器把自己的 DOM 修改再次当成正文更新。
    mutationObserver?.takeRecords();
    footnotePaginationDepth = Math.max(0, footnotePaginationDepth - 1);
  }
};

const normalizeChapterParagraphAnchor = (anchor, chapterUuid) => {
  const token = String(anchor || "");
  if (!token) return "";
  if (/^\d+$/.test(token)) return `${chapterUuid}-${token}`;

  const legacyMatch = token.match(LEGACY_PARAGRAPH_ID_PATTERN);
  if (legacyMatch?.[1]?.toLowerCase() === chapterUuid.toLowerCase()) {
    return `${chapterUuid}-${legacyMatch[2]}`;
  }

  return token;
};

const getInitialAnchor = () => {
  const chapterUuid = String(props.chapter?.uuid || "");
  const rawHash = String(route.hash || "").replace(/^#/, "");
  let decodedHash = rawHash;
  try {
    decodedHash = decodeURIComponent(rawHash);
  } catch {
    // 保留无法解码的原始 hash。
  }

  if (decodedHash) {
    return normalizeChapterParagraphAnchor(decodedHash, chapterUuid);
  }

  const stored = String(getState("READ_POS", "") || "");
  const normalizedStored = normalizeChapterParagraphAnchor(stored, chapterUuid);
  return normalizedStored.startsWith(`${chapterUuid}-`) ? normalizedStored : "";
};

const restorePage = () => {
  const chapterUuid = String(props.chapter?.uuid || "");
  if (!chapterUuid || restoredChapterUuid.value === chapterUuid) return;

  const requestedEdge = window.history.state?.mobileReaderEdge;
  if (
    requestedEdge?.chapterUuid === chapterUuid &&
    requestedEdge?.edge === "end"
  ) {
    currentPage.value = totalPages.value;
    restoredChapterUuid.value = chapterUuid;

    const nextHistoryState = { ...window.history.state };
    delete nextHistoryState.mobileReaderEdge;
    window.history.replaceState(nextHistoryState, "");
    return;
  }

  const target = document.getElementById(getInitialAnchor());

  currentPage.value = target ? getElementPage(target) : 1;
  restoredChapterUuid.value = chapterUuid;
};

const measurePages = async () => {
  if (keyboardPaginationFrozen) return;

  if (measureInProgress) {
    measureQueued = true;
    return;
  }

  measureInProgress = true;

  try {
    const viewport = viewportRef.value;
    if (!viewport || props.isLoading) return;

    if (viewport.clientWidth <= 1 || viewport.clientHeight <= 1) {
      isMeasuring.value = false;
      return;
    }

    const token = ++measureToken;
    const chapterUuid = String(props.chapter?.uuid || "");
    isMeasuring.value = true;
    const previousProgress =
      totalPages.value > 1
        ? (currentPage.value - 1) / (totalPages.value - 1)
        : 0;

    pageWidth.value = Math.max(1, Math.floor(viewport.clientWidth));
    const pageLayout = getPageLayout(viewport);
    pageHeight.value = pageLayout.height;
    pageLineHeight.value = pageLayout.lineHeight;
    await nextTick();
    await waitForLayout();

    if (keyboardPaginationFrozen) {
      isMeasuring.value = false;
      return;
    }

    if (
      token !== measureToken ||
      chapterUuid !== String(props.chapter?.uuid || "")
    ) {
      return;
    }

    const article = getArticleElement();
    const contentRoot = article?.querySelector(":scope > div");
    const hasBodyContent = Boolean(
      contentRoot?.textContent?.trim() ||
      contentRoot?.querySelector("img, video, svg, canvas, table, pre"),
    );
    if (!article || (String(props.content || "").trim() && !hasBodyContent)) {
      isMeasuring.value = false;
      return;
    }

    const footnotesReady = await paginatePageFootnotes(
      article,
      viewport,
      token,
    );
    if (!footnotesReady || token !== measureToken) return;

    measuredChapterUuid.value = chapterUuid;

    if (restoredChapterUuid.value !== String(props.chapter?.uuid || "")) {
      restorePage();
    } else {
      currentPage.value = normalizePage(
        Math.round(previousProgress * (totalPages.value - 1)) + 1,
      );
    }

    await nextTick();
    await waitForLayout();
    if (token !== measureToken) return;

    const firstPageHasContent = pageHasVisibleContent(article, viewport, 1);
    const currentPageHasContent = pageHasVisibleContent(
      article,
      viewport,
      currentPage.value,
    );
    if (!firstPageHasContent || !currentPageHasContent) {
      if (emptyPageRecoveryPasses < MAX_EMPTY_PAGE_RECOVERY_PASSES) {
        emptyPageRecoveryPasses += 1;
        hasMeasured.value = false;
        rollbackIncompleteFootnoteLayout(article);
        measureQueued = true;
        return;
      }

      if (!currentPageHasContent) {
        currentPage.value = findNearestContentPage(
          article,
          viewport,
          currentPage.value,
        );
      }
    }

    emptyPageRecoveryPasses = 0;

    hasMeasured.value = true;
    isMeasuring.value = false;
    emitProgress();
    void revealMeasuredChapter();
  } finally {
    measureInProgress = false;

    if (measureQueued && !keyboardPaginationFrozen) {
      measureQueued = false;
      scheduleMeasure();
    }
  }
};

const scheduleMeasure = () => {
  if (keyboardPaginationFrozen || measureInProgress) {
    measureQueued = true;
    return;
  }

  measureQueued = false;
  if (measureFrame) window.cancelAnimationFrame(measureFrame);
  measureFrame = window.requestAnimationFrame(() => {
    measureFrame = 0;
    void measurePages();
  });
};

const scheduleFreshMeasure = () => {
  // 立即作废仍在等待字体、脚注高度或双 rAF 布局的旧任务，确保它只能回滚，
  // 不能在新排版设置生效后提交混合了两套参数的分页结果。
  measureToken += 1;
  scheduleMeasure();
};

const scheduleViewportMeasure = () => {
  if (keyboardPaginationFrozen) return;

  window.clearTimeout(viewportResizeTimer);
  viewportResizeTimer = window.setTimeout(
    scheduleMeasure,
    VIEWPORT_SETTLE_DELAY,
  );
};

const getVisualViewportHeight = () =>
  window.visualViewport?.height || window.innerHeight;

const getKeyboardHeightThreshold = () =>
  Math.max(
    KEYBOARD_MIN_HEIGHT_DELTA,
    Math.round(keyboardBaselineHeight * 0.15),
  );

const freezeKeyboardPagination = () => {
  keyboardPaginationFrozen = true;
  window.clearTimeout(keyboardReleaseTimer);
  window.clearTimeout(viewportResizeTimer);
  measureToken += 1;
  if (measureFrame) {
    window.cancelAnimationFrame(measureFrame);
    measureFrame = 0;
  }
  isMeasuring.value = false;
};

const isKeyboardInput = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  if (
    element.matches("textarea, [contenteditable=''], [contenteditable='true']")
  ) {
    return true;
  }
  if (!(element instanceof HTMLInputElement)) return false;

  return ![
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ].includes(element.type);
};

const releaseKeyboardPagination = () => {
  keyboardPaginationFrozen = false;
  keyboardBaselineHeight = getVisualViewportHeight();
  window.clearTimeout(keyboardReleaseTimer);
  scheduleViewportMeasure();
};

const scheduleKeyboardRelease = () => {
  window.clearTimeout(keyboardReleaseTimer);
  keyboardReleaseTimer = window.setTimeout(() => {
    const heightDelta = keyboardBaselineHeight - getVisualViewportHeight();
    if (heightDelta <= getKeyboardHeightThreshold() / 2) {
      releaseKeyboardPagination();
    }
  }, VIEWPORT_SETTLE_DELAY);
};

const handleKeyboardFocusIn = (event) => {
  if (!isKeyboardInput(event.target)) return;

  window.clearTimeout(keyboardReleaseTimer);
  if (!keyboardPaginationFrozen) {
    keyboardBaselineHeight = getVisualViewportHeight();
  }
  freezeKeyboardPagination();
};

const handleKeyboardFocusOut = (event) => {
  if (!isKeyboardInput(event.target)) return;

  window.setTimeout(() => {
    if (isKeyboardInput(document.activeElement)) return;
    scheduleKeyboardRelease();
  });
};

const handleVisualViewportChange = () => {
  const currentHeight = getVisualViewportHeight();

  if (!keyboardPaginationFrozen) {
    keyboardBaselineHeight = currentHeight;
    scheduleViewportMeasure();
    return;
  }

  window.clearTimeout(viewportResizeTimer);
  if (!isKeyboardInput(document.activeElement)) scheduleKeyboardRelease();
};

const findVisibleAnchor = () => {
  const viewport = viewportRef.value;
  const article = getArticleElement();
  if (!viewport || !article) return null;

  const viewportRect = viewport.getBoundingClientRect();
  const candidates = article.querySelectorAll(
    "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], p[id]",
  );

  return Array.from(candidates).find((element) =>
    Array.from(element.getClientRects()).some(
      (rect) =>
        rect.right > viewportRect.left + 4 &&
        rect.left < viewportRect.right - 4 &&
        rect.bottom > viewportRect.top + 4 &&
        rect.top < viewportRect.bottom - 4,
    ),
  );
};

const persistCurrentPosition = () => {
  const anchor = findVisibleAnchor();
  if (!anchor?.id) return;

  setState("READ_POS", anchor.id);
};

const persistPosition = () => {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistCurrentPosition, 240);
};

const emitProgress = () => {
  emit("progress", pageProgress.value);
};

const triggerReaderHint = () => {
  showNavigationHint.value = true;
  setState("MOBILE_PAGE_HINT_SEEN", true);
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    showNavigationHint.value = false;
  }, 6000);
};

const dismissReaderHint = () => {
  window.clearTimeout(hintTimer);
  showNavigationHint.value = false;
};

const handleReadingProgressChange = (progress) => {
  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  pendingReadingProgress.value = normalizedProgress;
  if (!chapterSnapshotVisible.value) {
    totalReadingProgress.value = normalizedProgress;
  }
};

const setReaderControlsOpen = (open) => {
  const nextOpen = Boolean(open);
  if (!nextOpen && isKeyboardInput(document.activeElement)) {
    document.activeElement?.blur();
  }
  emit("controls-open-change", nextOpen);
};

const goToPage = (page) => {
  const target = normalizePage(page);
  if (target === currentPage.value) return;
  currentPage.value = target;
  emitProgress();
  persistPosition();
};

const beginChapterNavigation = (direction = 0) => {
  chapterNavigationPending.value = true;
  chapterLoadingOverlayVisible.value = true;
  chapterTransitionDirection.value = direction;
  captureChapterSnapshot();

  window.clearTimeout(chapterNavigationTimer);
  chapterNavigationTimer = window.setTimeout(() => {
    if (!chapterNavigationPending.value) return;
    chapterNavigationPending.value = false;
    chapterLoadingOverlayVisible.value = false;
    chapterTransitionDirection.value = 0;
    void revealMeasuredChapter();
  }, 12000);
};

const turnChapter = (direction) => {
  const normalizedDirection = direction < 0 ? -1 : 1;
  const canNavigate =
    normalizedDirection < 0 ? hasPrevious.value : hasNext.value;
  if (
    !paginationReady.value ||
    chapterNavigationPending.value ||
    !canNavigate
  ) {
    return;
  }

  beginChapterNavigation(normalizedDirection);

  const navigation =
    normalizedDirection < 0 ? handlePrev({ lastPage: true }) : handleNext();
  Promise.resolve(navigation).catch(() => {
    window.clearTimeout(chapterNavigationTimer);
    chapterNavigationPending.value = false;
    chapterLoadingOverlayVisible.value = false;
    chapterTransitionDirection.value = 0;
    void revealMeasuredChapter();
  });
};

const turnPage = (direction) => {
  if (showChapterLoadingOverlay.value) return;

  showNavigationHint.value = false;
  if (!paginationReady.value) {
    scheduleMeasure();
    return;
  }

  const target = currentPage.value + direction;
  if (target < 1) {
    turnChapter(-1);
    return;
  }

  if (target > totalPages.value) {
    turnChapter(1);
    return;
  }

  goToPage(target);
};

const pointer = {
  id: null,
  x: 0,
  y: 0,
  startedAt: 0,
  active: false,
};

const resetPointer = () => {
  pointer.id = null;
  pointer.active = false;
};

const isInteractiveTarget = (event) => {
  const path = event.composedPath?.() || [event.target];
  return path.some(
    (node) =>
      node instanceof Element &&
      node.matches(
        "a, button, input, select, textarea, summary, [role='button'], [contenteditable='true'], [data-paragraph-id], [data-reader-interactive]",
      ),
  );
};

const topPullGesture = {
  id: null,
  x: 0,
  y: 0,
  active: false,
  triggered: false,
};

const resetTopPullGesture = () => {
  topPullGesture.id = null;
  topPullGesture.active = false;
  topPullGesture.triggered = false;
};

const getTrackedTouch = (touches) =>
  Array.from(touches || []).find(
    (touch) => touch.identifier === topPullGesture.id,
  );

const handleTopPullStart = (event) => {
  if (
    event.touches.length !== 1 ||
    showChapterLoadingOverlay.value ||
    props.controlsOpen ||
    isInteractiveTarget(event)
  ) {
    resetTopPullGesture();
    return;
  }

  const touch = event.touches[0];
  if (touch.clientY > NAVBAR_PULL_START_ZONE) {
    resetTopPullGesture();
    return;
  }

  topPullGesture.id = touch.identifier;
  topPullGesture.x = touch.clientX;
  topPullGesture.y = touch.clientY;
  topPullGesture.active = true;
  topPullGesture.triggered = false;
};

const handleTopPullMove = (event) => {
  if (!topPullGesture.active) return;

  const touch = getTrackedTouch(event.touches);
  if (!touch) {
    resetTopPullGesture();
    return;
  }

  const deltaX = touch.clientX - topPullGesture.x;
  const deltaY = touch.clientY - topPullGesture.y;
  const isDownwardPull =
    deltaY > 0 &&
    Math.abs(deltaY) >= Math.abs(deltaX) * NAVBAR_PULL_DIRECTION_RATIO;

  if (Math.abs(deltaX) > 16 && Math.abs(deltaX) > Math.abs(deltaY)) {
    resetTopPullGesture();
    return;
  }

  if (isDownwardPull && deltaY > 8 && event.cancelable) {
    event.preventDefault();
  }

  if (
    topPullGesture.triggered ||
    !isDownwardPull ||
    deltaY < NAVBAR_PULL_DISTANCE
  ) {
    return;
  }

  topPullGesture.triggered = true;
  dismissReaderHint();
  window.dispatchEvent(new Event(MOBILE_READER_NAVBAR_SHOW_EVENT));
};

const handleViewportClick = (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".footnote-ref a[href^='#fn']")) {
    event.preventDefault();
  }
};

const isNearCommentTrigger = (clientX, clientY) => {
  const article = getArticleElement();
  if (!article) return false;

  return Array.from(article.querySelectorAll(".comment-trigger")).some(
    (trigger) => {
      const rect = trigger.getBoundingClientRect();
      return (
        clientX >= rect.left - COMMENT_EXCLUSION_RADIUS &&
        clientX <= rect.right + COMMENT_EXCLUSION_RADIUS &&
        clientY >= rect.top - COMMENT_EXCLUSION_RADIUS &&
        clientY <= rect.bottom + COMMENT_EXCLUSION_RADIUS
      );
    },
  );
};

const isProtectedPointerEvent = (event) =>
  isInteractiveTarget(event) ||
  isNearCommentTrigger(event.clientX, event.clientY);

const handlePointerDown = (event) => {
  if (event.button !== 0) return;
  if (isProtectedPointerEvent(event)) return;

  pointer.id = event.pointerId;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.startedAt = performance.now();
  pointer.active = true;
  event.currentTarget.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event) => {
  if (!pointer.active || pointer.id !== event.pointerId) return;
  const deltaX = event.clientX - pointer.x;
  const deltaY = event.clientY - pointer.y;
  if (Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
    event.preventDefault();
  }
};

const handlePointerUp = (event) => {
  if (!pointer.active || pointer.id !== event.pointerId) return;

  const deltaX = event.clientX - pointer.x;
  const deltaY = event.clientY - pointer.y;
  const pressDuration = performance.now() - pointer.startedAt;
  const protectedInteraction = isProtectedPointerEvent(event);
  resetPointer();

  if (protectedInteraction) return;

  if (
    Math.abs(deltaX) >= SWIPE_DISTANCE &&
    Math.abs(deltaX) >= Math.abs(deltaY) * 1.2
  ) {
    turnPage(deltaX < 0 ? 1 : -1);
    return;
  }

  const isTap =
    pressDuration < 350 && Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12;
  const selection = window.getSelection?.();
  if (!isTap || (selection && !selection.isCollapsed)) return;

  const viewportRect = viewportRef.value?.getBoundingClientRect();
  if (!viewportRect?.width) return;

  const relativeX = (event.clientX - viewportRect.left) / viewportRect.width;
  if (relativeX <= TAP_EDGE_RATIO) {
    turnPage(-1);
  } else if (relativeX >= 1 - TAP_EDGE_RATIO) {
    turnPage(1);
  }
};

const handleKeydown = (event) => {
  if (isKeyboardInput(event.target) || showChapterLoadingOverlay.value) return;

  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    turnPage(1);
  } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    turnPage(-1);
  }
};

watch(
  () => [route.params.volumeSlug, route.params.chapterSlug],
  ([volumeSlug, chapterSlug], [previousVolumeSlug, previousChapterSlug]) => {
    const hadPreviousRoute = Boolean(previousVolumeSlug || previousChapterSlug);
    const routeChanged =
      volumeSlug !== previousVolumeSlug || chapterSlug !== previousChapterSlug;
    if (!hadPreviousRoute || !routeChanged) return;

    if (!chapterNavigationPending.value) {
      beginChapterNavigation(0);
    } else {
      chapterLoadingOverlayVisible.value = true;
    }
  },
  { flush: "sync" },
);

watch(
  () => props.chapter?.uuid,
  (chapterUuid, previousChapterUuid) => {
    if (
      chapterUuid &&
      previousChapterUuid &&
      chapterUuid !== previousChapterUuid
    ) {
      captureChapterSnapshot();
    }
  },
  { flush: "sync" },
);

watch(
  () => [props.chapter?.uuid, props.content, props.isLoading],
  ([chapterUuid], [previousChapterUuid]) => {
    if (chapterUuid !== previousChapterUuid) {
      window.clearTimeout(chapterNavigationTimer);
      setReaderControlsOpen(false);
      measuredChapterUuid.value = "";
      restoredChapterUuid.value = "";
      footnotesByPage.value = {};
      footnoteReservesByPage.value = {};
      measuringFootnotes.value = [];
      hasMeasured.value = false;
      emptyPageRecoveryPasses = 0;
    }
    scheduleFreshMeasure();
  },
  { deep: true, flush: "post" },
);

watch(
  () => [
    props.styleConfigs.fontStyle,
    props.styleConfigs.fontSize,
    props.styleConfigs.fontGap,
    props.styleConfigs.lineHeight,
    props.styleConfigs.paraHeight,
  ],
  () => {
    // 排版控件连续变化时保留最后一个完整页面，直到新布局通过首页与当前页校验。
    if (hasMeasured.value && !props.isLoading) captureChapterSnapshot();
    scheduleFreshMeasure();
  },
  { flush: "sync" },
);

watch(hasMeasured, (ready) => {
  if (!ready || getState("MOBILE_PAGE_HINT_SEEN", false)) return;
  triggerReaderHint();
});

watch(
  [
    currentPage,
    totalPages,
    paginationReady,
    totalReadingProgress,
    pageProgress,
  ],
  ([page, pages, ready, readingProgress, chapterProgress]) => {
    emit("controller-state", {
      currentPage: page,
      totalPages: pages,
      paginationReady: ready,
      readingProgress,
      pageProgress: chapterProgress,
    });
  },
  { immediate: true },
);

defineExpose({ triggerReaderHint, goToPage, turnChapter });

onMounted(() => {
  const viewport = viewportRef.value;
  if (!viewport) return;

  keyboardBaselineHeight = getVisualViewportHeight();

  resizeObserver = new ResizeObserver(scheduleViewportMeasure);
  resizeObserver.observe(viewport);
  if (sectionRef.value) resizeObserver.observe(sectionRef.value);
  const dock = document.querySelector("[data-mobile-reader-dock]");
  if (dock) resizeObserver.observe(dock);

  mutationObserver = new MutationObserver((records) => {
    if (footnotePaginationDepth > 0) return;

    const article = getArticleElement();
    if (
      article &&
      records.some(
        (record) =>
          record.target === article || article.contains(record.target),
      )
    ) {
      scheduleMeasure();
    }
  });
  mutationObserver.observe(viewport, { childList: true, subtree: true });

  viewport.addEventListener("load", scheduleMeasure, true);
  window.addEventListener("keydown", handleKeydown);
  document.addEventListener("focusin", handleKeyboardFocusIn, true);
  document.addEventListener("focusout", handleKeyboardFocusOut, true);
  window.visualViewport?.addEventListener("resize", handleVisualViewportChange);
  window.visualViewport?.addEventListener("scroll", handleVisualViewportChange);
  document.fonts?.ready.then(scheduleMeasure);
  scheduleMeasure();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  viewportRef.value?.removeEventListener("load", scheduleMeasure, true);
  window.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("focusin", handleKeyboardFocusIn, true);
  document.removeEventListener("focusout", handleKeyboardFocusOut, true);
  window.visualViewport?.removeEventListener(
    "resize",
    handleVisualViewportChange,
  );
  window.visualViewport?.removeEventListener(
    "scroll",
    handleVisualViewportChange,
  );
  window.clearTimeout(persistTimer);
  window.clearTimeout(hintTimer);
  window.clearTimeout(viewportResizeTimer);
  window.clearTimeout(keyboardReleaseTimer);
  window.clearTimeout(chapterRevealTimer);
  window.clearTimeout(chapterNavigationTimer);
  persistCurrentPosition();
  measureToken += 1;
  if (measureFrame) window.cancelAnimationFrame(measureFrame);
});
</script>

<style scoped>
.mobile-page-viewport {
  touch-action: pan-y;
  transition: opacity 180ms ease;
}

.mobile-page-viewport :deep(.mobile-page-article) {
  box-sizing: border-box;
  height: var(--reader-page-height);
  min-height: var(--reader-page-height);
  max-height: var(--reader-page-height);
  width: var(--reader-page-width);
  max-width: none;
  column-width: var(--reader-page-width);
  column-gap: var(--reader-page-gap);
  column-fill: auto;
  padding-block-start: var(--reader-page-padding-block);
  padding-block-end: var(--reader-page-padding-block);
  overflow: visible;
  transform: translate3d(
    calc(var(--reader-chapter-offset, 0px) - var(--reader-page-offset)),
    0,
    0
  );
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.mobile-page-viewport.chapter-transition-preparing :deep(.mobile-page-article) {
  transition: none;
}

.mobile-page-viewport :deep(.mobile-page-article p) {
  line-height: var(--reader-page-line-height);
  orphans: 1;
  widows: 1;
}

/* 移动端把段间距量化成半行，兼顾段落节奏与分页基线。 */
.mobile-page-viewport :deep(.mobile-page-article > div > p) {
  margin-block: 0;
}

.mobile-page-viewport :deep(.mobile-page-article > div > p ~ p) {
  margin-block-start: var(--reader-paragraph-gap);
}

.mobile-page-viewport
  :deep(.mobile-page-article > div > .mobile-page-baseline-adjusted) {
  margin-block-start: calc(
    var(--reader-page-baseline-base-margin, 0px) +
      var(--reader-page-baseline-adjust, 0px)
  ) !important;
}

/* 脚注避让从溢出行处分出续段，保留本页已经容纳的正文行。 */
.mobile-page-viewport
  :deep(
    .mobile-page-article
      > div
      > p.mobile-footnote-split-source:not(.mobile-footnote-split-empty)
  ) {
  /* DOM 拆段会让浏览器误把分页处视为段尾；实际仍有续文，末行应保持两端对齐。 */
  text-align-last: justify;
}

.mobile-page-viewport
  :deep(.mobile-page-article > div > p.mobile-footnote-continuation) {
  margin-block-start: 0;
  break-before: column;
  -webkit-column-break-before: always;
}

.mobile-page-viewport
  :deep(
    .mobile-page-article
      > div
      > p.mobile-footnote-continuation:not(.mobile-footnote-paragraph-start)
  ) {
  text-indent: 0 !important;
}

.mobile-page-viewport
  :deep(
    .mobile-page-article
      > div
      > p.mobile-footnote-continuation.mobile-footnote-paragraph-start
  ) {
  text-indent: var(
    --reader-footnote-continuation-indent,
    var(--para-text-indent)
  ) !important;
}

.mobile-page-viewport
  :deep(.mobile-page-article > div > p.mobile-footnote-split-empty) {
  display: none;
}

.mobile-page-viewport :deep(.mobile-page-article .footnotes-sep),
.mobile-page-viewport :deep(.mobile-page-article .footnotes) {
  display: none;
}

.mobile-page-viewport :deep(.mobile-footnote-page-break) {
  display: block;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  break-before: column;
  -webkit-column-break-before: always;
}

.mobile-page-viewport :deep(.mobile-page-article li),
.mobile-page-viewport :deep(.mobile-page-article blockquote) {
  line-height: var(--reader-page-line-height);
}

.mobile-page-viewport :deep(.mobile-page-article > *) {
  max-width: 100%;
}

.mobile-page-viewport :deep(.mobile-pagination-end) {
  display: block;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  line-height: 0;
}

.mobile-page-viewport :deep(.mobile-page-article h1),
.mobile-page-viewport :deep(.mobile-page-article h2),
.mobile-page-viewport :deep(.mobile-page-article h3),
.mobile-page-viewport :deep(.mobile-page-article h4),
.mobile-page-viewport :deep(.mobile-page-article h5),
.mobile-page-viewport :deep(.mobile-page-article h6),
.mobile-page-viewport :deep(.mobile-page-article figure),
.mobile-page-viewport :deep(.mobile-page-article pre),
.mobile-page-viewport :deep(.mobile-page-article table),
.mobile-page-viewport :deep(.mobile-page-article details) {
  break-inside: avoid-column;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-page-viewport,
  .mobile-page-viewport :deep(.mobile-page-article) {
    transition: none;
  }
}
</style>
