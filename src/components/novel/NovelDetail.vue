<template>
  <main class="flex-1 mx-auto w-full max-w-7xl px-8 py-12 md:px-10 lg:py-16">
    <section
      class="grid items-center gap-8 border-b border-base-300 pb-10 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] md:gap-12 lg:gap-16 lg:pb-14"
    >
      <figure class="relative mx-auto w-full max-w-72 md:max-w-none">
        <div
          v-show="!imageLoaded"
          class="skeleton absolute inset-0 z-10 aspect-12/17 w-full rounded-lg"
        ></div>
        <img
          v-fade-in
          src="/assets/images/covers/theHorizon.webp"
          alt="《向远方》小说封面"
          class="relative z-0 aspect-12/17 w-full rounded-lg object-cover shadow-2xl"
          @load="handleImageLoad"
        />
      </figure>

      <section class="min-w-0 flex flex-col lg:gap-12">
        <section>
          <p
            class="mb-6 flex items-center max-sm:justify-between sm:gap-4 text-xs font-bold tracking-[0.24em] text-primary uppercase"
          >
            The Horizon
            <span class="h-px w-16 bg-primary/50"></span>
            Mori
            <span class="h-px w-8 bg-primary/50"></span>
          </p>
          <h1
            class="font-serif leading-none font-black text-balance text-5xl lg:text-6xl"
          >
            向远方
          </h1>
          <p
            class="mt-6 max-w-2xl font-serif text-justify text-base leading-8 text-base-content/70 sm:text-lg"
          >
            方远洛生在潋城县一个普通的教师家庭。从家属院的童年，到异乡求学的青春，他在家人的守望、朋友的陪伴与一次次离别中慢慢长大。曾经，他以为离开家门便是远方；后来才明白，远方既是不断抵达的新生活，也是始终牵引他回望的故乡。
          </p>
        </section>

        <section>
          <section
            class="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch"
          >
            <button
              type="button"
              class="btn btn-primary min-h-14 min-w-0 justify-between gap-4 text-left shadow-sm"
              :disabled="primaryChapterDisabled"
              @click="handlePrimaryChapter"
            >
              <span class="min-w-0">
                <span class="block text-xs font-normal opacity-70">
                  {{ primaryActionLabel }}
                </span>
                <span
                  class="block truncate text-base"
                  :title="primaryChapterTitle"
                >
                  {{ primaryChapterTitle }}
                </span>
              </span>
              <i class="ri-arrow-right-line shrink-0 text-xl"></i>
            </button>

            <button
              type="button"
              class="btn btn-outline btn-primary min-h-14 justify-start gap-3 sm:max-w-64"
              :disabled="!latestChapter?.uuid"
              @click="
                latestChapter?.uuid && handleAnyChapter(latestChapter.uuid)
              "
            >
              <i class="ri-sparkling-2-line shrink-0 text-lg"></i>
              <span class="min-w-0 text-left">
                <span class="block text-xs font-normal"> 最新章节 </span>
                <span class="block truncate" :title="latestChapterTitle">
                  {{ latestChapterTitle }}
                </span>
              </span>
            </button>
          </section>

          <section
            class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-base-content/60"
          >
            <span class="inline-flex items-center gap-1.5">
              <i class="ri-book-open-line"></i>
              {{ readChapters.length }} 章已读
            </span>
            <span class="inline-flex items-center gap-1.5">
              <i class="ri-stack-line"></i>
              {{ flatChapters.length }} 章收录
            </span>
            <span class="inline-flex items-center gap-1.5">
              <i class="ri-edit-line"></i>
              共 {{ totalWordCount }} 字
            </span>
          </section>
        </section>
      </section>
    </section>

    <section class="py-10 lg:py-14" aria-label="小说章节目录">
      <Chapters />
    </section>

    <section class="border-t border-base-300 pt-10 lg:pt-14">
      <div class="mb-6">
        <p
          class="mb-2 text-xs font-bold tracking-[0.2em] text-base-content/45 uppercase"
        >
          Discussion
        </p>
        <h2 class="font-serif text-3xl font-bold text-balance">本书评论</h2>
      </div>

      <Giscus
        :repo="GISCUS.novelRepo.name"
        :repo-id="GISCUS.novelRepo.id"
        :category="GISCUS.categories.general.name"
        :category-id="GISCUS.categories.general.id"
        mapping="specific"
        :term="GISCUS.defaultTerm"
        strict="0"
        reactions-enabled="1"
        emit-metadata="0"
        input-position="top"
        :theme="themeStore.giscusTheme"
        lang="zh-CN"
        loading="lazy"
      />
    </section>
  </main>
  <FootBar />
</template>

<script setup>
import { computed } from "vue";
import Giscus from "@giscus/vue";

import { useChapters } from "@/composables/useChapters";
import { useImageLoad } from "@/composables/useImageLoad";
import { getChapterDisplayTitle } from "@/utils/format-chapter-label";

import CONFIG from "@/constants/config";
const { GISCUS } = CONFIG;

import { storeToRefs } from "pinia";
import { useNovelStore } from "@/stores/novelStore";
import { useThemeStore } from "@/stores/themeStore";

import Chapters from "@/components/novel/ChapterList.vue";
import FootBar from "@/components/layout/FootBar.vue";

const novelStore = useNovelStore();
const {
  readChapters,
  flatChapters,
  currentChapter,
  latestChapter,
  totalWordCount,
} = storeToRefs(novelStore);
const themeStore = useThemeStore();

const { imageLoaded, handleImageLoad } = useImageLoad();

const { handleFirstChapter, handleAnyChapter } = useChapters();

const hasReadingHistory = computed(() => readChapters.value.length > 0);
const primaryActionLabel = computed(() =>
  hasReadingHistory.value ? "继续上次阅读" : "开始阅读",
);
const primaryChapter = computed(() =>
  hasReadingHistory.value
    ? currentChapter.value
    : flatChapters.value[0],
);
const primaryChapterTitle = computed(() =>
  getChapterDisplayTitle(primaryChapter.value) || "加载中……",
);
const latestChapterTitle = computed(
  () => getChapterDisplayTitle(latestChapter.value) || "加载中……",
);
const primaryChapterDisabled = computed(() =>
  hasReadingHistory.value
    ? !currentChapter.value?.uuid
    : flatChapters.value.length === 0,
);

const handlePrimaryChapter = () => {
  if (!hasReadingHistory.value) {
    handleFirstChapter();
    return;
  }

  if (currentChapter.value?.uuid) {
    handleAnyChapter(currentChapter.value.uuid, { resume: true });
  }
};
</script>
