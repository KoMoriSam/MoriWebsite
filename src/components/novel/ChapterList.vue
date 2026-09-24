<template>
  <section class="min-w-0" aria-labelledby="chapter-directory-title">
    <header
      class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <hgroup class="min-w-0">
        <p class="text-sm text-base-content/55">Contents</p>
        <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            id="chapter-directory-title"
            class="font-serif text-2xl font-semibold text-balance"
          >
            章节目录
          </h2>
          <span class="text-sm text-base-content/55">
            {{ chapterVolumes.length }} 卷 · {{ chapterCount }} 章
          </span>
        </div>
      </hgroup>

      <div class="flex shrink-0 items-center gap-1">
        <div class="tooltip tooltip-left" data-tip="刷新章节目录">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            aria-label="刷新章节目录"
            title="刷新章节目录"
            :disabled="isLoadingList"
            @click="novelStore.refreshChapters()"
          >
            <i
              class="ri-refresh-line"
              :class="{ 'animate-spin': isLoadingList }"
              aria-hidden="true"
            ></i>
          </button>
        </div>
        <div class="tooltip tooltip-left" data-tip="清除阅读记录">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            aria-label="清除阅读记录"
            title="清除阅读记录"
            :disabled="isLoadingList"
            @click="novelStore.refreshReadChapters()"
          >
            <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>

    <div
      v-if="isLoadingList"
      role="status"
      aria-busy="true"
      aria-label="章节目录加载中"
    >
      <span class="sr-only">章节目录加载中</span>

      <div class="join join-vertical w-full" aria-hidden="true">
        <div
          v-for="volumeIndex in 2"
          :key="volumeIndex"
          class="join-item collapse collapse-arrow collapse-open min-w-0 border border-base-300 bg-base-100"
        >
          <div class="collapse-title min-w-0">
            <span class="min-w-0 flex-1">
              <span class="skeleton block h-5 w-40 max-w-2/3"></span>
              <span class="skeleton mt-1.5 block h-3 w-12"></span>
            </span>
          </div>

          <ul
            class="collapse-content grid grid-cols-1 border-t border-base-300 bg-base-200/15 px-0 pb-0 lg:grid-cols-2"
          >
            <li
              v-for="chapterIndex in SKELETON_CHAPTER_COUNT"
              :key="chapterIndex"
              class="min-w-0 border-base-300"
              :class="{
                'border-b': chapterIndex < SKELETON_CHAPTER_COUNT,
                'border-b-0': chapterIndex === SKELETON_CHAPTER_COUNT,
                'lg:border-r': hasChapterColumnDivider(chapterIndex - 1, 2),
                'lg:border-r-0': !hasChapterColumnDivider(chapterIndex - 1, 2),
                'lg:border-b': !isChapterInLastRow(
                  chapterIndex - 1,
                  SKELETON_CHAPTER_COUNT,
                  2,
                ),
                'lg:border-b-0': isChapterInLastRow(
                  chapterIndex - 1,
                  SKELETON_CHAPTER_COUNT,
                  2,
                ),
              }"
            >
              <div
                class="btn btn-ghost h-fit w-full items-start rounded-none py-2 text-start"
              >
                <span class="min-w-0 flex-1">
                  <span class="flex min-w-0 items-start gap-2">
                    <span class="skeleton h-4 w-3/5"></span>
                    <span class="skeleton h-4 w-12 shrink-0"></span>
                  </span>
                  <span class="mt-2.5 flex items-center gap-3">
                    <span class="skeleton h-3 w-10"></span>
                    <span class="skeleton h-3 w-16"></span>
                    <span class="skeleton h-3 w-12"></span>
                  </span>
                </span>
                <span
                  class="skeleton mt-0.5 size-4 shrink-0 rounded-selector"
                ></span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div
      v-else-if="chapterVolumes.length > 0"
      class="join join-vertical w-full"
    >
      <details
        v-for="volume in chapterVolumes"
        :key="volume.volumeInfo.uuid"
        open
        class="join-item collapse collapse-arrow min-w-0 bg-base-100 border-base-300 border"
      >
        <summary
          class="collapse-title min-w-0 transition-colors hover:bg-base-200/50 [&::-webkit-details-marker]:hidden"
        >
          <hgroup class="min-w-0 flex-1">
            <h3 class="block truncate font-serif text-lg font-semibold">
              {{ volume.volumeInfo.title }}
            </h3>
            <p class="mt-0.5 block text-xs text-base-content/50">
              {{ volume.chapters?.length || 0 }} 章
            </p>
          </hgroup>
        </summary>

        <ul
          v-if="volume.chapters && volume.chapters.length > 0"
          class="collapse-content grid grid-cols-1 border-t border-base-300 bg-base-200/15 px-0 pb-0 xl:grid-cols-2"
        >
          <li
            v-for="(chapter, chapterIndex) in volume.chapters"
            :key="chapter.uuid"
            class="min-w-0 border-base-300"
            :class="{
              'border-b': chapterIndex < volume.chapters.length - 1,
              'border-b-0': chapterIndex === volume.chapters.length - 1,
              'xl:border-r': hasChapterColumnDivider(chapterIndex, 2),
              'xl:border-r-0': !hasChapterColumnDivider(chapterIndex, 2),
              'xl:border-b': !isChapterInLastRow(
                chapterIndex,
                volume.chapters.length,
                2,
              ),
              'xl:border-b-0': isChapterInLastRow(
                chapterIndex,
                volume.chapters.length,
                2,
              ),
            }"
          >
            <button
              v-if="chapter"
              type="button"
              class="group/chapter btn btn-ghost border-0 rounded-none h-fit w-full items-start text-start py-2"
              :class="{
                'btn-active': chapter.uuid === currentChapterUuid,
              }"
              :aria-current="
                chapter.uuid === currentChapterUuid ? 'page' : undefined
              "
              :disabled="isDisabled"
              @click="onClick(chapter.uuid)"
            >
              <span class="min-w-0 flex-1">
                <span class="flex min-w-0 items-start gap-2">
                  <span
                    class="min-w-0 flex-1 text-pretty leading-snug font-semibold break-words"
                  >
                    {{ chapter.title }}
                  </span>
                  <span class="flex shrink-0 flex-wrap justify-end gap-1">
                    <ChapterStatusBadges
                      :chapter="chapter"
                      :latest-chapter-uuid="latestChapter?.uuid"
                      :read="isRead(chapter.uuid)"
                      :recent="isRecent(chapter.uuid, chapter.uploadDate)"
                      revision-label="有修订"
                    />
                  </span>
                </span>

                <span
                  class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-normal text-xs text-base-content/50"
                >
                  <span
                    class="inline-flex items-center gap-1"
                    :class="
                      isRead(chapter.uuid)
                        ? 'text-base-content/45'
                        : 'text-primary'
                    "
                  >
                    <span v-if="isRead(chapter.uuid)" class="status"></span>
                    <span v-else class="status status-primary"></span>
                    {{ isRead(chapter.uuid) ? "已读" : "未读" }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <i class="ri-time-line font-normal" aria-hidden="true"></i>
                    {{ useDateFormat(chapter.uploadDate, "YYYY/M/D") }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <i
                      class="ri-file-text-line font-normal"
                      aria-hidden="true"
                    ></i>
                    {{ chapter.length }} 字
                  </span>
                  <client-only>
                    <span
                      v-if="
                        analyticsAvailable &&
                        getChapterReadStatus(chapter.uuid) !== 'error'
                      "
                      class="inline-flex items-center gap-1"
                    >
                      <i class="ri-eye-line font-normal" aria-hidden="true"></i>
                      <template
                        v-if="Number.isFinite(getChapterReads(chapter.uuid))"
                      >
                        {{ formatReadCount(getChapterReads(chapter.uuid)) }}
                        阅读
                      </template>
                      <span
                        v-else
                        class="loading loading-dots loading-xs"
                        :aria-label="`正在读取《${chapter.title}》的阅读量`"
                      ></span>
                    </span>
                  </client-only>
                  <client-only>
                    <span
                      v-if="
                        commentCountsAvailable &&
                        getChapterCommentStatus(chapter) !== 'error'
                      "
                      class="inline-flex items-center gap-1"
                    >
                      <i
                        class="ri-chat-3-line font-normal"
                        aria-hidden="true"
                      ></i>
                      <template
                        v-if="Number.isFinite(getChapterComments(chapter))"
                      >
                        {{ formatReadCount(getChapterComments(chapter)) }}
                        评论
                      </template>
                      <span
                        v-else
                        class="loading loading-dots loading-xs"
                        :aria-label="`正在读取《${chapter.title}》的评论量`"
                      ></span>
                    </span>
                  </client-only>
                </span>
              </span>

              <i
                class="ri-arrow-right-line mt-0.5 shrink-0 text-base-content/20 transition-[color,transform] group-hover/chapter:translate-x-0.5 group-hover/chapter:text-base-content/55"
                aria-hidden="true"
              ></i>
            </button>
          </li>
        </ul>
      </details>
    </div>

    <div
      v-else
      class="flex min-h-64 flex-col items-center justify-center gap-2 border-y border-dashed border-base-300 px-6 py-12 text-center text-base-content/50"
    >
      <i class="ri-book-open-line text-3xl" aria-hidden="true"></i>
      <p class="font-semibold text-base-content/70">暂时没有可阅读的章节</p>
      <p class="text-sm">刷新目录后再试一次</p>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useDateFormat } from "@vueuse/core";

import { useNovelStore } from "@/stores/novelStore";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";

import { useChapters } from "@/composables/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";

import ChapterStatusBadges from "@/components/novel/ChapterStatusBadges.vue";

const novelStore = useNovelStore();
const analyticsStore = useAnalyticsStore();
const commentCountsStore = useCommentCountsStore();
const { analyticsAvailable } = storeToRefs(analyticsStore);
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const readCountFormatter = new Intl.NumberFormat("zh-CN");
const formatReadCount = (value) => readCountFormatter.format(Number(value));
const getChapterReads = (chapterId) =>
  analyticsStore.getContentReads("novel", chapterId);
const getChapterReadStatus = (chapterId) =>
  analyticsStore.getContentStatus("novel", chapterId);
const getChapterComments = (chapter) =>
  commentCountsStore.getContentCommentTotal("novel", chapter?.uuid);
const getChapterCommentStatus = (chapter) =>
  commentCountsStore.getContentCommentStatus("novel", chapter?.uuid);
const isChapterInLastRow = (index, chapterCount, columnCount) => {
  const lastRowSize = chapterCount % columnCount || columnCount;
  return index >= chapterCount - lastRowSize;
};
const SKELETON_CHAPTER_COUNT = 5;
const hasChapterColumnDivider = (index, columnCount) =>
  (index + 1) % columnCount !== 0;
const {
  chapterCount,
  chapterVolumes,
  currentChapterUuid,
  isLoadingList,
  latestChapter,
} = storeToRefs(novelStore);

const { isRead, handleAnyChapter, isRecent } = useChapters();

const { isDisabled, handleClick } = useClickLimit();

// 点击事件
const onClick = (newId) => {
  handleClick(handleAnyChapter, newId);
};
</script>
