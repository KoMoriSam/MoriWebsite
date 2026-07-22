// src/directive/index.js
import { useIntersectionObserver } from "@vueuse/core";
// 封装插件
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
            //在监听的图片第一次完成加载后就停止监听
            stop();
          }
        });
      },
    });
  },
};

const showElement = (el) => {
  el.classList.add("opacity-100");
  el.classList.remove("opacity-0");
};

const loadBackground = (el, url) => {
  if (!url) {
    showElement(el);
    return;
  }

  const image = new Image();

  // 防止 URL 快速变化时，旧图片加载完成后误触发
  const loadId = Symbol();
  el.__fadeInLoadId = loadId;

  image.onload = image.onerror = () => {
    if (el.__fadeInLoadId === loadId) {
      showElement(el);
    }
  };

  image.src = url;

  // 已经被浏览器缓存
  if (image.complete) {
    showElement(el);
  }
};

export const fadeIn = {
  mounted(el, binding) {
    el.classList.add("opacity-0", "transition-opacity", "duration-500");

    // v-fade-in="图片地址"：用于 background-image
    if (binding.value) {
      loadBackground(el, binding.value);
      return;
    }

    // 不传参数：保持原来的 img 用法
    if (el.tagName === "IMG") {
      const handleLoad = () => showElement(el);

      el.__fadeInHandleLoad = handleLoad;

      if (el.complete) {
        handleLoad();
      } else {
        el.addEventListener("load", handleLoad, { once: true });
        el.addEventListener("error", handleLoad, { once: true });
      }

      return;
    }

    // 普通元素没有图片需要等待，直接显示
    showElement(el);
  },

  updated(el, binding) {
    if (binding.value && binding.value !== binding.oldValue) {
      el.classList.add("opacity-0");
      el.classList.remove("opacity-100");

      loadBackground(el, binding.value);
    }
  },

  unmounted(el) {
    if (el.__fadeInHandleLoad) {
      el.removeEventListener("load", el.__fadeInHandleLoad);
      el.removeEventListener("error", el.__fadeInHandleLoad);
    }

    delete el.__fadeInHandleLoad;
    delete el.__fadeInLoadId;
  },
};
