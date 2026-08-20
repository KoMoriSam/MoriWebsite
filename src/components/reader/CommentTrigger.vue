<template>
  <button
    type="button"
    class="comment-trigger reader-header-comment-trigger group"
    :class="{
      'has-count': count > 0,
      hidden: count <= 0,
    }"
    :data-paragraph-id="paragraphId"
    :data-source-type="sourceType"
    aria-label="打开段评"
    @click="requestOpen"
  >
    <i class="ri-more-fill text-lg" aria-hidden="true"></i>
    <span
      class="paragraph-comment-count"
      :class="{ hidden: count <= 0 }"
      :data-paragraph-id="paragraphId"
      :data-source-type="sourceType"
      aria-label="当前段评评论数"
    >
      {{ countLabel }}
    </span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useGlobalEventListener } from "@/composables/useGlobalEventListener";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

const props = defineProps({
  paragraphId: {
    type: String,
    required: true,
  },
  sourceType: {
    type: String,
    default: "article",
  },
});
const emit = defineEmits(["open"]);

const { getCount } = useParagraphCommentsStorage();
const count = ref(0);
const countLabel = computed(() => {
  if (count.value <= 0) return "";
  return count.value > 99 ? "99+" : `${count.value}`;
});

watch(
  () => [props.paragraphId, props.sourceType],
  () => {
    count.value = getCount(props.paragraphId, props.sourceType);
  },
  { immediate: true },
);

const handleParagraphMetadata = (event) => {
  if (
    event?.detail?.paragraphId !== props.paragraphId ||
    (event?.detail?.sourceType || "article") !== props.sourceType
  ) {
    return;
  }

  const nextCount = Number(event.detail.totalCommentCount ?? 0);
  count.value = Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0;
};
const { addEventListener: addParagraphMetadataListener } =
  useGlobalEventListener(
    "paragraph-comment-metadata",
    handleParagraphMetadata,
    false,
  );
addParagraphMetadataListener();

const requestOpen = (event) => {
  event.stopPropagation();
  emit("open", event);
  if (event.defaultPrevented) return;

  event.preventDefault();
  document.dispatchEvent(
    new CustomEvent("paragraph-comment-open", {
      detail: {
        paragraphId: props.paragraphId,
        sourceType: props.sourceType,
      },
    }),
  );
};
</script>

<style scoped>
@reference "@/assets/main.css";

.reader-header-comment-trigger {
  @apply relative z-0 ml-1 hidden h-4 min-h-0 w-6 min-w-6 -translate-y-0.5
    items-center justify-center overflow-visible pb-0.25 pl-0.5 whitespace-nowrap
    text-primary opacity-0 transition-[opacity,scale]
    before:absolute before:inset-0 before:bg-primary before:content-[''] before:mask-bubble
    hover:text-primary-content hover:before:mask-bubble-fill
    active:scale-80 active:text-primary-content active:before:mask-bubble-fill;
}

.reader-header-comment-trigger.has-count {
  @apply inline-flex opacity-100;
}

.reader-header-comment-trigger.has-count i {
  @apply hidden;
}

.reader-header-comment-trigger i,
.reader-header-comment-trigger .paragraph-comment-count {
  @apply z-10;
}

.reader-header-comment-trigger .paragraph-comment-count {
  @apply font-sans text-xs leading-none font-bold whitespace-nowrap;
}
</style>
