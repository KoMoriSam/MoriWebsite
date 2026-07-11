<template>
  <Reader drawer drawer-id="novel-reader-sidebar" toc tocTitle="本页已读">
    <section :ref="scrollRef" class="min-w-0 w-full max-w-full overflow-x-clip">
      <ChapterInfo
        v-if="latestChapter"
        :additionalClasses="`max-lg:btn-sm btn-outline btn-secondary py-6 ${
          isDisabled ? 'btn-disabled' : ''
        }`"
        :onClick="onClick"
      >
        <template #content>
          <div
            class="min-w-0 flex max-md:flex-col md:gap-4 items-start md:items-center group"
          >
            <span class="font-bold truncate">{{ latestChapter.title }}</span>
            <span
              v-if="latestChapter.uploadDate"
              class="block truncate text-xs text-secondary/60 group-hover:text-secondary-content/60"
            >
              {{
                latestChapter.modifiedDate
                  ? useDateFormat(
                      latestChapter.modifiedDate,
                      "YYYY/M/D H:mm 更新",
                    )
                  : useDateFormat(
                      latestChapter.uploadDate,
                      "YYYY/M/D H:mm 更新",
                    )
              }}
            </span>
          </div>
        </template>
        <template #aside>
          <label
            for="novel-reader-sidebar"
            class="btn max-lg:btn-sm btn-secondary btn-outline py-6 font-bold"
            @click="handleSideComponentUpdate('Chapters')"
          >
            <i class="ri-book-marked-line text-2xl md:text-lg"></i>
            目录
          </label>
        </template>
      </ChapterInfo>

      <ChapterController />

      <header
        v-if="currentChapter"
        class="flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="group min-w-0 max-w-full flex-1">
          <div
            v-if="currentChapter.volumeTitle"
            class="mb-2 flex min-w-0 max-w-full items-center"
          >
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
      <section class="min-w-0 w-full max-w-full">
        <div
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
        </div>

        <aside class="min-w-0 w-full max-w-full">
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
            input-position="top"
            :theme="giscusTheme"
            lang="zh-CN"
            loading="lazy"
          />
        </aside>
      </section>
    </template>

    <template #floating>
      <aside class="max-lg:dock">
        <FloatingActionButton main-icon="ri-more-line" :actions="fabActions" />
      </aside>
    </template>

    <template #drawer>
      <KeepAlive>
        <component :is="components[sideCurrentComponent]" />
      </KeepAlive>
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
import Chapters from "@/components/novel/ChapterList.vue";
import ChapterController from "@/components/novel/ChapterController.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import Markdown from "@/components/reader/Markdown.vue";
import ChapterInfo from "@/components/novel/ChapterInfo.vue";
import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";

import CONFIG from "@/constants/config";
const { GISCUS } = CONFIG;

import { useDateFormat } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useChapters } from "@/composables/useChapters";
import { useGiscus } from "@/composables/useGiscus";
import { useScrollTo } from "@/composables/useScrollTo";
import { useClickLimit } from "@/composables/useClickLimit";

const novelStore = useNovelStore();
const {
  currentPageContent,
  latestChapter,
  currentChapter,
  currentChapterUuid,
  currentChapterPage,
  isLoadingContent,
} = storeToRefs(novelStore);

const router = useRouter();

const readerStore = useReaderStore();
const { styleConfigs } = storeToRefs(readerStore);

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

const components = {
  Chapters,
  FormatSetting,
};

import { computed, ref, watch } from "vue";
import { useReaderSettingsStorage } from "@/utils/storage/new-reader-settings";
const { getSetting, setSetting } = useReaderSettingsStorage();
const sideCurrentComponent = ref(
  getSetting("NOVEL_SIDE_CURRENT_COMPONENT", "Chapters"),
);

// 同样监听侧边栏组件变化
watch(
  () => getSetting("NOVEL_SIDE_CURRENT_COMPONENT"),
  (newValue) => {
    sideCurrentComponent.value = newValue;
  },
);

const handleSideComponentUpdate = (component) => {
  setSetting("NOVEL_SIDE_CURRENT_COMPONENT", component);
};

const { currentMapping, commentToggle } = useGiscus();

const giscusVersion = ref(0);
const giscusMapping = "specific";
const giscusTerm = computed(() =>
  currentMapping.value === "title"
    ? `${currentChapter.value?.title || ""} | KoMoriSam`
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
        "YYYY/M/D H:mm 上传",
      ),
    },
  ];

  if (currentChapter.value?.modifiedDate) {
    stats.push({
      icon: "ri-file-edit-line",
      text: useDateFormat(
        currentChapter.value.modifiedDate,
        "YYYY/M/D H:mm 修改",
      ),
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
  await novelStore.refreshContent();
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
    onClick: () => handleSideComponentUpdate("FormatSetting"),
  },
  {
    key: "chapters",
    for: "novel-reader-sidebar",
    label: "目录",
    icon: "ri-file-list-2-line",
    buttonClass: "btn-primary btn-soft",
    onClick: () => handleSideComponentUpdate("Chapters"),
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
        params: { volumeSlug: undefined, chapterSlug: undefined },
      });
    },
  },
]);

const { scrollRef, scrollToTop, scrollToBottom } = useScrollTo();

const { handleRecentChapter } = useChapters();

const { isDisabled, handleClick } = useClickLimit();
const onClick = () => {
  handleClick(handleRecentChapter);
};
</script>
