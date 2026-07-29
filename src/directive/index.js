// src/directive/index.js
import { useIntersectionObserver } from "@vueuse/core";

export const lazyPlugin = {
  install(app) {
    app.directive("lazy", {
      mounted(el, binding) {
        el.classList.add("skeleton max-w-full sm:max-w-3xs object-cover");
        const { stop } = useIntersectionObserver(el, ([{ isIntersecting }]) => {
          console.log(isIntersecting);

          if (isIntersecting) {
            el.src = binding.value;
            el.onload = () => {
              el.classList.remove("skeleton object-cover");
            };
            stop();
          }
        });
      },
    });
  },
};

const BACKGROUND_CLASS = "fade-in-background";
const BACKGROUND_LOADED_CLASS = "fade-in-background-loaded";
const BACKGROUND_IMAGE_PROPERTY = "--fade-in-background-image";

const showElement = (el) => {
  el.classList.add("opacity-100");
  el.classList.remove("opacity-0");
};

const hideElement = (el) => {
  el.classList.add("opacity-0");
  el.classList.remove("opacity-100");
};

const getImageSourceKey = (el) => {
  return [
    el.getAttribute("src") || "",
    el.getAttribute("srcset") || "",
    el.getAttribute("sizes") || "",
  ].join("|");
};

const parseCssTime = (value) => {
  const time = String(value).trim();
  const amount = Number.parseFloat(time);

  if (!Number.isFinite(amount)) return 0;

  return time.endsWith("ms") ? amount : amount * 1000;
};

const hasOpacityTransition = (el) => {
  const computedStyle = getComputedStyle(el);
  const properties = computedStyle.transitionProperty
    .split(",")
    .map((property) => property.trim());
  const durations = computedStyle.transitionDuration
    .split(",")
    .map(parseCssTime);
  const transitionCount = Math.max(properties.length, durations.length);

  for (let index = 0; index < transitionCount; index += 1) {
    const property = properties[index % properties.length];
    const duration = durations[index % durations.length];

    if ((property === "all" || property === "opacity") && duration > 0) {
      return true;
    }
  }

  return false;
};

const queueImageReveal = (el, sourceKey = el.__fadeInSourceKey) => {
  if (el.__fadeInFrameId) {
    cancelAnimationFrame(el.__fadeInFrameId);
  }

  // Commit the hidden state first so cached images also animate on mount.
  void el.offsetWidth;

  el.__fadeInFrameId = requestAnimationFrame(() => {
    if (
      el.__fadeInMode === "image" &&
      el.__fadeInSourceKey === sourceKey
    ) {
      showElement(el);
    }
  });
};

const prepareImage = (el) => {
  el.__fadeInMode = "image";
  el.__fadeInSourceKey = getImageSourceKey(el);
  hideElement(el);

  if (!el.classList.contains("motion-reduce:transition-none")) {
    el.classList.add("motion-reduce:transition-none");
    el.__fadeInAddedReducedMotion = true;
  }

  // 尊重组件已有的 transition，避免覆盖 transform、scale 或自定义时长
  if (!hasOpacityTransition(el)) {
    el.classList.add("transition-opacity", "duration-500");
    el.__fadeInAddedTransition = true;
  }

  const handleLoad = () => queueImageReveal(el);
  el.__fadeInHandleLoad = handleLoad;
  el.addEventListener("load", handleLoad);
  el.addEventListener("error", handleLoad);

  if (el.complete) {
    handleLoad();
  }
};

const updateImage = (el) => {
  const sourceKey = getImageSourceKey(el);

  if (sourceKey === el.__fadeInSourceKey) return;

  el.__fadeInSourceKey = sourceKey;
  hideElement(el);

  // 缓存图片在 src 更新后可能不会经历可见的加载阶段
  el.__fadeInFrameId = requestAnimationFrame(() => {
    if (el.__fadeInSourceKey === sourceKey && el.complete) {
      queueImageReveal(el, sourceKey);
    }
  });
};

const toCssUrl = (url) => {
  const escapedUrl = String(url)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

  return `url("${escapedUrl}")`;
};

const showBackground = (el) => {
  el.classList.add(BACKGROUND_LOADED_CLASS);
};

const hideBackground = (el) => {
  el.classList.remove(BACKGROUND_LOADED_CLASS);
};

const loadBackground = (el, url) => {
  const loadId = Symbol();
  el.__fadeInLoadId = loadId;
  hideBackground(el);

  if (!url) {
    el.style.setProperty(BACKGROUND_IMAGE_PROPERTY, "none");
    showBackground(el);
    return;
  }

  const image = new Image();
  let settled = false;

  const handleLoad = () => {
    if (settled || el.__fadeInLoadId !== loadId) return;
    settled = true;

    el.style.setProperty(BACKGROUND_IMAGE_PROPERTY, toCssUrl(url));
    el.__fadeInFrameId = requestAnimationFrame(() => {
      if (el.__fadeInLoadId === loadId) {
        showBackground(el);
      }
    });
  };

  image.onload = image.onerror = handleLoad;
  image.src = url;

  if (image.complete) {
    handleLoad();
  }
};

export const fadeIn = {
  mounted(el, binding) {
    // 传入图片地址的非 img 元素使用独立背景伪元素
    if (binding.value && el.tagName !== "IMG") {
      el.__fadeInMode = "background";
      el.classList.add(BACKGROUND_CLASS);
      el.style.backgroundImage = "none";
      loadBackground(el, binding.value);
      return;
    }

    if (el.tagName === "IMG") {
      prepareImage(el);
      return;
    }

    // 普通元素保持原有兼容行为
    el.classList.add("opacity-0", "transition-opacity", "duration-500");
    showElement(el);
  },

  updated(el, binding) {
    if (el.__fadeInMode === "image") {
      updateImage(el);
      return;
    }

    if (el.__fadeInMode !== "background") return;

    // Vue 更新内联 style 后再次移除真实背景，只让伪元素显示图片
    el.style.backgroundImage = "none";

    if (binding.value !== binding.oldValue) {
      loadBackground(el, binding.value);
    }
  },

  unmounted(el) {
    if (el.__fadeInFrameId) {
      cancelAnimationFrame(el.__fadeInFrameId);
    }

    if (el.__fadeInHandleLoad) {
      el.removeEventListener("load", el.__fadeInHandleLoad);
      el.removeEventListener("error", el.__fadeInHandleLoad);
    }

    if (el.__fadeInAddedTransition) {
      el.classList.remove("transition-opacity", "duration-500");
    }

    if (el.__fadeInAddedReducedMotion) {
      el.classList.remove("motion-reduce:transition-none");
    }

    el.classList.remove(BACKGROUND_CLASS, BACKGROUND_LOADED_CLASS);
    el.style.removeProperty(BACKGROUND_IMAGE_PROPERTY);

    delete el.__fadeInAddedTransition;
    delete el.__fadeInAddedReducedMotion;
    delete el.__fadeInMode;
    delete el.__fadeInFrameId;
    delete el.__fadeInHandleLoad;
    delete el.__fadeInLoadId;
    delete el.__fadeInSourceKey;
  },
};
