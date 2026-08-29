<template>
  <section
    ref="scrollContainerRef"
    class="scroll-reader absolute inset-x-0 top-0 bottom-6 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
    aria-label="上下滚动阅读器"
    :aria-busy="showChapterLoadingOverlay"
    @pointerdown.capture="handleTextPointerDown"
    @pointermove.capture="handleTextPointerMove"
    @pointerup.capture="handleTextPointerUp"
    @pointercancel.capture="handleTextPointerCancel"
    @scroll.passive="handleScroll"
    @click="handleTapClick"
    @contextmenu.capture.prevent="handleTextContextMenu"
    @wheel.passive="markReadingInteraction"
  >
    <Markdown
      :content="content"
      :is-loading="isLoading"
      :show-loading="false"
      :header-data="headerData"
      :style-configs="styleConfigs"
      use-reader-colors
      :manage-route-anchor="false"
      class="scroll-reader-article"
      @render-ready="handleMarkdownRenderReady"
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
    </Markdown>

    <ChapterToc
      mobile
      progress-only
      viewport-pagination
      :page-progress="chapterScrollProgress"
      @progress-change="totalReadingProgress = $event"
    />

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
        class="pointer-events-none fixed inset-0 z-40 grid place-items-center"
      >
        <button
          type="button"
          class="alert alert-soft pointer-events-auto block w-[calc(100%_-_1.5rem)] max-w-sm cursor-pointer border border-base-300 bg-base-100/95 p-3 text-left text-sm shadow-lg backdrop-blur-md"
          aria-label="上下滚动阅读提示：轻触九宫格区域执行对应操作，上下滑动滚动，点击关闭"
          @click="dismissReaderHint"
        >
          <span class="block w-full">
            <span class="flex items-baseline justify-between gap-3">
              <span class="text-sm font-semibold">阅读操作</span>
              <span class="text-[0.6875rem] text-base-content/45">
                轻触提示可关闭
              </span>
            </span>

            <span class="mt-2.5 grid grid-cols-2 gap-2">
              <span class="rounded-box bg-base-200/75 px-2.5 py-2 text-center">
                <i
                  class="ri-arrow-up-down-line block text-xl leading-none text-base-content/75"
                  aria-hidden="true"
                ></i>
                <span class="mt-1.5 block text-xs font-semibold">
                  上下滚动
                </span>
                <span
                  class="mt-0.5 block text-[0.6875rem] text-base-content/55"
                >
                  正文区域<br />上下滑动阅读
                </span>
              </span>

              <span class="rounded-box bg-base-200/75 px-2.5 py-2 text-center">
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

  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ChapterHeader from "@/components/novel/ChapterHeader.vue";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import Markdown from "@/components/reader/Markdown.vue";
import { useChapters } from "@/composables/useChapters";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import { alignMobileChapterHeaderBlock } from "@/utils/reader/align-header";
import { useReaderHint } from "@/composables/novel/useReaderHint";
import { useReaderTextContext } from "@/composables/novel/useReaderTextContext";

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
  restoreChapterStart: {
    type: Boolean,
    default: false,
  },
  tapZones: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "controller-state",
  "reader-action",
  "text-context",
  "chapter-start-restored",
  "open-comments",
  "loading-overlay-change",
]);
const route = useRoute();
const { getState, setState } = useReadingStateStorage();
const { handlePrev, handleNext } = useChapters();

const scrollContainerRef = ref(null);
const chapterScrollProgress = ref(0);
const totalReadingProgress = ref(0);
const currentViewportPage = ref(1);
const totalViewportPages = ref(1);
const {
  visible: showNavigationHint,
  show: triggerReaderHint,
  dismiss: dismissReaderHint,
} = useReaderHint();
const renderedChapterUuid = ref("");
const showChapterLoadingOverlay = computed(
  () =>
    props.isLoading ||
    renderedChapterUuid.value !== String(props.chapter?.uuid || ""),
);
watch(
  showChapterLoadingOverlay,
  (visible) => emit("loading-overlay-change", visible),
  { immediate: true },
);

let scrollFrame = 0;
let persistTimer = 0;
let restoreToken = 0;
let restoreOnRender = true;
let restoredChapterUuid = "";
let lastScrollAt = 0;

const updateScrollProgress = () => {
  const container = scrollContainerRef.value;
  if (!container) return;

  const scrollRange = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  chapterScrollProgress.value =
    scrollRange > 0
      ? Math.min(100, Math.max(0, (container.scrollTop / scrollRange) * 100))
      : 100;
  totalViewportPages.value = Math.max(
    1,
    Math.ceil(container.scrollHeight / Math.max(1, container.clientHeight)),
  );
  currentViewportPage.value = Math.min(
    totalViewportPages.value,
    Math.max(
      1,
      Math.floor(container.scrollTop / Math.max(1, container.clientHeight)) + 1,
    ),
  );
};

const findReadingAnchor = () => {
  const container = scrollContainerRef.value;
  if (!container) return null;

  const containerTop = container.getBoundingClientRect().top;
  const anchors = container.querySelectorAll(
    "#markdown-content h1[id], #markdown-content h2[id], #markdown-content h3[id], #markdown-content h4[id], #markdown-content h5[id], #markdown-content h6[id], #markdown-content p[id]",
  );
  let current = null;

  anchors.forEach((anchor) => {
    if (anchor.getBoundingClientRect().top <= containerTop + 64) {
      current = anchor;
    }
  });

  return current || anchors[0] || null;
};

const persistCurrentPosition = () => {
  const container = scrollContainerRef.value;
  if (container && container.scrollTop <= 1) {
    setState("READ_POS", "");
    return;
  }

  const anchor = findReadingAnchor();
  if (anchor?.id) setState("READ_POS", anchor.id);
};

const persistPosition = () => {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistCurrentPosition, 240);
};

const handleScroll = () => {
  lastScrollAt = performance.now();
  markReadingInteraction();
  if (!scrollFrame) {
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      updateScrollProgress();
    });
  }
  persistPosition();
};

const waitForLayout = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });

const alignChapterHeaderBlock = async () => {
  const article = scrollContainerRef.value?.querySelector("#markdown-content");
  return alignMobileChapterHeaderBlock({
    article,
    lineHeight:
      (Number(props.styleConfigs.fontSize) || 20) *
      (Number(props.styleConfigs.lineHeight) || 1.6),
    waitForLayout,
  });
};

const decodeAnchor = (value) => {
  const anchor = String(value || "").replace(/^#/, "");
  if (!anchor) return "";

  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
};

const findAnchorInContainer = (container, anchorId) => {
  if (!container || !anchorId) return null;

  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return container.querySelector(`#${CSS.escape(anchorId)}`);
  }

  return (
    Array.from(container.querySelectorAll("[id]")).find(
      (element) => element.id === anchorId,
    ) || null
  );
};

const clampScrollTop = (container, value = container?.scrollTop || 0) => {
  if (!container) return;
  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  container.scrollTop = Math.min(maxScrollTop, Math.max(0, value));
};

const restorePosition = async () => {
  if (props.isLoading) return;

  const token = ++restoreToken;

  await nextTick();
  await waitForLayout();

  const container = scrollContainerRef.value;
  if (!container || token !== restoreToken) return;

  await alignChapterHeaderBlock();
  if (token !== restoreToken || container !== scrollContainerRef.value) return;

  const restoreChapterStart = props.restoreChapterStart;
  const anchorId = restoreChapterStart
    ? ""
    : decodeAnchor(route.hash) || String(getState("READ_POS", "") || "").trim();
  const target = findAnchorInContainer(container, anchorId);

  if (target) {
    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    clampScrollTop(container, container.scrollTop + targetTop - containerTop);
  } else {
    container.scrollTop = 0;
  }

  await waitForLayout();
  if (token !== restoreToken || container !== scrollContainerRef.value) return;
  clampScrollTop(container);
  updateScrollProgress();
  if (restoreChapterStart) emit("chapter-start-restored");
};

const markReadingInteraction = () => {
  restoreOnRender = false;
};

const handleMarkdownRenderReady = async () => {
  const container = scrollContainerRef.value;
  if (!container || props.isLoading) return;

  const chapterUuid = String(props.chapter?.uuid || "");
  if (restoreOnRender && chapterUuid !== restoredChapterUuid) {
    restoredChapterUuid = chapterUuid;
    restoreOnRender = false;
    await restorePosition();
    if (chapterUuid === String(props.chapter?.uuid || "") && !props.isLoading) {
      renderedChapterUuid.value = chapterUuid;
    }
    return;
  }

  clampScrollTop(container);
  updateScrollProgress();
  renderedChapterUuid.value = chapterUuid;
};

const turnChapter = (direction) => {
  if (props.isLoading) return;
  if (direction < 0) {
    void handlePrev();
    return;
  }
  void handleNext();
};

const getArticleElement = () =>
  scrollContainerRef.value?.querySelector(":scope > .markdown-content");
const {
  getSelectionContext,
  handleContextMenu: handleTextContextMenu,
  handlePointerCancel: handleTextPointerCancel,
  handlePointerDown: handleTextPointerDown,
  handlePointerMove: handleTextPointerMove,
  handlePointerUp: handleTextPointerUp,
  isInteractiveEvent: isInteractiveTarget,
} = useReaderTextContext({ getRoot: getArticleElement, emit });

const handleTapClick = (event) => {
  markReadingInteraction();
  if (
    event.button !== 0 ||
    isInteractiveTarget(event) ||
    performance.now() - lastScrollAt < 180 ||
    getSelectionContext()
  ) {
    return;
  }

  const container = scrollContainerRef.value;
  const rect = container?.getBoundingClientRect();
  if (!rect?.width || !rect.height) return;
  const x = Math.min(
    0.999,
    Math.max(0, (event.clientX - rect.left) / rect.width),
  );
  const y = Math.min(
    0.999,
    Math.max(0, (event.clientY - rect.top) / rect.height),
  );
  const action =
    props.tapZones[Math.floor(y * 3) * 3 + Math.floor(x * 3)] || "none";
  if (action !== "none") emit("reader-action", action);
};

const turnPage = (direction) => {
  const container = scrollContainerRef.value;
  if (!container || props.isLoading) return;

  const maxScrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  const atTop = container.scrollTop <= 0;
  const atBottom = maxScrollTop > 0 && container.scrollTop >= maxScrollTop - 1;

  // 到达滚动边界时切换章节；否则在当前章内滚动。
  if (direction < 0 && atTop) {
    void handlePrev();
    return;
  }
  if (direction > 0 && atBottom) {
    void handleNext();
    return;
  }

  container.scrollBy({
    top: direction * container.clientHeight * 0.9,
    behavior: "smooth",
  });
};

watch(
  () => props.chapter?.uuid,
  (chapterUuid, previousChapterUuid) => {
    if (!chapterUuid || chapterUuid === previousChapterUuid) return;
    restoreOnRender = true;
    restoredChapterUuid = "";
    renderedChapterUuid.value = "";
  },
  { flush: "sync" },
);

watch(
  () => props.isLoading,
  (loading, wasLoading) => {
    if (loading) renderedChapterUuid.value = "";
    if (!loading && wasLoading) restoreOnRender = true;
  },
  { flush: "sync" },
);

watch(
  [
    showChapterLoadingOverlay,
    totalReadingProgress,
    chapterScrollProgress,
    currentViewportPage,
    totalViewportPages,
  ],
  ([loading, readingProgress, pageProgress, currentPage, totalPages]) => {
    emit("controller-state", {
      currentPage,
      totalPages,
      paginationReady: !loading,
      readingProgress,
      pageProgress,
    });
  },
  { immediate: true },
);

defineExpose({
  triggerReaderHint,
  turnChapter,
  turnPage,
  goToPage: (progress) => {
    const container = scrollContainerRef.value;
    if (!container) return;
    const range = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTop =
      (range * Math.min(100, Math.max(0, Number(progress) || 0))) / 100;
  },
});

onBeforeUnmount(() => {
  restoreToken += 1;
  window.cancelAnimationFrame(scrollFrame);
  window.clearTimeout(persistTimer);
  persistCurrentPosition();
});
</script>

<style scoped src="@/assets/mobile-reader.css"></style>
