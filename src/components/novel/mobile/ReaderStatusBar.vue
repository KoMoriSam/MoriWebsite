<template>
  <footer
    ref="barRef"
    class="mt-auto flex h-6 min-h-6 shrink-0 items-center gap-3 overflow-hidden text-[0.6875rem] leading-6 text-base-content/55 tabular-nums"
    aria-label="阅读信息"
  >
    <span class="min-w-0 flex-1 truncate text-left">{{ statusTitle }}</span>
    <span class="shrink-0">{{ currentPage }} / {{ totalPages }}</span>
    <span class="shrink-0">{{ progressLabel }}</span>
  </footer>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  bookTitle: { type: String, default: "" },
  volumeTitle: { type: String, default: "" },
  chapterTitle: { type: String, default: "" },
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  readingProgress: { type: Number, default: 0 },
});

const barRef = ref(null);
const quotedBookTitle = computed(() => {
  const title = props.bookTitle.trim();
  if (!title) return "";
  return title.startsWith("《") && title.endsWith("》")
    ? title
    : `《${title}》`;
});
const statusTitle = computed(() => {
  if (props.currentPage > 1) {
    return props.chapterTitle.trim() || quotedBookTitle.value;
  }

  return [quotedBookTitle.value, props.volumeTitle.trim()]
    .filter(Boolean)
    .join("");
});
const progressLabel = computed(
  () => `${Math.min(100, Math.max(0, props.readingProgress)).toFixed(1)}%`,
);

defineExpose({ element: barRef });
</script>
