<template>
  <aside
    v-if="notes.length"
    ref="rootRef"
    class="page-footnotes markdown-content prose absolute inset-x-0 z-10 max-w-none overflow-y-auto bg-base-100/95"
    :class="{ 'page-footnotes-measure': measure }"
    aria-label="本页脚注"
    data-reader-interactive
  >
    <div ref="contentRef" class="page-footnotes-content">
      <hr class="footnotes-sep" />
      <section class="footnotes">
        <ol class="footnotes-list">
          <li
            v-for="note in notes"
            :key="note.id"
            :value="getNoteNumber(note.label)"
            class="footnote-item"
          >
            <p class="text-justify text-pretty">{{ note.text }}</p>
          </li>
        </ol>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import {
  calculateTextRectBaseline,
  resetTextBaselineMetrics,
} from "@/utils/reader/measure-mobile-pages";

const props = defineProps({
  notes: {
    type: Array,
    default: () => [],
  },
  measure: {
    type: Boolean,
    default: false,
  },
});

const rootRef = ref(null);
const contentRef = ref(null);
let alignmentFrame = 0;
let resizeObserver;

const getNoteNumber = (label) => {
  const number = Number.parseInt(String(label || ""), 10);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const findLastFootnoteTextRect = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let lastNode = null;
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) lastNode = node;
    node = walker.nextNode();
  }
  if (!lastNode) return null;

  const range = document.createRange();
  range.selectNodeContents(lastNode);
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  range.detach?.();
  const rect = rects[rects.length - 1];
  return rect
    ? {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        textElement: lastNode.parentElement,
      }
    : null;
};

const alignLastFootnoteBaseline = async () => {
  window.cancelAnimationFrame(alignmentFrame);
  await nextTick();
  alignmentFrame = window.requestAnimationFrame(() => {
    const root = rootRef.value;
    const content = contentRef.value;
    const viewport = root?.closest(".mobile-page-viewport");
    const article = viewport?.querySelector(".mobile-page-article");
    if (!root || !content || !viewport || !article || props.measure) return;

    content.style.setProperty("--reader-footnote-baseline-shift", "0px");
    resetTextBaselineMetrics();
    const textRect = findLastFootnoteTextRect(content);
    if (!textRect) return;

    const style = window.getComputedStyle(root);
    const lineHeight = Number.parseFloat(
      style.getPropertyValue("--reader-page-line-height"),
    );
    const pagePadding = Number.parseFloat(
      window.getComputedStyle(article).paddingBlockStart,
    );
    const baselineOffset = Number.parseFloat(
      style.getPropertyValue("--reader-page-baseline-offset"),
    );
    if (![lineHeight, pagePadding, baselineOffset].every(Number.isFinite)) {
      return;
    }

    const viewportTop = viewport.getBoundingClientRect().top;
    const baseline = calculateTextRectBaseline(textRect);
    const baselineToBottom = Math.max(0, textRect.bottom - baseline);
    const firstGridBaseline = viewportTop + pagePadding + baselineOffset;
    const pageContentBottom = root.getBoundingClientRect().bottom;
    const targetBaseline =
      firstGridBaseline +
      Math.floor(
        (pageContentBottom - baselineToBottom - firstGridBaseline + 0.5) /
          lineHeight,
      ) *
        lineHeight;
    const availableShift = Math.max(
      0,
      root.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom,
    );
    const shift = Math.min(
      availableShift,
      Math.max(0, targetBaseline - baseline),
    );
    content.style.setProperty(
      "--reader-footnote-baseline-shift",
      `${shift}px`,
    );
  });
};

const observeFootnoteElements = () => {
  resizeObserver?.disconnect();
  if (rootRef.value) resizeObserver?.observe(rootRef.value);
  if (contentRef.value) resizeObserver?.observe(contentRef.value);
};

watch(
  () => props.notes.map((note) => `${note.id}:${note.text}`).join("|"),
  alignLastFootnoteBaseline,
  { flush: "post" },
);

watch(
  [rootRef, contentRef],
  () => {
    observeFootnoteElements();
    void alignLastFootnoteBaseline();
  },
  { flush: "post" },
);

onMounted(() => {
  resizeObserver = new ResizeObserver(alignLastFootnoteBaseline);
  observeFootnoteElements();
  document.fonts?.ready.then(alignLastFootnoteBaseline);
  void alignLastFootnoteBaseline();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.cancelAnimationFrame(alignmentFrame);
});
</script>

<!-- 与桌面正文使用同一份脚注字体、字号和 marker 规则。reader.css 是
     scoped 样式，必须在本组件作用域内再次引入，不能依赖 Markdown.vue
     的 scope 属性穿透到这个同级浮层。 -->
<style scoped src="@/assets/reader.css"></style>

<style scoped>
.page-footnotes {
  bottom: var(--reader-page-padding-block);
  height: var(--reader-footnote-reserve);
  padding: 0;
  overscroll-behavior: contain;
}

.page-footnotes-content {
  transform: translateY(var(--reader-footnote-baseline-shift, 0px));
}

.page-footnotes.markdown-content.prose
  > .page-footnotes-content
  > .footnotes-sep {
  margin-block: 0 calc(var(--para-font-size) * 0.25);
  margin-inline: 0;
  padding: 0;
}

.page-footnotes.markdown-content.prose .footnotes,
.page-footnotes.markdown-content.prose .footnotes-list {
  margin: 0;
  padding-block: 0;
}

.page-footnotes.markdown-content.prose .footnotes-list {
  padding-inline-start: 1.5em;
}

.page-footnotes.markdown-content.prose .footnote-item {
  margin: 0;
  padding: 0;
}

.page-footnotes.markdown-content.prose .footnote-item + .footnote-item {
  margin-block-start: calc(var(--para-font-size) * 0.125);
}

.page-footnotes.markdown-content.prose .footnotes p {
  margin: 0;
  padding: 0;
}

.page-footnotes-measure {
  position: static;
  inset: auto;
  height: auto;
  overflow: visible;
}
</style>
