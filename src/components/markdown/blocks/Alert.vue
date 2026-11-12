<template>
  <details
    role="alert"
    class="alert alert-soft alert-vertical sm:gap-2"
    :class="[
      `bg-transparent border-${type}`,
      foldable && ['collapse', 'collapse-arrow'],
    ]"
    :open="!foldable || !collapsed"
    data-markdown-alert
    :data-system-label="defaultTitle || undefined"
  >
    <summary
      class="alert-title"
      :class="
        foldable
          ? `text-${type} collapse-title`
          : `text-${type} pointer-events-none`
      "
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
import RenderedContent from "@/components/markdown/RenderedContent.vue";

defineProps({
  type: { type: String, default: "info" },
  icon: { type: String, default: "ri-information-line" },
  titleHtml: { type: String, default: "" },
  defaultTitle: { type: String, default: "" },
  foldable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
});
</script>

<style scoped>
@reference "@/assets/main.css";

details.alert {
  @apply block w-full max-w-full box-border
    border-l-4 border-0 rounded-s-none
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
