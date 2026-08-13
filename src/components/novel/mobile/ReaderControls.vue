<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="controlsOpen"
        class="fixed inset-0 z-[60] bg-neutral/35"
        data-mobile-reader-controls
        aria-label="阅读控制已打开，点击控制区域以外收起"
        @pointerdown.self="closeAll"
      >
        <div class="pointer-events-none absolute inset-x-0 bottom-0">
          <Transition
            appear
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-4 opacity-0"
          >
            <div class="pointer-events-auto">
              <div class="mb-2 flex justify-center gap-3 px-2">
                <button
                  type="button"
                  class="btn shadow-sm"
                  aria-label="书内搜索"
                  @click="openDialog('search')"
                >
                  <i
                    class="ri-search-line text-xl font-normal"
                    aria-hidden="true"
                  ></i>
                  搜索
                </button>
                <button
                  type="button"
                  class="btn shadow-sm"
                  aria-label="使用帮助"
                  @click="showHelp"
                >
                  <i
                    class="ri-question-line text-xl font-normal"
                    aria-hidden="true"
                  ></i>
                  帮助
                </button>
                <button
                  type="button"
                  class="btn shadow-sm"
                  :disabled="isLoadingContent"
                  aria-label="刷新内容"
                  @click="refreshContent"
                >
                  <i
                    class="ri-refresh-line text-xl font-normal"
                    :class="{ 'animate-spin': isLoadingContent }"
                    aria-hidden="true"
                  ></i>
                  刷新
                </button>
              </div>

              <nav
                class="w-full border-t border-base-300 bg-base-100/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md"
                aria-label="移动阅读控制"
              >
                <div
                  class="grid min-h-14 w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-1 border-b border-base-300/70 px-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] sm:gap-2 sm:px-2"
                >
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-square mx-auto"
                    :disabled="!hasPrevious || isLoadingContent"
                    aria-label="上一章"
                    @click="emit('change-chapter', -1)"
                  >
                    <i class="ri-skip-left-line text-xl" aria-hidden="true"></i>
                  </button>
                  <label
                    class="flex min-w-0 flex-col gap-1 text-center text-[0.6875rem] text-base-content/55 tabular-nums"
                  >
                    <span
                      >{{
                        isPagedMode
                          ? `本章已读 ${safeCurrentPage} 页 / 共 ${safeTotalPages} 页`
                          : `本章已读 ${pageProgressLabel}`
                      }}
                      · 全书进度 {{ readingProgressLabel }}</span
                    >
                    <input
                      type="range"
                      class="range range-xs w-full"
                      :min="progressMin"
                      :max="progressMax"
                      :value="progressValue"
                      :disabled="!paginationReady"
                      aria-label="调整本章阅读位置"
                      @input="handleProgressInput"
                    />
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-square mx-auto"
                    :disabled="!hasNext || isLoadingContent"
                    aria-label="下一章"
                    @click="emit('change-chapter', 1)"
                  >
                    <i
                      class="ri-skip-right-line text-xl"
                      aria-hidden="true"
                    ></i>
                  </button>
                </div>

                <div
                  class="dock dock-sm relative! inset-auto! grid h-16 min-h-16 w-full! max-w-none grid-cols-5 bg-transparent px-0"
                >
                  <button type="button" @click="goToCover">
                    <i class="ri-book-open-line text-xl" aria-hidden="true"></i
                    ><span class="dock-label">返回封面</span>
                  </button>
                  <button type="button" @click="openDialog('toc')">
                    <i class="ri-list-unordered text-xl" aria-hidden="true"></i
                    ><span class="dock-label">章节目录</span>
                  </button>
                  <button type="button" @click="openDialog('comments')">
                    <i class="ri-chat-3-line text-xl" aria-hidden="true"></i
                    ><span class="dock-label">评论区</span>
                  </button>
                  <button type="button" @click="openDialog('format')">
                    <i class="ri-font-size-2 text-xl" aria-hidden="true"></i
                    ><span class="dock-label">界面排版</span>
                  </button>
                  <button type="button" @click="openDialog('more')">
                    <i class="ri-settings-3-line text-xl" aria-hidden="true"></i
                    ><span class="dock-label">更多设置</span>
                  </button>
                </div>
              </nav>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <dialog
      ref="searchDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box flex max-h-[72dvh] flex-col rounded-t-box p-0">
        <DialogHeader title="书内搜索" @back="requestCloseDialog" />
        <section class="min-h-0 overflow-hidden p-4">
          <NovelContentSearch
            :active="activeDialog === 'search'"
            :initial-keyword="searchKeyword"
            :before-navigate="prepareDialogNavigation"
            @select="closeAll"
          />
        </section>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">返回阅读控制</button>
      </form>
    </dialog>

    <dialog
      ref="tocDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box flex max-h-[76dvh] flex-col rounded-t-box p-0">
        <DialogHeader title="章节目录" @back="requestCloseDialog" />
        <section class="min-h-0 p-4">
          <ChapterToc
            mobile
            embedded
            viewport-pagination
            :page-progress="pageProgress"
            :before-select="prepareDialogNavigation"
            @select="closeAll"
          />
        </section>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">返回阅读控制</button>
      </form>
    </dialog>

    <dialog
      ref="formatDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div
        class="modal-box flex h-dvh max-h-dvh flex-col overflow-hidden rounded-none p-0 sm:h-[min(90dvh,52rem)] sm:max-h-[min(90dvh,52rem)] sm:rounded-box"
      >
        <DialogHeader
          title="界面排版"
          subtitle="调整后可在下方即时预览"
          @back="requestCloseDialog"
        >
          <template #action>
            <button
              type="button"
              class="btn btn-ghost btn-sm shrink-0"
              :disabled="isMobileLayoutDefault"
              @click="readerStore.resetMobileLayout"
            >
              <i class="ri-reset-left-line" aria-hidden="true"></i>
              恢复默认
            </button>
          </template>
        </DialogHeader>
        <FormatSetting mobile :show-header="false" />
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">返回阅读控制</button>
      </form>
    </dialog>

    <dialog
      ref="moreDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box max-h-[78dvh] overflow-y-auto rounded-t-box p-0">
        <DialogHeader title="更多设置" @back="requestCloseDialog" />
        <ReaderMoreSettings @edit-tap-zones="openTapZoneEditor" />
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">返回阅读控制</button>
      </form>
    </dialog>

    <dialog
      ref="commentsDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box flex max-h-[78dvh] flex-col rounded-t-box p-0">
        <DialogHeader
          :title="currentMapping === 'title' ? '本章说' : '本书说'"
          @back="requestCloseDialog"
        >
          <template #action>
            <button
              type="button"
              class="btn btn-info btn-soft btn-xs shrink-0"
              @click="commentToggle"
            >
              {{ currentMapping === "title" ? "切换本书说" : "切换本章说" }}
            </button>
          </template>
        </DialogHeader>
        <section class="min-h-0 flex-1 overflow-y-auto p-4">
          <Giscus
            :key="giscusKey"
            :repo="GISCUS.novelRepo.name"
            :repo-id="GISCUS.novelRepo.id"
            :category="GISCUS.categories.general.name"
            :category-id="GISCUS.categories.general.id"
            :mapping="giscusMapping"
            :term="giscusTerm"
            strict="0"
            reactions-enabled="1"
            emit-metadata="0"
            input-position="bottom"
            :theme="giscusTheme"
            lang="zh-CN"
            loading="lazy"
          />
        </section>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">返回阅读控制</button>
      </form>
    </dialog>

    <TapZoneEditor
      v-if="tapZoneEditorOpen"
      @close="requestCloseTapZoneEditor"
    />
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import Giscus from "@giscus/vue";
import { useNovelStore } from "@/stores/novelStore";
import { useReaderStore } from "@/stores/readerStore";
import { useThemeStore } from "@/stores/themeStore";
import { useChapters } from "@/composables/useChapters";
import { useGiscus } from "@/composables/useGiscus";
import { useModalClose } from "@/composables/useModal";
import { getChapterContextTitle } from "@/utils/format-chapter-label";
import CONFIG from "@/constants/config";
import {
  MOBILE_READING_MODES,
  MOBILE_READER_NAVBAR_HIDE_EVENT,
} from "@/constants/reader";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import NovelContentSearch from "@/components/novel/NovelContentSearch.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import ReaderMoreSettings from "./ReaderMoreSettings.vue";
import TapZoneEditor from "./TapZoneEditor.vue";
import DialogHeader from "./ReaderDialogHeader.vue";

const { GISCUS } = CONFIG;

const props = defineProps({
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  paginationReady: { type: Boolean, default: true },
  controlsOpen: Boolean,
  readingProgress: { type: Number, default: 0 },
  pageProgress: { type: Number, default: 0 },
  readingMode: { type: String, default: MOBILE_READING_MODES.PAGED },
});
const emit = defineEmits([
  "change-page",
  "change-chapter",
  "controls-open-change",
  "refresh-content",
  "show-reader-hint",
]);
const novelStore = useNovelStore();
const { currentChapter, isLoadingContent } = storeToRefs(novelStore);
const readerStore = useReaderStore();
const { isMobileLayoutDefault } = storeToRefs(readerStore);
const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);
const { hasPrevious, hasNext } = useChapters();
const router = useRouter();
const activeDialog = ref(null);
const searchKeyword = ref("");
const searchDialogRef = ref(null);
const tocDialogRef = ref(null);
const formatDialogRef = ref(null);
const moreDialogRef = ref(null);
const commentsDialogRef = ref(null);
const tapZoneEditorOpen = ref(false);
const safeTotalPages = computed(() =>
  Math.max(1, Math.trunc(props.totalPages || 1)),
);
const safeCurrentPage = computed(() =>
  Math.min(
    safeTotalPages.value,
    Math.max(1, Math.trunc(props.currentPage || 1)),
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
const progressMax = computed(() =>
  isPagedMode.value ? safeTotalPages.value : 100,
);
const progressMin = computed(() => (isPagedMode.value ? 1 : 0));
const progressValue = computed(() =>
  isPagedMode.value ? safeCurrentPage.value : Math.max(0, props.pageProgress),
);
const pageProgressLabel = computed(() => `${Math.round(props.pageProgress)}%`);
const { currentMapping, commentToggle } = useGiscus();
const giscusVersion = ref(0);
const giscusMapping = "specific";
const giscusTerm = computed(() =>
  currentMapping.value === "title"
    ? getChapterContextTitle(currentChapter.value)
    : GISCUS.defaultTerm,
);
const giscusKey = computed(
  () => `${currentMapping.value}-${giscusTerm.value}-${giscusVersion.value}`,
);
const dialogRefs = {
  search: searchDialogRef,
  toc: tocDialogRef,
  format: formatDialogRef,
  more: moreDialogRef,
  comments: commentsDialogRef,
};

const closeDialogImmediately = () => {
  const dialog = dialogRefs[activeDialog.value]?.value;
  if (dialog?.open) dialog.close();
  activeDialog.value = null;
  tapZoneEditorOpen.value = false;
};
const dialogClose = useModalClose({
  onClose: closeDialogImmediately,
});

const openDialog = async (name) => {
  if (!dialogRefs[name] || activeDialog.value === name) return;
  if (activeDialog.value) {
    dialogClose.discard();
  }

  activeDialog.value = name;
  await nextTick();
  const dialog = dialogRefs[name].value;
  if (!dialog || dialog.open) return;
  dialogClose.activate();
  dialog.showModal();
};

const requestCloseDialog = () => dialogClose.requestClose();
const requestPlatformCloseDialog = () => dialogClose.requestPlatformClose();
const openTapZoneEditor = async () => {
  dialogClose.discard();
  emit("controls-open-change", false);
  window.dispatchEvent(new Event(MOBILE_READER_NAVBAR_HIDE_EVENT));
  tapZoneEditorOpen.value = true;
  dialogClose.activate();
};
const requestCloseTapZoneEditor = () => dialogClose.requestClose();

const closeAll = () => {
  if (activeDialog.value || tapZoneEditorOpen.value) dialogClose.discard();
  emit("controls-open-change", false);
  window.dispatchEvent(new Event(MOBILE_READER_NAVBAR_HIDE_EVENT));
};
const prepareDialogNavigation = () => {
  const replaceDialogHistory = false;

  // 目标内容将自行完成路由更新，这里只同步关闭当前模态框。
  dialogClose.discard();
  emit("controls-open-change", false);
  window.dispatchEvent(new Event(MOBILE_READER_NAVBAR_HIDE_EVENT));
  return { replaceDialogHistory };
};
const handleProgressInput = (event) => {
  const value = Number(event.target.value);
  if (isPagedMode.value) emit("change-page", value);
  else emit("change-page", value);
};
const goToCover = () => {
  closeAll();
  void router.push({ name: "novel" });
};
const showHelp = () => {
  closeAll();
  emit("show-reader-hint");
};
const refreshContent = () => {
  if (isLoadingContent.value) return;
  emit("refresh-content");
};
const openControl = (detail) => {
  const request =
    typeof detail === "string" ? { name: detail, keyword: "" } : detail || {};
  if (!["toc", "search"].includes(request.name)) return;
  if (request.name === "search") searchKeyword.value = request.keyword || "";
  return openDialog(request.name);
};
const handleExternalDialogRequest = (event) => void openControl(event.detail);

defineExpose({ openControl });

onMounted(() => {
  window.addEventListener(
    "mobile-reader:open-control",
    handleExternalDialogRequest,
  );
});
onBeforeUnmount(() => {
  Object.values(dialogRefs).forEach(
    (item) => item.value?.open && item.value.close(),
  );
  window.removeEventListener(
    "mobile-reader:open-control",
    handleExternalDialogRequest,
  );
});
</script>
