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
        :aria-label="translate('reader.readerControls.readingControlsAreOpenTapOutsideToClose')"
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
                  :aria-label="translate('reader.readerControls.searchInBook')"
                  @click="openDialog('search')"
                >
                  <i
                    class="ri-search-line text-xl"
                    aria-hidden="true"
                  ></i>
                  {{ translate('common.navBar.search') }}
                </button>
                <button
                  type="button"
                  class="btn shadow-sm"
                  :aria-label="translate('reader.readerControls.help')"
                  @click="showHelp"
                >
                  <i
                    class="ri-question-line text-xl"
                    aria-hidden="true"
                  ></i>
                  {{ translate('reader.readerControls.help2') }}
                </button>
                <button
                  type="button"
                  class="btn shadow-sm"
                  :disabled="isLoadingContent"
                  :aria-label="translate('reader.novelReader.refreshContent')"
                  @click="refreshContent"
                >
                  <i
                    class="ri-refresh-line text-xl"
                    :class="{ 'animate-spin': isLoadingContent }"
                    aria-hidden="true"
                  ></i>
                  {{ translate('reader.readerControls.refresh') }}
                </button>
              </div>

              <nav
                class="w-full border-t border-base-300 bg-base-100/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md"
                :aria-label="translate('reader.readerControls.mobileReadingControls')"
              >
                <div
                  class="grid min-h-14 w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-1 border-b border-base-300/70 px-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] sm:gap-2 sm:px-2"
                >
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-square mx-auto"
                    :disabled="!hasPrevious || isLoadingContent"
                    :aria-label="translate('reader.chapterController.previousChapter')"
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
                          ? translate('reader.readerControls.chapterPage', { p0: safeCurrentPage, p1: safeTotalPages })
                          : translate('reader.readerControls.chapterProgress', { p0: pageProgressLabel })
                      }}
                      {{ translate('reader.readerControls.bookProgress') }} {{ readingProgressLabel }}</span
                    >
                    <input
                      type="range"
                      class="range range-xs w-full"
                      :min="progressMin"
                      :max="progressMax"
                      :value="progressValue"
                      :disabled="!paginationReady"
                      :aria-label="translate('reader.readerControls.adjustChapterReadingPosition')"
                      @input="handleProgressInput"
                    />
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-square mx-auto"
                    :disabled="!hasNext || isLoadingContent"
                    :aria-label="translate('reader.chapterController.nextChapter')"
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
                    ><span class="dock-label">{{ translate('reader.readerControls.backToCover') }}</span>
                  </button>
                  <button type="button" @click="openDialog('toc')">
                    <i class="ri-list-unordered text-xl" aria-hidden="true"></i
                    ><span class="dock-label">{{ translate('reader.chapterList.chapters') }}</span>
                  </button>
                  <button type="button" @click="openDialog('comments')">
                    <i class="ri-chat-3-line text-xl" aria-hidden="true"></i
                    ><span class="dock-label">{{ translate('reader.readerControls.comments') }}</span>
                  </button>
                  <button type="button" @click="openDialog('format')">
                    <i class="ri-font-size-2 text-xl" aria-hidden="true"></i
                    ><span class="dock-label">{{ translate('reader.readerControls.layout') }}</span>
                  </button>
                  <button type="button" @click="openDialog('more')">
                    <i class="ri-settings-3-line text-xl" aria-hidden="true"></i
                    ><span class="dock-label">{{ translate('tools.imageConverter.moreSettings') }}</span>
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
        <ReaderDialogHeader :title="translate('reader.readerControls.searchInBook')" @back="requestCloseDialog" />
        <section class="min-h-0 overflow-hidden p-4">
          <ContentSearch
            :active="activeDialog === 'search'"
            :initial-keyword="searchKeyword"
            :before-navigate="prepareDialogNavigation"
            @select="closeAll"
          />
        </section>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">{{ translate('reader.readerControls.backToReadingControls') }}</button>
      </form>
    </dialog>

    <dialog
      ref="tocDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box flex max-h-[76dvh] flex-col rounded-t-box p-0">
        <ReaderDialogHeader :title="translate('reader.chapterList.chapters')" @back="requestCloseDialog" />
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
        <button @click.prevent="requestCloseDialog">{{ translate('reader.readerControls.backToReadingControls') }}</button>
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
        <ReaderDialogHeader
          :title="translate('reader.readerControls.layout')"
          :subtitle="translate('reader.formatSetting.previewChangesBelowAsYouAdjust')"
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
              {{ translate('reader.formatSetting.resetToDefaults') }}
            </button>
          </template>
        </ReaderDialogHeader>
        <FormatSetting mobile :show-header="false" />
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">{{ translate('reader.readerControls.backToReadingControls') }}</button>
      </form>
    </dialog>

    <dialog
      ref="moreDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box max-h-[78dvh] overflow-y-auto rounded-t-box p-0">
        <ReaderDialogHeader :title="translate('tools.imageConverter.moreSettings')" @back="requestCloseDialog" />
        <ReaderMoreSettings @edit-tap-zones="openTapZoneEditor" />
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">{{ translate('reader.readerControls.backToReadingControls') }}</button>
      </form>
    </dialog>

    <dialog
      ref="commentsDialogRef"
      class="modal modal-bottom z-[90]"
      @cancel.prevent="requestPlatformCloseDialog"
    >
      <div class="modal-box flex max-h-[78dvh] flex-col rounded-t-box p-0">
        <ReaderDialogHeader
          :title="currentMapping === 'title' ? translate('reader.novelReader.chapterComments') : translate('reader.novelReader.bookComments')"
          @back="requestCloseDialog"
        >
          <template #action>
            <button
              type="button"
              class="btn btn-info btn-soft btn-xs shrink-0"
              @click="commentToggle"
            >
              {{ currentMapping === "title" ? translate('reader.novelReader.switchToBookComments') : translate('reader.novelReader.switchToChapterComments') }}
            </button>
          </template>
        </ReaderDialogHeader>
        <section class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
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
            :lang="commentLocale"
            loading="lazy"
          />
        </section>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click.prevent="requestCloseDialog">{{ translate('reader.readerControls.backToReadingControls') }}</button>
      </form>
    </dialog>

    <TapZoneEditor
      v-if="tapZoneEditorOpen"
      @close="requestCloseTapZoneEditor"
    />
  </Teleport>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, commentLocale } = useLocale();

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import Giscus from "@giscus/vue";
import { useNovelStore } from "@/stores/novel";
import { useReaderStore } from "@/stores/readerStore";
import { useThemeStore } from "@/stores/themeStore";
import { useChapters } from "@/composables/novel/useChapters";
import { useGiscus } from "@/composables/novel/useGiscus";
import { useModalClose } from "@/composables/useModal";
import { getChapterContextTitle } from "@/utils/novel/format-label";
import CONFIG from "@/constants/config";
import {
  MOBILE_READING_MODES,
  MOBILE_READER_NAVBAR_HIDE_EVENT,
} from "@/constants/reader";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import ContentSearch from "@/components/novel/ContentSearch.vue";
import FormatSetting from "@/components/reader/interaction/FormatSetting.vue";
import ReaderMoreSettings from "./ReaderMoreSettings.vue";
import TapZoneEditor from "./TapZoneEditor.vue";
import ReaderDialogHeader from "../display/ReaderDialogHeader.vue";

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
  if (!["toc", "search", "comments"].includes(request.name)) return;
  if (request.name === "search") searchKeyword.value = request.keyword || "";
  if (
    request.name === "comments" &&
    ["title", "specific"].includes(request.mapping)
  ) {
    currentMapping.value = request.mapping;
  }
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
