<template>
  <div :class="['min-w-0 w-full max-w-full', containerClass]">
    <slot name="before" />

    <div
      v-if="showToc"
      :class="[
        'sticky z-10 transition-[top,margin] duration-300 ease-out motion-reduce:transition-none xl:hidden',
        mobileTocCompact ? 'top-0 mb-1' : 'top-2 mb-4',
      ]"
      @pointerdown.passive="handleMobileTocInteraction"
      @touchstart.passive="handleMobileTocTouchStart"
      @touchmove="handleMobileTocTouchMove"
      @touchend.passive="handleMobileTocTouchEnd"
      @touchcancel="resetMobileTocTouch"
    >
      <div
        aria-hidden="true"
        :class="[
          'pointer-events-none absolute -top-2 -bottom-4 left-1/2 z-0 w-screen -translate-x-1/2 bg-gradient-to-b from-base-100/90 via-base-100/45 to-transparent transition-[opacity,backdrop-filter] duration-300 ease-out motion-reduce:transition-none',
          mobileTocCompact
            ? 'opacity-0 backdrop-blur-none'
            : 'opacity-100 backdrop-blur-lg',
        ]"
        style="
          mask-image: linear-gradient(
            to bottom,
            black 0%,
            black 42%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            black 0%,
            black 42%,
            transparent 100%
          );
        "
      ></div>

      <div
        aria-hidden="true"
        :class="[
          'pointer-events-none absolute -top-1 -bottom-8 left-1/2 z-0 w-screen -translate-x-1/2 bg-base-100 transition-opacity duration-300 ease-out motion-reduce:transition-none',
          mobileTocCompact ? 'opacity-100' : 'opacity-0',
        ]"
        style="
          mask-image: linear-gradient(
            to bottom,
            black 0,
            black calc(100% - 2rem),
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            black 0,
            black calc(100% - 2rem),
            transparent 100%
          );
        "
      ></div>

      <div class="relative z-10 [&_[data-mobile-toc-handle]]:touch-pan-x">
        <slot
          name="mobile-toc"
          :compact="mobileTocCompact"
          :expand="expandMobileToc"
          :toggle="toggleMobileToc"
          :setMenuOpen="setMobileTocMenuOpen"
        />
      </div>
    </div>

    <div
      :class="[
        'grid min-w-0 w-full max-w-full grid-cols-1 items-start',
        gridClass,
      ]"
    >
      <aside
        v-if="showToc"
        :class="[
          'hidden min-w-0 w-full max-w-full xl:sticky xl:block xl:self-start',
          tocClass,
        ]"
        :style="{
          top: stickyTop,
          height: `calc(90dvh - ${stickyTop})`,
        }"
      >
        <slot name="toc" />
      </aside>

      <section
        ref="readerContentElement"
        :data-reader-content="readerId"
        :class="[
          'min-w-0 w-full max-w-full',
          showAside &&
            'border-b border-base-300 pb-8 xl:border-r xl:border-b-0 xl:pr-8 xl:pb-0',
          showToc && 'xl:border-l xl:border-base-300 xl:pl-8',
          contentClass,
        ]"
      >
        <slot />
      </section>

      <aside
        v-if="showAside"
        ref="asideElement"
        :class="[
          'lg:sticky lg:self-start',
          'max-h-[unset] lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
          'scrollbar-none',
          asideClass,
        ]"
        :style="{
          top: stickyTop,
          maskImage: asideMaskImage,
          WebkitMaskImage: asideMaskImage,
        }"
      >
        <slot name="aside" />
      </aside>
    </div>

    <slot name="after" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

import { useScrollMask } from "@/composables/useScrollMask";

const props = defineProps({
  containerClass: { type: [String, Array, Object], default: "" },
  gridClass: { type: [String, Array, Object], default: "" },
  contentClass: { type: [String, Array, Object], default: "" },
  tocClass: { type: [String, Array, Object], default: "" },
  asideClass: { type: [String, Array, Object], default: "" },
  stickyTop: { type: String, default: "12rem" },
  showToc: { type: Boolean, default: false },
  showAside: { type: Boolean, default: false },
  readerId: { type: String, required: true },
});

const asideElement = ref(null);
const { maskImage: asideMaskImage } = useScrollMask(asideElement);

const readerContentElement = ref(null);
const mobileTocCompact = ref(false);
const manualExpandAutoCollapseDelay = 3000;
let contentBoundaryFrame = 0;
let contentBoundaryReached = null;
let contentBoundaryObserver;
let mobileTocCollapseTimer;
let mobileTocMenuOpen = false;
const mobileTocTouchStart = {
  x: 0,
  y: 0,
  active: false,
};

const resetMobileTocTouch = () => {
  mobileTocTouchStart.active = false;
};

const clearMobileTocAutoCollapse = () => {
  window.clearTimeout(mobileTocCollapseTimer);
  mobileTocCollapseTimer = undefined;
};

const scheduleMobileTocAutoCollapse = () => {
  clearMobileTocAutoCollapse();
  if (
    mobileTocCompact.value ||
    mobileTocMenuOpen ||
    getContentBoundaryState() !== true
  ) {
    return;
  }

  mobileTocCollapseTimer = window.setTimeout(() => {
    mobileTocCollapseTimer = undefined;
    if (!mobileTocMenuOpen && getContentBoundaryState() === true) {
      mobileTocCompact.value = true;
    }
  }, manualExpandAutoCollapseDelay);
};

const setMobileTocCompact = (compact, autoCollapseAfterExpand = false) => {
  const nextCompact = compact && getContentBoundaryState() === true;

  mobileTocCompact.value = nextCompact;
  if (nextCompact) mobileTocMenuOpen = false;
  clearMobileTocAutoCollapse();

  if (!nextCompact && autoCollapseAfterExpand) {
    scheduleMobileTocAutoCollapse();
  }
};

const setMobileTocMenuOpen = (open) => {
  mobileTocMenuOpen = Boolean(open);
  clearMobileTocAutoCollapse();

  if (!mobileTocMenuOpen && !mobileTocCompact.value) {
    scheduleMobileTocAutoCollapse();
  }
};

const handleMobileTocInteraction = () => {
  if (!mobileTocCompact.value) scheduleMobileTocAutoCollapse();
};

const handleMobileTocTouchStart = (event) => {
  const target = event.target;
  const handle =
    target instanceof Element
      ? target.closest("[data-mobile-toc-handle]")
      : null;
  const touch = event.touches?.[0];

  if (!handle || !touch) {
    resetMobileTocTouch();
    return;
  }

  mobileTocTouchStart.x = touch.clientX;
  mobileTocTouchStart.y = touch.clientY;
  mobileTocTouchStart.active = true;
};

const handleMobileTocTouchMove = (event) => {
  if (!mobileTocTouchStart.active) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = touch.clientX - mobileTocTouchStart.x;
  const deltaY = touch.clientY - mobileTocTouchStart.y;
  const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;

  if (isVerticalSwipe && event.cancelable) event.preventDefault();
};

const handleMobileTocTouchEnd = (event) => {
  if (!mobileTocTouchStart.active) return;

  const touch = event.changedTouches?.[0];
  resetMobileTocTouch();
  if (!touch) return;

  const deltaX = touch.clientX - mobileTocTouchStart.x;
  const deltaY = touch.clientY - mobileTocTouchStart.y;
  const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;

  if (!isVerticalSwipe || Math.abs(deltaY) < 36) return;

  if (deltaY < 0 && getContentBoundaryState() !== true) {
    setMobileTocCompact(false);
    return;
  }

  const compact = deltaY < 0;
  setMobileTocCompact(compact, !compact);
};

const expandMobileToc = () => {
  setMobileTocCompact(false, true);
};

const toggleMobileToc = () => {
  const compact = !mobileTocCompact.value;
  setMobileTocCompact(compact, !compact);
};

const getContentBoundaryState = () => {
  if (!props.showToc || !readerContentElement.value) return null;

  const contentBoundaryElement =
    readerContentElement.value.querySelector("#markdown-content");
  if (!contentBoundaryElement) return null;

  return contentBoundaryElement.getBoundingClientRect().top <= 0;
};

const updateMobileTocAtContentBoundary = () => {
  const reachedContent = getContentBoundaryState();
  if (reachedContent === null) return;

  if (reachedContent === contentBoundaryReached) return;

  contentBoundaryReached = reachedContent;
  setMobileTocCompact(reachedContent);
};

const scheduleMobileTocBoundaryUpdate = () => {
  if (contentBoundaryFrame) return;

  contentBoundaryFrame = window.requestAnimationFrame(() => {
    contentBoundaryFrame = 0;
    updateMobileTocAtContentBoundary();
  });
};

onMounted(() => {
  window.addEventListener("scroll", scheduleMobileTocBoundaryUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleMobileTocBoundaryUpdate);

  if (readerContentElement.value) {
    contentBoundaryObserver = new MutationObserver(
      scheduleMobileTocBoundaryUpdate,
    );
    contentBoundaryObserver.observe(readerContentElement.value, {
      childList: true,
      subtree: true,
    });
  }

  scheduleMobileTocBoundaryUpdate();
});

onBeforeUnmount(() => {
  clearMobileTocAutoCollapse();
  contentBoundaryObserver?.disconnect();
  window.removeEventListener("scroll", scheduleMobileTocBoundaryUpdate);
  window.removeEventListener("resize", scheduleMobileTocBoundaryUpdate);
  if (contentBoundaryFrame) {
    window.cancelAnimationFrame(contentBoundaryFrame);
  }
});
</script>
