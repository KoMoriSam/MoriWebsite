<template>
  <nav
    v-if="variant === 'mobile'"
    data-mobile-reader-dock
    class="dock z-50 border-t border-base-300 bg-base-100/95"
    aria-label="移动阅读控制"
  >
    <button
      type="button"
      :disabled="!paginationReady"
      aria-label="打开使用帮助"
      @click="showReaderHint"
    >
      <i class="ri-information-line text-xl" aria-hidden="true"></i>
      <span class="dock-label">使用帮助</span>
    </button>

    <button
      type="button"
      :disabled="
        !paginationReady ||
        (isPagedMode ? safeCurrentPage <= 1 && !hasPrevious : !hasPrevious) ||
        isLoadingContent ||
        isDisabled
      "
      :aria-label="isPagedMode && safeCurrentPage > 1 ? '上一页' : '上一章'"
      @click="requestPrevious"
    >
      <i
        :class="
          isPagedMode && safeCurrentPage > 1
            ? 'ri-arrow-left-s-line'
            : 'ri-skip-left-line'
        "
        class="text-xl"
        aria-hidden="true"
      ></i>
      <span class="dock-label">
        {{ isPagedMode && safeCurrentPage > 1 ? "上一页" : "上一章" }}
      </span>
    </button>

    <button
      type="button"
      :disabled="!paginationReady"
      :aria-expanded="controlsOpen"
      aria-haspopup="dialog"
      :aria-label="controlButtonAriaLabel"
      @click="toggleControls"
    >
      <span class="text-sm leading-none font-bold tabular-nums my-1.75">
        {{
          isPagedMode ? `${safeCurrentPage} / ${safeTotalPages}` : "滚动阅读"
        }}
      </span>
      <span class="dock-label tabular-nums">
        {{ readingProgressLabel }}
      </span>
    </button>

    <button
      type="button"
      :disabled="
        !paginationReady ||
        (isPagedMode
          ? safeCurrentPage >= safeTotalPages && !hasNext
          : !hasNext) ||
        isLoadingContent ||
        isDisabled
      "
      :aria-label="
        isPagedMode && safeCurrentPage < safeTotalPages ? '下一页' : '下一章'
      "
      @click="requestNext"
    >
      <i
        :class="
          isPagedMode && safeCurrentPage < safeTotalPages
            ? 'ri-arrow-right-s-line'
            : 'ri-skip-right-line'
        "
        class="text-xl"
        aria-hidden="true"
      ></i>
      <span class="dock-label">
        {{
          isPagedMode && safeCurrentPage < safeTotalPages ? "下一页" : "下一章"
        }}
      </span>
    </button>

    <button
      type="button"
      :disabled="!paginationReady"
      aria-haspopup="dialog"
      aria-label="打开小说评论区"
      @click="openComments"
    >
      <i class="ri-chat-3-line text-xl" aria-hidden="true"></i>
      <span class="dock-label">评论</span>
    </button>
  </nav>

  <Teleport to="body">
    <dialog
      v-if="variant === 'mobile'"
      ref="controlsDialogRef"
      class="modal modal-bottom z-[90] sm:modal-middle"
      aria-labelledby="mobile-reader-controls-title"
      @cancel.prevent="closeControls"
      @close="handleDialogClosed('controls')"
    >
      <div
        class="modal-box flex max-h-[min(80dvh,44rem)] flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <header
          class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <h2
              id="mobile-reader-controls-title"
              class="truncate text-lg font-bold"
            >
              阅读控制
            </h2>
            <p class="text-sm text-base-content/60 tabular-nums">
              <template v-if="isPagedMode">
                本章 {{ safeCurrentPage }} / {{ safeTotalPages }} 页 ·
              </template>
              <template v-else>上下滚动 ·</template>
              阅读进度 {{ readingProgressLabel }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm shrink-0"
            aria-label="关闭阅读控制"
            @click="closeControls"
          >
            <i class="ri-close-line text-xl" aria-hidden="true"></i>
          </button>
        </header>

        <section class="min-h-0 overflow-y-auto p-4">
          <fieldset class="mb-4">
            <legend class="mb-2 text-sm font-medium">翻页方式</legend>
            <div role="tablist" class="tabs tabs-box w-full">
              <button
                type="button"
                role="tab"
                class="tab min-w-0 flex-1 gap-1.5"
                :class="{ 'tab-active': isPagedMode }"
                :aria-selected="isPagedMode"
                @click="changeReadingMode('paged')"
              >
                <i class="ri-arrow-left-right-line" aria-hidden="true"></i>
                <span>左右翻页</span>
              </button>
              <button
                type="button"
                role="tab"
                class="tab min-w-0 flex-1 gap-1.5"
                :class="{ 'tab-active': !isPagedMode }"
                :aria-selected="!isPagedMode"
                @click="changeReadingMode('scroll')"
              >
                <i class="ri-arrow-up-down-line" aria-hidden="true"></i>
                <span>上下滚动</span>
              </button>
            </div>
          </fieldset>

          <div class="mb-4 flex items-stretch gap-2">
            <button
              type="button"
              class="input input-sm flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 text-left"
              aria-haspopup="dialog"
              aria-label="书内搜索"
              @click="switchDialog('search')"
            >
              <i
                class="ri-search-line shrink-0 text-lg text-base-content/60"
                aria-hidden="true"
              ></i>
              <span class="min-w-0 flex-1 truncate text-base-content/55">
                书内搜索
              </span>
            </button>

            <form
              v-if="isPagedMode"
              class="join shrink-0"
              @submit.prevent="submitPageJump"
            >
              <input
                id="mobile-reader-page-jump"
                v-model.number="pageJumpValue"
                type="number"
                inputmode="numeric"
                :min="1"
                :max="safeTotalPages"
                class="input input-sm join-item h-11 w-16 px-2"
                aria-label="要跳转的页码"
              />
              <button
                type="submit"
                class="btn btn-sm join-item h-11 min-h-11 px-2"
                :disabled="!paginationReady"
              >
                <label for="mobile-reader-page-jump" class="sr-only">
                  跳转页码
                </label>
                跳转页码
              </button>
            </form>
          </div>

          <ul class="grid w-full grid-cols-4 gap-1 rounded-box bg-base-200 p-2">
            <li class="min-w-0">
              <button
                type="button"
                class="btn btn-ghost h-auto min-h-16 w-full min-w-0 flex-col gap-1 px-1 py-2"
                @click="goToCover"
              >
                <i class="ri-book-open-line text-xl" aria-hidden="true"></i>
                <span class="text-center text-xs leading-tight font-normal">
                  返回封面
                </span>
              </button>
            </li>
            <li class="min-w-0">
              <button
                type="button"
                class="btn btn-ghost h-auto min-h-16 w-full min-w-0 flex-col gap-1 px-1 py-2"
                @click="switchDialog('toc')"
              >
                <i class="ri-list-unordered text-xl" aria-hidden="true"></i>
                <span class="text-center text-xs leading-tight font-normal">
                  章节目录
                </span>
              </button>
            </li>
            <li class="min-w-0">
              <button
                type="button"
                class="btn btn-ghost h-auto min-h-16 w-full min-w-0 flex-col gap-1 px-1 py-2"
                @click="switchDialog('format')"
              >
                <i class="ri-font-size-2 text-xl" aria-hidden="true"></i>
                <span class="text-center text-xs leading-tight font-normal">
                  排版设置
                </span>
              </button>
            </li>
            <li class="min-w-0">
              <button
                type="button"
                class="btn btn-ghost h-auto min-h-16 w-full min-w-0 flex-col gap-1 px-1 py-2"
                :disabled="isLoadingContent"
                @click="refreshContent"
              >
                <i
                  class="ri-refresh-line text-xl"
                  :class="{ 'animate-spin': isLoadingContent }"
                  aria-hidden="true"
                ></i>
                <span class="text-center text-xs leading-tight font-normal">
                  {{ isLoadingContent ? "正在刷新" : "刷新内容" }}
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button type="button" aria-label="关闭阅读控制" @click="closeControls">
          关闭
        </button>
      </form>
    </dialog>

    <dialog
      v-if="variant === 'mobile'"
      ref="commentsDialogRef"
      class="modal modal-bottom z-[90] sm:modal-middle"
      aria-labelledby="mobile-reader-comments-title"
      @cancel.prevent="closeControls"
      @close="handleDialogClosed('comments')"
    >
      <div
        class="modal-box flex max-h-[min(80dvh,44rem)] flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <section class="min-h-0 overflow-y-auto p-4">
          <slot v-if="activeDialog === 'comments'" name="comments" />
        </section>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button type="button" aria-label="关闭小说评论" @click="closeControls">
          关闭
        </button>
      </form>
    </dialog>

    <dialog
      v-if="variant === 'mobile'"
      ref="searchDialogRef"
      class="modal modal-bottom z-[90] sm:modal-middle"
      aria-labelledby="mobile-reader-search-title"
      @cancel.prevent="switchDialog('controls')"
      @close="handleDialogClosed('search')"
    >
      <div
        class="modal-box flex max-h-[min(80dvh,44rem)] flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <header
          class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3"
        >
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm shrink-0"
            aria-label="返回阅读控制"
            @click="switchDialog('controls')"
          >
            <i class="ri-arrow-left-line text-xl" aria-hidden="true"></i>
          </button>
          <div class="min-w-0 flex-1">
            <h2
              id="mobile-reader-search-title"
              class="truncate text-lg font-bold"
            >
              书内搜索
            </h2>
          </div>
        </header>

        <section class="min-h-0 overflow-hidden p-4">
          <NovelContentSearch
            :active="activeDialog === 'search'"
            @select="closeControls"
          />
        </section>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button
          type="button"
          aria-label="退出小说搜索并返回阅读控制"
          @click="switchDialog('controls')"
        >
          关闭
        </button>
      </form>
    </dialog>

    <dialog
      v-if="variant === 'mobile'"
      ref="tocDialogRef"
      class="modal modal-bottom z-[90] sm:modal-middle"
      aria-labelledby="mobile-reader-toc-title"
      @cancel.prevent="switchDialog('controls')"
      @close="handleDialogClosed('toc')"
    >
      <div
        class="modal-box flex max-h-[min(80dvh,44rem)] flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <header
          class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3"
        >
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm shrink-0"
            aria-label="返回阅读控制"
            @click="switchDialog('controls')"
          >
            <i class="ri-arrow-left-line text-xl" aria-hidden="true"></i>
          </button>
          <h2
            id="mobile-reader-toc-title"
            class="min-w-0 flex-1 truncate text-lg font-bold"
          >
            章节目录
          </h2>
        </header>

        <section class="flex max-h-[min(68dvh,38rem)] min-h-0 flex-col p-4">
          <ChapterToc
            mobile
            embedded
            viewport-pagination
            :page-progress="pageProgress"
            @select="closeControls"
          />
        </section>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button
          type="button"
          aria-label="退出章节目录并返回阅读控制"
          @click="switchDialog('controls')"
        >
          关闭
        </button>
      </form>
    </dialog>

    <dialog
      v-if="variant === 'mobile'"
      ref="formatDialogRef"
      class="modal modal-bottom z-[90] sm:modal-middle"
      aria-labelledby="mobile-reader-format-title"
      @cancel.prevent="switchDialog('controls')"
      @close="handleDialogClosed('format')"
    >
      <div
        class="modal-box flex max-h-[min(80dvh,44rem)] flex-col overflow-hidden rounded-t-box p-0 sm:rounded-box"
      >
        <header
          class="flex shrink-0 items-center gap-2 border-b border-base-300 px-4 py-3"
        >
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm shrink-0"
            aria-label="返回阅读控制"
            @click="switchDialog('controls')"
          >
            <i class="ri-arrow-left-line text-xl" aria-hidden="true"></i>
          </button>
          <h2
            id="mobile-reader-format-title"
            class="min-w-0 flex-1 truncate text-lg font-bold"
          >
            排版设置
          </h2>
        </header>

        <section class="max-h-[min(68dvh,38rem)] min-h-0 overflow-y-auto p-4">
          <FormatSetting :show-header="false" />
        </section>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button
          type="button"
          aria-label="退出排版设置并返回阅读控制"
          @click="switchDialog('controls')"
        >
          关闭
        </button>
      </form>
    </dialog>
  </Teleport>

  <nav
    v-if="variant !== 'mobile'"
    class="mt-12 flex border-t border-base-300 pt-6 justify-between"
    aria-label="章节导航"
  >
    <button
      type="button"
      class="btn btn-sm md:btn-md gap-2 lg:gap-3"
      :disabled="!hasPrevious || isLoadingContent || isDisabled"
      @click="onHandlePrev"
    >
      <i class="ri-arrow-left-line"></i>
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
      <i class="ri-arrow-right-line"></i>
    </button>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import ChapterToc from "@/components/novel/ChapterToc.vue";
import NovelContentSearch from "@/components/novel/NovelContentSearch.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import { useChapters } from "@/composables/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";
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
const { currentChapter, currentChapterIndex, flatChapters, isLoadingContent } =
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
      await switchDialog(activeDialog.value || "controls");
      return;
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

const requestPage = (page) => {
  const target = Math.min(
    safeTotalPages.value,
    Math.max(1, Math.trunc(Number(page) || 1)),
  );
  if (target !== safeCurrentPage.value) emit("change-page", target);
};

const requestPrevious = () => {
  if (!props.paginationReady) return;
  if (isPagedMode.value && safeCurrentPage.value > 1) {
    requestPage(safeCurrentPage.value - 1);
    return;
  }
  emit("change-chapter", -1);
};

const requestNext = () => {
  if (!props.paginationReady) return;
  if (isPagedMode.value && safeCurrentPage.value < safeTotalPages.value) {
    requestPage(safeCurrentPage.value + 1);
    return;
  }
  emit("change-chapter", 1);
};

const goToCover = () => {
  closeControls();
  void router.push("/novel");
};

const closeControls = () => {
  activeDialog.value = null;
  emit("controls-open-change", false);
};
const handleDialogClosed = (name) => {
  if (activeDialog.value !== name) return;
  activeDialog.value = null;
  if (props.controlsOpen) emit("controls-open-change", false);
};
const toggleControls = () => {
  if (!props.paginationReady) return;
  emit("controls-open-change", !props.controlsOpen);
};
const openComments = () => {
  if (!props.paginationReady) return;
  if (props.controlsOpen) {
    void switchDialog("comments");
    return;
  }
  activeDialog.value = "comments";
  emit("controls-open-change", true);
};
const submitPageJump = () => {
  const target = Math.min(
    safeTotalPages.value,
    Math.max(1, Math.trunc(Number(pageJumpValue.value) || 1)),
  );
  pageJumpValue.value = target;
  requestPage(target);
  closeControls();
};
const refreshContent = () => {
  if (isLoadingContent.value) return;
  closeControls();
  emit("refresh-content");
};
const showReaderHint = () => {
  emit("show-reader-hint");
};
const changeReadingMode = (mode) => {
  if (
    mode === props.readingMode ||
    !Object.values(MOBILE_READING_MODES).includes(mode)
  ) {
    return;
  }

  emit("reading-mode-change", mode);
};

const onHandlePrev = () => handleClick(handlePrev);
const onHandleNext = () => handleClick(handleNext);

onBeforeUnmount(() => {
  activeDialog.value = null;
  closeAllDialogs();
});
</script>
