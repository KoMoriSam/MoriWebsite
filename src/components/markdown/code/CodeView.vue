<template>
  <ScrollableContainer>
    <article class="mockup-code not-prose markdown-code-view">
      <pre
        v-for="(line, index) in highlightedLines"
        :key="index"
        class="code-line"
        :data-prefix="index + 1"
      ><code class="hljs" :class="`language-${language}`" v-html="line" /></pre>
    </article>
  </ScrollableContainer>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import hljs from "highlight.js/lib/core";
import { onMounted, ref, watch } from "vue";
import { sanitizeMarkdownHtml } from "@/utils/markdown/sanitize-html";
import {
  normalizeLanguage,
  preloadHighlightLanguages,
} from "@/utils/markdown/load-markdown-features";

const props = defineProps({
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: "plaintext",
  },
});

const normalizeCode = (value) =>
  value.replace(/\r\n?/g, "\n").replace(/\n$/, "");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const splitHighlightedCode = (html) => {
  const lines = [];
  const openTags = [];
  let currentLine = "";

  html.split(/(<span\b[^>]*>|<\/span>|\n)/g).forEach((part) => {
    if (!part) return;

    if (part === "\n") {
      lines.push(
        `${currentLine}${"</span>".repeat(openTags.length)}` || "&#8203;",
      );
      currentLine = openTags.join("");
      return;
    }

    if (part.startsWith("<span")) {
      openTags.push(part);
    } else if (part === "</span>") {
      openTags.pop();
    }

    currentLine += part;
  });

  lines.push(currentLine || "&#8203;");
  return lines;
};

const getPlainCodeLines = (value) =>
  normalizeCode(value)
    .split("\n")
    .map((line) => escapeHtml(line) || "&#8203;");

const highlightedLines = ref(getPlainCodeLines(props.code));

const highlightCode = async () => {
  const language = normalizeLanguage(props.language) || "plaintext";
  const currentCode = props.code;

  await preloadHighlightLanguages([language, "plaintext"]);

  if (
    currentCode !== props.code ||
    language !== (normalizeLanguage(props.language) || "plaintext")
  ) {
    return;
  }

  const resolvedLanguage = hljs.getLanguage(language) ? language : "plaintext";
  const highlightedCode = hljs.highlight(normalizeCode(currentCode), {
    language: resolvedLanguage,
    ignoreIllegals: true,
  }).value;

  // 清洗整段高亮结果，再按行分配，避免为每行单独解析 HTML。
  highlightedLines.value = splitHighlightedCode(
    sanitizeMarkdownHtml(highlightedCode),
  );
};

onMounted(highlightCode);
watch(
  () => [props.code, props.language],
  () => {
    highlightedLines.value = getPlainCodeLines(props.code);
    highlightCode();
  },
  { flush: "post" },
);
</script>

<style scoped>
@reference "@/assets/main.css";

.markdown-code-view {
  @apply max-w-full overflow-x-auto scrollbar-thin rounded-none;
  color: var(--hljs-foreground);
  background: var(--hljs-background);
  padding-block: var(--md-component-gap, 0.5rem);
  font-size: var(--md-component-detail-size, 0.875rem);
  line-height: 1.5;
}

.markdown-code-view::before {
  content: none;
}

.code-line {
  margin: 0;
  padding: 0;
  overflow: visible;
}

.code-line > code {
  display: inline-block;
  padding: 0;
}

.code-line::before {
  position: sticky;
  left: 0;
  opacity: 1;
  background: var(--hljs-background);
  color: color-mix(in oklab, var(--hljs-foreground) 50%, transparent);
  box-shadow: 2ch 0 0 var(--hljs-background);
}
</style>
