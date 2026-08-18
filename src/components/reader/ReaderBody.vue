<template>
  <div :class="['min-w-0 w-full max-w-full', containerClass]">
    <slot name="before" />

    <div
      v-if="showToc"
      ref="mobileTocBoundaryElement"
      aria-hidden="true"
      class="relative -top-2 h-0 xl:hidden"
    ></div>
    <div
      v-if="showToc"
      :class="[
        'sticky z-10 transition-[top] duration-300 ease-out motion-reduce:transition-none xl:hidden',
        mobileTocCompact ? 'top-0' : 'top-2',
      ]"
      @pointerdown="handleMobileTocPointerDown"
      @pointermove="handleMobileTocPointerMove"
      @pointerup="handleMobileTocPointerEnd"
      @pointercancel="resetMobileTocPointer"
      @click.capture="handleMobileTocClickCapture"
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
      v-if="showToc"
      aria-hidden="true"
      :class="[
        'transition-[height] duration-300 ease-out motion-reduce:transition-none xl:hidden',
        mobileTocCompact ? 'h-1' : 'h-4',
      ]"
    ></div>

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
          'max-lg:mb-12',
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
const mobileTocBoundaryElement = ref(null);
const mobileTocCompact = ref(false);
const mobileTocScrollDirectionThreshold = 24;
const mobileTocAutoTransitionLockDuration = 400;
let mobileTocBoundaryFrame = 0;
let mobileTocBoundaryObserver;
let mobileTocBoundaryReached = false;
let mobileTocClickSuppressionTimer;
let mobileTocMenuOpen = false;
let lastMobileTocScrollY = 0;
let mobileTocScrollDirection = 0;
let mobileTocScrollDistance = 0;
let mobileTocScrollPending = false;
let mobileTocAutoTransitionLockedUntil = 0;
let suppressNextMobileTocClick = false;
const mobileTocPointerStart = {
  id: null,
  x: 0,
  y: 0,
  active: false,
};

const resetMobileTocPointer = () => {
  mobileTocPointerStart.id = null;
  mobileTocPointerStart.active = false;
};

const suppressMobileTocSyntheticClick = () => {
  window.clearTimeout(mobileTocClickSuppressionTimer);
  suppressNextMobileTocClick = true;
  mobileTocClickSuppressionTimer = window.setTimeout(() => {
    suppressNextMobileTocClick = false;
  }, 500);
};

const handleMobileTocClickCapture = (event) => {
  if (!suppressNextMobileTocClick) return;

  window.clearTimeout(mobileTocClickSuppressionTimer);
  suppressNextMobileTocClick = false;
  event.preventDefault();
  event.stopPropagation();
};

const setMobileTocCompact = (compact) => {
  const nextCompact = Boolean(compact) && getMobileTocBoundaryState() === true;
  const compactChanged = nextCompact !== mobileTocCompact.value;

  mobileTocCompact.value = nextCompact;
  if (nextCompact) mobileTocMenuOpen = false;

  if (compactChanged && typeof window !== "undefined") {
    mobileTocAutoTransitionLockedUntil =
      window.performance.now() + mobileTocAutoTransitionLockDuration;
    lastMobileTocScrollY = Math.max(0, window.scrollY);
    resetMobileTocScrollDirection();
  }
};

const setMobileTocMenuOpen = (open) => {
  mobileTocMenuOpen = Boolean(open);
};

const handleMobileTocPointerDown = (event) => {
  const target = event.target;
  const handle =
    target instanceof Element
      ? target.closest("[data-mobile-toc-handle]")
      : null;

  if (!handle || !event.isPrimary) {
    resetMobileTocPointer();
    return;
  }

  mobileTocPointerStart.id = event.pointerId;
  mobileTocPointerStart.x = event.clientX;
  mobileTocPointerStart.y = event.clientY;
  mobileTocPointerStart.active = true;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
};

const handleMobileTocPointerMove = (event) => {
  if (
    !mobileTocPointerStart.active ||
    event.pointerId !== mobileTocPointerStart.id
  ) {
    return;
  }

  const deltaX = event.clientX - mobileTocPointerStart.x;
  const deltaY = event.clientY - mobileTocPointerStart.y;
  const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;

  if (isVerticalSwipe && event.cancelable) event.preventDefault();
};

const handleMobileTocPointerEnd = (event) => {
  if (
    !mobileTocPointerStart.active ||
    event.pointerId !== mobileTocPointerStart.id
  ) {
    return;
  }

  const deltaX = event.clientX - mobileTocPointerStart.x;
  const deltaY = event.clientY - mobileTocPointerStart.y;
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
  resetMobileTocPointer();
  const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;

  if (!isVerticalSwipe || Math.abs(deltaY) < 36) return;

  suppressMobileTocSyntheticClick();
  const compact = deltaY < 0;
  setMobileTocCompact(compact);
};

const expandMobileToc = () => {
  setMobileTocCompact(false);
};

const toggleMobileToc = () => {
  const compact = !mobileTocCompact.value;
  setMobileTocCompact(compact);
};

const getMobileTocBoundaryState = () => {
  if (!props.showToc || !mobileTocBoundaryElement.value) return null;

  return mobileTocBoundaryElement.value.getBoundingClientRect().top <= 0;
};

const resetMobileTocScrollDirection = () => {
  mobileTocScrollDirection = 0;
  mobileTocScrollDistance = 0;
};

const updateMobileTocAtBoundary = (trackScrollDirection = false) => {
  const currentScrollY = Math.max(0, window.scrollY);
  const scrollDelta = currentScrollY - lastMobileTocScrollY;
  lastMobileTocScrollY = currentScrollY;

  const reachedTocBoundary = getMobileTocBoundaryState();
  if (reachedTocBoundary === null) return;
  const enteredStickyBoundary = reachedTocBoundary && !mobileTocBoundaryReached;
  mobileTocBoundaryReached = reachedTocBoundary;

  if (!reachedTocBoundary) {
    resetMobileTocScrollDirection();
    setMobileTocCompact(false);
    return;
  }

  const autoTransitionLocked =
    window.performance.now() < mobileTocAutoTransitionLockedUntil;

  if (
    enteredStickyBoundary &&
    trackScrollDirection &&
    scrollDelta > 0 &&
    !autoTransitionLocked
  ) {
    resetMobileTocScrollDirection();
    if (!mobileTocMenuOpen && !mobileTocCompact.value) {
      setMobileTocCompact(true);
    }
    return;
  }

  if (!trackScrollDirection || scrollDelta === 0 || autoTransitionLocked) {
    if (autoTransitionLocked) resetMobileTocScrollDirection();
    return;
  }

  const direction = Math.sign(scrollDelta);
  if (direction !== mobileTocScrollDirection) {
    mobileTocScrollDirection = direction;
    mobileTocScrollDistance = 0;
  }

  mobileTocScrollDistance += Math.abs(scrollDelta);
  if (mobileTocScrollDistance < mobileTocScrollDirectionThreshold) return;

  mobileTocScrollDistance = 0;

  if (direction > 0) {
    if (!mobileTocMenuOpen && !mobileTocCompact.value) {
      setMobileTocCompact(true);
    }
  } else if (mobileTocCompact.value) {
    setMobileTocCompact(false);
  }
};

const scheduleMobileTocBoundaryUpdate = (event) => {
  if (event?.type === "scroll") mobileTocScrollPending = true;
  if (mobileTocBoundaryFrame) return;

  mobileTocBoundaryFrame = window.requestAnimationFrame(() => {
    mobileTocBoundaryFrame = 0;
    const trackScrollDirection = mobileTocScrollPending;
    mobileTocScrollPending = false;
    updateMobileTocAtBoundary(trackScrollDirection);
  });
};

onMounted(() => {
  lastMobileTocScrollY = Math.max(0, window.scrollY);
  window.addEventListener("scroll", scheduleMobileTocBoundaryUpdate, {
    passive: true,
  });
  window.addEventListener("resize", scheduleMobileTocBoundaryUpdate);

  if (readerContentElement.value) {
    mobileTocBoundaryObserver = new MutationObserver(
      scheduleMobileTocBoundaryUpdate,
    );
    mobileTocBoundaryObserver.observe(readerContentElement.value, {
      childList: true,
      subtree: true,
    });
  }

  scheduleMobileTocBoundaryUpdate();
});

onBeforeUnmount(() => {
  window.clearTimeout(mobileTocClickSuppressionTimer);
  mobileTocBoundaryObserver?.disconnect();
  window.removeEventListener("scroll", scheduleMobileTocBoundaryUpdate);
  window.removeEventListener("resize", scheduleMobileTocBoundaryUpdate);
  if (mobileTocBoundaryFrame) {
    window.cancelAnimationFrame(mobileTocBoundaryFrame);
  }
});
</script>
