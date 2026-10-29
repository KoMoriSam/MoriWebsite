<template>
  <div
    ref="surface"
    class="pointer-events-none absolute bottom-0 left-1/2 -z-10 w-[calc(100vw-var(--ambient-scrollbar,0px))] -translate-x-1/2 overflow-hidden"
    :style="surfaceStyle"
    aria-hidden="true"
  >
    <div v-if="$slots.default" ref="underlay" class="absolute inset-0 -z-10">
      <slot :light-theme="lightTheme"></slot>
    </div>
    <canvas ref="canvas" class="block size-full"></canvas>
    <span ref="primary" class="invisible absolute text-primary"></span>
    <span ref="warning" class="invisible absolute text-warning"></span>
    <span ref="info" class="invisible absolute text-info"></span>
    <span ref="foreground" class="invisible absolute text-base-content"></span>
    <span ref="background" class="invisible absolute text-base-100"></span>
  </div>
</template>

<script setup>
import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import { layoutMotionActive } from "@/composables/layout/useLayoutMotion";

const props = defineProps({ config: { type: Object, required: true } });
const surface = ref(null);
const underlay = ref(null);
const surfaceStyle = ref({ top: "0px" });
const canvas = ref(null);
const primary = ref(null);
const warning = ref(null);
const info = ref(null);
const foreground = ref(null);
const background = ref(null);
const lightTheme = ref(false);
let activate = () => {};
let deactivate = () => {};
let dispose = () => {};
let freezeLayout = () => {};
let resumeLayout = () => {};
defineExpose({
  freezeLayout: () => freezeLayout(),
  resumeLayout: () => resumeLayout(),
});

onMounted(() => {
  const context = canvas.value.getContext("2d");
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d");
  const sample = document.createElement("canvas");
  sample.width = sample.height = 1;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!context || !layerContext || !sampleContext) return;

  const {
    createEffect,
    effectOptions,
    initialTime = 0,
    speed = 1,
    strength = 1,
    lightMultiplier = 1,
    desktopOffset = 0,
    mask = {},
  } = props.config;
  const anchor = surface.value.parentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  const desktopViewport = matchMedia("(min-width: 48rem)");
  const state = {
    width: 0,
    height: 0,
    ratio: 1,
    layerScale: 1,
    desktopLayout: false,
    lightTheme: false,
    time: initialTime,
  };
  let active = true;
  let pageActive = true;
  let inView = false;
  let palette;
  let previous = 0;
  let frame = 0;
  let resizeFrame = 0;
  let layoutFrozen = false;
  let restoreLayout = () => {};
  const rgba = (name, opacity) =>
    `rgba(${palette[name].join(",")},${Math.min(1, opacity * strength * (state.lightTheme ? lightMultiplier : 1))})`;
  const effect = createEffect(
    { context, layer, layerContext, state, rgba },
    effectOptions,
  );

  function readColor(element) {
    sampleContext.clearRect(0, 0, 1, 1);
    sampleContext.fillStyle = getComputedStyle(element).color;
    sampleContext.fillRect(0, 0, 1, 1);
    return [...sampleContext.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }

  const canPaint = () => active && pageActive && inView && !document.hidden && !layoutMotionActive.value;
  const shouldAnimate = () => canPaint() && !reducedMotion.matches;

  function refreshPalette() {
    if (!active || !pageActive || layoutFrozen || layoutMotionActive.value) return;
    const base = readColor(background.value);
    state.lightTheme =
      base[0] * 0.2126 + base[1] * 0.7152 + base[2] * 0.0722 > 128;
    lightTheme.value = state.lightTheme;
    palette = effect.createPalette(
      {
        green: readColor(primary.value),
        gold: readColor(warning.value),
        info: readColor(info.value),
        ink: readColor(foreground.value),
      },
      state.lightTheme,
    );
    paint();
  }

  function paint() {
    const { width, height, ratio, desktopLayout } = state;
    if (!canPaint() || !width || !height || !palette) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    if (desktopLayout) context.translate(width * desktopOffset, 0);
    effect.paint();
    context.restore();

    context.globalCompositeOperation = "destination-in";
    const maskConfig = (desktopLayout ? mask.desktop : mask.mobile) || {};
    const horizontal = context.createLinearGradient(0, 0, width, 0);
    const horizontalStops =
      maskConfig.horizontal ??
      (desktopLayout
        ? [
            [0, 0.025],
            [0.37, 0.48],
            [0.62, 1],
            [0.87, 0.48],
            [1, 0.025],
          ]
        : [
            [0, 0.025],
            [0.28, 0.08],
            [0.56, 0.48],
            [0.75, 1],
          ]);
    for (const [position, opacity] of horizontalStops) {
      const offset =
        desktopLayout && position > 0 && position < 1 ? desktopOffset : 0;
      horizontal.addColorStop(
        Math.max(0, Math.min(1, position + offset)),
        `rgba(0,0,0,${opacity})`,
      );
    }
    context.fillStyle = horizontal;
    context.fillRect(0, 0, width, height);
    const vertical = context.createLinearGradient(0, 0, 0, height);
    const verticalStops = maskConfig.vertical ?? [
      [0, 0.65],
      [0.12, 1],
      [0.8, 1],
      [1, 0],
    ];
    for (const [position, opacity] of verticalStops) {
      vertical.addColorStop(position, `rgba(0,0,0,${opacity})`);
    }
    context.fillStyle = vertical;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
  }

  function animate(now) {
    frame = 0;
    if (!shouldAnimate()) return;
    if (!previous || now - previous >= 32) {
      if (previous)
        state.time += Math.min((now - previous) / 1000, 0.1) * speed;
      previous = now;
      paint();
    }
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    paint();
    if (shouldAnimate()) frame = requestAnimationFrame(animate);
  }

  function resize() {
    resizeFrame = 0;
    if (!active || !pageActive || layoutFrozen || layoutMotionActive.value) return;
    const bounds = anchor.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pageTop = bounds.top + window.scrollY;
    const width = document.documentElement.getBoundingClientRect().width;
    const height = bounds.height + pageTop;
    surfaceStyle.value = {
      top: `${-pageTop}px`,
      left: `${width / 2 - bounds.left}px`,
      "--ambient-scrollbar": `${Math.max(0, window.innerWidth - width)}px`,
    };
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const desktopLayout = desktopViewport.matches;
    if (
      state.width === width &&
      state.height === height &&
      state.ratio === ratio &&
      state.desktopLayout === desktopLayout
    )
      return;
    Object.assign(state, { width, height, ratio, desktopLayout });
    canvas.value.width = Math.max(1, Math.round(width * ratio));
    canvas.value.height = Math.max(1, Math.round(height * ratio));
    state.layerScale = Math.min(1, 640 / width, 320 / height);
    layer.width = Math.max(1, Math.ceil(width * state.layerScale));
    layer.height = Math.max(1, Math.ceil(height * state.layerScale));
    paint();
  }

  function scheduleResize() {
    if (active && pageActive && !layoutFrozen && !layoutMotionActive.value && !resizeFrame)
      resizeFrame = requestAnimationFrame(resize);
  }

  freezeLayout = () => {
    const element = surface.value;
    if (!active || layoutFrozen || !element?.isConnected) return;
    const bounds = element.getBoundingClientRect();
    const layerBounds = underlay.value?.getBoundingClientRect() || bounds;
    const layers = Array.from(underlay.value?.children || []).map((child) => ({
      element: child,
      style: child.style.cssText,
      bounds: child.getBoundingClientRect(),
    }));
    const previousStyle = surfaceStyle.value;
    const previousInlineStyle = element.style.cssText;
    layoutFrozen = true;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;

    const geometry = {
      position: "fixed",
      top: `${bounds.top}px`,
      left: `${bounds.left}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      bottom: "auto",
      translate: "none",
      transform: "none",
    };
    Object.assign(element.style, geometry);
    surfaceStyle.value = { ...previousStyle, ...geometry };
    for (const layer of layers) {
      Object.assign(layer.element.style, {
        position: "absolute",
        top: `${layer.bounds.top - layerBounds.top}px`,
        left: `${layer.bounds.left - layerBounds.left}px`,
        right: "auto",
        bottom: "auto",
        width: `${layer.bounds.width}px`,
        height: `${layer.bounds.height}px`,
        maxWidth: "none",
        maxHeight: "none",
        aspectRatio: "auto",
        translate: "none",
        transform: "none",
      });
    }
    restoreLayout = () => {
      element.style.cssText = previousInlineStyle;
      surfaceStyle.value = previousStyle;
      for (const layer of layers) layer.element.style.cssText = layer.style;
    };
  };
  resumeLayout = () => {
    if (!active || !layoutFrozen) return;
    restoreLayout();
    restoreLayout = () => {};
    layoutFrozen = false;
    refreshPalette();
    resize();
    syncMotion();
  };

  const stopMotionWatch = watch(layoutMotionActive, (paused) => {
    if (!paused) {
      refreshPalette();
      resize();
    }
    syncMotion();
  });
  const sizeObserver = new ResizeObserver(scheduleResize);
  sizeObserver.observe(anchor);
  const themeObserver = new MutationObserver(refreshPalette);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class", "style"],
  });
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncMotion();
  });
  visibilityObserver.observe(surface.value);
  document.addEventListener("visibilitychange", syncMotion);
  reducedMotion.addEventListener("change", syncMotion);
  colorScheme.addEventListener("change", refreshPalette);
  desktopViewport.addEventListener("change", scheduleResize);
  window.addEventListener("resize", scheduleResize, { passive: true });
  activate = () => {
    if (!active) return;
    pageActive = true;
    refreshPalette();
    resize();
    syncMotion();
  };
  deactivate = () => {
    pageActive = false;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    syncMotion();
  };
  refreshPalette();
  resize();
  dispose = () => {
    active = false;
    stopMotionWatch();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(resizeFrame);
    sizeObserver.disconnect();
    themeObserver.disconnect();
    visibilityObserver.disconnect();
    document.removeEventListener("visibilitychange", syncMotion);
    reducedMotion.removeEventListener("change", syncMotion);
    colorScheme.removeEventListener("change", refreshPalette);
    desktopViewport.removeEventListener("change", scheduleResize);
    window.removeEventListener("resize", scheduleResize);
  };
});

onActivated(() => activate());
onDeactivated(() => deactivate());
onBeforeUnmount(() => dispose());
</script>
