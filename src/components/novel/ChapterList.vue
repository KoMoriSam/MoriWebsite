<template>
  <section
    class="min-w-0"
    aria-labelledby="chapter-directory-title"
    :aria-busy="isLoadingList"
  >
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <p
          class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
          lang="en"
        >
          Contents
        </p>
        <div class="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2
            id="chapter-directory-title"
            class="font-serif text-2xl font-bold text-balance md:text-3xl"
          >
            {{ translate("reader.chapters.title") }}
          </h2>
          <CatalogMeta
            icon="ri-stack-line"
            class="text-xs text-base-content/55"
          >
            {{ formatNumber(chapterVolumes.length) }}
            {{ translate("reader.chapters.volumes") }}
            {{ formatNumber(chapterCount) }}
            {{ translate("reader.chapters.countUnit") }}
          </CatalogMeta>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <div
          class="tooltip tooltip-left"
          :data-tip="translate('reader.chapters.refresh')"
        >
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-base-content/55"
            :aria-label="translate('reader.chapters.refresh')"
            :disabled="isLoadingList"
            @click="novelStore.refreshChapters()"
          >
            <i
              class="ri-refresh-line"
              :class="
                isLoadingList ? 'animate-spin motion-reduce:animate-none' : ''
              "
              aria-hidden="true"
            ></i>
          </button>
        </div>
        <div
          class="tooltip tooltip-left"
          :data-tip="translate('reader.chapters.clearHistory')"
        >
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-base-content/55"
            :aria-label="translate('reader.chapters.clearHistory')"
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
      class="space-y-4"
      role="status"
      :aria-label="translate('reader.chapters.loading')"
    >
      <span class="sr-only">{{ translate("reader.chapters.loading") }}</span>
      <div
        v-for="volumeIndex in 2"
        :key="volumeIndex"
        class="rounded-box border border-base-300 bg-base-100 p-4"
        aria-hidden="true"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <span class="skeleton h-6 w-40 max-w-2/3"></span>
          <span class="skeleton h-4 w-12"></span>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="chapterIndex in SKELETON_CHAPTER_COUNT"
            :key="chapterIndex"
            class="space-y-3 p-3"
          >
            <span class="skeleton block h-4 w-4/5"></span>
            <div class="flex gap-3">
              <span class="skeleton h-3 w-12"></span>
              <span class="skeleton h-3 w-20"></span>
              <span class="skeleton h-3 w-12"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="chapterVolumes.length" class="space-y-4">
      <details
        v-for="volume in chapterVolumes"
        :key="volume.volumeInfo.uuid"
        open
        class="collapse collapse-arrow min-w-0 rounded-box border border-base-300 bg-base-100"
      >
        <summary
          class="collapse-title min-w-0 transition-colors hover:bg-base-200/50 [&::-webkit-details-marker]:hidden"
        >
          <span class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <span
              class="min-w-0 wrap-break-word font-serif text-lg font-bold"
              >{{ volume.volumeInfo.title }}</span
            >
            <CatalogMeta
              icon="ri-book-open-line"
              class="text-xs font-normal text-base-content/50"
            >
              {{ formatNumber(volume.chapters?.length || 0) }}
              {{ translate("reader.chapters.countUnit") }}
            </CatalogMeta>
          </span>
        </summary>
        <ul
          v-if="volume.chapters?.length"
          class="collapse-content grid grid-cols-1 gap-2 px-3 pt-1 pb-3 md:grid-cols-2 md:gap-3 md:px-4 md:pb-4"
        >
          <li
            v-for="chapter in volume.chapters"
            :key="chapter.uuid"
            class="min-w-0"
          >
            <button
              v-if="chapter"
              type="button"
              class="group/chapter btn btn-ghost h-auto min-h-0 w-full items-start gap-2 rounded-field border-0 p-3 text-start font-normal"
              :class="chapter.uuid === currentChapterUuid ? 'bg-base-200' : ''"
              :aria-current="
                chapter.uuid === currentChapterUuid ? 'page' : undefined
              "
              :disabled="isDisabled"
              @click="onClick(chapter.uuid)"
            >
              <span class="min-w-0 flex-1">
                <span class="flex min-w-0 flex-wrap items-start gap-2">
                  <span
                    class="min-w-0 grow basis-40 wrap-break-word text-sm leading-snug font-semibold text-pretty"
                    >{{ chapter.title }}</span
                  >
                  <span class="flex shrink-0 flex-wrap gap-1">
                    <ChapterStatusBadges
                      :chapter="chapter"
                      :latest-chapter-uuid="latestChapter?.uuid"
                      :read="isRead(chapter.uuid)"
                      :recent="isRecent(chapter.uuid, chapter.uploadDate)"
                      :revision-label="translate('common.badges.revised')"
                    />
                  </span>
                </span>
                <span
                  class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50"
                >
                  <CatalogMeta
                    :icon="
                      isRead(chapter.uuid)
                        ? 'ri-check-double-line'
                        : 'ri-book-open-line'
                    "
                    :class="
                      isRead(chapter.uuid)
                        ? 'text-base-content/45'
                        : 'text-primary'
                    "
                  >
                    {{
                      isRead(chapter.uuid)
                        ? translate("reader.chapters.read")
                        : translate("reader.chapters.unread")
                    }}
                  </CatalogMeta>
                  <CatalogMeta icon="ri-calendar-line">{{
                    formatLocalizedDate(chapter.uploadDate)
                  }}</CatalogMeta>
                  <CatalogMeta icon="ri-file-text-line"
                    >{{ formatNumber(chapter.length) }}
                    {{ translate("reader.chapters.characters") }}</CatalogMeta
                  >
                  <client-only>
                    <CatalogMeta
                      v-if="
                        analyticsAvailable &&
                        getChapterReadStatus(chapter.uuid) !== 'error'
                      "
                      icon="ri-eye-line"
                    >
                      <template
                        v-if="Number.isFinite(getChapterReads(chapter.uuid))"
                        >{{ formatReadCount(getChapterReads(chapter.uuid)) }}
                        {{ translate("reader.chapters.reads") }}</template
                      >
                      <span
                        v-else
                        class="loading loading-dots loading-xs"
                        :aria-label="
                          translate('reader.chapters.loadingReads', {
                            p0: chapter.title,
                          })
                        "
                      ></span>
                    </CatalogMeta>
                    <CatalogMeta
                      v-if="
                        commentCountsAvailable &&
                        getChapterCommentStatus(chapter) !== 'error'
                      "
                      icon="ri-chat-3-line"
                    >
                      <template
                        v-if="Number.isFinite(getChapterComments(chapter))"
                        >{{ formatReadCount(getChapterComments(chapter)) }}
                        {{ translate("markdown.moment.comments") }}</template
                      >
                      <span
                        v-else
                        class="loading loading-dots loading-xs"
                        :aria-label="
                          translate('reader.chapters.loadingComments', {
                            p0: chapter.title,
                          })
                        "
                      ></span>
                    </CatalogMeta>
                  </client-only>
                </span>
              </span>
              <i
                class="ri-arrow-right-line mt-0.5 shrink-0 text-base-content/25 transition-[color,transform] group-hover/chapter:translate-x-0.5 group-hover/chapter:text-primary motion-reduce:transform-none motion-reduce:transition-none"
                aria-hidden="true"
              ></i>
            </button>
          </li>
        </ul>
      </details>
    </div>

    <div
      v-else
      class="card card-border min-h-48 items-center justify-center gap-2 bg-base-100 px-6 py-10 text-center text-base-content/50"
    >
      <i class="ri-book-open-line text-3xl text-primary" aria-hidden="true"></i>
      <p class="font-semibold text-base-content/70">
        {{ translate("reader.chapters.empty") }}
      </p>
      <p class="text-sm">{{ translate("reader.chapters.emptyHint") }}</p>
    </div>
  </section>
</template>
<script setup>
import { useLocale } from "@/i18n";
const {
  t: translate,
  number: formatNumber,
  date: formatLocalizedDate,
} = useLocale();

import { storeToRefs } from "pinia";

import { useNovelStore } from "@/stores/novel";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";

import { useChapters } from "@/composables/novel/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";

import ChapterStatusBadges from "@/components/novel/ChapterStatusBadges.vue";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";

const novelStore = useNovelStore();
const analyticsStore = useAnalyticsStore();
const commentCountsStore = useCommentCountsStore();
const { analyticsAvailable } = storeToRefs(analyticsStore);
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const readCountFormatter = { format: (value) => formatNumber(value) };
const formatReadCount = (value) => readCountFormatter.format(Number(value));
const getChapterReads = (chapterId) =>
  analyticsStore.getContentReads("novel", chapterId);
const getChapterReadStatus = (chapterId) =>
  analyticsStore.getContentStatus("novel", chapterId);
const getChapterComments = (chapter) =>
  commentCountsStore.getContentCommentTotal("novel", chapter?.uuid);
const getChapterCommentStatus = (chapter) =>
  commentCountsStore.getContentCommentStatus("novel", chapter?.uuid);
const SKELETON_CHAPTER_COUNT = 5;
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
