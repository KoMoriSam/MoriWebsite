<template>
  <article
    class="mockup-code before:content-none not-prose max-w-full overflow-x-auto scrollbar-thin bg-(--hljs-background) rounded-none py-2"
  >
    <pre
      v-for="(line, index) in highlightedLines"
      :key="index"
      class="m-0! p-0 max-w-full overflow-visible! before:sticky before:left-0 before:bg-(--hljs-background) before:text-[color-mix(in_oklab,var(--hljs-foreground)_50%,transparent)] before:opacity-100! before:shadow-[2ch_0_0_var(--hljs-background)]"
      :data-prefix="index + 1"
    ><code class="hljs p-0! text-sm md:text-base inline-block! overflow-visible!" :class="`language-${language}`"><RenderedContent :html="line" /></code></pre>
  </article>
</template>

<script setup>
import hljs from "highlight.js/lib/core";
import { onMounted, ref, watch } from "vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";
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

  highlightedLines.value = splitHighlightedCode(highlightedCode);
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
