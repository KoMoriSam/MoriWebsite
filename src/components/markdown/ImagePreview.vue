<template>
  <Teleport v-if="toolbarTarget" :to="toolbarTarget">
    <div
      class="preview-layout"
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

      <header class="preview-header">
        <p
          class="preview-info ps-2.5 pt-2.5 text-center text-xs tabular-nums leading-relaxed text-white"
          :aria-label="`第 ${currentIndex + 1} 张，共 ${totalImages} 张`"
        >
          <span class="font-bold">{{ currentIndex + 1 }}</span>
          <span class="text-white/50"> / {{ totalImages }}</span>
        </p>

        <p
          v-if="caption"
          class="preview-caption pt-2.5 text-center text-xs leading-relaxed text-white text-balance"
        >
          {{ caption }}
        </p>

        <button
          type="button"
          class="btn btn-circle btn-ghost btn-neutral disabled:text-white/25 text-white preview-close"
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
        class="btn btn-square btn-lg btn-ghost btn-neutral disabled:text-white/25 text-white preview-prev"
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
        class="btn btn-square btn-lg btn-ghost btn-neutral disabled:text-white/25 text-white preview-next"
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
          class="btn btn-square btn-ghost btn-neutral disabled:text-white/25 text-white"
          :disabled="cannotZoomOut"
          aria-label="缩小图片"
          title="缩小"
          @click="changeZoom(1 / ZOOM_FACTOR)"
        >
          <i class="ri-zoom-out-line text-lg" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-ghost font-mono tabular-nums btn-neutral disabled:text-white/25 text-white"
          :disabled="cannotResetZoom"
          :aria-label="`缩放 ${zoomPercent}%，点击恢复适应屏幕`"
          title="适应屏幕"
          @click="resetZoom"
        >
          {{ zoomPercent }}%
          <i
            v-if="!cannotResetZoom"
            class="ri-reset-left-line text-white/50 text-xs"
            aria-hidden="true"
          ></i>
        </button>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-neutral disabled:text-white/25 text-white"
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
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

import { useModalClose } from "@/composables/useModal";
import { useToast } from "@/composables/useToast";

const ZOOM_FACTOR = 1.25;
const ZOOM_EPSILON = 0.005;
const PRELOADER_DELAY = 400;
const FILTER_TRANSITION_DURATION = 333;
const PREVIEW_SVG_FILTER = "invert(1) hue-rotate(180deg)";
const FALLBACK_IMAGE_WIDTH = 1200;
const FALLBACK_IMAGE_HEIGHT = 800;

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
const toolbarTarget = ref(null);
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
const close = () => modalClose.requestClose();

const getImageCaption = (image) => {
  const figure = image.closest("figure.markdown-figure");
  return (
    figure?.querySelector(":scope > figcaption")?.textContent?.trim() ||
    image.getAttribute("alt")?.trim() ||
    ""
  );
};

const getImageDimensions = (image) => {
  if (image.naturalWidth && image.naturalHeight) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  const attributeWidth = Number(image.getAttribute("width"));
  const attributeHeight = Number(image.getAttribute("height"));
  if (attributeWidth > 0 && attributeHeight > 0) {
    return { width: attributeWidth, height: attributeHeight };
  }

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

const createGalleryItem = (image) => {
  const src = image.currentSrc || image.src;
  const { width, height } = getImageDimensions(image);
  const imageStyle = window.getComputedStyle(image);
  const inheritedFilter = imageStyle.filter;
  const thumbCropped = imageStyle.objectFit === "cover";
  const isSvg =
    image.classList.contains("markdown-svg-image") ||
    /\.svg(?:[?#]|$)/iu.test(src);
  const sourceFilterFrom =
    inheritedFilter && inheritedFilter !== "none" ? inheritedFilter : "none";
  let sourceFilter = "";

  if (isSvg) sourceFilter = PREVIEW_SVG_FILTER;
  else if (inheritedFilter && inheritedFilter !== "none") {
    sourceFilter = inheritedFilter;
  }

  return {
    src,
    msrc: src,
    width,
    height,
    thumbCropped,
    alt: image.getAttribute("alt") || "",
    caption: getImageCaption(image),
    sourceFilter,
    sourceFilterFrom:
      isSvg && sourceFilterFrom !== sourceFilter ? sourceFilterFrom : "",
    element: image,
  };
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

const open = async ({ images, index = 0, pointer = null } = {}) => {
  const galleryImages = Array.from(images || []).filter(
    (image) => image instanceof HTMLImageElement,
  );
  const selectedImage = galleryImages[index];
  if (typeof window === "undefined" || !selectedImage || photoSwipe) return;

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

  const dataSource = galleryImages.map(createGalleryItem);
  const instance = new PhotoSwipe({
    dataSource,
    index,
    initialPointerPos:
      pointer && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)
        ? pointer
        : null,
    mainClass: "preview",
    bgOpacity: 0.92,
    loop: false,
    allowPanToNext: true,
    wheelToZoom: true,
    secondaryZoomLevel: (zoomLevels) =>
      Math.min(zoomLevels.max, Math.max(1, zoomLevels.initial * 2)),
    imageClickAction: "zoom",
    bgClickAction: "close",
    tapAction: "toggle-controls",
    doubleTapAction: "zoom",
    closeOnVerticalDrag: true,
    pinchToClose: true,
    arrowPrev: false,
    arrowNext: false,
    counter: false,
    close: false,
    zoom: false,
    preloader: false,
    errorMsg: "图片加载失败",
    paddingFn: (_viewportSize, itemData) => ({
      top: itemData.caption ? 72 : 20,
      right: 16,
      bottom: 126,
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
  instance.on("change", () => {
    syncGalleryState(instance);
    syncPreloader(instance);
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
  });
  instance.on("destroy", () => {
    if (photoSwipe !== instance) return;
    clearPreloader();
    photoSwipe = null;
    toolbarTarget.value = null;
    caption.value = "";
    currentIndex.value = 0;
    totalImages.value = 1;
    modalClose.discard({ close: false });
  });

  photoSwipe = instance;
  modalClose.activate();

  try {
    instance.init();
  } catch (error) {
    console.error("图片预览打开失败", error);
    clearPreloader();
    photoSwipe = null;
    toolbarTarget.value = null;
    caption.value = "";
    currentIndex.value = 0;
    totalImages.value = 1;
    modalClose.discard({ close: false });
    toast.error("图片预览打开失败");
  }
};

onBeforeUnmount(() => {
  openRequestId += 1;
  clearPreloader();
  modalClose.discard({ close: false });
  if (photoSwipe) {
    photoSwipe.options.showHideAnimationType = "none";
    photoSwipe.close();
    photoSwipe = null;
  }
  toolbarTarget.value = null;
});

defineExpose({ open, close });
</script>

<style>
.pswp.preview {
  --pswp-bg: var(--color-black);
  --pswp-placeholder-bg: transparent;
  --pswp-root-z-index: 140;
  --pswp-error-text-color: var(--color-white);
}

.preview .pswp__bg {
  backdrop-filter: blur(8px);
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
