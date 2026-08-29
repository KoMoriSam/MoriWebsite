<template>
  <section
    ref="sectionRef"
    class="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    aria-label="分页阅读器"
    :aria-busy="showChapterLoadingOverlay"
    :style="readerTypographyStyle"
  >
    <div
      ref="viewportRef"
      class="mobile-page-viewport relative min-h-0 shrink-0 overflow-hidden overscroll-none"
      :class="{
        'opacity-60': isMeasuring && !hasMeasured && !chapterSnapshotVisible,
        'pagination-measuring': isMeasuring,
        'pagination-layout-resetting': paginationLayoutResetting,
        'chapter-transition-preparing':
          chapterSnapshotVisible && !chapterSnapshotLeaving,
      }"
      :style="{
        '--reader-page-gap': `${PAGE_GAP}px`,
        '--reader-page-width': `${pageWidth}px`,
        '--reader-page-height': `${pageHeight}px`,
        '--reader-page-line-height': `${pageLineHeight}px`,
        '--reader-page-baseline-offset': `${pageBaselineOffset}px`,
        '--reader-paragraph-gap': `${paragraphGap}px`,
        '--reader-footnote-reserve': `${footnoteReserve}px`,
        '--reader-page-font-size': `${styleConfigs.fontSize}px`,
        '--reader-page-padding-block':
          'var(--mobile-reader-content-padding-block)',
        '--reader-page-offset': `${renderedPageOffset}px`,
        '--reader-chapter-offset': `${chapterEnterOffset}px`,
        height: `${pageHeight}px`,
        backgroundColor: readerBackgroundColor || undefined,
      }"
      @pointerdown.capture="handlePointerDown"
      @pointermove.capture="handlePointerMove"
      @pointerup.capture="handlePointerUp"
      @pointercancel.capture="resetPointer"
      @click="handleViewportClick"
      @contextmenu.capture.prevent="handleTextContextMenu"
    >
      <Markdown
        :content="content"
        :is-loading="isLoading"
        :show-loading="false"
        :header-data="headerData"
        :style-configs="styleConfigs"
        use-reader-colors
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
            @open-comments="emit('open-comments', $event)"
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
        v-if="isDevelopment"
        class="mobile-page-baseline-grid pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      ></div>

      <div
        v-show="chapterSnapshotVisible"
        ref="chapterSnapshotRef"
        class="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-base-100 transition-[transform,opacity] duration-[220ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        :class="{
          'opacity-0':
            chapterSnapshotLeaving && chapterTransitionDirection === 0,
        }"
        :style="{
          transform: chapterSnapshotTransform,
          backgroundColor: readerBackgroundColor || undefined,
        }"
        aria-hidden="true"
      ></div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="showNavigationHint"
          class="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <button
            type="button"
            data-reader-interactive
            aria-label="阅读操作提示：轻触九宫格区域执行对应操作，左右滑动翻页，点击提示关闭"
            class="alert alert-soft pointer-events-auto block w-[calc(100%_-_1.5rem)] max-w-sm cursor-pointer border border-base-300 bg-base-100/95 p-3 text-left text-sm shadow-lg backdrop-blur-md"
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

              <span class="mt-2.5 grid grid-cols-2 gap-2">
                <span
                  class="rounded-box bg-base-200/75 px-2.5 py-2 text-center"
                >
                  <i
                    class="ri-grid-line block text-xl leading-none text-base-content/75"
                    aria-hidden="true"
                  ></i>
                  <span class="mt-1.5 block text-xs font-semibold">
                    轻触操作（可自定义）
                  </span>
                  <span
                    class="mt-0.5 block text-[0.6875rem] text-base-content/55"
                  >
                    中央展开菜单<br />
                    四周翻页
                  </span>
                </span>

                <span
                  class="rounded-box bg-base-200/75 px-2.5 py-2 text-center"
                >
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
                    正文区域<br />可左右滑动
                  </span>
                </span>
              </span>

              <span
                class="mt-2.5 flex items-baseline gap-2 border-t border-base-300 pt-2 text-xs"
              >
                <span class="shrink-0 font-semibold">更多控制</span>
                <span class="text-base-content/60">
                  九宫格区域可设为菜单、上一章、下一章、目录、搜索、帮助等操作
                </span>
              </span>
            </span>
          </button>
        </div>
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
import { computed, nextTick, ref, toRef, watch } from "vue";
import { useRoute } from "vue-router";

import ChapterHeader from "@/components/novel/ChapterHeader.vue";
import PageFootnotes from "./PageFootnotes.vue";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import Markdown from "@/components/reader/Markdown.vue";
import { useChapters } from "@/composables/useChapters";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import { alignMobileChapterHeaderBlock } from "@/utils/reader/align-header.js";
import {
  calculateRawColumnPage,
  calculateReaderFlowBaseline,
  calculateTextRectBaseline,
  collectMarkdownBodyChildren,
  collectReaderBodyTextRects,
  collectReaderMediaElements,
  collectReaderPageFlowRects,
  createFootnoteLayoutSignature,
  findLastTextRect,
  resetTextBaselineMetrics,
  roundLayoutPixel,
  waitForReaderLayout,
} from "@/utils/reader/measure-mobile-pages";
import { useReaderHint } from "@/composables/novel/useReaderHint";
import { useReaderTextContext } from "@/composables/novel/useReaderTextContext";
import { usePagedReaderInput } from "@/composables/novel/usePagedReaderInput";
import { usePaginationKeyboardFreeze } from "@/composables/novel/usePaginationKeyboardFreeze";
import { usePagedChapterTransition } from "@/composables/novel/usePagedChapterTransition";
import { usePagedReadingPosition } from "@/composables/novel/usePagedReadingPosition";
import { usePaginationScheduler } from "@/composables/novel/usePaginationScheduler";
import { usePaginationObservers } from "@/composables/novel/usePaginationObservers";
import { usePagedFootnoteLayout } from "@/composables/novel/usePagedFootnoteLayout";
import {
  prepareMobileTables,
  restoreMobileTables,
  splitMobileTables,
} from "@/utils/reader/split-mobile-tables";

const PAGE_GAP = 32;
const PAGE_VERTICAL_PADDING = 8;
const isDevelopment = import.meta.env.DEV;
const MIN_BODY_LINES_WITH_FOOTNOTES = 3;
const MAX_FOOTNOTE_LAYOUT_PASSES = 64;
const MAX_EMPTY_PAGE_RECOVERY_PASSES = 3;
const MIN_PAGE_HEIGHT = 160;
const SWIPE_DISTANCE = 26;
const VIEWPORT_SETTLE_DELAY = 120;
const TYPOGRAPHY_SETTLE_DELAY = 90;
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
  tapZones: { type: Array, default: () => [] },
  wheelPagination: { type: Boolean, default: false },
});

const emit = defineEmits([
  "progress",
  "controls-open-change",
  "controller-state",
  "reader-action",
  "text-context",
  "open-comments",
]);
const route = useRoute();
const { getState, setState } = useReadingStateStorage();
const { hasPrevious, hasNext, handlePrev, handleNext } = useChapters();

const sectionRef = ref(null);
const viewportRef = ref(null);
const endMarkerRef = ref(null);
const chapterSnapshotRef = ref(null);
const footnoteMeasureRef = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const pageWidth = ref(1);
const pageHeight = ref(MIN_PAGE_HEIGHT);
const pageLineHeight = ref(35.2);
const pageBaselineOffset = ref(0);
const leadingEmptyPages = ref(0);
const paginationLayoutResetting = ref(false);
const isMeasuring = ref(true);
const hasMeasured = ref(false);
const measuredChapterUuid = ref("");
const {
  visible: showNavigationHint,
  show: showReaderHint,
  dismiss: hideReaderHint,
} = useReaderHint();
const footnotesByPage = ref({});
const footnoteReservesByPage = ref({});
const measuringFootnotes = ref([]);

let measureToken = 0;
let emptyPageRecoveryPasses = 0;
let forcePaginationResetPending = true;
let takeMutationRecords = () => {};

const pageStride = computed(() => pageWidth.value + PAGE_GAP);
const readerBackgroundColor = computed(() =>
  ["lemonade", "forest", "corporate", "dim"].includes(
    props.styleConfigs.colorTheme,
  )
    ? ""
    : props.styleConfigs.backgroundColor || "",
);
const pageOffset = computed(() => (currentPage.value - 1) * pageStride.value);
// 移动端浏览器偶尔会在多栏布局稳定前保留一个没有内容的首栏。
// 该偏移只折叠浏览器生成的空栏，不改变对外暴露的章节页码。
const renderedPageOffset = computed(
  () => pageOffset.value + leadingEmptyPages.value * pageStride.value,
);
const paragraphGap = computed(
  () =>
    Math.max(0, Number(props.styleConfigs.paraHeight) || 0) *
    pageLineHeight.value,
);
const readerTypographyStyle = computed(() => ({
  "--para-font-size": `${props.styleConfigs.fontSize}px`,
  "--para-letter-spacing": `${props.styleConfigs.fontGap * 0.25}rem`,
  "--para-line-height": props.styleConfigs.lineHeight,
  "--para-margin-inline": `${
    Math.max(0, Number(props.styleConfigs.paraHeight) || 0) *
    Math.max(1, Number(props.styleConfigs.fontSize) || 20) *
    Math.max(1, Number(props.styleConfigs.lineHeight) || 1.6)
  }px`,
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
const paginationReady = computed(
  () =>
    hasMeasured.value &&
    !isMeasuring.value &&
    measuredChapterUuid.value === String(props.chapter?.uuid || ""),
);
const getArticleElement = () =>
  viewportRef.value?.querySelector(":scope > .markdown-content");
const {
  beginChapterNavigation,
  cancelChapterNavigation,
  captureChapterSnapshot,
  chapterEnterOffset,
  chapterLoadingOverlayVisible,
  chapterNavigationPending,
  chapterSnapshotLeaving,
  chapterSnapshotTransform,
  chapterSnapshotVisible,
  chapterTransitionDirection,
  handleReadingProgressChange,
  revealMeasuredChapter,
  totalReadingProgress,
} = usePagedChapterTransition({
  chapterSnapshotRef,
  getArticleElement,
  pageGap: PAGE_GAP,
  pageVerticalPadding: PAGE_VERTICAL_PADDING,
  pageWidth,
  pageHeight,
  pageLineHeight,
  paragraphGap,
  footnoteReserve,
  renderedPageOffset,
  pageStride,
  fontSize: () => props.styleConfigs.fontSize,
  paginationReady,
  canCapture: hasMeasured,
  revealDuration: CHAPTER_REVEAL_DURATION,
  slideDuration: CHAPTER_SLIDE_DURATION,
});
const showChapterLoadingOverlay = computed(
  () =>
    props.isLoading ||
    chapterLoadingOverlayVisible.value ||
    !hasMeasured.value ||
    measuredChapterUuid.value !== String(props.chapter?.uuid || ""),
);
const pageProgress = computed(() =>
  totalPages.value <= 1
    ? 100
    : ((currentPage.value - 1) / (totalPages.value - 1)) * 100,
);

const waitForLayout = waitForReaderLayout;

const normalizePage = (page) =>
  Math.min(totalPages.value, Math.max(1, Math.trunc(Number(page) || 1)));

const getPageLayout = (viewport) => {
  const viewportRect = viewport.getBoundingClientRect();
  const sectionRect = sectionRef.value?.getBoundingClientRect();
  const viewportTop = viewportRect.top;
  const visualViewport = window.visualViewport;
  const visualBottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : window.innerHeight;
  const readerBottom = sectionRect?.bottom ?? visualBottom;
  const availableHeight = Math.max(
    MIN_PAGE_HEIGHT,
    Math.floor(Math.min(readerBottom, visualBottom) - viewportTop),
  );
  const fontSize = Math.max(1, Number(props.styleConfigs.fontSize) || 22);
  const lineHeight = Math.max(
    1,
    roundLayoutPixel(fontSize * (Number(props.styleConfigs.lineHeight) || 1.6)),
  );

  return {
    height: availableHeight,
    // 保持整章行高恒定；不足一行的余量自然留在页面底部。
    lineHeight,
  };
};

const getMeasuredPageCount = (article, viewport) => {
  const stride = pageStride.value;
  if (!stride) return 1;

  const lastTextRect = findLastTextRect(article);
  const markerRect = endMarkerRef.value?.getBoundingClientRect();
  const lastTextPage = lastTextRect
    ? Math.max(
        1,
        getRawRectPage(lastTextRect, viewport) - leadingEmptyPages.value,
      )
    : 1;
  const markerPage = markerRect
    ? Math.max(
        1,
        getRawRectPage(markerRect, viewport) - leadingEmptyPages.value,
      )
    : 1;

  // scrollWidth 在部分移动浏览器的多栏布局中只会返回第一栏宽度；最后一个
  // 正文字符和末尾定位点能直接指出内容最终落在哪一栏。
  const scrollWidthPages = Math.max(
    1,
    Math.ceil((article.scrollWidth + PAGE_GAP - 1) / stride) -
      leadingEmptyPages.value,
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

  return normalizePage(
    getRawRectPage(rect, viewport) - leadingEmptyPages.value,
  );
};

const {
  persistCurrentPosition,
  persistPosition,
  resetRestoredChapter,
  restorePage,
  restoredChapterUuid,
} = usePagedReadingPosition({
  route,
  chapter: toRef(props, "chapter"),
  currentPage,
  totalPages,
  viewportRef,
  getArticleElement,
  getElementPage,
  getState,
  setState,
  legacyParagraphIdPattern: LEGACY_PARAGRAPH_ID_PATTERN,
});

const clearPageBaselineAdjustments = (article) => {
  article
    .querySelectorAll(
      ".mobile-page-baseline-adjusted, .mobile-page-edge-adjusted",
    )
    .forEach((element) => {
      element.style.removeProperty("--reader-page-baseline-adjust");
      element.style.removeProperty("--reader-page-baseline-base-margin");
      element.style.removeProperty("--reader-page-edge-margin");
      element.classList.remove("mobile-page-baseline-adjusted");
      element.classList.remove("mobile-page-edge-adjusted");
    });
};

const clearPageFlowGridAdjustments = (article) => {
  article
    .querySelectorAll(".mobile-page-flow-grid-adjusted")
    .forEach((element) => {
      element.style.removeProperty("--reader-flow-grid-base-padding");
      element.style.removeProperty("--reader-flow-grid-adjust");
      element.classList.remove("mobile-page-flow-grid-adjusted");
    });
};

const alignPageFlowBlocksToGrid = async (article, token) => {
  clearPageFlowGridAdjustments(article);
  await nextTick();
  await waitForLayout();
  if (token !== measureToken) return false;

  const viewport = viewportRef.value;
  const lineHeight = pageLineHeight.value;
  if (!viewport || lineHeight <= 0) return true;

  resetTextBaselineMetrics();
  const bodyRects = getBodyTextRects(article);
  const regularParagraph = article.querySelector(":scope > p");
  const referenceRect =
    bodyRects.find(
      (rect) => rect.textElement?.closest("p") === regularParagraph,
    ) || bodyRects[0];
  const baselineOffset = referenceRect
    ? calculateTextRectBaseline(referenceRect) - referenceRect.top
    : 0;
  const gridOrigin =
    viewport.getBoundingClientRect().top +
    PAGE_VERTICAL_PADDING +
    baselineOffset;

  // 正文直接挂在 article 下（渲染层不再包裹 div）。直接遍历 article 的
  // 子元素，排除章节头与末尾定位点这些非正文成员。
  const flowBlocks = collectMarkdownBodyChildren(article).flatMap((element) => {
    if (element.classList.contains("moments-card")) return [];
    if (!element.matches("[data-markdown-chat]")) return [element];
    return Array.from(
      element.querySelectorAll(":scope > :is(.chat-bar, .chat-info, .chat)"),
    );
  });

  // 本轮统一读取所有块的几何信息。后面的容量判断只查缓存，避免每处理一个
  // 聊天气泡都重新测量其余气泡，长聊天记录也保持线性布局读取次数。
  const flowMeasurements = flowBlocks.map((element) => ({
    element,
    style: window.getComputedStyle(element),
    rects: Array.from(element.getClientRects()).filter(
      (rect) => rect.width > 0 && rect.height > 0,
    ),
  }));
  const followingPageExtents = new Array(flowMeasurements.length);
  const lowestFollowingByPage = new Map();
  const lowestFollowingChatByPage = new Map();

  for (let index = flowMeasurements.length - 1; index >= 0; index -= 1) {
    const measurement = flowMeasurements[index];
    const currentPage = measurement.rects[0]
      ? getRectPage(measurement.rects[0], viewport)
      : 0;
    followingPageExtents[index] = {
      lastFollowingEntry: lowestFollowingByPage.get(currentPage) || null,
      lastFollowingChatEntry:
        lowestFollowingChatByPage.get(currentPage) || null,
    };

    const isChatBlock = measurement.element.matches(
      ".chat-bar, .chat-info, .chat",
    );
    measurement.rects.forEach((rect) => {
      const page = getRectPage(rect, viewport);
      const entry = { element: measurement.element, rect };
      const lowestEntry = lowestFollowingByPage.get(page);
      if (!lowestEntry || rect.bottom > lowestEntry.rect.bottom) {
        lowestFollowingByPage.set(page, entry);
      }
      const lowestChatEntry = lowestFollowingChatByPage.get(page);
      if (
        isChatBlock &&
        (!lowestChatEntry || rect.bottom > lowestChatEntry.rect.bottom)
      ) {
        lowestFollowingChatByPage.set(page, entry);
      }
    });
  }

  const adjustments = [];
  const plannedPageShift = new Map();
  const viewportBottom =
    viewport.getBoundingClientRect().top +
    pageHeight.value -
    PAGE_VERTICAL_PADDING;
  for (const [elementIndex, measurement] of flowMeasurements.entries()) {
    const { element, rects, style } = measurement;
    if (
      element.matches(
        "p, blockquote, .markdown-table-wrapper, .footnotes, .footnotes-sep, .mobile-footnote-continuation, .mobile-footnote-split-empty, [aria-hidden='true']",
      )
    ) {
      continue;
    }

    // 聊天气泡同样必须只有一个外框 rect；若单条消息高于整页而被浏览器
    // 强制拆开，就不能把多个 fragment 的高度相加后补到其中一栏。
    if (
      rects.length !== 1 ||
      rects.length === 0 ||
      style.display === "none" ||
      style.position === "absolute" ||
      style.position === "fixed"
    ) {
      continue;
    }

    const blockHeight = rects[0].height;
    const marginStart = Number.parseFloat(style.marginBlockStart) || 0;
    const marginEnd = Number.parseFloat(style.marginBlockEnd) || 0;
    const blockAdvance = blockHeight + marginStart + marginEnd;
    const remainder = ((blockAdvance % lineHeight) + lineHeight) % lineHeight;
    let adjustment = remainder < 0.5 ? 0 : lineHeight - remainder;

    // 正文标题使用大字号衬线字体，其文字基线偏移与普通正文不同。只将
    // h1/h2 的外框高度补成整行仍可能让标题后的正文落在半格位置，因此
    // 直接检查它之后第一条正文基线的相位，和引用块一样按实际流位移补齐。
    if (element.matches("h1, h2, h3, h4, h5, h6") && referenceRect) {
      const followingRect = bodyRects.find(
        (rect) =>
          rect.textElement &&
          !element.contains(rect.textElement) &&
          Boolean(
            element.compareDocumentPosition(rect.textElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      );
      if (followingRect) {
        const baseline = calculateTextRectBaseline(followingRect);
        const phase =
          (((baseline - gridOrigin) % lineHeight) + lineHeight) % lineHeight;
        adjustment =
          phase < 0.5 || lineHeight - phase < 0.5 ? 0 : lineHeight - phase;
      }
    }

    if (adjustment < 0.5 || adjustment > lineHeight - 0.5) continue;

    const isChatBlock = element.matches(".chat-bar, .chat-info, .chat");
    const elementPage = getRectPage(rects[0], viewport);
    const currentPageShift = plannedPageShift.get(elementPage) || 0;
    const { lastFollowingEntry, lastFollowingChatEntry } =
      followingPageExtents[elementIndex];
    const exceedsPage = (rect) =>
      rect &&
      rect.bottom + currentPageShift + adjustment > viewportBottom + 0.5;
    const movesCurrentBlock = exceedsPage(rects[0]);
    const movesFollowingChatBlock = exceedsPage(lastFollowingChatEntry?.rect);
    const changesNaturalPageBreak = exceedsPage(lastFollowingEntry?.rect);

    if (
      movesFollowingChatBlock ||
      (isChatBlock && (movesCurrentBlock || changesNaturalPageBreak))
    ) {
      // 外框补齐不能改变自然分页归属。若不足一行的 padding 会把当前气泡
      // 或本页后续内容挤到下一页，本页不补；前置特殊块也不能挤走后续 chat。
      continue;
    }

    const basePadding = Number.parseFloat(style.paddingBlockEnd) || 0;
    adjustments.push({ element, basePadding, adjustment });
    plannedPageShift.set(elementPage, currentPageShift + adjustment);
  }

  adjustments.forEach(({ element, basePadding, adjustment }) => {
    element.classList.add("mobile-page-flow-grid-adjusted");
    element.style.setProperty(
      "--reader-flow-grid-base-padding",
      `${basePadding}px`,
    );
    element.style.setProperty("--reader-flow-grid-adjust", `${adjustment}px`);
  });
  if (adjustments.length) {
    await nextTick();
    await waitForLayout();
  }

  return token === measureToken;
};

const alignChapterHeaderBlock = async (article, token) => {
  return alignMobileChapterHeaderBlock({
    article,
    lineHeight: pageLineHeight.value,
    waitForLayout,
    isCurrent: () => token === measureToken,
  });
};

const getBodyTextRects = collectReaderBodyTextRects;

const getPageBodyTextRects = (article, viewport, page) =>
  getBodyTextRects(article)
    .filter((rect) => getRectPage(rect, viewport) === page)
    .sort((left, right) => left.top - right.top || left.left - right.left);

const getRawRectPage = (rect, viewport = viewportRef.value) => {
  // CSS 多栏会把整数列宽折算成带小数的布局像素。例如声明 343px 时，
  // 后续栏的实际起点可能比理论 stride 小约 0.01px；直接 floor 会把整栏
  // 误判为前一页，继而令脚注归属和页内基线校正全部错页。
  return calculateRawColumnPage({
    rect,
    viewport,
    renderedOffset: renderedPageOffset.value,
    chapterOffset: chapterEnterOffset.value,
    stride: pageStride.value,
  });
};

const getFirstContentRawPage = (article, viewport) => {
  const contentRects = [
    ...getBodyTextRects(article),
    ...Array.from(
      article
        .querySelector(":scope > .mobile-chapter-header")
        ?.getClientRects() || [],
    ),
    ...collectReaderMediaElements(article).flatMap((element) =>
      Array.from(element.getClientRects()),
    ),
  ].filter((rect) => rect.width > 0 && rect.height > 0);

  if (!contentRects.length) return 1;
  return Math.min(
    ...contentRects.map((rect) => getRawRectPage(rect, viewport)),
  );
};

const normalizeLeadingEmptyPages = async (article, viewport, token) => {
  const nextLeadingEmptyPages = Math.max(
    0,
    getFirstContentRawPage(article, viewport) - 1,
  );
  if (nextLeadingEmptyPages === leadingEmptyPages.value) return true;

  leadingEmptyPages.value = nextLeadingEmptyPages;
  await nextTick();
  await waitForLayout();
  return token === measureToken;
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

  return collectReaderMediaElements(article).some((element) =>
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
  const flowBlocks = [
    ...collectMarkdownBodyChildren(article).flatMap((element) =>
      element.matches("[data-markdown-chat]")
        ? Array.from(
            element.querySelectorAll(
              ":scope > :is(.chat-bar, .chat-info, .chat)",
            ),
          )
        : [element],
    ),
    ...Array.from(
      article.querySelectorAll(
        "blockquote > p, blockquote > ul, blockquote > ol",
      ),
    ),
  ];

  return [...new Set(flowBlocks)].filter((element) => {
    const isFirstChatBlock =
      element.matches(".chat-bar, .chat-info, .chat") &&
      !element.previousElementSibling &&
      element.parentElement?.matches("[data-markdown-chat]");
    if (
      (!element.previousElementSibling &&
        !(isFirstChatBlock && element.parentElement.previousElementSibling)) ||
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
      computedStyle.position === "fixed" ||
      element.getClientRects()[0]?.height <= 0
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

const getPageStartGapElement = (article, firstRect, viewport, page) => {
  let element = firstRect.textElement;
  while (element && element !== article) {
    const parent = element.parentElement;
    const isTopLevelGap =
      parent === article &&
      element.previousElementSibling &&
      !element.matches(
        ".footnotes, .footnotes-sep, .mobile-footnote-continuation, .mobile-footnote-split-empty, [aria-hidden='true']",
      );
    const isNestedGap =
      parent?.matches("blockquote, li") &&
      element.matches("p, ul, ol, blockquote") &&
      element.previousElementSibling;
    const firstElementRect = element.getClientRects()[0];

    if (
      (isTopLevelGap || isNestedGap) &&
      firstElementRect &&
      getRectPage(firstElementRect, viewport) === page
    ) {
      return element;
    }
    element = parent;
  }
  return null;
};

const getFeasibleGridAdjustment = (
  baseline,
  targetBaseline,
  lineHeight,
  currentGap,
  {
    minBaseline = Number.NEGATIVE_INFINITY,
    maxBaseline = Number.POSITIVE_INFINITY,
  } = {},
) => {
  const rawAdjustment = targetBaseline - baseline;
  const approximateGridStep = Math.round(-rawAdjustment / lineHeight);
  const candidates = [];

  for (
    let step = approximateGridStep - 2;
    step <= approximateGridStep + 2;
    step += 1
  ) {
    const adjustment = rawAdjustment + step * lineHeight;
    const adjustedBaseline = baseline + adjustment;
    if (
      currentGap + adjustment >= -0.5 &&
      adjustedBaseline >= minBaseline &&
      adjustedBaseline <= maxBaseline
    ) {
      candidates.push(adjustment);
    }
  }

  return candidates.sort((left, right) => Math.abs(left) - Math.abs(right))[0];
};

// A paragraph that starts exactly at a column boundary may retain its
// fractional block-start margin. Correct that page-start phase first; the
// later end-of-page pass can then distribute only the remaining bottom error.
const alignPageStartBaselines = async (article, viewport, token) => {
  const lineHeight = pageLineHeight.value;
  const bodyRects = getBodyTextRects(article);
  const regularParagraph = article.querySelector(":scope > p");
  const referenceRect =
    bodyRects.find(
      (rect) => rect.textElement?.closest("p") === regularParagraph,
    ) || bodyRects[0];
  if (!referenceRect || lineHeight <= 0) return true;

  const viewportTop = viewport.getBoundingClientRect().top;
  const baselineOffset =
    calculateTextRectBaseline(referenceRect) - referenceRect.top;
  const targetBaseline = viewportTop + PAGE_VERTICAL_PADDING + baselineOffset;
  pageBaselineOffset.value = baselineOffset;

  for (let pass = 0; pass < 3; pass += 1) {
    const adjustments = [];
    const pageCount = getMeasuredPageCount(article, viewport);
    const pageRects = getBodyTextRects(article).reduce((grouped, rect) => {
      const page = getRectPage(rect, viewport);
      (grouped[page] ||= []).push(rect);
      return grouped;
    }, {});

    for (let page = 1; page <= pageCount; page += 1) {
      if (token !== measureToken) return false;
      const firstRect = pageRects[page]?.sort(
        (left, right) => left.top - right.top || left.left - right.left,
      )[0];
      if (!firstRect) continue;

      const gapElement = getPageStartGapElement(
        article,
        firstRect,
        viewport,
        page,
      );
      if (!gapElement) continue;

      const currentGap =
        Number.parseFloat(
          window.getComputedStyle(gapElement).marginBlockStart,
        ) || 0;
      const firstFlowElement = firstRect.textElement?.closest(
        "h1, h2, h3, h4, h5, h6",
      );
      const alignsSpecialBlockTop = firstFlowElement?.parentElement === article;
      const measuredBaseline = alignsSpecialBlockTop
        ? firstFlowElement.getClientRects()[0]?.top
        : calculateTextRectBaseline(firstRect);
      const expectedBaseline = alignsSpecialBlockTop
        ? viewportTop + PAGE_VERTICAL_PADDING
        : targetBaseline;
      const adjustment = getFeasibleGridAdjustment(
        measuredBaseline,
        expectedBaseline,
        lineHeight,
        currentGap,
        {
          minBaseline: expectedBaseline - 0.5,
          maxBaseline: expectedBaseline + 0.5,
        },
      );
      if (!Number.isFinite(adjustment) || Math.abs(adjustment) < 0.25) {
        continue;
      }

      adjustments.push({ gapElement, currentGap, adjustment });
    }

    if (!adjustments.length) break;
    adjustments.forEach(({ gapElement, currentGap, adjustment }) => {
      gapElement.classList.add("mobile-page-baseline-adjusted");
      gapElement.style.setProperty(
        "--reader-page-baseline-base-margin",
        `${currentGap}px`,
      );
      gapElement.style.setProperty(
        "--reader-page-baseline-adjust",
        `${adjustment}px`,
      );
    });
    await nextTick();
    await waitForLayout();
  }

  return token === measureToken;
};

const distributePageGapAdjustment = (candidates, adjustment) => {
  const records = candidates.map((element) => ({
    element,
    baseMargin:
      Number.parseFloat(window.getComputedStyle(element).marginBlockStart) || 0,
  }));
  if (!records.length) return [];

  const totalCurrentGap = records.reduce(
    (total, record) => total + record.baseMargin,
    0,
  );
  const targetMargin =
    (totalCurrentGap + adjustment) / Math.max(1, records.length);
  if (targetMargin < -0.5) return [];

  // 不论本轮是扩张还是压缩，都让本页所有实际块间距落到同一个值。
  // 这样被压进页尾的新段落不会保留原始段距，形成末尾忽松忽紧。
  return records.map((record) => ({
    ...record,
    targetMargin: Math.max(0, targetMargin),
  }));
};

const applyPageGapRecords = (records) => {
  records.forEach(({ element, targetMargin }) => {
    element.classList.add("mobile-page-edge-adjusted");
    element.style.setProperty("--reader-page-edge-margin", `${targetMargin}px`);
  });
};

// CSS 多栏会在每栏顶部重新排正文，但段距和脚注会留下不足一行的剩余空间。
// 把任意段距产生的相位差平均分摊到页内已有块间距，不移动首行，
// 也不制造额外页或改变脚注归属。
const alignPageEdgeBaselines = async (article, viewport, reserves, token) => {
  const lineHeight = pageLineHeight.value;
  if (lineHeight <= 0) return;
  resetTextBaselineMetrics();

  const pageCount = getMeasuredPageCount(article, viewport);
  const viewportTop = viewport.getBoundingClientRect().top;
  const bodyRects = getBodyTextRects(article);
  const pageRects = collectReaderPageFlowRects(article).reduce(
    (grouped, rect) => {
      const page = getRectPage(rect, viewport);
      (grouped[page] ||= []).push(rect);
      return grouped;
    },
    {},
  );
  const regularParagraph = article.querySelector(":scope > p");
  const referenceRect =
    bodyRects.find(
      (rect) => rect.textElement?.closest("p") === regularParagraph,
    ) || bodyRects[0];
  if (!referenceRect) return;
  // 整章网格必须由普通正文定义。若第一页先出现小字号引用块，不能用它的
  // 字体基线偏移带偏后续所有普通正文页面。
  const baselineOffset =
    calculateTextRectBaseline(referenceRect) - referenceRect.top;
  pageBaselineOffset.value = baselineOffset;
  const pendingAdjustments = [];

  for (let page = 1; page <= pageCount; page += 1) {
    if (token !== measureToken) return;

    const rects = (pageRects[page] || []).sort(
      (left, right) => left.top - right.top || left.left - right.left,
    );
    if (!rects.length) continue;

    const firstRect = rects[0];
    const lastRect = rects.reduce((lowest, rect) =>
      calculateReaderFlowBaseline(rect, baselineOffset) >
      calculateReaderFlowBaseline(lowest, baselineOffset)
        ? rect
        : lowest,
    );
    const bodyBottom =
      viewportTop +
      pageHeight.value -
      PAGE_VERTICAL_PADDING -
      (reserves[page] || 0);
    const firstGridBottom =
      viewportTop + PAGE_VERTICAL_PADDING + baselineOffset;
    const availableGridHeight = bodyBottom - firstGridBottom;
    if (availableGridHeight < 0) continue;

    // baseline 本身不能贴到正文底边：不同字号、字体和引用块在 baseline
    // 下方仍有不同高度。先扣除当前末行的真实下沿，避免算出一个视觉上
    // 已越界的目标，随后又被校验逻辑回滚，造成校正时有时无。
    const lastBaselineToBottom = lastRect.flowBlock
      ? 0
      : Math.max(0, lastRect.bottom - calculateTextRectBaseline(lastRect));
    const targetLastBaseline =
      firstGridBottom +
      Math.floor(
        (availableGridHeight - lastBaselineToBottom + 0.5) / lineHeight,
      ) *
        lineHeight;
    const candidates = getPageBlockGapCandidates(
      article,
      viewport,
      page,
      firstRect,
    );
    if (!candidates.length) continue;

    const totalGapCapacity = candidates.reduce(
      (total, element) =>
        total +
        (Number.parseFloat(window.getComputedStyle(element).marginBlockStart) ||
          0),
      0,
    );
    // 页尾需要命中本页最下方的目标基线，而不是任意一条同相位网格线。
    // 旧逻辑会在 target - 1/2 个行高处优先选中 0 调整量，导致页面虽然
    // “在网格上”，末行却高低不一；直接使用到目标末基线的实际距离。
    const adjustment =
      targetLastBaseline -
      calculateReaderFlowBaseline(lastRect, baselineOffset);

    if (
      !Number.isFinite(adjustment) ||
      Math.abs(adjustment) < 0.25 ||
      adjustment < -totalGapCapacity - 0.5 ||
      // 末页保持自然收尾，避免把少量正文拉伸到整页高度；其余页面允许
      // 引用块等不可拆分元素造成的多行留白被均匀分摊到现有块间距。
      (page === pageCount && adjustment > lineHeight * 1.05)
    ) {
      continue;
    }

    const adjustmentRecords = distributePageGapAdjustment(
      candidates,
      adjustment,
    );
    if (!adjustmentRecords.length) continue;
    pendingAdjustments.push({
      page,
      bodyBottom,
      targetLastBaseline,
      adjustmentRecords,
    });
  }

  if (!pendingAdjustments.length || token !== measureToken) return;
  const footnotesBefore = createFootnoteLayoutSignature(
    collectPageFootnotes(article),
  );
  pendingAdjustments.forEach(({ adjustmentRecords }) =>
    applyPageGapRecords(adjustmentRecords),
  );
  await nextTick();
  await waitForLayout();
  if (token !== measureToken) return;

  // 负向校正可能把原本位于下一栏的末段（甚至连续短段）拉回本页。
  // 这些新进入本页的块不在首次候选集合中，需要按分页后的真实成员重新
  // 计算统一段距；否则页尾保留原段距，而前面的段距已经被收紧。
  for (let pass = 0; pass < 3; pass += 1) {
    const convergingPageRects = collectReaderPageFlowRects(article).reduce(
      (grouped, rect) => {
        const page = getRectPage(rect, viewport);
        (grouped[page] ||= []).push(rect);
        return grouped;
      },
      {},
    );
    let changed = false;

    pendingAdjustments.forEach((record) => {
      const rects = (convergingPageRects[record.page] || []).sort(
        (left, right) => left.top - right.top || left.left - right.left,
      );
      if (!rects.length) return;

      const firstRect = rects[0];
      const lastRect = rects.reduce((lowest, rect) =>
        calculateReaderFlowBaseline(rect, baselineOffset) >
        calculateReaderFlowBaseline(lowest, baselineOffset)
          ? rect
          : lowest,
      );
      const remainingAdjustment =
        record.targetLastBaseline -
        calculateReaderFlowBaseline(lastRect, baselineOffset);
      const candidates = getPageBlockGapCandidates(
        article,
        viewport,
        record.page,
        firstRect,
      );
      const nextRecords = distributePageGapAdjustment(
        candidates,
        remainingAdjustment,
      );
      if (!nextRecords.length) return;

      const targetMargin = nextRecords[0].targetMargin;
      const hasNewCandidate = nextRecords.some(
        ({ element }) =>
          !record.adjustmentRecords.some(
            ({ element: currentElement }) => currentElement === element,
          ),
      );
      const hasUnevenMargin = nextRecords.some(
        ({ element }) =>
          Math.abs(
            (Number.parseFloat(
              window.getComputedStyle(element).marginBlockStart,
            ) || 0) - targetMargin,
          ) > 0.25,
      );
      if (
        Math.abs(remainingAdjustment) <= 0.75 &&
        !hasNewCandidate &&
        !hasUnevenMargin
      ) {
        return;
      }

      const elements = new Map(
        record.adjustmentRecords.map((item) => [item.element, item]),
      );
      nextRecords.forEach((item) => elements.set(item.element, item));
      record.adjustmentRecords = [...elements.values()];
      applyPageGapRecords(nextRecords);
      changed = true;
    });

    if (!changed) break;
    await nextTick();
    await waitForLayout();
    if (token !== measureToken) return;
  }

  const adjustedPageRects = collectReaderPageFlowRects(article).reduce(
    (grouped, rect) => {
      const page = getRectPage(rect, viewport);
      (grouped[page] ||= []).push(rect);
      return grouped;
    },
    {},
  );
  const footnotesChanged =
    createFootnoteLayoutSignature(collectPageFootnotes(article)) !==
    footnotesBefore;
  const invalidRecords = pendingAdjustments.filter(
    ({ page, bodyBottom, targetLastBaseline }) => {
      const adjustedRects = adjustedPageRects[page] || [];
      const adjustedLastRect = adjustedRects.reduce(
        (lowest, rect) =>
          !lowest ||
          calculateReaderFlowBaseline(rect, baselineOffset) >
            calculateReaderFlowBaseline(lowest, baselineOffset)
            ? rect
            : lowest,
        null,
      );
      return (
        footnotesChanged ||
        !adjustedLastRect ||
        Math.abs(
          calculateReaderFlowBaseline(adjustedLastRect, baselineOffset) -
            targetLastBaseline,
        ) > 0.75 ||
        adjustedLastRect.bottom > bodyBottom + 1
      );
    },
  );

  if (!invalidRecords.length) return;
  invalidRecords.forEach(({ adjustmentRecords }) => {
    adjustmentRecords.forEach(({ element }) => {
      element.style.removeProperty("--reader-page-edge-margin");
      element.classList.remove("mobile-page-edge-adjusted");
    });
  });
  await nextTick();
  await waitForLayout();
};

const {
  collectPageFootnotes,
  isPaginating: isFootnotePaginationActive,
  paginatePageFootnotes,
  resetPaginationLayout,
  rollbackIncompleteFootnoteLayout,
} = usePagedFootnoteLayout({
  footnoteMeasureRef,
  footnotesByPage,
  footnoteReservesByPage,
  measuringFootnotes,
  totalPages,
  pageHeight,
  pageLineHeight,
  leadingEmptyPages,
  paginationLayoutResetting,
  pageVerticalPadding: PAGE_VERTICAL_PADDING,
  minimumBodyLines: MIN_BODY_LINES_WITH_FOOTNOTES,
  maximumPasses: MAX_FOOTNOTE_LAYOUT_PASSES,
  getElementPage,
  getRectPage,
  getMeasuredPageCount,
  clearPageBaselineAdjustments,
  clearPageFlowGridAdjustments,
  prepareMobileTables,
  restoreMobileTables,
  splitMobileTables: (article, viewport, token) =>
    splitMobileTables({
      article,
      viewport,
      pageHeight: pageHeight.value,
      pageVerticalPadding: PAGE_VERTICAL_PADDING,
      lineHeight: pageLineHeight.value,
      isCurrent: () => token === measureToken,
    }),
  alignChapterHeaderBlock,
  alignPageFlowBlocksToGrid,
  alignPageStartBaselines,
  normalizeLeadingEmptyPages,
  alignPageEdgeBaselines,
  waitForLayout,
  isCurrent: (token) => token === measureToken,
  takeMutationRecords: () => takeMutationRecords(),
});

const measurePages = async () => {
  if (isKeyboardPaginationFrozen()) return;
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
    totalPages.value > 1 ? (currentPage.value - 1) / (totalPages.value - 1) : 0;

  pageWidth.value = Math.max(1, Math.floor(viewport.clientWidth));
  const pageLayout = getPageLayout(viewport);
  pageHeight.value = pageLayout.height;
  pageLineHeight.value = pageLayout.lineHeight;
  await nextTick();
  await waitForLayout();

  if (isKeyboardPaginationFrozen()) {
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
  const hasBodyContent = Boolean(
    article?.textContent?.trim() ||
    article?.querySelector("img, video, svg, canvas, table, pre"),
  );
  if (!article || (String(props.content || "").trim() && !hasBodyContent)) {
    isMeasuring.value = false;
    return;
  }

  if (forcePaginationResetPending) {
    const resetReady = await resetPaginationLayout(article, token);
    if (!resetReady || token !== measureToken) {
      forcePaginationResetPending = true;
      return;
    }
    forcePaginationResetPending = false;
  }

  const footnotesReady = await paginatePageFootnotes(article, viewport, token);
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
      forcePaginationResetPending = true;
      requestMeasureRerun();
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
};

const {
  cancelPending: cancelPendingMeasure,
  requestRerun: requestMeasureRerun,
  scheduleDelayedMeasure,
  scheduleFreshMeasure,
  scheduleMeasure,
  scheduleViewportMeasure,
} = usePaginationScheduler({
  measure: measurePages,
  isFrozen: () => isKeyboardPaginationFrozen(),
  onInvalidate: () => {
    measureToken += 1;
  },
  viewportDelay: VIEWPORT_SETTLE_DELAY,
});

const { isFrozen: isKeyboardPaginationFrozen, isKeyboardInput } =
  usePaginationKeyboardFreeze({
    settleDelay: VIEWPORT_SETTLE_DELAY,
    minimumHeightDelta: KEYBOARD_MIN_HEIGHT_DELTA,
    onFreeze: () => {
      cancelPendingMeasure({ invalidate: true });
      isMeasuring.value = false;
    },
    onRelease: scheduleViewportMeasure,
    onViewportChange: scheduleViewportMeasure,
  });

const emitProgress = () => {
  emit("progress", pageProgress.value);
};

const triggerReaderHint = () => {
  setState("MOBILE_PAGE_HINT_SEEN", true);
  showReaderHint();
};

const dismissReaderHint = hideReaderHint;

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
  Promise.resolve(navigation).catch(cancelChapterNavigation);
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

const {
  getSelectionContext,
  handleContextMenu: handleTextContextMenu,
  handlePointerCancel: handleTextPointerCancel,
  handlePointerDown: handleTextPointerDown,
  handlePointerMove: handleTextPointerMove,
  handlePointerUp: handleTextPointerUp,
  isInteractiveEvent: isInteractiveTarget,
} = useReaderTextContext({ getRoot: getArticleElement, emit });

const handleViewportClick = (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".footnote-ref a[href^='#fn']")) {
    event.preventDefault();
  }
};

const {
  handlePointerDown: handlePagedPointerDown,
  handlePointerMove: handlePagedPointerMove,
  handlePointerUp: handlePagedPointerUp,
  resetPointer: resetPagedPointer,
} = usePagedReaderInput({
  viewportRef,
  tapZones: toRef(props, "tapZones"),
  wheelEnabled: toRef(props, "wheelPagination"),
  turnPage,
  emitAction: (action) => emit("reader-action", action),
  isBlocked: showChapterLoadingOverlay,
  isKeyboardInput,
  isInteractiveEvent: isInteractiveTarget,
  getSelectionContext,
  swipeDistance: SWIPE_DISTANCE,
});

const handlePointerDown = (event) => {
  handleTextPointerDown(event);
  handlePagedPointerDown(event);
};
const handlePointerMove = (event) => {
  handleTextPointerMove(event);
  handlePagedPointerMove(event);
};
const handlePointerUp = (event) => {
  handleTextPointerUp(event);
  handlePagedPointerUp(event);
};
const resetPointer = () => {
  handleTextPointerCancel();
  resetPagedPointer();
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
      setReaderControlsOpen(false);
      measuredChapterUuid.value = "";
      resetRestoredChapter();
      footnotesByPage.value = {};
      footnoteReservesByPage.value = {};
      measuringFootnotes.value = [];
      hasMeasured.value = false;
      leadingEmptyPages.value = 0;
      emptyPageRecoveryPasses = 0;
      forcePaginationResetPending = true;
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
    measureToken += 1;
    scheduleDelayedMeasure(TYPOGRAPHY_SETTLE_DELAY);
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

defineExpose({ triggerReaderHint, goToPage, turnChapter, turnPage });

({ takeMutationRecords } = usePaginationObservers({
  viewportRef,
  sectionRef,
  getArticleElement,
  shouldIgnoreMutations: isFootnotePaginationActive,
  scheduleMeasure,
  scheduleViewportMeasure,
}));
</script>

<style scoped src="@/assets/mobile-reader.css"></style>
