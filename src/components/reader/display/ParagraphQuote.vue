<template>
  <blockquote class="paragraph-comment-title m-0 border-s-3 border-s-base-content/25 ps-1.5">
    <div
      :lang="lang"
      style="--para-font-size: 0.875rem; --para-margin-inline: 0px"
      :style="{ '--para-line-height': READER_STYLE_DEFAULTS.lineHeight }"
      class="markdown markdown-reading prose flow-root min-w-0 w-full max-w-full font-sans font-normal [&_img.preview-image]:max-h-40 [&_img.preview-image]:object-contain"
    >
      <RenderedContent :html="html" :resolver="resolver" />
    </div>
  </blockquote>
</template>

<script setup>
import RenderedContent from "@/components/markdown/RenderedContent.vue";
import { READER_STYLE_DEFAULTS } from "@/constants/reader";

defineProps({
  html: { type: String, default: "" },
  lang: { type: String, default: "" },
  resolver: { type: Function, default: null },
});
</script>
