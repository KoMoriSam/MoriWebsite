<template>
  <span
    v-if="languageLabel"
    class="font-mono badge badge-ghost badge-sm bg-base-300 text-base-content absolute left-20 top-4"
  >
    {{ languageLabel }}
  </span>

  <div class="max-w-full overflow-x-auto scrollbar-thin pb-2">
    <pre
      v-for="(line, index) in highlightedLines"
      :key="index"
      class="bg-(--hljs-background) m-0! p-0 max-w-full overflow-visible! before:sticky before:left-0 before:bg-(--hljs-background) before:text-[color-mix(in_oklab,var(--hljs-foreground)_50%,transparent)] before:opacity-100! before:shadow-[2ch_0_0_var(--hljs-background)]"
      :data-prefix="index + 1"
    ><code class="hljs p-0! text-sm md:text-base inline-block! overflow-visible!" :class="`language-${language}`" v-html="line"></code></pre>
  </div>

  <client-only>
    <aside
      class="absolute right-2 top-2 tooltip tooltip-left font-mono"
      :class="copied ? 'tooltip-success' : ''"
      :data-tip="copied ? '复制成功' : '复制到剪贴板'"
    >
      <button
        class="btn btn-sm btn-square"
        @click="copy(code)"
        :class="{
          'btn-success': copied,
          'btn-ghost': !copied,
        }"
      >
        <i
          class="font-normal"
          :class="[copied ? 'ri-check-line' : 'ri-file-copy-line']"
        ></i>
      </button>
    </aside>
  </client-only>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import hljs from "highlight.js/lib/core";
import { computed, onMounted, ref, toRef, watch } from "vue";
import {
  getLanguageDisplayName,
  normalizeLanguage,
  preloadHighlightLanguages,
} from "@/utils/markdown/load-markdown-features";

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: "plaintext" },
});

const code = toRef(props, "code");
const languageLabel = computed(() => getLanguageDisplayName(props.language));

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

const { copy, copied } = useClipboard({
  source: code,
  legacy: true,
});
</script>
