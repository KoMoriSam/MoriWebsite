<template>
  <details
    role="alert"
    class="alert alert-soft alert-vertical sm:gap-2"
    :class="[
      `alert-${type} border-[color:var(--alert-color)]`,
      foldable && ['collapse', 'collapse-arrow'],
    ]"
    :open="!foldable || !collapsed"
    data-markdown-alert
  >
    <summary
      class="alert-title"
      :class="foldable ? 'collapse-title' : 'pointer-events-none'"
    >
      <i :class="icon"></i>
      <h6><RenderedContent :html="titleHtml" /></h6>
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
  foldable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
});
</script>
