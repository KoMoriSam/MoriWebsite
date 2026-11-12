<template>
  <Thread :key="paragraphId" :scope="sourceType === 'novel' ? 'novel-paragraph' : 'article-paragraph'"
    :target="paragraphId" scroll-mode="dialog" @count="updateCount" />
</template>

<script setup>
import Thread from "@/components/comments/Thread.vue";
const props = defineProps({
  paragraphId: { type: String, required: true },
  sourceType: {
    type: String, default: "article",
    validator: (value) => ["article", "novel"].includes(value),
  },
});

function updateCount(totalCommentCount) {
  document.dispatchEvent(new CustomEvent("paragraph-comment-metadata", {
    detail: { paragraphId: props.paragraphId, sourceType: props.sourceType, totalCommentCount },
  }));
}
</script>
