<template>
  <blockquote class="paragraph-comment-title m-0 border-s-3 border-s-base-content/25 ps-1.5">
    <div
      :lang="lang"
      style="
        --para-font-size: 0.875rem;
        --para-line-height: 1.6;
        --para-letter-spacing: 0px;
        --para-margin-inline: 0px;
        --para-text-indent: 0px;
      "
      class="markdown-content prose flow-root min-w-0 w-full max-w-full font-sans font-normal text-(length:--para-font-size) leading-(--para-line-height) tracking-(--para-letter-spacing) text-pretty text-justify prose-blockquote:[quotes:none] prose-blockquote:font-serif prose-blockquote:font-light prose-blockquote:not-italic prose-a:text-primary prose-a:no-underline prose-a:hover:underline [&_img.preview-image]:max-h-40 [&_img.preview-image]:object-contain"
    >
      <RenderedContent :html="html" :resolver="resolver" />
    </div>
  </blockquote>
</template>

<script setup>
import RenderedContent from "@/components/markdown/RenderedContent.vue";

defineProps({
  html: { type: String, default: "" },
  lang: { type: String, default: "" },
  resolver: { type: Function, default: null },
});
</script>

<style scoped src="@/assets/reader.css"></style>
