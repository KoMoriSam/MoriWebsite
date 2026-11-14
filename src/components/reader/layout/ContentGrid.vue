<template>
  <section :class="['min-w-0 w-full max-w-full', containerClass]">
    <!--
      移动端目录。
      注意：sticky 元素必须直接处在 ReaderBody 的长内容容器中，
      不能再套一个仅有目录自身高度的父级，否则滚动越过父级后 sticky 会失效。
    -->
    <div
      v-if="showToc"
      ref="mobileTocBoundaryElement"
      aria-hidden="true"
      class="relative -top-2 h-0"
      :class="mobileTocVisibility"
    ></div>

    <aside
      v-if="showToc"
      ref="mobileTocElement"
      data-reader-mobile-toc
      :aria-label="translate('reader.body.contents')"
      :class="[
        'sticky z-10',
        mobileTocVisibility,
        mobileTocCompact ? 'top-0' : 'top-2',
      ]"
      @pointerdown="handleMobileTocPointerDown"
      @pointermove="handleMobileTocPointerMove"
      @pointerup="handleMobileTocPointerEnd"
      @pointercancel="resetMobileTocPointer"
      @click.capture="handleMobileTocClickCapture"
    >
      <div
        data-mobile-toc-backdrop
        aria-hidden="true"
        :class="[
          'pointer-events-none absolute -top-2 -bottom-4 -inset-x-(--reader-page-gutter,0px) z-0 bg-gradient-to-b from-base-100 via-base-100/80 to-transparent [contain:strict]',
          mobileTocCompact ? 'opacity-0' : 'opacity-100',
        ]"
      ></div>

      <div class="relative z-10">
        <slot
          name="mobile-toc"
          :compact="mobileTocCompact"
          :expand="expandMobileToc"
          :toggle="toggleMobileToc"
          :set-menu-open="setMobileTocMenuOpen"
        />
      </div>
    </aside>

    <div
      v-if="showToc"
      aria-hidden="true"
      :class="[
        mobileTocVisibility,
        mobileTocCompact ? 'h-1' : 'h-4',
      ]"
    ></div>

    <!-- 主阅读区 -->
    <div
      ref="bodyElement"
      :class="[
        'grid min-w-0 w-full max-w-full grid-cols-1 items-start',
        gridClass,
      ]"
    >
      <aside
        v-if="showToc"
        :class="[
          'sticky hidden min-w-0 w-full max-w-full self-start',
          scrollContainer ? '@min-[48rem]/reader:block' : 'xl:block',
          tocClass,
        ]"
        :style="{
          top: stickyTop,
          height: `calc(90dvh - ${stickyTop})`,
        }"
        :aria-label="translate('reader.body.contents')"
      >
        <slot name="toc" />
      </aside>

      <!-- 真正的 article 语义由 Markdown.vue 提供 -->
      <div
        ref="contentElement"
        :class="[
          'min-w-0 w-full max-w-full',
          showAside &&
            'border-b border-base-300 pb-8 xl:border-r xl:border-b-0 xl:pr-8 xl:pb-0',
          showToc && (scrollContainer
            ? '@min-[48rem]/reader:border-l @min-[48rem]/reader:border-base-300 @min-[48rem]/reader:pl-4'
            : 'xl:border-l xl:border-base-300 xl:pl-8'),
          contentClass,
        ]"
      >
        <slot />
      </div>

      <ScrollableContainer
        v-if="showAside"
        :class="[
          'min-w-0 w-full max-w-full lg:sticky lg:self-start',
          'max-lg:mb-12',
          asideClass,
        ]"
        :style="{
          top: stickyTop,
          '--reader-sticky-top': stickyTop,
        }"
      >
        <aside
          class="max-h-[unset] lg:max-h-[calc(100dvh-var(--navbar-height)-3rem)] lg:overflow-y-auto scrollbar-none"
          :aria-label="translate('reader.body.aids')"
        >
          <slot name="aside" />
        </aside>
      </ScrollableContainer>
    </div>
  </section>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useEventListener, useResizeObserver } from "@vueuse/core";
import { layoutMotionActive } from "@/composables/layout/useLayoutMotion";
import { useMobileTocTransition } from "@/composables/reader/useMobileTocTransition";

const props = defineProps({
  containerClass: { type: [String, Array, Object], default: "" },
  gridClass: { type: [String, Array, Object], default: "" },
  contentClass: { type: [String, Array, Object], default: "" },
  tocClass: { type: [String, Array, Object], default: "" },
  asideClass: { type: [String, Array, Object], default: "" },
  stickyTop: { type: String, default: "12rem" },
  showToc: { type: Boolean, default: false },
  scrollContainer: { type: Object, default: null },
  showAside: { type: Boolean, default: false },
});

const emit = defineEmits(["content-ready"]);

const contentElement = ref(null);
const mobileTocBoundaryElement = ref(null);
const mobileTocElement = ref(null);
const bodyElement = ref(null);

const mobileTocCompact = ref(false);
const mobileTocMenuOpen = ref(false);
const mobileTocVisibility = computed(() =>
  props.scrollContainer ? "@min-[48rem]/reader:hidden" : "xl:hidden",
);
const scrollPosition = () => Math.max(0, props.scrollContainer?.scrollTop ?? window.scrollY);
useMobileTocTransition(mobileTocElement, bodyElement, mobileTocCompact);

const mobileTocScrollDirectionThreshold = 24;
const mobileTocAutoTransitionLockDuration = 400;

let mobileTocBoundaryFrame = 0;
let mobileTocClickSuppressionTimer;
let mobileTocLastScrollY = 0;
let mobileTocScrollDirection = 0;
let mobileTocScrollDistance = 0;
let mobileTocScrollPending = false;
let mobileTocBoundaryReached = false;
let mobileTocAutoTransitionLockedUntil = 0;
let suppressNextMobileTocClick = false;

const mobileTocPointerStart = {
  id: null,
  x: 0,
  y: 0,
  active: false,
};

const getMobileTocBoundaryState = () => {
  const boundary = mobileTocBoundaryElement.value;
  if (!boundary?.getClientRects().length) return null;
  const top = props.scrollContainer?.getBoundingClientRect().top ?? 0;
  return boundary.getBoundingClientRect().top <= top;
};

const resetMobileTocPointer = () => {
  mobileTocPointerStart.id = null;
  mobileTocPointerStart.active = false;
};

const resetMobileTocScrollDirection = () => {
  mobileTocScrollDirection = 0;
  mobileTocScrollDistance = 0;
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

const setMobileTocCompact = (value) => {
  const nextCompact = Boolean(value) && getMobileTocBoundaryState() === true;
  const changed = nextCompact !== mobileTocCompact.value;

  mobileTocCompact.value = nextCompact;

  if (nextCompact) {
    mobileTocMenuOpen.value = false;
  }

  if (changed && typeof window !== "undefined") {
    mobileTocAutoTransitionLockedUntil =
      window.performance.now() + mobileTocAutoTransitionLockDuration;
    mobileTocLastScrollY = scrollPosition();
    resetMobileTocScrollDirection();
  }
};

const expandMobileToc = () => {
  setMobileTocCompact(false);
};

const toggleMobileToc = () => {
  setMobileTocCompact(!mobileTocCompact.value);
};

const setMobileTocMenuOpen = (open) => {
  mobileTocMenuOpen.value = Boolean(open);
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

  if (isVerticalSwipe && Math.abs(deltaY) >= 36) {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    if (event.cancelable) event.preventDefault();
  }
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

  if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  resetMobileTocPointer();

  const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
  if (!isVerticalSwipe || Math.abs(deltaY) < 36) return;

  suppressMobileTocSyntheticClick();
  setMobileTocCompact(deltaY < 0);
};

const updateMobileTocAtBoundary = (trackScrollDirection = false) => {
  const currentScrollY = scrollPosition();
  const scrollDelta = currentScrollY - mobileTocLastScrollY;
  mobileTocLastScrollY = currentScrollY;

  const reached = getMobileTocBoundaryState();
  if (reached === null) return;

  const enteredBoundary = reached && !mobileTocBoundaryReached;
  mobileTocBoundaryReached = reached;

  if (!reached) {
    resetMobileTocScrollDirection();
    setMobileTocCompact(false);
    return;
  }

  const locked = window.performance.now() < mobileTocAutoTransitionLockedUntil;

  if (enteredBoundary && trackScrollDirection && scrollDelta > 0 && !locked) {
    resetMobileTocScrollDirection();

    if (!mobileTocMenuOpen.value && !mobileTocCompact.value) {
      setMobileTocCompact(true);
    }

    return;
  }

  if (!trackScrollDirection || scrollDelta === 0 || locked) {
    if (locked) resetMobileTocScrollDirection();
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
    if (!mobileTocMenuOpen.value && !mobileTocCompact.value) {
      setMobileTocCompact(true);
    }
  } else if (mobileTocCompact.value) {
    setMobileTocCompact(false);
  }
};

const scheduleMobileTocBoundaryUpdate = (event) => {
  if (event?.type === "scroll") {
    mobileTocScrollPending = true;
  }

  if (mobileTocBoundaryFrame || layoutMotionActive.value) return;

  mobileTocBoundaryFrame = window.requestAnimationFrame(() => {
    mobileTocBoundaryFrame = 0;
    if (layoutMotionActive.value) return;

    const trackScrollDirection = mobileTocScrollPending;
    mobileTocScrollPending = false;

    updateMobileTocAtBoundary(trackScrollDirection);
  });
};

watch(layoutMotionActive, (active) => {
  if (!active) scheduleMobileTocBoundaryUpdate();
});

const scrollTarget = computed(() =>
  props.scrollContainer || (typeof window !== "undefined" ? window : null),
);
useEventListener(scrollTarget, "scroll", scheduleMobileTocBoundaryUpdate, { passive: true });
useResizeObserver(() => props.scrollContainer, () => {
  if (getMobileTocBoundaryState() === null) setMobileTocCompact(false);
  scheduleMobileTocBoundaryUpdate();
});

onMounted(() => {
  emit("content-ready", contentElement.value);

  mobileTocLastScrollY = scrollPosition();

  window.addEventListener("resize", scheduleMobileTocBoundaryUpdate);

  scheduleMobileTocBoundaryUpdate();
});

onBeforeUnmount(() => {
  window.clearTimeout(mobileTocClickSuppressionTimer);
  window.removeEventListener("resize", scheduleMobileTocBoundaryUpdate);

  if (mobileTocBoundaryFrame) {
    window.cancelAnimationFrame(mobileTocBoundaryFrame);
  }
});
</script>
