<template>
  <nav
    class="mt-12 flex border-t border-base-300 pt-6 justify-between"
    aria-label="章节导航"
  >
    <button
      type="button"
      class="btn btn-sm md:btn-md gap-2 lg:gap-3"
      :disabled="!hasPrevious || isLoadingContent || isDisabled"
      @click="onHandlePrev"
    >
      <i class="ri-arrow-left-s-line"></i>
      <div class="flex flex-col items-start gap-0.5 leading-[1.1]">
        <span
          class="text-base-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
        >
          上一章
        </span>
        <span>{{ previousChapter?.title || "已经是第一章" }}</span>
      </div>
    </button>

    <button
      type="button"
      class="btn btn-neutral btn-sm md:btn-md gap-2 lg:gap-3"
      :disabled="!hasNext || isLoadingContent || isDisabled"
      @click="onHandleNext"
    >
      <div class="flex flex-col items-end gap-0.5 leading-[1.1]">
        <span
          class="text-neutral-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
        >
          下一章
        </span>
        <span>{{ nextChapter?.title || "已经是最新章" }}</span>
      </div>
      <i class="ri-arrow-right-s-line"></i>
    </button>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { useChapters } from "@/composables/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";
import { useModalClose } from "@/composables/useModal";
import { useNovelStore } from "@/stores/novelStore";
import { MOBILE_READING_MODES } from "@/constants/reader";

const props = defineProps({
  variant: {
    type: String,
    default: "desktop",
    validator: (value) => ["desktop", "mobile"].includes(value),
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  paginationReady: {
    type: Boolean,
    default: true,
  },
  controlsOpen: {
    type: Boolean,
    default: false,
  },
  readingProgress: {
    type: Number,
    default: 0,
  },
  pageProgress: {
    type: Number,
    default: 0,
  },
  readingMode: {
    type: String,
    default: MOBILE_READING_MODES.PAGED,
    validator: (value) => Object.values(MOBILE_READING_MODES).includes(value),
  },
});

const emit = defineEmits([
  "change-page",
  "change-chapter",
  "controls-open-change",
  "refresh-content",
  "show-reader-hint",
  "reading-mode-change",
]);
const router = useRouter();

const novelStore = useNovelStore();
const { currentChapterIndex, flatChapters, isLoadingContent } =
  storeToRefs(novelStore);

const { hasPrevious, hasNext, handlePrev, handleNext } = useChapters();
const { isDisabled, handleClick } = useClickLimit();

const safeTotalPages = computed(() =>
  Math.max(1, Math.trunc(Number(props.totalPages) || 1)),
);
const safeCurrentPage = computed(() =>
  Math.min(
    safeTotalPages.value,
    Math.max(1, Math.trunc(Number(props.currentPage) || 1)),
  ),
);
const safeReadingProgress = computed(() =>
  Math.min(100, Math.max(0, Number(props.readingProgress) || 0)),
);
const readingProgressLabel = computed(
  () => `${safeReadingProgress.value.toFixed(1)}%`,
);
const isPagedMode = computed(
  () => props.readingMode === MOBILE_READING_MODES.PAGED,
);
const controlButtonAriaLabel = computed(() =>
  isPagedMode.value
    ? `总阅读进度 ${readingProgressLabel.value}，本章第 ${safeCurrentPage.value} 页，共 ${safeTotalPages.value} 页，点击打开阅读控制`
    : `总阅读进度 ${readingProgressLabel.value}，当前为上下滚动阅读，点击打开阅读控制`,
);
const pageJumpValue = ref(1);
const controlsDialogRef = ref(null);
const searchDialogRef = ref(null);
const tocDialogRef = ref(null);
const formatDialogRef = ref(null);
const commentsDialogRef = ref(null);
const activeDialog = ref(null);

const getDialog = (name) => {
  if (name === "controls") return controlsDialogRef.value;
  if (name === "search") return searchDialogRef.value;
  if (name === "toc") return tocDialogRef.value;
  if (name === "format") return formatDialogRef.value;
  if (name === "comments") return commentsDialogRef.value;
  return null;
};

const closeAllDialogs = () => {
  [
    controlsDialogRef.value,
    searchDialogRef.value,
    tocDialogRef.value,
    formatDialogRef.value,
    commentsDialogRef.value,
  ].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
};
const closeControlsImmediately = () => {
  activeDialog.value = null;
  closeAllDialogs();
  if (props.controlsOpen) emit("controls-open-change", false);
};
const controlsModal = useModalClose({
  onClose: closeControlsImmediately,
});

const switchDialog = async (name) => {
  const previousName = activeDialog.value;
  activeDialog.value = name;

  const previousDialog = getDialog(previousName);
  if (previousDialog?.open) previousDialog.close();

  await nextTick();
  const dialog = getDialog(name);
  if (
    props.controlsOpen &&
    activeDialog.value === name &&
    dialog?.isConnected &&
    !dialog.open
  ) {
    dialog.showModal();
  }
};

watch(
  () => props.controlsOpen,
  async (open) => {
    if (open) {
      pageJumpValue.value = safeCurrentPage.value;
      controlsModal.activate();
      await switchDialog(activeDialog.value || "controls");
      return;
    }

    if (controlsModal.isActive()) {
      controlsModal.discard({ close: false });
    }
    activeDialog.value = null;
    closeAllDialogs();
  },
  { immediate: true },
);

const previousChapter = computed(
  () => flatChapters.value[currentChapterIndex.value - 1],
);
const nextChapter = computed(
  () => flatChapters.value[currentChapterIndex.value + 1],
);

const onHandlePrev = () => handleClick(handlePrev);
const onHandleNext = () => handleClick(handleNext);

onBeforeUnmount(() => {
  activeDialog.value = null;
  closeAllDialogs();
});
</script>
