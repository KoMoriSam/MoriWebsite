<template>
  <section
    class="not-prose flex w-full flex-col relative mx-auto my-4 max-w-full overflow-hidden rounded-box border border-base-300 bg-base-100 font-sans"
    data-markdown-code-block
  >
    <header
      class="flex shrink-0 select-none items-center justify-between gap-2 border-b border-base-300 bg-base-100 py-0.5 ps-3 pe-2"
    >
      <hgroup
        class="flex min-w-0 items-center text-sm font-medium text-base-content"
      >
        <i
          :class="languageIcon"
          class="me-2 text-lg font-normal"
          aria-hidden="true"
        ></i>
        <h2 v-if="languageLabel" class="truncate">{{ languageLabel }}</h2>
      </hgroup>

      <client-only>
        <aside
          class="tooltip tooltip-left font-mono"
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
    </header>

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
  </section>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
import hljs from "highlight.js/lib/core";
import { computed, onMounted, ref, toRef, watch } from "vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";
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

const languageIcon = computed(() => {
  const iconMap = {
    // 有对应 Logo
    JavaScript: "ri-javascript-line",
    Java: "ri-java-line",
    PHP: "ri-php-line",
    HTML: "ri-html5-line",
    CSS: "ri-css3-line",
    Markdown: "ri-markdown-line",
    Vue: "ri-vuejs-line",
    React: "ri-reactjs-line",
    Angular: "ri-angularjs-line",

    // 数据 / 查询
    SQL: "ri-database-2-line",
    GraphQL: "ri-node-tree",

    // Shell / 命令行
    Bash: "ri-terminal-line",
    Shell: "ri-terminal-line",
    Zsh: "ri-terminal-line",
    PowerShell: "ri-terminal-line",
    Fish: "ri-terminal-line",
    Batch: "ri-terminal-line",

    // 配置 / 数据格式
    JSON: "ri-braces-line",
    JSON5: "ri-braces-line",
    "JSON with Comments": "ri-braces-line",
    YAML: "ri-braces-line",
    TOML: "ri-settings-3-line",
    INI: "ri-settings-3-line",
    Properties: "ri-settings-3-line",
    XML: "ri-code-s-line",

    // 构建 / 部署 / 服务配置
    Dockerfile: "ri-code-box-line",
    Makefile: "ri-tools-line",
    NGINX: "ri-file-settings-line",

    // 文档 / 模板
    LaTeX: "ri-file-text-line",
    "Plain Text": "ri-file-text-line",
    txt: "ri-file-text-line",

    // 特殊代码块
    Diff: "ri-git-commit-line",
    Mermaid: "ri-flow-chart",
    "Protocol Buffers": "ri-file-code-line",
  };

  return iconMap[languageLabel.value] || "ri-code-s-slash-line";
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

const { copy, copied } = useClipboard({
  source: code,
  legacy: true,
});
</script>
