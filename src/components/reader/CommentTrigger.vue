<template>
  <button
    v-if="count > 0"
    type="button"
    class="comment-trigger reader-header-comment-trigger has-count group"
    :data-paragraph-id="paragraphId"
    :data-source-type="sourceType"
    aria-label="打开段评"
    @click="requestOpen"
  >
    <i class="ri-more-fill text-lg" aria-hidden="true"></i>
    <span
      class="paragraph-comment-count"
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
