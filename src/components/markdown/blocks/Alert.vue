<template>
  <details
    role="alert"
    class="alert alert-soft markdown-block bg-transparent"
    :class="[colors.border, foldable && ['collapse', 'collapse-arrow']]"
    :open="!foldable || !collapsed"
    data-markdown-alert
    :data-system-label="defaultTitle || undefined"
  >
    <summary
      class="alert-title"
      :class="[
        colors.title,
        foldable ? 'collapse-title' : 'pointer-events-none',
      ]"
    >
      <i :class="icon"></i>
      <span class="alert-heading">
        <RenderedContent :html="titleHtml" />
      </span>
    </summary>
    <div class="alert-content">
      <slot />
    </div>
  </details>
</template>

<script setup>
import { computed } from "vue";
import RenderedContent from "@/components/markdown/RenderedContent.vue";

const props = defineProps({
  type: { type: String, default: "info" },
  icon: { type: String, default: "ri-information-line" },
  titleHtml: { type: String, default: "" },
  defaultTitle: { type: String, default: "" },
  foldable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
});

const colorsByType = {
  info: { border: "border-info", title: "text-info" },
  success: { border: "border-success", title: "text-success" },
  warning: { border: "border-warning", title: "text-warning" },
  error: { border: "border-error", title: "text-error" },
  muted: { border: "border-base-content/30", title: "text-base-content/70" },
};

const colors = computed(() =>
  Object.hasOwn(colorsByType, props.type)
    ? colorsByType[props.type]
    : colorsByType.info,
);
</script>

<style scoped>
@reference "@/assets/main.css";

details.alert {
  @apply block w-full max-w-full box-border rounded-none text-start;
  border-width: 0;
  border-inline-start-width: 4px;
  padding: var(--md-component-gap) var(--md-component-padding);
}

summary.alert-title {
  @apply flex w-full min-w-0 items-center box-border p-0 text-start;
  gap: var(--md-component-gap);
  font-size: var(--md-component-detail-size);
  line-height: 1.25;
}

summary.alert-title > i {
  flex: none;
  font-size: var(--md-component-icon);
  line-height: 1;
}

/* daisyUI's collapse arrow normally floats over the summary. Here it is
   the final flex item, so it stays aligned when the title wraps. */
details.alert.collapse-arrow > summary.alert-title::after {
  position: static;
  flex: none;
  inline-size: calc(var(--md-component-icon) * 0.5);
  block-size: calc(var(--md-component-icon) * 0.5);
  margin-inline: 0.125rem;
  align-self: center;
  translate: 0 0.1875rem;
}

.alert-heading {
  @apply min-w-0 font-serif font-medium;
}

.alert-content {
  --md-indent: 0px;
  --md-list-offset: 0px;
  --md-align: start;
  --md-text-size: var(--md-component-detail-size);
  --md-block-gap: var(--md-component-gap);
  --md-list-item-gap: var(--md-block-gap);
  color: var(--color-base-content);
  text-align: start;
}

.alert-content :deep(> :last-child),
.alert-content :deep(> :is(ul, ol, blockquote):last-child > :last-child),
.alert-content :deep(> :is(ul, ol):last-child > li:last-child > p:last-child),
.alert-content :deep(> .markdown-table-scroll:last-child > .markdown-table-wrapper) {
  margin-block-end: 0;
}

.alert-content :deep(> :is(h1, h2, h3, h4, h5, h6):last-child) {
  padding-block-end: 0;
}
</style>
