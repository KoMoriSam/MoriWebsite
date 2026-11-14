<template>
  <header
    class="markdown-code-header flex shrink-0 select-none items-center justify-between gap-(--md-component-gap,0.5rem) border-b border-base-300 bg-base-100 py-[calc(var(--md-component-gap,0.5rem)*0.5)] ps-(--md-component-padding,0.75rem) pe-[calc(var(--md-component-gap,0.5rem)*0.5)]"
  >
    <hgroup
      class="flex min-w-0 items-center gap-(--md-component-gap,0.5rem) text-(length:--md-component-detail-size,0.875rem) leading-tight font-medium text-base-content"
    >
      <i
        :class="header.icon"
        class="markdown-toolbar-icon font-normal"
        aria-hidden="true"
      ></i>
      <h6 v-if="title" class="font-mono truncate">{{ title }}</h6>
      <h6 v-else-if="header.label" class="font-mono font-bold truncate">
        {{ header.label }}
      </h6>
    </hgroup>

    <client-only>
      <slot name="actions"></slot>
    </client-only>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { getLanguageDisplayName } from "@/utils/markdown/load-markdown-features";

const props = defineProps({
  type: {
    type: String,
    default: "code",
    validator: (value) => ["code", "mermaid"].includes(value),
  },
  language: {
    type: String,
    default: "plaintext",
  },
  title: {
    type: String,
    default: "",
  },
});

const LANGUAGE_ICONS = {
  JavaScript: "ri-javascript-line",
  Java: "ri-java-line",
  PHP: "ri-php-line",
  HTML: "ri-html5-line",
  CSS: "ri-css3-line",
  Markdown: "ri-markdown-line",
  Vue: "ri-vuejs-line",
  React: "ri-reactjs-line",
  Angular: "ri-angularjs-line",
  SQL: "ri-database-2-line",
  GraphQL: "ri-node-tree",
  Bash: "ri-terminal-line",
  Shell: "ri-terminal-line",
  Zsh: "ri-terminal-line",
  PowerShell: "ri-terminal-line",
  Fish: "ri-terminal-line",
  Batch: "ri-terminal-line",
  JSON: "ri-braces-line",
  JSON5: "ri-braces-line",
  "JSON with Comments": "ri-braces-line",
  YAML: "ri-braces-line",
  TOML: "ri-settings-3-line",
  INI: "ri-settings-3-line",
  Properties: "ri-settings-3-line",
  XML: "ri-code-s-line",
  Dockerfile: "ri-code-box-line",
  Makefile: "ri-tools-line",
  NGINX: "ri-file-settings-line",
  LaTeX: "ri-file-text-line",
  "Plain Text": "ri-file-text-line",
  txt: "ri-file-text-line",
  Diff: "ri-git-commit-line",
  Mermaid: "ri-flow-chart",
  "Protocol Buffers": "ri-file-code-line",
};

const header = computed(() => {
  if (props.type === "mermaid") {
    return {
      label: "Mermaid",
      icon: "ri-flow-chart",
    };
  }

  const label = getLanguageDisplayName(props.language);
  return {
    label,
    icon: LANGUAGE_ICONS[label] || "ri-code-s-slash-line",
  };
});
</script>

<style scoped>
.markdown-code-header {
  --md-toolbar-icon: clamp(
    0.75rem,
    calc(var(--md-component-size, 1rem) * 0.75),
    1rem
  );
}

.markdown-code-header :deep(.markdown-toolbar-icon),
.markdown-code-header :deep(.markdown-control > i) {
  font-size: var(--md-toolbar-icon);
  line-height: 1;
}
</style>
