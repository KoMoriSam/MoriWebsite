<template>
  <Reader drawer drawer-id="novel-reader-sidebar" toc>
    <template #mobile-toc="{ progress, compact, toggle, setMenuOpen }">
      <ChapterToc
        mobile
        :compact="compact"
        :page-progress="progress"
        @toggle-compact="toggle"
        @menu-open-change="setMenuOpen"
      />
    </template>

    <template #toc="{ progress }">
      <ChapterToc :page-progress="progress" />
    </template>

    <section :ref="scrollRef" class="min-w-0 w-full max-w-full overflow-x-clip">
      <header
        v-if="currentChapter && isFirstChapterPage"
        id="novel-reading-start"
        class="flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="group min-w-0 max-w-full flex-1">
          <div
            v-if="currentChapter.volumeTitle"
            class="mb-2 flex min-w-0 max-w-full items-center"
          >
            <div
              class="tooltip tooltip-right max-lg:hidden"
              data-tip="返回封面页"
            >
              <RouterLink
                to="/novel"
                class="btn btn-outline btn-info btn-xs btn-circle mr-2"
              >
                <i class="ri-arrow-left-line"></i>
              </RouterLink>
            </div>
            <span
              class="badge badge-outline badge-info min-w-0 max-w-full gap-1 overflow-hidden font-normal"
            >
              <i class="ri-bookmark-line shrink-0"></i>
              <span class="min-w-0 truncate">
                {{ currentChapter.volumeTitle }}
              </span>
            </span>
          </div>

          <div class="flex min-w-0 max-w-full items-start gap-2">
            <h1
              class="min-w-0 max-w-full flex-1 text-pretty text-3xl leading-tight font-serif font-bold break-words [overflow-wrap:anywhere] md:text-4xl"
            >
              {{ currentChapter.title }}
            </h1>
          </div>
        </div>

        <ul
          v-if="chapterStats.length"
          class="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 lg:max-w-64 lg:shrink-0 lg:justify-end"
        >
          <li
            v-for="(stat, index) in chapterStats"
            :key="index"
            class="flex min-w-0 max-w-full"
          >
            <span
              class="badge badge-sm min-w-0 max-w-full gap-1 overflow-hidden"
            >
              <i v-if="stat.icon" class="shrink-0" :class="stat.icon"></i>
              <span class="truncate">{{ stat.text }}</span>
            </span>
          </li>
        </ul>
      </header>

      <ChapterController
        v-else-if="currentChapter && showTopChapterController"
        id="novel-reading-start"
      />

      <div v-if="currentChapter" class="min-w-0 w-full max-w-full">
        <Markdown
          :content="currentPageContent"
          :is-loading="isLoadingContent"
          :header-data="chapterHeaderData"
          :style-configs="styleConfigs"
        />
      </div>

      <ChapterController v-if="currentChapter && !isLoadingContent" />
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

    <template #floating>
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
import FormatSetting from "@/components/reader/FormatSetting.vue";
import Markdown from "@/components/reader/Markdown.vue";
import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";

import CONFIG from "@/constants/config";
const { GISCUS } = CONFIG;

import { useDateFormat } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { useGiscus } from "@/composables/useGiscus";
import { usePosTracker } from "@/composables/usePosTracker";
import { useScrollTo } from "@/composables/useScrollTo";
import { getChapterContextTitle } from "@/utils/format-chapter-label";
import {
  getChapterRoutePage,
  normalizeChapterPage,
} from "@/utils/normalize-chapter-route";

const novelStore = useNovelStore();
const {
  currentPageContent,
  currentChapter,
  currentChapterUuid,
  currentChapterPage,
  isLoadingContent,
  totalPages,
} = storeToRefs(novelStore);

const router = useRouter();
const route = useRoute();

const readerStore = useReaderStore();
const { styleConfigs } = storeToRefs(readerStore);

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
const isFirstChapterPage = computed(
  () => normalizeChapterPage(currentChapterPage.value) === 1,
);
const showTopChapterController = computed(
  () =>
    totalPages.value > 1 &&
    !isFirstChapterPage.value &&
    !isLoadingContent.value,
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
  const page = Number(currentChapterPage.value) || 1;
  const permalink = novelStore.getPermalinkByUuid(chapterId);
  const routeMatchesContent = Boolean(
    route.name === "novel-reader" &&
    permalink &&
    route.params.volumeSlug === permalink.volumeSlug &&
    route.params.chapterSlug === permalink.chapterSlug &&
    getChapterRoutePage(route) === page,
  );
  const shouldTrack =
    routeMatchesContent &&
    !isLoadingContent.value &&
    Boolean(currentPageContent.value) &&
    Boolean(chapterId);

  if (!shouldTrack) {
    disposeNovelPosTracker();
    return;
  }

  const readerContext = `${chapterId}:${page}`;
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
      getPage: () => Number(currentChapterPage.value) || 1,
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
    currentChapterPage.value,
    isLoadingContent.value,
    currentPageContent.value,
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
  page: currentChapterPage.value,
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
      ),
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
