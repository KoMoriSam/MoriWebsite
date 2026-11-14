<template>
  <details
    role="alert"
    class="alert alert-soft alert-vertical bg-transparent sm:gap-2"
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
      <h6>
        <RenderedContent :html="titleHtml" />
      </h6>
    </summary>
    <slot />
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
  @apply block w-full max-w-full box-border
    border-l-4 border-0 rounded-none
    text-left justify-items-stretch;
}

details.alert > summary.alert-title {
  @apply flex w-full max-w-full min-w-0
    items-center box-border gap-2 p-0 text-left;
}

details.alert > summary.alert-title h6 {
  @apply flex-initial min-w-0 p-0 indent-0 font-serif;
}

.collapse-arrow > .collapse-title::after {
  @apply static! shrink-0! self-center! translate-y-0.75!;
}

details.alert.collapse > summary.alert-title {
  @apply w-full;
}

details.alert > :not(summary.alert-title) {
  @apply w-full text-justify;
}

details.alert > p,
details.alert > ul,
details.alert > ol {
  @apply w-full;
}

details.alert p,
details.alert ul li,
details.alert ol li {
  @apply indent-0 text-base-content py-0 mt-2 mb-1;
}

details.alert ul li,
details.alert ol li {
  @apply ps-0 indent-0;
}
</style>
