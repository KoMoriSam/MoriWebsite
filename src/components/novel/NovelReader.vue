<template>
  <Reader
    drawer
    drawer-id="novel-reader-sidebar"
    :toc="!isMobileReader"
    :aside="!isMobileReader"
    :page-class="readerPageClass"
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
      :class="{ 'relative h-full min-h-0': isMobileReader }"
      :style="
        isMobileReader
          ? {
              '--mobile-reader-content-padding-block': '0.5rem',
              '--mobile-reader-shell-padding-bottom': '1.5rem',
              '--mobile-reader-dock-clearance':
                'calc(4.5rem + env(safe-area-inset-bottom))',
            }
          : undefined
      "
    >
      <ChapterHeader
        v-if="currentChapter && !isMobileReader"
        :chapter="currentChapter"
        :stats="chapterStats"
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
        @controls-open-change="mobileReaderControlsOpen = $event"
        @controller-state="updateMobileControllerState"
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
        @controller-state="updateMobileControllerState"
      />

      <ChapterController
        v-if="currentChapter && isMobileReader"
        variant="mobile"
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
        @reading-mode-change="readerStore.setMobileReadingMode"
      >
        <template #comments>
          <section
            class="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2"
          >
            <h3
              id="mobile-reader-comments-title"
              class="min-w-0 text-xl font-bold break-words"
            >
              {{ currentMapping === "title" ? "本章说" : "本书说" }}
            </h3>

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
      </ChapterController>

      <div v-else-if="currentChapter" class="min-w-0 w-full max-w-full">
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
        <h2 class="min-w-0 text-2xl font-bold break-words">
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

    <template #drawer>
      <FormatSetting />
    </template>
  </Reader>
</template>

<script setup>
import { storeToRefs } from "pinia";
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
import { getChapterContextTitle } from "@/utils/format-chapter-label";
import { MOBILE_READING_MODES } from "@/constants/reader";

const novelStore = useNovelStore();
const {
  currentChapter,
  currentChapterContent,
  currentChapterUuid,
  isLoadingContent,
} = storeToRefs(novelStore);

const router = useRouter();
const route = useRoute();

const readerStore = useReaderStore();
const { styleConfigs, mobileReadingMode } = storeToRefs(readerStore);

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watch,
} from "vue";

const stopNovelPosTracker = ref(null);
const trackedReaderContext = ref("");
const mobileReaderControlsOpen = ref(false);
const activeMobileReaderRef = ref(null);
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
const isMobileReader = useMediaQuery("(max-width: 1023px)");
const isPagedMobileReader = computed(
  () => mobileReadingMode.value === MOBILE_READING_MODES.PAGED,
);
const readerPageClass = computed(() =>
  isMobileReader.value
    ? "fixed inset-0 z-40 mx-auto h-dvh w-full max-w-7xl overflow-hidden bg-base-100 p-6 pt-2 sm:px-8 [&_.drawer]:h-full [&_.drawer-content]:pb-0"
    : "mx-auto max-w-7xl px-6 sm:px-8 lg:px-10",
);
const readerContainerClass = computed(() =>
  isMobileReader.value ? "flex h-full min-h-0 flex-col" : "py-6",
);
const readerGridClass = computed(() =>
  isMobileReader.value
    ? "min-h-0 flex-1"
    : "gap-y-8 xl:grid-cols-[15rem_minmax(0,1fr)_20rem] xl:gap-x-8 2xl:grid-cols-[17rem_minmax(0,1fr)_22rem]",
);
const readerContentClass = computed(() =>
  isMobileReader.value ? "h-full min-h-0 border-0! p-0!" : "",
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
onBeforeUnmount(disposeNovelPosTracker);

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

  return stats;
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
    key: "refresh",
    label: "刷新内容",
    icon: isLoadingContent.value
      ? "ri-loader-4-line animate-spin"
      : "ri-refresh-line",
    buttonClass: "btn-success btn-soft",
    onClick: handleRefreshContent,
  },
  {
    key: "settings",
    for: "novel-reader-sidebar",
    label: "阅读器设置",
    icon: "ri-settings-3-line",
    buttonClass: "btn-primary btn-soft",
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
