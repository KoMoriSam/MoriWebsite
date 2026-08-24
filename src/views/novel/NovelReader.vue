<template>
  <Reader
    ref="readerRef"
    :toc="!isMobileReader"
    :aside="!isMobileReader"
    :page-class="readerPageClass"
    :page-style="readerPageStyle"
    :page-theme="readerPageTheme"
    :container-class="readerContainerClass"
    :grid-class="readerGridClass"
    :content-class="readerContentClass"
  >
    <template #toc="{ progress }">
      <ChapterToc :page-progress="progress" />
    </template>

    <section
      :ref="scrollRef"
      class="min-w-0 w-full max-w-full overflow-x-clip"
      :class="{ 'relative flex h-full min-h-0 flex-col': isMobileReader }"
      @pointerdown.capture="handleReaderPointerDown"
      @pointermove.capture="handleReaderPointerMove"
      @pointerup.capture="handleReaderPointerUp"
      @pointercancel.capture="handleReaderPointerCancel"
      @contextmenu.capture="handleReaderContextMenu"
      :style="
        isMobileReader
          ? {
              '--mobile-reader-content-padding-block': '0.5rem',
              '--mobile-reader-shell-padding-bottom': '0rem',
              color: readerCustomTextColor || undefined,
              backgroundColor: readerCustomBackgroundColor || undefined,
            }
          : undefined
      "
    >
      <ChapterHeader
        v-if="currentChapter && !isMobileReader"
        :chapter="currentChapter"
        :stats="chapterStats"
        @open-comments="handleChapterComments"
      />

      <PagedReader
        v-if="currentChapter && isMobileReader && isPagedMobileReader"
        ref="activeMobileReaderRef"
        :content="currentChapterContent"
        :chapter="currentChapter"
        :chapter-stats="chapterStats"
        :header-data="chapterHeaderData"
        :style-configs="styleConfigs"
        :is-loading="isLoadingContent"
        :controls-open="mobileReaderControlsOpen"
        :tap-zones="mobileTapZones"
        :wheel-pagination="mobileWheelPagination"
        @controls-open-change="mobileReaderControlsOpen = $event"
        @reader-action="handleMobileReaderAction"
        @text-context="openTextContextMenu"
        @controller-state="updateMobileControllerState"
        @open-comments="handleChapterComments"
      />

      <ScrollReader
        v-else-if="currentChapter && isMobileReader"
        ref="activeMobileReaderRef"
        :content="currentChapterContent"
        :chapter="currentChapter"
        :chapter-stats="chapterStats"
        :header-data="chapterHeaderData"
        :style-configs="styleConfigs"
        :is-loading="isLoadingContent"
        :controls-open="mobileReaderControlsOpen"
        :tap-zones="mobileTapZones"
        :restore-chapter-start="restoreMobileScrollToChapterStart"
        @controller-state="updateMobileControllerState"
        @reader-action="handleMobileReaderAction"
        @text-context="openTextContextMenu"
        @chapter-start-restored="restoreMobileScrollToChapterStart = false"
        @open-comments="handleChapterComments"
      />

      <ReaderStatusBar
        v-if="currentChapter && isMobileReader"
        book-title="向远方"
        :volume-title="currentChapter.volumeTitle"
        :chapter-title="getChapterDisplayTitle(currentChapter)"
        :current-page="mobileControllerState.currentPage"
        :total-pages="mobileControllerState.totalPages"
        :reading-progress="mobileControllerState.readingProgress"
      />

      <ReaderControls
        v-if="currentChapter && isMobileReader"
        ref="mobileReaderControlsRef"
        :current-page="mobileControllerState.currentPage"
        :total-pages="mobileControllerState.totalPages"
        :pagination-ready="mobileControllerState.paginationReady"
        :controls-open="mobileReaderControlsOpen"
        :reading-progress="mobileControllerState.readingProgress"
        :page-progress="mobileControllerState.pageProgress"
        :reading-mode="mobileReadingMode"
        @change-page="callMobileReaderAction('goToPage', $event)"
        @change-chapter="callMobileReaderAction('turnChapter', $event)"
        @controls-open-change="mobileReaderControlsOpen = $event"
        @refresh-content="handleRefreshContent"
        @show-reader-hint="callMobileReaderAction('triggerReaderHint')"
      />

      <TextContextMenu
        v-model="textContextOpen"
        :context="textContext"
        :share-meta="textShareMeta"
        @search="openContextSearch"
        @comment="handleChapterComments"
      />

      <div
        v-if="currentChapter && !isMobileReader"
        class="min-w-0 w-full max-w-full"
      >
        <Markdown
          :content="currentChapterContent"
          :is-loading="isLoadingContent"
          :header-data="chapterHeaderData"
          :style-configs="styleConfigs"
        />
        <ChapterController v-if="!isLoadingContent" />
      </div>
    </section>

    <template #aside>
      <section
        class="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2"
      >
        <h2 class="min-w-0 text-2xl font-serif font-bold break-words">
          {{ currentMapping === "title" ? "本章说" : "本书说" }}
        </h2>

        <button
          type="button"
          class="btn btn-info btn-soft btn-xs shrink-0"
          @click="commentToggle"
        >
          {{ currentMapping === "title" ? "切换本书说" : "切换本章说" }}
        </button>
      </section>

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
    </template>

    <template v-if="!isMobileReader" #floating>
      <aside class="max-lg:dock shadow-sm">
        <FloatingActionButton main-icon="ri-more-line" :actions="fabActions" />
      </aside>
    </template>

    <template #format-setting>
      <FormatSetting />
    </template>
  </Reader>

  <dialog
    v-if="!isMobileReader"
    ref="chapterCommentsDialogRef"
    class="modal"
    @cancel.prevent="requestPlatformCloseChapterComments"
  >
    <section class="modal-box flex max-h-[82dvh] flex-col p-0">
      <header
        class="flex items-center justify-between gap-3 border-b border-base-300 px-5 py-4"
      >
        <h2 class="text-xl font-serif font-bold">本章说</h2>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-circle"
          aria-label="关闭本章说"
          @click="requestCloseChapterComments"
        >
          <i class="ri-close-line text-xl" aria-hidden="true"></i>
        </button>
      </header>
      <section class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
        <Giscus
          :key="`chapter-comments-dialog-${giscusKey}`"
          :repo="GISCUS.novelRepo.name"
          :repo-id="GISCUS.novelRepo.id"
          :category="GISCUS.categories.general.name"
          :category-id="GISCUS.categories.general.id"
          :mapping="giscusMapping"
          :term="getChapterContextTitle(currentChapter)"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="bottom"
          :theme="giscusTheme"
          lang="zh-CN"
          loading="lazy"
        />
      </section>
    </section>
    <form method="dialog" class="modal-backdrop">
      <button @click.prevent="requestCloseChapterComments">关闭本章说</button>
    </form>
  </dialog>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useCommentCountsStore } from "@/stores/commentCountsStore";
import { useNovelStore } from "@/stores/novelStore";
import { useReaderStore } from "@/stores/readerStore";
import { useThemeStore } from "@/stores/themeStore";

import Giscus from "@giscus/vue";
import Reader from "@/components/reader/Reader.vue";
import ChapterToc from "@/components/novel/ChapterToc.vue";
import ChapterController from "@/components/novel/ChapterController.vue";
import ChapterHeader from "@/components/novel/ChapterHeader.vue";
import PagedReader from "@/components/novel/mobile/PagedReader.vue";
import ScrollReader from "@/components/novel/mobile/ScrollReader.vue";
import ReaderControls from "@/components/novel/mobile/ReaderControls.vue";
import TextContextMenu from "@/components/reader/TextContextMenu.vue";
import ReaderStatusBar from "@/components/novel/mobile/ReaderStatusBar.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import Markdown from "@/components/reader/Markdown.vue";
import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";

import CONFIG from "@/constants/config";
const { GISCUS } = CONFIG;

import { useDateFormat, useMediaQuery } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { useGiscus } from "@/composables/useGiscus";
import { usePosTracker } from "@/composables/usePosTracker";
import { useScrollTo } from "@/composables/useScrollTo";
import { useReaderTextContext } from "@/composables/novel/useReaderTextContext";
import { useContentReadTracking } from "@/composables/useContentReadTracking";
import { useModalClose } from "@/composables/useModal";
import {
  getChapterContextTitle,
  getChapterDisplayTitle,
} from "@/utils/format-chapter-label";
import {
  MOBILE_READING_MODES,
  MOBILE_READER_VOLUME_KEY_EVENT,
} from "@/constants/reader";

const novelStore = useNovelStore();
const {
  currentChapter,
  currentChapterContent,
  currentChapterUuid,
  isLoadingContent,
} = storeToRefs(novelStore);

const router = useRouter();
const route = useRoute();

const trackedChapterId = computed(() =>
  String(currentChapterUuid.value || "").trim(),
);
const commentCountsStore = useCommentCountsStore();
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const chapterComments = computed(() =>
  commentCountsStore.getContentCommentTotal("novel", trackedChapterId.value),
);
const trackedChapterReady = computed(() => {
  const chapterId = trackedChapterId.value;
  const permalink = novelStore.getPermalinkByUuid(chapterId);

  return Boolean(
    chapterId &&
      permalink &&
      route.name === "novel-reader" &&
      route.params.volumeSlug === permalink.volumeSlug &&
      route.params.chapterSlug === permalink.chapterSlug &&
      !isLoadingContent.value &&
      currentChapterContent.value.length > 0,
  );
});
const {
  analyticsAvailable,
  contentReads: chapterReads,
} = useContentReadTracking({
  contentType: "novel",
  contentId: trackedChapterId,
  ready: trackedChapterReady,
});
const chapterReadCountFormatter = new Intl.NumberFormat("zh-CN");

watch(
  () => [
    trackedChapterId.value,
    getChapterContextTitle(currentChapter.value),
  ],
  ([contentId, discussionTerm]) => {
    if (!contentId || !discussionTerm) return;
    void commentCountsStore.loadContentCommentTotals("novel", [
      { contentId, discussionTerm },
    ]);
  },
  { immediate: true },
);

const readerStore = useReaderStore();
const {
  styleConfigs,
  mobileReadingMode,
  mobileTapZones,
  mobileWheelPagination,
  mobileVolumePagination,
} = storeToRefs(readerStore);

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  nextTick,
  ref,
  watch,
} from "vue";

const stopNovelPosTracker = ref(null);
const readerRef = ref(null);
const trackedReaderContext = ref("");
const mobileReaderControlsOpen = ref(false);
const textContextOpen = ref(false);
const textContext = ref({});
const activeMobileReaderRef = ref(null);
const mobileReaderControlsRef = ref(null);
const chapterCommentsDialogRef = ref(null);
const restoreMobileScrollToChapterStart = ref(false);
let mobileControlOpenTimer = 0;
const mobileControllerState = ref({
  currentPage: 1,
  totalPages: 1,
  paginationReady: false,
  readingProgress: 0,
  pageProgress: 0,
});

const updateMobileControllerState = (state = {}) => {
  mobileControllerState.value = {
    ...mobileControllerState.value,
    ...state,
  };
};

const callMobileReaderAction = (name, ...args) => {
  const action = activeMobileReaderRef.value?.[name];
  if (typeof action === "function") action(...args);
};
const openMobileControl = async (name, keyword = "", mapping = "") => {
  mobileReaderControlsOpen.value = true;
  window.dispatchEvent(new Event("mobile-reader:show-navbar"));
  await nextTick();

  // 九宫格动作由 pointerup 触发；等同一次合成 click 完成后再显示 modal，
  // 避免刚生成的 backdrop 接收到这次点击并立即把 modal 关闭。
  window.clearTimeout(mobileControlOpenTimer);
  mobileControlOpenTimer = window.setTimeout(() => {
    void mobileReaderControlsRef.value?.openControl({ name, keyword, mapping });
  }, 0);
};
const closeChapterCommentsImmediately = () => {
  if (chapterCommentsDialogRef.value?.open) {
    chapterCommentsDialogRef.value.close();
  }
};
const chapterCommentsModal = useModalClose({
  onClose: closeChapterCommentsImmediately,
});
const openDesktopChapterComments = async () => {
  await nextTick();
  const dialog = chapterCommentsDialogRef.value;
  if (!dialog || dialog.open) return;

  chapterCommentsModal.activate();
  dialog.showModal();
};
const requestCloseChapterComments = () => chapterCommentsModal.requestClose();
const requestPlatformCloseChapterComments = () =>
  chapterCommentsModal.requestPlatformClose();
const handleChapterComments = (event) => {
  event?.preventDefault?.();
  currentMapping.value = "title";
  if (!isMobileReader.value) {
    void openDesktopChapterComments();
    return;
  }

  void openMobileControl("comments", "", "title");
};
const handleMobileReaderAction = (action) => {
  if (action === "menu") {
    mobileReaderControlsOpen.value = !mobileReaderControlsOpen.value;
    window.dispatchEvent(
      new Event(
        mobileReaderControlsOpen.value
          ? "mobile-reader:show-navbar"
          : "mobile-reader:hide-navbar",
      ),
    );
    return;
  }
  if (action === "previous-page") callMobileReaderAction("turnPage", -1);
  else if (action === "next-page") callMobileReaderAction("turnPage", 1);
  else if (action === "previous-chapter")
    callMobileReaderAction("turnChapter", -1);
  else if (action === "next-chapter") callMobileReaderAction("turnChapter", 1);
  else if (["toc", "search"].includes(action)) {
    void openMobileControl(action);
  } else if (action === "help") callMobileReaderAction("triggerReaderHint");
};
const openTextContextMenu = (context) => {
  if (!context) {
    textContextOpen.value = false;
    textContext.value = {};
    return;
  }
  textContext.value = context || {};
  textContextOpen.value = true;
};
const openContextSearch = (keyword) => {
  if (isMobileReader.value) {
    void openMobileControl("search", keyword);
    return;
  }

  void router.replace({
    query: {
      ...route.query,
      search: "1",
      q: String(keyword || "").trim() || undefined,
    },
  });
};
const handleNativeVolumeKey = (event) => {
  if (!isMobileReader.value || !mobileVolumePagination.value) return;
  const direction = event.detail?.direction;
  if (["down", "next", 1].includes(direction)) {
    callMobileReaderAction("turnPage", 1);
  } else if (["up", "previous", -1].includes(direction)) {
    callMobileReaderAction("turnPage", -1);
  }
};
const handleVolumeKeydown = (event) => {
  if (!isMobileReader.value || !mobileVolumePagination.value) return;
  if (["VolumeDown", "AudioVolumeDown"].includes(event.key)) {
    event.preventDefault();
    callMobileReaderAction("turnPage", 1);
  } else if (["VolumeUp", "AudioVolumeUp"].includes(event.key)) {
    event.preventDefault();
    callMobileReaderAction("turnPage", -1);
  }
};
const isMobileReader = useMediaQuery("(max-width: 1023px)");
const {
  handleContextMenu: handleDesktopTextContextMenu,
  handlePointerCancel: handleDesktopPointerCancel,
  handlePointerDown: handleDesktopPointerDown,
  handlePointerMove: handleDesktopPointerMove,
  handlePointerUp: handleDesktopPointerUp,
} = useReaderTextContext({
  getRoot: () => (isMobileReader.value ? null : scrollRef.value),
  emit: (_eventName, context) => openTextContextMenu(context),
});
const handleReaderContextMenu = (event) => {
  if (!isMobileReader.value) handleDesktopTextContextMenu(event);
};
const handleReaderPointerDown = (event) => {
  if (!isMobileReader.value) handleDesktopPointerDown(event);
};
const handleReaderPointerMove = (event) => {
  if (!isMobileReader.value) handleDesktopPointerMove(event);
};
const handleReaderPointerUp = (event) => {
  if (!isMobileReader.value) handleDesktopPointerUp(event);
};
const handleReaderPointerCancel = () => {
  if (!isMobileReader.value) handleDesktopPointerCancel();
};
const isPagedMobileReader = computed(
  () => mobileReadingMode.value === MOBILE_READING_MODES.PAGED,
);
watch(
  mobileReadingMode,
  (mode, previousMode) => {
    restoreMobileScrollToChapterStart.value = Boolean(
      isMobileReader.value &&
      previousMode === MOBILE_READING_MODES.PAGED &&
      mode === MOBILE_READING_MODES.SCROLL &&
      mobileControllerState.value.paginationReady &&
      mobileControllerState.value.currentPage === 1,
    );
  },
  { flush: "sync" },
);
const readerPageTheme = computed(() => {
  if (!isMobileReader.value) return "";
  return ["lemonade", "forest", "corporate", "dim"].includes(
    styleConfigs.value.colorTheme,
  )
    ? styleConfigs.value.colorTheme
    : "";
});
const usesCustomReaderColors = computed(
  () =>
    isMobileReader.value &&
    (styleConfigs.value.colorTheme === "custom" ||
      (!readerPageTheme.value &&
        Boolean(
          styleConfigs.value.textColor || styleConfigs.value.backgroundColor,
        ))),
);
const readerCustomTextColor = computed(() =>
  usesCustomReaderColors.value ? styleConfigs.value.textColor : "",
);
const readerCustomBackgroundColor = computed(() =>
  usesCustomReaderColors.value ? styleConfigs.value.backgroundColor : "",
);
const readerPageStyle = computed(() => {
  if (!isMobileReader.value) return undefined;

  const textColor = readerCustomTextColor.value;
  const backgroundColor = readerCustomBackgroundColor.value;
  return {
    color: textColor || undefined,
    backgroundColor: backgroundColor || undefined,
    "--reader-text-color": textColor || "var(--color-base-content)",
    "--color-base-content": textColor || undefined,
    "--color-base-100": backgroundColor || undefined,
    "--color-base-200": backgroundColor
      ? `color-mix(in oklab, ${backgroundColor} 94%, ${textColor || "black"})`
      : undefined,
    "--color-base-300": backgroundColor
      ? `color-mix(in oklab, ${backgroundColor} 88%, ${textColor || "black"})`
      : undefined,
  };
});
const readerPageClass = computed(() =>
  isMobileReader.value
    ? "fixed inset-0 z-40 mx-auto h-dvh w-full max-w-7xl overflow-hidden bg-base-100 px-6 py-2 text-base-content sm:px-8"
    : "mx-auto max-w-7xl px-6 sm:px-8 lg:px-10",
);
const readerContainerClass = computed(() =>
  isMobileReader.value ? "flex h-full min-h-0 flex-col" : "py-6",
);
const readerGridClass = computed(() =>
  isMobileReader.value
    ? "h-full min-h-0 flex-1 items-stretch! overflow-hidden"
    : "gap-y-8 xl:grid-cols-[15rem_minmax(0,1fr)_20rem] xl:gap-x-8 2xl:grid-cols-[17rem_minmax(0,1fr)_22rem]",
);
const readerContentClass = computed(() =>
  isMobileReader.value
    ? "flex h-full min-h-0 self-stretch overflow-hidden border-0! p-0!"
    : "",
);

const disposeNovelPosTracker = () => {
  if (typeof stopNovelPosTracker.value === "function") {
    stopNovelPosTracker.value();
  }

  stopNovelPosTracker.value = null;
  trackedReaderContext.value = "";
};

const setupNovelPosTracker = () => {
  if (typeof window === "undefined") return;

  const chapterId = String(currentChapterUuid.value || "");
  const permalink = novelStore.getPermalinkByUuid(chapterId);
  const routeMatchesContent = Boolean(
    route.name === "novel-reader" &&
    permalink &&
    route.params.volumeSlug === permalink.volumeSlug &&
    route.params.chapterSlug === permalink.chapterSlug,
  );
  const shouldTrack =
    routeMatchesContent &&
    !isLoadingContent.value &&
    currentChapterContent.value.length > 0 &&
    !isMobileReader.value &&
    Boolean(chapterId);

  if (!shouldTrack) {
    disposeNovelPosTracker();
    return;
  }

  const readerContext = chapterId;
  if (
    trackedReaderContext.value === readerContext &&
    stopNovelPosTracker.value
  ) {
    return;
  }

  disposeNovelPosTracker();
  stopNovelPosTracker.value = usePosTracker(
    router,
    () => novelStore.updateTitle(),
    {
      getContextId: () => String(currentChapterUuid.value || ""),
      isActive: () => router.currentRoute.value.name === "novel-reader",
      posSelector:
        "#markdown-content h1[id], #markdown-content h2[id], #markdown-content h3[id], #markdown-content h4[id], #markdown-content h5[id], #markdown-content h6[id], #markdown-content p[id]",
    },
  );
  trackedReaderContext.value = readerContext;
};

watch(
  () => [
    route.fullPath,
    currentChapterUuid.value,
    isLoadingContent.value,
    currentChapterContent.value,
    isMobileReader.value,
  ],
  setupNovelPosTracker,
  { immediate: true, flush: "post" },
);

onActivated(setupNovelPosTracker);
onDeactivated(disposeNovelPosTracker);
onMounted(() => {
  window.addEventListener("keydown", handleVolumeKeydown);
  window.addEventListener(
    MOBILE_READER_VOLUME_KEY_EVENT,
    handleNativeVolumeKey,
  );
});
onBeforeUnmount(() => {
  window.clearTimeout(mobileControlOpenTimer);
  disposeNovelPosTracker();
  window.removeEventListener("keydown", handleVolumeKeydown);
  window.removeEventListener(
    MOBILE_READER_VOLUME_KEY_EVENT,
    handleNativeVolumeKey,
  );
});

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

const remountGiscus = () => {
  giscusVersion.value += 1;
};

watch(
  () => [currentChapterUuid.value, currentMapping.value],
  () => {
    remountGiscus();
  },
  { immediate: true },
);

const chapterHeaderData = computed(() => ({
  title: currentChapter.value?.title || "",
  uuid: currentChapterUuid.value,
  page: 1,
  sourceType: "novel",
  commentScope: "chapter",
  commentTerm: getChapterContextTitle(currentChapter.value),
  meta: currentChapter.value?.volumeTitle,
}));

const chapterStats = computed(() => {
  const stats = [
    {
      icon: "ri-time-line",
      text: useDateFormat(
        currentChapter.value?.uploadDate,
        "YYYY/M/D H:mm 发布",
      ).value,
    },
  ];

  if (currentChapter.value?.modifiedDate) {
    stats.push({
      icon: "ri-file-edit-line",
      text: "有修订",
    });
  }

  stats.push({
    icon: "ri-file-text-line",
    text: `约 ${currentChapter.value?.length || 0} 字`,
  });

  if (analyticsAvailable.value && Number.isFinite(chapterReads.value)) {
    stats.push({
      icon: "ri-eye-line",
      text: `${chapterReadCountFormatter.format(chapterReads.value)} 次阅读`,
    });
  }

  return stats;
});

const textShareMeta = computed(() => {
  const publicationInfo =
    chapterStats.value.find(({ icon }) => icon === "ri-time-line")?.text || "";
  const contentItems = chapterStats.value
    .filter(({ icon }) =>
      ["ri-file-edit-line", "ri-file-text-line"].includes(icon),
    )
    .map(({ text }) => text)
    .filter(Boolean);
  const contentInfo = contentItems.join(" · ");
  const engagementItems = [
    analyticsAvailable.value && Number.isFinite(chapterReads.value)
      ? `${chapterReadCountFormatter.format(chapterReads.value)} 次阅读`
      : "",
    commentCountsAvailable.value && Number.isFinite(chapterComments.value)
      ? `${chapterReadCountFormatter.format(chapterComments.value)} 条评论`
      : "",
  ].filter(Boolean);
  const engagementInfo = engagementItems.join(" · ");
  const detailLines = [
    publicationInfo,
    contentInfo,
    engagementInfo,
  ].filter(Boolean);
  const sourceLabel = ["《向远方》", currentChapter.value?.volumeTitle]
    .filter(Boolean)
    .join(" · ");

  return {
    sourceLabel,
    title: currentChapter.value?.title || "",
    detail: detailLines.join(" · "),
    detailLines,
    detailLineLimit: 3,
    excludeFromContent: [
      currentChapter.value?.volumeTitle,
      publicationInfo,
      ...contentItems,
      contentInfo,
      ...engagementItems,
      engagementInfo,
      detailLines.join(" "),
    ].filter(Boolean),
    path: route.path,
  };
});

const handleRefreshContent = async () => {
  if (isLoadingContent.value) return;
  await novelStore.refreshChapters();
  remountGiscus();
};

const fabActions = computed(() => [
  {
    key: "bottom",
    label: "至底部",
    icon: "ri-skip-down-line",
    buttonClass: "btn-info btn-soft",
    onClick: () => scrollToBottom(),
  },
  {
    key: "top",
    label: "至顶部",
    icon: "ri-skip-up-line",
    buttonClass: "btn-info btn-soft",
    onClick: () => scrollToTop(),
  },
  {
    key: "settings",
    label: "阅读排版",
    icon: "ri-settings-3-line",
    buttonClass: "btn-primary btn-soft",
    onClick: () => readerRef.value?.openFormatSetting(),
  },
  {
    key: "refresh",
    label: "刷新内容",
    icon: isLoadingContent.value
      ? "ri-loader-4-line animate-spin"
      : "ri-refresh-line",
    buttonClass: "btn-success btn-soft",
    onClick: handleRefreshContent,
  },
  {
    key: "cover",
    label: "封面页",
    icon: "ri-arrow-go-back-line",
    buttonClass: "btn-secondary btn-soft",
    onClick: () => {
      scrollToTop();
      router.push({
        name: "novel",
      });
    },
  },
]);

const { scrollRef, scrollToTop, scrollToBottom } = useScrollTo();
</script>
