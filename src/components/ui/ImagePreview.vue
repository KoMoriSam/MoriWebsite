<template>
  <div
    v-if="mode === 'inline'"
    ref="inlineHost"
    v-bind="$attrs"
    class="image-preview-host relative overflow-hidden"
    role="group"
    :aria-label="ariaLabel"
  ></div>

  <Teleport v-if="toolbarTarget" :to="toolbarTarget">
    <div
      class="preview-layout text-shadow-xs/90"
      data-reader-interactive
      @pointerdown.stop
      @click.stop
      @contextmenu.prevent
    >
      <div
        v-if="isLoading"
        class="preview-loading"
        role="status"
        aria-live="polite"
        aria-label="图片加载中"
      >
        <span
          class="loading loading-spinner loading-xl text-primary"
          aria-hidden="true"
        ></span>
      </div>

      <header v-if="mode === 'fullscreen'" class="preview-header">
        <p
          class="preview-info ps-2.5 pt-2.5 text-center text-xs tabular-nums leading-relaxed text-gray-300 text-shadow-xs/90"
          :aria-label="`第 ${currentIndex + 1} 张，共 ${totalImages} 张`"
        >
          <span class="font-bold">{{ currentIndex + 1 }}</span>
          <span class="text-gray-300/50"> / {{ totalImages }}</span>
        </p>

        <p
          v-if="caption"
          class="preview-caption pt-2.5 text-center text-xs leading-relaxed text-gray-300 text-balance"
        >
          {{ caption }}
        </p>

        <button
          type="button"
          class="btn btn-circle btn-ghost btn-neutral disabled:text-gray-300/25 text-gray-300 preview-close text-shadow-xs/90"
          data-preview-control
          aria-label="关闭图片预览"
          title="关闭"
          @click="close"
        >
          <i class="ri-close-line text-xl" aria-hidden="true"></i>
        </button>
      </header>

      <button
        type="button"
        class="btn btn-square btn-lg btn-ghost btn-neutral disabled:text-gray-300/25 text-gray-300 preview-prev text-shadow-xs/90"
        data-preview-control
        :disabled="cannotGoPrevious"
        aria-label="上一张图片"
        title="上一张"
        @click="previous"
      >
        <i class="ri-arrow-left-wide-line text-3xl" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="btn btn-square btn-lg btn-ghost btn-neutral disabled:text-gray-300/25 text-gray-300 preview-next text-shadow-xs/90"
        data-preview-control
        :disabled="cannotGoNext"
        aria-label="下一张图片"
        title="下一张"
        @click="next"
      >
        <i class="ri-arrow-right-wide-line text-3xl" aria-hidden="true"></i>
      </button>

      <div
        class="preview-footer"
        data-preview-control
        aria-label="图片预览控制"
      >
        <button
          type="button"
          class="btn btn-square btn-ghost btn-neutral disabled:text-gray-300/25 text-gray-300 text-shadow-xs/90"
          :disabled="cannotZoomOut"
          aria-label="缩小图片"
          title="缩小"
          @click="changeZoom(1 / ZOOM_FACTOR)"
        >
          <i class="ri-zoom-out-line text-lg" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-ghost font-mono tabular-nums btn-neutral disabled:text-gray-300/25 text-gray-300 text-shadow-xs/90"
          :disabled="cannotResetZoom"
          :aria-label="`缩放 ${zoomPercent}%，点击恢复适应屏幕`"
          title="适应屏幕"
          @click="resetZoom"
        >
          {{ zoomPercent }}%
          <i
            v-if="!cannotResetZoom"
            class="ri-reset-left-line text-gray-300/50 text-xs"
            aria-hidden="true"
          ></i>
        </button>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-neutral disabled:text-gray-300/25 text-gray-300 text-shadow-xs/90"
          :disabled="cannotZoomIn"
          aria-label="放大图片"
          title="放大"
          @click="changeZoom(ZOOM_FACTOR)"
        >
          <i class="ri-zoom-in-line text-lg" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </Teleport>

  <Teleport v-if="overlayTarget" :to="overlayTarget">
    <div class="image-preview-overlay size-full">
      <slot
        name="overlay"
        :slide="currentSlideData"
        :index="currentIndex"
      ></slot>
    </div>
  </Teleport>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";

import { useModalClose } from "@/composables/useModal";
import { useToast } from "@/composables/useToast";

const ZOOM_FACTOR = 1.25;
const ZOOM_EPSILON = 0.005;
const PRELOADER_DELAY = 400;
const FILTER_TRANSITION_DURATION = 333;
const FALLBACK_IMAGE_WIDTH = 1200;
const FALLBACK_IMAGE_HEIGHT = 800;

defineOptions({ inheritAttrs: false });

const props = defineProps({
  mode: {
    type: String,
    default: "fullscreen",
    validator: (value) => ["fullscreen", "inline"].includes(value),
  },
  slides: {
    type: Array,
    default: () => [],
  },
  index: {
    type: Number,
    default: 0,
  },
  ariaLabel: {
    type: String,
    default: "图片预览",
  },
});

const emit = defineEmits(["update:index"]);
const slots = useSlots();

let photoSwipeModulePromise;

const loadPhotoSwipe = () => {
  if (!photoSwipeModulePromise) {
    photoSwipeModulePromise = Promise.all([
      import("photoswipe"),
      import("photoswipe/style.css"),
    ])
      .then(([module]) => module.default)
      .catch((error) => {
        photoSwipeModulePromise = null;
        throw error;
      });
  }

  return photoSwipeModulePromise;
};

const toast = useToast({ position: "center", closable: false });
const inlineHost = ref(null);
const toolbarTarget = ref(null);
const overlayTarget = ref(null);
const activeSlides = ref([]);
const caption = ref("");
const currentIndex = ref(0);
const totalImages = ref(1);
const currentZoom = ref(1);
const initialZoom = ref(1);
const maximumZoom = ref(1);
const isLoading = ref(false);

let photoSwipe = null;
let openRequestId = 0;
let preloaderTimer = null;
let resizeObserver = null;
let pendingInlinePreview = null;
let unmounted = false;

const currentSlideData = computed(
  () => activeSlides.value[currentIndex.value] || null,
);

const zoomPercent = computed(() =>
  Math.round((currentZoom.value / Math.max(initialZoom.value, 0.001)) * 100),
);
const cannotZoomOut = computed(
  () => currentZoom.value <= initialZoom.value + ZOOM_EPSILON,
);
const cannotZoomIn = computed(
  () => currentZoom.value >= maximumZoom.value - ZOOM_EPSILON,
);
const cannotResetZoom = computed(
  () => Math.abs(currentZoom.value - initialZoom.value) <= ZOOM_EPSILON,
);
const cannotGoPrevious = computed(() => currentIndex.value <= 0);
const cannotGoNext = computed(
  () => currentIndex.value >= totalImages.value - 1,
);

const syncZoomState = (slide = photoSwipe?.currSlide) => {
  if (!slide) return;

  currentZoom.value = slide.currZoomLevel;
  initialZoom.value = slide.zoomLevels.initial;
  maximumZoom.value = slide.zoomLevels.max;
};

const syncGalleryState = (instance = photoSwipe) => {
  if (!instance?.currSlide) return;

  currentIndex.value = instance.currIndex;
  totalImages.value = instance.getNumItems();
  caption.value = instance.currSlide.data.caption || "";
  syncZoomState(instance.currSlide);
};

const clearPreloader = () => {
  if (preloaderTimer) {
    window.clearTimeout(preloaderTimer);
    preloaderTimer = null;
  }
  isLoading.value = false;
};

const syncPreloader = (instance = photoSwipe) => {
  clearPreloader();
  if (!instance?.currSlide?.content.isLoading()) return;

  preloaderTimer = window.setTimeout(() => {
    preloaderTimer = null;
    isLoading.value = Boolean(instance.currSlide?.content.isLoading());
  }, PRELOADER_DELAY);
};

const changeZoom = (factor) => {
  const slide = photoSwipe?.currSlide;
  if (!slide) return;

  const nextZoom = Math.min(
    slide.zoomLevels.max,
    Math.max(slide.zoomLevels.initial, slide.currZoomLevel * factor),
  );
  slide.zoomTo(nextZoom, undefined, 180);
};

const resetZoom = () => {
  const slide = photoSwipe?.currSlide;
  if (!slide) return;
  slide.zoomTo(slide.zoomLevels.initial, undefined, 180);
};

const previous = () => photoSwipe?.prev();
const next = () => photoSwipe?.next();
const closePhotoSwipe = () => photoSwipe?.close();
const modalClose = useModalClose({ onClose: closePhotoSwipe });
const close = () => {
  if (props.mode === "fullscreen") modalClose.requestClose();
};

const normalizeSlides = (slides) =>
  Array.from(slides || [])
    .map((slide, index) => {
      const src = String(slide?.src || "");
      if (!src) return null;

      return {
        ...slide,
        id: slide.id ?? `${src}-${index}`,
        src,
        msrc: slide.msrc || src,
        width: Number(slide.width) || FALLBACK_IMAGE_WIDTH,
        height: Number(slide.height) || FALLBACK_IMAGE_HEIGHT,
        alt: slide.alt || "",
        caption: slide.caption || "",
      };
    })
    .filter(Boolean);

const preventContextMenu = (event) => event.preventDefault();

const disableImageContextMenu = (element) => {
  if (!(element instanceof HTMLImageElement)) return;
  element.addEventListener("contextmenu", preventContextMenu);
};

const prepareSourceFilter = (element, content) => {
  const { sourceFilter, sourceFilterFrom } = content?.data || {};
  if (!element || !sourceFilter) return;

  element.style.filter = sourceFilterFrom || sourceFilter;
  if (sourceFilterFrom) {
    element.style.transition = `filter ${FILTER_TRANSITION_DURATION}ms cubic-bezier(.4, 0, .22, 1)`;
  }
};

const animateSourceFilter = (element, content) => {
  const sourceFilter = content?.data.sourceFilter;
  if (!element || !sourceFilter) return;
  element.style.filter = sourceFilter;
};

const restoreSourceFilter = (content) => {
  const sourceFilterFrom = content?.data.sourceFilterFrom;
  if (!sourceFilterFrom) return;

  if (content.placeholder?.element) {
    content.placeholder.element.style.filter = sourceFilterFrom;
  }
  if (content.element) {
    content.element.style.filter = sourceFilterFrom;
  }
};

const updateLoadedDimensions = (slide, content) => {
  const image = content?.element;
  if (
    !slide ||
    content?.data.preserveDeclaredDimensions ||
    !(image instanceof HTMLImageElement) ||
    !image.naturalWidth ||
    !image.naturalHeight ||
    (slide.width === image.naturalWidth && slide.height === image.naturalHeight)
  ) {
    return;
  }

  content.width = image.naturalWidth;
  content.height = image.naturalHeight;
  content.data.width = image.naturalWidth;
  content.data.height = image.naturalHeight;
  slide.width = image.naturalWidth;
  slide.height = image.naturalHeight;
  slide.resize();
};

const sizeOverlayHost = (host, width, height) => {
  if (!host) return;
  host.style.width = `${Math.max(0, Number(width) || 0)}px`;
  host.style.height = `${Math.max(0, Number(height) || 0)}px`;
};

const ensureOverlayHost = (slide) => {
  if (!slots.overlay || !slide?.container) return null;

  let host = slide.container.querySelector(
    ":scope > .image-preview-overlay-host",
  );
  if (!host) {
    host = document.createElement("div");
    host.className = "image-preview-overlay-host";
    slide.container.appendChild(host);
  }
  sizeOverlayHost(
    host,
    slide.content?.displayedImageWidth,
    slide.content?.displayedImageHeight,
  );
  return host;
};

const syncOverlayTarget = (instance = photoSwipe) => {
  overlayTarget.value = ensureOverlayHost(instance?.currSlide);
};

const resetPreviewState = () => {
  clearPreloader();
  toolbarTarget.value = null;
  overlayTarget.value = null;
  caption.value = "";
  currentIndex.value = 0;
  totalImages.value = 1;
  currentZoom.value = 1;
  initialZoom.value = 1;
  maximumZoom.value = 1;
};

const createPreview = async ({ slides, index = 0, pointer = null } = {}) => {
  const dataSource = normalizeSlides(slides);
  if (
    typeof window === "undefined" ||
    !dataSource.length ||
    photoSwipe ||
    (props.mode === "inline" && !inlineHost.value)
  ) {
    return;
  }

  const requestId = ++openRequestId;
  let PhotoSwipe;
  try {
    PhotoSwipe = await loadPhotoSwipe();
  } catch (error) {
    console.error("图片预览模块加载失败", error);
    if (requestId === openRequestId) toast.error("图片预览加载失败");
    return;
  }
  if (requestId !== openRequestId) return;

  activeSlides.value = dataSource;
  const inline = props.mode === "inline";
  const initialIndex = Math.min(
    dataSource.length - 1,
    Math.max(0, Number(index) || 0),
  );
  const instance = new PhotoSwipe({
    dataSource,
    index: initialIndex,
    initialPointerPos:
      !inline &&
      pointer &&
      Number.isFinite(pointer.x) &&
      Number.isFinite(pointer.y)
        ? pointer
        : null,
    mainClass: `preview image-preview--${props.mode}`,
    appendToEl: inline ? inlineHost.value : undefined,
    getViewportSizeFn: inline
      ? () => ({
          x: inlineHost.value?.clientWidth || 0,
          y: inlineHost.value?.clientHeight || 0,
        })
      : undefined,
    bgOpacity: inline ? 0 : 0.92,
    loop: false,
    allowPanToNext: true,
    wheelToZoom: true,
    secondaryZoomLevel: (zoomLevels) =>
      Math.min(zoomLevels.max, Math.max(1, zoomLevels.initial * 2)),
    imageClickAction: "zoom",
    bgClickAction: inline ? false : "close",
    tapAction: inline ? false : "toggle-controls",
    doubleTapAction: "zoom",
    closeOnVerticalDrag: !inline,
    pinchToClose: !inline,
    escKey: !inline,
    arrowKeys: !inline,
    trapFocus: !inline,
    returnFocus: !inline,
    clickToCloseNonZoomable: false,
    showHideAnimationType: inline ? "none" : "zoom",
    showAnimationDuration: inline ? 0 : 333,
    hideAnimationDuration: inline ? 0 : 333,
    arrowPrev: false,
    arrowNext: false,
    counter: false,
    close: false,
    zoom: false,
    preloader: false,
    errorMsg: "图片加载失败",
    paddingFn: (_viewportSize, itemData) => ({
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    }),
  });
  let openingFilterTransitionStarted = false;

  instance.on("uiRegister", () => {
    instance.ui.registerElement({
      name: "controls",
      className: "preview-ui",
      appendTo: "root",
      onInit: (element) => {
        toolbarTarget.value = element;
      },
    });
  });
  instance.on("firstUpdate", () => {
    if (!inline) return;
    instance.element?.setAttribute("role", "group");
    instance.element?.setAttribute("aria-label", props.ariaLabel);
  });
  instance.on("change", () => {
    syncGalleryState(instance);
    syncPreloader(instance);
    syncOverlayTarget(instance);
    if (inline && currentIndex.value !== props.index) {
      emit("update:index", currentIndex.value);
    }
  });
  instance.on("zoomPanUpdate", ({ slide }) => {
    if (slide === instance.currSlide) syncZoomState(slide);
  });
  instance.on("contentLoad", ({ content }) => {
    if (openingFilterTransitionStarted || instance.opener.isOpen) {
      animateSourceFilter(content.placeholder?.element, content);
    } else {
      prepareSourceFilter(content.placeholder?.element, content);
    }
  });
  instance.on("contentLoadImage", ({ content }) => {
    disableImageContextMenu(content.element);
    if (openingFilterTransitionStarted || instance.opener.isOpen) {
      animateSourceFilter(content.element, content);
    } else {
      prepareSourceFilter(content.element, content);
    }
  });
  instance.on("contentAppendImage", ({ content }) => {
    if (openingFilterTransitionStarted || instance.opener.isOpen) {
      animateSourceFilter(content.element, content);
    }
    if (content.slide === instance.currSlide) syncOverlayTarget(instance);
  });
  instance.on("contentResize", ({ content, width, height }) => {
    if (content.slide !== instance.currSlide) return;
    const host = ensureOverlayHost(content.slide);
    sizeOverlayHost(host, width, height);
    overlayTarget.value = host;
  });
  instance.on("openingAnimationStart", () => {
    openingFilterTransitionStarted = true;
    const content = instance.currSlide?.content;
    if (!content) return;

    animateSourceFilter(content.placeholder?.element, content);
    animateSourceFilter(content.element, content);
  });
  instance.on("openingAnimationEnd", () => {
    const content = instance.currSlide?.content;
    if (!content) return;

    animateSourceFilter(content.placeholder?.element, content);
    animateSourceFilter(content.element, content);
  });
  instance.on("closingAnimationStart", () => {
    if (instance.currSlide) restoreSourceFilter(instance.currSlide.content);
  });
  instance.on("loadComplete", ({ slide, content, isError }) => {
    if (
      !isError &&
      content.element instanceof HTMLImageElement &&
      !content.element.naturalWidth
    ) {
      content.onError();
      return;
    }

    if (!isError) updateLoadedDimensions(slide, content);
    if (slide === instance.currSlide) syncPreloader(instance);
  });
  instance.on("afterInit", () => {
    syncGalleryState(instance);
    syncPreloader(instance);
    syncOverlayTarget(instance);
  });
  instance.on("destroy", () => {
    if (photoSwipe !== instance) return;
    photoSwipe = null;
    resetPreviewState();
    if (!inline) {
      activeSlides.value = [];
      modalClose.discard({ close: false });
    }
    if (inline && pendingInlinePreview && !unmounted) {
      const pending = pendingInlinePreview;
      pendingInlinePreview = null;
      void nextTick(() => createPreview(pending));
    }
  });

  photoSwipe = instance;
  if (!inline) modalClose.activate();

  try {
    instance.init();
  } catch (error) {
    console.error("图片预览打开失败", error);
    photoSwipe = null;
    resetPreviewState();
    if (!inline) modalClose.discard({ close: false });
    toast.error("图片预览打开失败");
  }
};

const open = ({ slides, index = 0, pointer = null } = {}) => {
  if (props.mode !== "fullscreen") return;
  void createPreview({ slides, index, pointer });
};

const stopPreview = () => {
  openRequestId += 1;
  if (!photoSwipe) {
    resetPreviewState();
    return;
  }
  photoSwipe.options.showHideAnimationType = "none";
  photoSwipe.close();
};

const inlineSlideKeys = () =>
  normalizeSlides(props.slides).map(
    (slide) => `${slide.id}:${slide.src}:${slide.revision ?? ""}`,
  );

const captureSlideViewState = (slide) => {
  if (!slide) return null;
  return {
    zoomRatio:
      slide.currZoomLevel / Math.max(slide.zoomLevels.initial, 0.001),
    pan: { x: slide.pan.x, y: slide.pan.y },
  };
};

const restoreSlideViewState = (slide, state) => {
  if (!slide || !state) return;
  slide.zoomTo(slide.zoomLevels.initial * state.zoomRatio, false, 0);
  slide.panTo(state.pan.x, state.pan.y);
};

const syncInlineSlides = () => {
  if (props.mode !== "inline") return;
  const nextSlides = normalizeSlides(props.slides);
  if (!nextSlides.length) {
    pendingInlinePreview = null;
    stopPreview();
    activeSlides.value = [];
    return;
  }
  if (pendingInlinePreview) {
    pendingInlinePreview = { slides: nextSlides, index: props.index };
    activeSlides.value = nextSlides;
    return;
  }
  if (!photoSwipe) {
    void createPreview({ slides: nextSlides, index: props.index });
    return;
  }

  const previousStructure = activeSlides.value
    .map((slide) => slide.id)
    .join("|");
  const nextStructure = nextSlides.map((slide) => slide.id).join("|");
  if (previousStructure !== nextStructure) {
    pendingInlinePreview = { slides: nextSlides, index: props.index };
    stopPreview();
    activeSlides.value = nextSlides;
    return;
  }

  const changedIndexes = nextSlides.flatMap((slide, slideIndex) => {
    const previousSlide = activeSlides.value[slideIndex];
    return previousSlide?.src !== slide.src ||
      previousSlide?.revision !== slide.revision ||
      previousSlide?.width !== slide.width ||
      previousSlide?.height !== slide.height
      ? [slideIndex]
      : [];
  });
  activeSlides.value = nextSlides;
  photoSwipe.options.dataSource = nextSlides;
  changedIndexes.forEach((slideIndex) => {
    const viewState =
      slideIndex === photoSwipe?.currIndex
        ? captureSlideViewState(photoSwipe.currSlide)
        : null;
    photoSwipe?.refreshSlideContent(slideIndex);
    if (slideIndex === photoSwipe?.currIndex) {
      restoreSlideViewState(photoSwipe.currSlide, viewState);
    }
  });
};

onMounted(() => {
  if (props.mode !== "inline") return;
  resizeObserver = new ResizeObserver(() => photoSwipe?.updateSize(true));
  if (inlineHost.value) resizeObserver.observe(inlineHost.value);
  syncInlineSlides();
});

watch(inlineSlideKeys, syncInlineSlides);

watch(
  () => props.index,
  (index) => {
    if (
      props.mode === "inline" &&
      photoSwipe &&
      Number.isInteger(index) &&
      index !== photoSwipe.currIndex
    ) {
      const targetIndex = Math.min(
        activeSlides.value.length - 1,
        Math.max(0, index),
      );
      photoSwipe.goTo(targetIndex);
    }
  },
);

watch(
  () => props.ariaLabel,
  (label) => {
    if (props.mode === "inline") {
      photoSwipe?.element?.setAttribute("aria-label", label);
    }
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  pendingInlinePreview = null;
  resizeObserver?.disconnect();
  modalClose.discard({ close: false });
  stopPreview();
});

defineExpose({ open, close });
</script>

<style>
.pswp.preview.image-preview--fullscreen {
  --pswp-bg: var(--color-black);
  --pswp-placeholder-bg: transparent;
  --pswp-root-z-index: 140;
  --pswp-error-text-color: var(--color-white);
}

.pswp.preview.image-preview--fullscreen .pswp__bg {
  backdrop-filter: blur(8px);
}

.pswp.preview.image-preview--inline {
  --pswp-bg: transparent;
  --pswp-placeholder-bg: transparent;
  --pswp-root-z-index: 1;
  --pswp-error-text-color: var(--color-base-content);
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.image-preview-overlay-host {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.image-preview-overlay {
  pointer-events: none;
}

.preview-ui {
  position: absolute;
  inset: 0;
  z-index: 20;
}

.pswp.preview .preview-ui.pswp__hide-on-close {
  pointer-events: none;
}

.preview-layout {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-layout [data-preview-control] {
  pointer-events: auto;
}

.pswp.preview:not(.pswp--ui-visible) .preview-layout [data-preview-control] {
  pointer-events: none;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.preview-header {
  position: absolute;
  top: max(0.75rem, env(safe-area-inset-top));
  left: 0.75rem;
  right: 0.75rem;
  display: grid;
  grid-template-columns: minmax(3rem, 1fr) minmax(0, 42rem) minmax(3rem, 1fr);
  align-items: start;
  gap: 0.75rem;
}

.preview-info {
  grid-column: 1;
  justify-self: start;
  width: max-content;
  margin: 0;
}

.preview-caption {
  grid-column: 2;
  justify-self: center;
  width: 100%;
  margin: 0;
}

.preview-close {
  grid-column: 3;
  justify-self: end;
}

.preview-prev,
.preview-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.preview-prev {
  left: 0.75rem;
}

.preview-next {
  right: 0.75rem;
}

.pswp.preview .preview-prev:disabled,
.pswp.preview .preview-next:disabled,
.pswp.preview.pswp--one-slide .preview-prev,
.pswp.preview.pswp--one-slide .preview-next,
.pswp.preview.pswp--one-slide .preview-info {
  display: none;
}

.pswp.preview.pswp--touch .preview-prev,
.pswp.preview.pswp--touch .preview-next {
  visibility: hidden;
}

.pswp.preview.pswp--has_mouse .preview-prev,
.pswp.preview.pswp--has_mouse .preview-next {
  visibility: visible;
}

.pswp.preview.image-preview--inline .preview-prev,
.pswp.preview.image-preview--inline .preview-next {
  visibility: visible;
}

.pswp.preview .pswp__error-msg {
  width: max-content;
  max-width: min(24rem, calc(100vw - 3rem));
  padding: 1rem;
  line-height: 1.5;
  text-align: center;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: normal;
}

.preview-footer {
  position: absolute;
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  left: 50%;
  display: flex;
  width: max-content;
  max-width: calc(100% - 1.5rem);
  transform: translateX(-50%);
  align-items: center;
  gap: 0.625rem;
}

@media (prefers-reduced-motion: reduce) {
  .preview *,
  .preview *::before,
  .preview *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
