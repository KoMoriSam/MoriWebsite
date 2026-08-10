<template>
  <section
    class="scroll-reader absolute inset-x-0 top-0 flex min-h-0 flex-col overflow-hidden"
    aria-label="上下滚动阅读器"
    :aria-busy="isLoading"
    :style="{
      bottom:
        'max(0px, calc(var(--mobile-reader-dock-clearance) - var(--mobile-reader-shell-padding-bottom)))',
    }"
    @touchstart.passive="handleTopPullStart"
    @touchmove="handleTopPullMove"
    @touchend.passive="resetTopPullGesture"
    @touchcancel.passive="resetTopPullGesture"
  >
    <div
      ref="scrollContainerRef"
      class="min-h-0 flex-1 touch-pan-y overflow-y-scroll overscroll-y-contain [-webkit-overflow-scrolling:touch]"
      @scroll.passive="handleScroll"
      @pointerdown.passive="markReadingInteraction"
      @wheel.passive="markReadingInteraction"
    >
      <Markdown
        :content="content"
        :is-loading="isLoading"
        :header-data="headerData"
        :style-configs="styleConfigs"
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
          />
        </template>
      </Markdown>
    </div>

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
      <button
        v-if="showNavigationHint"
        type="button"
        class="alert alert-soft absolute bottom-[var(--mobile-reader-content-padding-block)] left-1/2 z-20 block w-[calc(100%_-_1.5rem)] max-w-sm -translate-x-1/2 cursor-pointer border border-base-300 bg-base-100/95 p-3 text-left text-sm shadow-lg backdrop-blur-md"
        aria-label="上下滚动阅读提示：可在底部阅读控制切换为左右翻页，从顶部下滑调出导航栏，在导航栏区域上滑可收起，点击关闭"
        @click="dismissReaderHint"
      >
        <span class="flex items-center gap-3">
          <i
            class="ri-arrow-up-down-line text-2xl text-base-content/70"
            aria-hidden="true"
          ></i>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold">上下滚动阅读</span>
            <span class="mt-0.5 block text-xs text-base-content/60">
              直接上下滑动阅读；点击底部“滚动阅读”可切换回左右翻页；从页面最顶部下滑可唤出导航栏，在导航栏区域上滑可收起。
            </span>
          </span>
        </span>
      </button>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isLoading"
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
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import ChapterHeader from "@/components/novel/ChapterHeader.vue";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import Markdown from "@/components/reader/Markdown.vue";
import { useChapters } from "@/composables/useChapters";
import { MOBILE_READER_NAVBAR_SHOW_EVENT } from "@/constants/reader";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import { alignMobileChapterHeaderBlock } from "@/utils/reader/align-header";

const NAVBAR_PULL_START_ZONE = 72;
const NAVBAR_PULL_DISTANCE = 48;
const NAVBAR_PULL_DIRECTION_RATIO = 1.25;

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

const emit = defineEmits(["controller-state"]);
const route = useRoute();
const { getState, setState } = useReadingStateStorage();
const { handlePrev, handleNext } = useChapters();

const scrollContainerRef = ref(null);
const chapterScrollProgress = ref(0);
const totalReadingProgress = ref(0);
const showNavigationHint = ref(false);

let scrollFrame = 0;
let persistTimer = 0;
let hintTimer = 0;
let restoreToken = 0;
let restoreOnRender = true;

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
  const anchor = findReadingAnchor();
  if (anchor?.id) setState("READ_POS", anchor.id);
};

const persistPosition = () => {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistCurrentPosition, 240);
};

const handleScroll = () => {
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

  const anchorId =
    decodeAnchor(route.hash) || String(getState("READ_POS", "") || "").trim();
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
};

const markReadingInteraction = () => {
  restoreOnRender = false;
};

const handleMarkdownRenderReady = () => {
  const container = scrollContainerRef.value;
  if (!container || props.isLoading) return;

  if (restoreOnRender) {
    void restorePosition();
    return;
  }

  clampScrollTop(container);
  updateScrollProgress();
};

const turnChapter = (direction) => {
  if (props.isLoading) return;
  if (direction < 0) {
    void handlePrev();
    return;
  }
  void handleNext();
};

const triggerReaderHint = () => {
  showNavigationHint.value = true;
  window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(dismissReaderHint, 6000);
};

const dismissReaderHint = () => {
  window.clearTimeout(hintTimer);
  showNavigationHint.value = false;
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

const handleTopPullStart = (event) => {
  const container = scrollContainerRef.value;
  if (
    event.touches.length !== 1 ||
    props.isLoading ||
    props.controlsOpen ||
    (container?.scrollTop || 0) > 0
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

  const touch = Array.from(event.touches || []).find(
    (item) => item.identifier === topPullGesture.id,
  );
  if (!touch) {
    resetTopPullGesture();
    return;
  }

  const deltaX = touch.clientX - topPullGesture.x;
  const deltaY = touch.clientY - topPullGesture.y;
  const isDownwardPull =
    deltaY > 0 &&
    Math.abs(deltaY) >= Math.abs(deltaX) * NAVBAR_PULL_DIRECTION_RATIO;

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

watch(
  () => [
    props.chapter?.uuid,
    props.content,
    props.isLoading,
    props.styleConfigs.fontStyle,
    props.styleConfigs.fontSize,
    props.styleConfigs.fontGap,
    props.styleConfigs.lineHeight,
    props.styleConfigs.paraHeight,
  ],
  () => {
    restoreOnRender = true;
    void restorePosition();
  },
  { flush: "post" },
);

watch(
  [() => props.isLoading, totalReadingProgress, chapterScrollProgress],
  ([loading, readingProgress, pageProgress]) => {
    emit("controller-state", {
      currentPage: 1,
      totalPages: 1,
      paginationReady: !loading,
      readingProgress,
      pageProgress,
    });
  },
  { immediate: true },
);

defineExpose({ triggerReaderHint, turnChapter });

onMounted(() => {
  void restorePosition();
});

onBeforeUnmount(() => {
  restoreToken += 1;
  window.cancelAnimationFrame(scrollFrame);
  window.clearTimeout(persistTimer);
  window.clearTimeout(hintTimer);
  persistCurrentPosition();
});
</script>

<style scoped>
.scroll-reader :deep(.scroll-reader-article) {
  padding-block-start: var(--mobile-reader-content-padding-block);
  padding-block-end: var(--mobile-reader-content-padding-block);
}

/* 分页模式会清除首段的上外边距；滚动模式也采用同一规则，避免切换时
   ChapterHeader 与首段之间的距离发生跳变。 */
.scroll-reader :deep(.scroll-reader-article > div > p:first-of-type) {
  margin-block-start: 0;
}
</style>
