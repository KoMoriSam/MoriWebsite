<template>
  <section
    ref="viewerRoot"
    data-mermaid-viewer
    class="not-prose"
    :class="isFullscreen ? 'h-full min-h-0' : ''"
    :aria-busy="renderStatus === 'loading'"
  >
    <CodeHeader type="mermaid">
      <template #actions>
        <nav
          class="flex shrink-0 items-center gap-1"
          aria-label="Mermaid 图表工具"
        >
          <div
            role="tablist"
            aria-label="Mermaid 视图切换"
            class="tabs tabs-box tabs-xs shrink-0"
          >
            <button
              role="tab"
              class="tab"
              :class="viewMode === 'code' ? 'tab-active' : ''"
              aria-label="查看 Mermaid 代码"
              :aria-pressed="viewMode === 'code'"
              title="代码"
              @click="viewMode = 'code'"
            >
              <i class="ri-code-s-slash-line" aria-hidden="true"></i>
            </button>
            <button
              role="tab"
              class="tab"
              :class="viewMode === 'preview' ? 'tab-active' : ''"
              aria-label="查看 Mermaid 预览"
              :aria-pressed="viewMode === 'preview'"
              title="预览"
              @click="viewMode = 'preview'"
            >
              <i class="ri-image-line" aria-hidden="true"></i>
            </button>
          </div>
          <aside
            class="tooltip tooltip-left mb-0.5 font-mono"
            :class="copied ? 'tooltip-success' : ''"
            :data-tip="
              viewMode === 'preview'
                ? isFullscreen
                  ? '退出全屏'
                  : '全屏'
                : copied
                  ? '复制成功'
                  : '复制代码'
            "
          >
            <button
              v-if="viewMode === 'preview'"
              type="button"
              class="btn btn-sm btn-square btn-ghost shrink-0"
              :aria-label="isFullscreen ? '退出全屏' : '全屏查看图表'"
              :aria-pressed="isFullscreen"
              :title="isFullscreen ? '退出全屏' : '全屏'"
              :disabled="!canFullscreen"
              @click="toggleFullscreen"
            >
              <i
                :class="
                  isFullscreen
                    ? 'ri-fullscreen-exit-line'
                    : 'ri-fullscreen-line'
                "
                aria-hidden="true"
              ></i>
            </button>
            <button
              v-else
              type="button"
              class="btn btn-sm btn-square shrink-0"
              :class="copied ? 'btn-success' : 'btn-ghost'"
              :aria-label="copied ? 'Mermaid 代码已复制' : '复制 Mermaid 代码'"
              :title="copied ? '复制成功' : '复制代码'"
              @click="copy(source)"
            >
              <i
                :class="copied ? 'ri-check-line' : 'ri-file-copy-line'"
                aria-hidden="true"
              ></i>
            </button>
          </aside>
        </nav>
      </template>
    </CodeHeader>

    <figure
      data-mermaid-preview
      class="group relative min-w-0 bg-base-200/50 m-0!"
      :class="[
        isFullscreen ? 'min-h-0 flex-1' : '',
        !isFullscreen && viewMode === 'preview' ? 'min-h-36 md:min-h-56' : '',
        'overflow-hidden',
      ]"
    >
      <div
        v-if="viewMode === 'preview' && renderStatus === 'loading'"
        role="status"
        aria-live="polite"
        class="absolute inset-0 flex items-center justify-center gap-3 text-sm text-base-content/70"
      >
        <span
          class="loading loading-spinner loading-sm"
          aria-hidden="true"
        ></span>
        <span>正在加载 Mermaid 图表……</span>
      </div>

      <div
        v-else-if="viewMode === 'preview' && renderStatus === 'error'"
        role="status"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-sm text-base-content/70"
      >
        <i
          class="ri-error-warning-line text-2xl text-warning"
          aria-hidden="true"
        ></i>
        <span>图表无效或不受支持</span>
      </div>

      <div
        ref="previewCanvas"
        v-show="viewMode === 'preview' && renderStatus === 'ready'"
        tabindex="0"
        role="img"
        aria-label="Mermaid 图表预览"
        class="min-h-[inherit] touch-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-base-content/30"
        :class="[
          isFullscreen ? 'absolute inset-0' : 'relative',
          'cursor-grab active:cursor-grabbing',
        ]"
        @keydown="handleCanvasKeydown"
        @wheel.prevent="handleCanvasWheel"
        @pointerdown="startPan"
        @pointermove="movePan"
        @pointerup="endPan"
        @pointercancel="endPan"
      >
        <div
          ref="diagramHost"
          class="flex min-h-[inherit] w-full items-center justify-center"
          :class="isFullscreen ? 'h-full' : ''"
        >
          <pre
            ref="diagramElement"
            class="mermaid"
            :aria-hidden="renderStatus === 'ready' ? undefined : 'true'"
          ></pre>
        </div>
      </div>

      <CodeView
        v-show="viewMode === 'code'"
        :code="source"
        language="mermaid"
      />

      <div
        v-show="viewMode === 'preview' && renderStatus === 'ready'"
        class="join join-vertical pointer-events-none absolute end-2 bottom-2 z-10 overflow-hidden rounded-full border border-base-300 bg-base-100 opacity-0 shadow-sm transition-opacity duration-200 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
        aria-label="图表缩放"
      >
        <button
          type="button"
          class="btn btn-sm btn-square btn-ghost join-item"
          aria-label="放大图表"
          title="放大"
          :disabled="zoom >= MAX_ZOOM"
          @click="changeZoom(ZOOM_STEP)"
        >
          <i class="ri-add-line" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-square btn-ghost join-item"
          aria-label="缩小图表"
          title="缩小"
          :disabled="zoom <= MIN_ZOOM"
          @click="changeZoom(-ZOOM_STEP)"
        >
          <i class="ri-subtract-line" aria-hidden="true"></i>
        </button>
      </div>
    </figure>
  </section>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import CodeHeader from "@/components/markdown/CodeHeader.vue";
import CodeView from "@/components/markdown/CodeView.vue";
import { renderMermaidSource } from "@/utils/markdown/markdown-it-mermaid";

const props = defineProps({
  source: {
    type: String,
    default: "",
  },
});
const emit = defineEmits(["render-complete"]);

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const MOBILE_TARGET_LABEL_FONT_SIZE = 10;
const DESKTOP_TARGET_LABEL_FONT_SIZE = 14;
const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";
const PAN_BOUNDARY_SPACE = 48;
const MOBILE_DIAGRAM_EDGE_INSET = 12;
const DESKTOP_DIAGRAM_EDGE_INSET = 24;
const viewMode = ref(import.meta.env.SSR ? "code" : "preview");
const zoom = ref(MIN_ZOOM);
const defaultZoom = ref(MIN_ZOOM);
const panX = ref(0);
const panY = ref(0);
const dragging = ref(false);
const viewerRoot = ref(null);
const previewCanvas = ref(null);
const diagramHost = ref(null);
const diagramElement = ref(null);
const isFullscreen = ref(false);
const canFullscreen = ref(false);
const renderStatus = ref(import.meta.env.SSR ? "idle" : "loading");
let panStart = null;
let pinchStart = null;
let resizeObserver = null;
let svgElement = null;
let diagramViewport = null;
let initialViewBox = null;
let defaultRenderScale = 1;
let sourceLabelFontSize = DESKTOP_TARGET_LABEL_FONT_SIZE;
let desktopMediaQuery = null;
let renderRequestId = 0;
const activePointers = new Map();

const { copy, copied } = useClipboard({
  source: computed(() => props.source),
  legacy: true,
});

const diagramType = computed(() => {
  const source = props.source.trimStart();

  if (/^gantt\b/i.test(source)) return "gantt";
  if (/^timeline\b/i.test(source)) return "timeline";
  if (/^journey\b/i.test(source)) return "journey";

  if (/^(?:flowchart|graph)\b/i.test(source)) return "flowchart";
  if (/^stateDiagram(?:-v2)?\b/i.test(source)) return "state";
  if (/^classDiagram\b/i.test(source)) return "class";
  if (/^erDiagram\b/i.test(source)) return "er";
  if (/^requirementDiagram\b/i.test(source)) return "requirement";

  if (/^gitGraph\b/i.test(source)) return "gitGraph";
  if (/^swimlane-beta\b/i.test(source)) return "swimlane";
  if (/^xychart(?:-beta)?\b/i.test(source)) return "xychart";

  return null;
});

const isLeftToRightDiagram = computed(() => {
  const source = props.source;
  const type = diagramType.value;

  // 天然从左向右展开的图表
  if (type === "gantt" || type === "timeline" || type === "journey") {
    return true;
  }

  // flowchart / graph
  if (type === "flowchart") {
    return /^\s*(?:flowchart|graph)\s+LR\b/i.test(source);
  }

  // swimlane
  if (type === "swimlane") {
    return /^\s*swimlane-beta\s+LR\b/i.test(source);
  }

  // GitGraph 默认就是 LR
  if (type === "gitGraph") {
    return !/^\s*gitGraph\s+(?:TB|BT):/i.test(source);
  }

  // XY Chart 的 horizontal 也从左侧开始
  if (type === "xychart") {
    return /^\s*xychart(?:-beta)?\s+horizontal\b/i.test(source);
  }

  // state / class / ER / requirement
  if (
    type === "state" ||
    type === "class" ||
    type === "er" ||
    type === "requirement"
  ) {
    return /(?:^|\n)\s*direction\s+LR\b/i.test(source);
  }

  return false;
});

const isRightToLeftDiagram = computed(() => {
  const source = props.source;
  const type = diagramType.value;

  if (type === "flowchart") {
    return /^\s*(?:flowchart|graph)\s+RL\b/i.test(source);
  }

  if (type === "swimlane") {
    return /^\s*swimlane-beta\s+RL\b/i.test(source);
  }

  if (
    type === "state" ||
    type === "class" ||
    type === "er" ||
    type === "requirement"
  ) {
    return /(?:^|\n)\s*direction\s+RL\b/i.test(source);
  }

  return false;
});

const getBaseScale = (svg = svgElement) => {
  if (!svg || !initialViewBox) return 0;

  const edgeInset = getDiagramEdgeInset();
  return Math.min(
    Math.max(0, svg.clientWidth - edgeInset * 2) / initialViewBox.width,
    Math.max(0, svg.clientHeight - edgeInset * 2) / initialViewBox.height,
  );
};

const getLabelFontSize = (svg) => {
  const fontSizes = [
    ...svg.querySelectorAll(
      "text, foreignObject p, foreignObject span, foreignObject div",
    ),
  ]
    .map((element) => Number.parseFloat(getComputedStyle(element).fontSize))
    .filter((fontSize) => Number.isFinite(fontSize) && fontSize > 0)
    .sort((a, b) => a - b);

  if (!fontSizes.length) {
    return (
      Number.parseFloat(getComputedStyle(svg).fontSize) ||
      DESKTOP_TARGET_LABEL_FONT_SIZE
    );
  }

  return fontSizes[Math.floor(fontSizes.length / 2)];
};

const getTargetLabelFontSize = () =>
  desktopMediaQuery?.matches
    ? DESKTOP_TARGET_LABEL_FONT_SIZE
    : MOBILE_TARGET_LABEL_FONT_SIZE;

const getDiagramEdgeInset = () =>
  desktopMediaQuery?.matches
    ? DESKTOP_DIAGRAM_EDGE_INSET
    : MOBILE_DIAGRAM_EDGE_INSET;

const resetRenderedDiagram = () => {
  if (svgElement) resizeObserver?.unobserve(svgElement);
  svgElement = null;
  diagramViewport = null;
  initialViewBox = null;
  defaultRenderScale = 1;
  sourceLabelFontSize = DESKTOP_TARGET_LABEL_FONT_SIZE;
  zoom.value = MIN_ZOOM;
  defaultZoom.value = MIN_ZOOM;
  panX.value = 0;
  panY.value = 0;
};

const insertRenderedSvg = (svg) => {
  if (!diagramElement.value) return false;

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parsedSvg = parsed.querySelector("svg");
  if (!parsedSvg) return false;

  const wrapper = document.createElement("div");
  wrapper.className = "mermaid-svg-wrapper";
  wrapper.appendChild(document.importNode(parsedSvg, true));
  diagramElement.value.replaceChildren(wrapper);
  return true;
};

const renderDiagram = async () => {
  const requestId = ++renderRequestId;
  const source = props.source.trim();
  renderStatus.value = "loading";
  resetRenderedDiagram();
  diagramElement.value?.replaceChildren();

  if (!source) {
    renderStatus.value = "error";
    emit("render-complete", { status: "error" });
    return;
  }

  try {
    const renderId = `mermaid-viewer-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const { svg, bindFunctions } = await renderMermaidSource(renderId, source);
    if (requestId !== renderRequestId || source !== props.source.trim()) return;
    if (!insertRenderedSvg(svg)) throw new Error("Mermaid 未返回有效 SVG");

    bindFunctions?.(diagramElement.value);
    renderStatus.value = "ready";
    await nextTick();
    initializeSvgViewport();
    emit("render-complete", { status: "ready" });
  } catch (error) {
    if (requestId !== renderRequestId || source !== props.source.trim()) return;
    console.warn("Mermaid 图表渲染失败", error);
    renderStatus.value = "error";
    emit("render-complete", { status: "error" });
  }
};

const syncSvgViewport = () => {
  if (!svgElement || !diagramViewport || !initialViewBox) return;

  const viewportWidth = svgElement.clientWidth;
  const viewportHeight = svgElement.clientHeight;
  if (viewportWidth <= 0 || viewportHeight <= 0) return;

  const baseScale = getBaseScale();
  const diagramCenterX = initialViewBox.x + initialViewBox.width / 2;
  const diagramCenterY = initialViewBox.y + initialViewBox.height / 2;

  svgElement.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);
  svgElement.setAttribute("preserveAspectRatio", "none");
  diagramViewport.setAttribute(
    "transform",
    `translate(${viewportWidth / 2 + panX.value} ${
      viewportHeight / 2 + panY.value
    }) scale(${baseScale * zoom.value}) translate(${-diagramCenterX} ${-diagramCenterY})`,
  );
};

const syncSvgCanvasWidth = () => {
  if (!svgElement) return;

  svgElement.style.setProperty("width", "100%", "important");
  svgElement.style.setProperty("max-width", "none", "important");
};

const syncSvgDimensions = () => {
  if (!svgElement || !initialViewBox || !previewCanvas.value) return;

  defaultRenderScale = getTargetLabelFontSize() / sourceLabelFontSize;
  const minimumViewportHeight = Number.parseFloat(
    getComputedStyle(previewCanvas.value).minHeight,
  );
  const viewportHeight = Math.max(
    Number.isFinite(minimumViewportHeight) ? minimumViewportHeight : 0,
    initialViewBox.height * defaultRenderScale + getDiagramEdgeInset() * 2,
  );

  svgElement.style.aspectRatio = "auto";
  svgElement.style.height = `${viewportHeight}px`;
  syncSvgCanvasWidth();
};

const initializeSvgViewport = () => {
  const nextSvg = diagramHost.value?.querySelector("svg");
  if (!nextSvg || nextSvg === svgElement) return;

  if (svgElement) resizeObserver?.unobserve(svgElement);

  const viewBox = nextSvg.viewBox?.baseVal;
  if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) return;

  svgElement = nextSvg;
  sourceLabelFontSize = getLabelFontSize(nextSvg);
  let contentBounds = null;
  try {
    contentBounds = nextSvg.getBBox();
  } catch {
    // 不支持 getBBox 时沿用 Mermaid 提供的 viewBox。
  }
  const fittedBounds =
    contentBounds?.width > 0 && contentBounds?.height > 0
      ? contentBounds
      : viewBox;
  initialViewBox = {
    x: fittedBounds.x,
    y: fittedBounds.y,
    width: fittedBounds.width,
    height: fittedBounds.height,
  };
  syncSvgDimensions();
  const svgNamespace = "http://www.w3.org/2000/svg";
  const staticElements = new Set([
    "defs",
    "desc",
    "metadata",
    "style",
    "title",
  ]);
  diagramViewport = document.createElementNS(svgNamespace, "g");
  diagramViewport.dataset.mermaidViewport = "";
  [...nextSvg.children]
    .filter((child) => !staticElements.has(child.localName))
    .forEach((child) => diagramViewport.appendChild(child));
  nextSvg.appendChild(diagramViewport);
  const baseScale = getBaseScale(nextSvg);
  defaultZoom.value = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, baseScale > 0 ? defaultRenderScale / baseScale : 1),
  );
  zoom.value = defaultZoom.value;
  resetDefaultPan();
  resizeObserver?.observe(svgElement);
  syncSvgViewport();
};

const getPanBounds = (targetZoom = zoom.value) => {
  const canvas = previewCanvas.value;
  const svg = svgElement || diagramHost.value?.querySelector("svg");

  if (!canvas || !svg || !initialViewBox) {
    return { x: 0, y: 0 };
  }

  const baseScale = getBaseScale(svg);
  const contentWidth = initialViewBox.width * baseScale * targetZoom;
  const contentHeight = initialViewBox.height * baseScale * targetZoom;
  const getBoundary = (contentSize, viewportSize) =>
    contentSize >= viewportSize
      ? (contentSize - viewportSize) / 2 + PAN_BOUNDARY_SPACE
      : Math.max(
          PAN_BOUNDARY_SPACE,
          (viewportSize - contentSize) / 2 - PAN_BOUNDARY_SPACE,
        );

  return {
    x: getBoundary(contentWidth, canvas.clientWidth),
    y: getBoundary(contentHeight, canvas.clientHeight),
  };
};

const resetDefaultPan = () => {
  panX.value = 0;
  panY.value = 0;

  if (
    (!isLeftToRightDiagram.value && !isRightToLeftDiagram.value) ||
    !svgElement ||
    !initialViewBox
  ) {
    return;
  }

  const contentWidth =
    initialViewBox.width * getBaseScale(svgElement) * defaultZoom.value;
  if (contentWidth > svgElement.clientWidth) {
    const horizontalOffset =
      (contentWidth - svgElement.clientWidth) / 2 + getDiagramEdgeInset();
    panX.value = isLeftToRightDiagram.value
      ? horizontalOffset
      : -horizontalOffset;
  }
};

const syncResponsiveViewport = () => {
  if (!svgElement || !initialViewBox) return;

  const wasAtDefaultZoom =
    Math.abs(zoom.value - defaultZoom.value) < Number.EPSILON;
  const baseScale = getBaseScale(svgElement);
  defaultZoom.value = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      baseScale > 0 ? defaultRenderScale / baseScale : MIN_ZOOM,
    ),
  );

  if (wasAtDefaultZoom) {
    zoom.value = defaultZoom.value;
    resetDefaultPan();
  }
};

const syncResponsiveLabelScale = () => {
  syncSvgDimensions();
  syncResponsiveViewport();
  clampPan();
  syncSvgViewport();
};

const clampPan = (
  nextX = panX.value,
  nextY = panY.value,
  targetZoom = zoom.value,
) => {
  const bounds = getPanBounds(targetZoom);
  panX.value = Math.min(bounds.x, Math.max(-bounds.x, nextX));
  panY.value = Math.min(bounds.y, Math.max(-bounds.y, nextY));
};

const changeZoom = (delta) => {
  const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + delta));
  zoom.value = nextZoom;
  clampPan(panX.value, panY.value, nextZoom);
};

const handleCanvasKeydown = (event) => {
  if (["+", "="].includes(event.key)) {
    event.preventDefault();
    changeZoom(ZOOM_STEP);
  } else if (event.key === "-") {
    event.preventDefault();
    changeZoom(-ZOOM_STEP);
  } else if (event.key === "0") {
    event.preventDefault();
    zoom.value = defaultZoom.value;
    resetDefaultPan();
  }
};

const handleCanvasWheel = (event) => {
  if (event.deltaY === 0) return;
  changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
};

const startPan = (event) => {
  if (event.pointerType === "touch") {
    activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointers.size === 2) {
      const pointers = [...activePointers.entries()].slice(0, 2);
      const [, first] = pointers[0];
      const [, second] = pointers[1];
      pinchStart = {
        pointerIds: pointers.map(([pointerId]) => pointerId),
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        midpointX: (first.x + second.x) / 2,
        midpointY: (first.y + second.y) / 2,
        zoom: zoom.value,
        panX: panX.value,
        panY: panY.value,
      };
      panStart = null;
      dragging.value = true;
      return;
    }

    if (activePointers.size > 2) return;
  }

  if (event.button !== 0) return;

  dragging.value = true;
  panStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    panX: panX.value,
    panY: panY.value,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
};

const movePan = (event) => {
  if (activePointers.has(event.pointerId)) {
    activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  if (pinchStart) {
    const [first, second] = pinchStart.pointerIds.map((pointerId) =>
      activePointers.get(pointerId),
    );
    if (!first || !second) return;

    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        pinchStart.zoom * (distance / Math.max(1, pinchStart.distance)),
      ),
    );
    const midpointX = (first.x + second.x) / 2;
    const midpointY = (first.y + second.y) / 2;
    const canvasBounds = previewCanvas.value?.getBoundingClientRect();
    const canvasCenterX =
      (canvasBounds?.left ?? 0) + (canvasBounds?.width ?? 0) / 2;
    const canvasCenterY =
      (canvasBounds?.top ?? 0) + (canvasBounds?.height ?? 0) / 2;
    const startFocalX = pinchStart.midpointX - canvasCenterX;
    const startFocalY = pinchStart.midpointY - canvasCenterY;
    const currentFocalX = midpointX - canvasCenterX;
    const currentFocalY = midpointY - canvasCenterY;
    const zoomRatio = nextZoom / pinchStart.zoom;

    zoom.value = nextZoom;
    clampPan(
      currentFocalX - (startFocalX - pinchStart.panX) * zoomRatio,
      currentFocalY - (startFocalY - pinchStart.panY) * zoomRatio,
      nextZoom,
    );
    return;
  }

  if (!dragging.value || !panStart) return;

  clampPan(
    panStart.panX + event.clientX - panStart.pointerX,
    panStart.panY + event.clientY - panStart.pointerY,
  );
};

const endPan = (event) => {
  activePointers.delete(event.pointerId);

  if (pinchStart?.pointerIds.includes(event.pointerId)) {
    pinchStart = null;
    const remainingPointer = activePointers.entries().next().value;

    if (remainingPointer) {
      const [, point] = remainingPointer;
      panStart = {
        pointerX: point.x,
        pointerY: point.y,
        panX: panX.value,
        panY: panY.value,
      };
      dragging.value = true;
    } else {
      panStart = null;
      dragging.value = false;
    }
  } else if (activePointers.size === 0) {
    dragging.value = false;
    panStart = null;
  }

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};

const syncFullscreenState = () => {
  isFullscreen.value = document.fullscreenElement === viewerRoot.value;
  nextTick(() => {
    syncSvgCanvasWidth();
    initializeSvgViewport();
    syncResponsiveViewport();
    clampPan();
    syncSvgViewport();
  });
};

const toggleFullscreen = async () => {
  if (!canFullscreen.value) return;

  if (document.fullscreenElement === viewerRoot.value) {
    await document.exitFullscreen();
    return;
  }

  await viewerRoot.value.requestFullscreen();
};

onMounted(() => {
  desktopMediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  desktopMediaQuery.addEventListener("change", syncResponsiveLabelScale);

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      syncResponsiveViewport();
      clampPan();
      syncSvgViewport();
    });
    if (previewCanvas.value) resizeObserver.observe(previewCanvas.value);
  }
  canFullscreen.value = Boolean(
    viewerRoot.value?.requestFullscreen && document.exitFullscreen,
  );
  syncFullscreenState();
  document.addEventListener("fullscreenchange", syncFullscreenState);
  renderDiagram();
});

watch([zoom, panX, panY], syncSvgViewport, { flush: "post" });
watch(
  viewMode,
  (mode) => {
    if (mode === "preview" && renderStatus.value === "idle") {
      renderDiagram();
    }
  },
  { flush: "post" },
);
watch(
  () => props.source,
  () => {
    renderRequestId += 1;
    renderStatus.value = "idle";
    resetRenderedDiagram();
    diagramElement.value?.replaceChildren();

    if (viewMode.value === "preview") {
      renderDiagram();
    }
  },
  { flush: "post" },
);

onBeforeUnmount(() => {
  renderRequestId += 1;
  resizeObserver?.disconnect();
  desktopMediaQuery?.removeEventListener("change", syncResponsiveLabelScale);
  document.removeEventListener("fullscreenchange", syncFullscreenState);
});
</script>
