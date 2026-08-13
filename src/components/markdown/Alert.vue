<template>
  <summary
    class="alert-title"
    :class="
      foldable
        ? 'collapse-title'
        : 'select-none pointer-events-none cursor-default'
    "
  >
    <i :class="icon"></i>
    <h6><RenderedContent :html="titleHtml" /></h6>
  </summary>
  <RenderedContent :html="contentHtml" />
</template>

<script setup>
import RenderedContent from "@/components/markdown/RenderedContent.vue";

defineProps({
  icon: { type: String, default: "ri-information-line" },
  titleHtml: { type: String, default: "" },
  contentHtml: { type: String, default: "" },
  foldable: { type: Boolean, default: false },
});
</script>
