<template>
  <main
    class="mx-auto w-full max-w-7xl flex-1 px-6 pt-3 pb-6 md:px-12 md:pt-4 md:pb-8 lg:px-16 xl:px-20"
    aria-labelledby="novel-title"
  >
    <section
      id="novel-opening"
      ref="opening"
      class="@container/novel viewport-section relative flex scroll-mt-(--navbar-scroll-offset) flex-col justify-center md:my-6 [--viewport-section-offset:calc(var(--navbar-height)+0.75rem)] md:[--viewport-section-offset:calc(var(--navbar-height)+4rem)]"
      aria-labelledby="novel-title"
    >
      <div
        v-if="isWideOpening"
        class="pointer-events-none absolute inset-x-0 top-0 z-10 grid grid-cols-12 gap-x-4 @min-[30rem]/novel:max-md:gap-x-6 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] md:gap-x-12 lg:gap-x-16"
      >
        <AuthorGreeting
          class="col-span-full min-w-0 text-sm sm:col-span-6 sm:col-start-7 md:col-span-1 md:col-start-2"
        />
      </div>
      <div
        class="relative isolate grid grid-cols-12 items-start gap-x-4 @min-[30rem]/novel:max-md:gap-x-6 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] md:gap-x-12 lg:gap-x-16"
      >
        <ForestBackdrop />
        <div
          class="contents md:col-span-1 md:col-start-2 md:row-start-1 md:block md:pt-20 md:max-lg:self-end lg:pt-28"
        >
          <div
            class="col-span-6 col-start-7 row-start-1 min-w-0 self-end pb-2 @min-[30rem]/novel:pb-0"
          >
            <p
              class="mb-3 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
              lang="en"
            >
              The Horizon
            </p>
            <h1
              id="novel-title"
              class="font-serif text-[clamp(2.25rem,7vw,3rem)] font-black leading-tight tracking-tight text-balance md:text-6xl"
            >
              向<span class="text-primary">远方</span>
            </h1>
            <CatalogMeta
              icon="ri-quill-pen-line"
              class="mt-3 text-xs text-base-content/55"
              >Mori</CatalogMeta
            >
          </div>
          <div
            class="col-span-full row-start-2 mt-6 flex min-w-0 items-start gap-3 @min-[30rem]/novel:mt-5 sm:block"
          >
            <div
              ref="openingPanelSurface"
              class="min-w-0 flex-1 overflow-hidden sm:overflow-visible"
            >
              <p
                v-if="isWideOpening || openingPanel === 'introduction'"
                id="novel-introduction-panel"
                :role="isWideOpening ? undefined : 'tabpanel'"
                :aria-labelledby="
                  isWideOpening ? undefined : 'novel-introduction-tab'
                "
                :tabindex="isWideOpening ? undefined : 0"
                class="max-w-2xl font-serif text-sm leading-7 text-pretty text-base-content/70 md:text-base md:leading-8"
                lang="zh-CN"
              >
                方远洛生在潋城县一个普通的教师家庭。从家属院的童年，到异乡求学的青春，他在家人的守望、朋友的陪伴与一次次离别中慢慢长大。曾经，他以为离开家门便是远方；后来才明白，远方既是不断抵达的新生活，也是始终牵引他回望的故乡。
              </p>
              <div
                v-else
                id="novel-author-panel"
                role="tabpanel"
                aria-labelledby="novel-author-tab"
                tabindex="0"
                class="min-w-0 text-sm"
              >
                <AuthorGreeting side="start" />
              </div>
            </div>
            <div
              v-if="!isWideOpening"
              role="tablist"
              aria-orientation="vertical"
              :aria-label="translate('novel.detail.aboutBook')"
              class="tabs tabs-box tabs-sm shrink-0 flex-nowrap [--tabs-direction:column] sm:hidden"
            >
              <label
                class="tab size-10 p-0"
                :title="translate('novel.detail.introduction')"
              >
                <input
                  id="novel-introduction-tab"
                  v-model="openingPanel"
                  type="radio"
                  name="novel-opening-panel"
                  value="introduction"
                  role="tab"
                  :aria-label="translate('novel.detail.introduction')"
                  :aria-selected="openingPanel === 'introduction'"
                  aria-controls="novel-introduction-panel"
                />
                <i class="ri-book-open-line text-lg" aria-hidden="true"></i>
              </label>
              <label
                class="tab size-10 p-0"
                :title="translate('novel.detail.authorNote')"
              >
                <input
                  id="novel-author-tab"
                  v-model="openingPanel"
                  type="radio"
                  name="novel-opening-panel"
                  value="author"
                  role="tab"
                  :aria-label="translate('novel.detail.authorNote')"
                  :aria-selected="openingPanel === 'author'"
                  aria-controls="novel-author-panel"
                />
                <i class="ri-chat-3-line text-lg" aria-hidden="true"></i>
              </label>
            </div>
          </div>
          <div
            class="relative z-20 col-span-full row-start-3 mt-6 flex min-w-0 flex-wrap items-center gap-2"
          >
            <button
              type="button"
              class="btn btn-primary"
              :title="primaryChapterTitle"
              :disabled="primaryChapterDisabled"
              @click="handlePrimaryChapter"
            >
              {{ primaryActionLabel }}
              <i class="ri-arrow-right-line shrink-0" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn"
              :title="getChapterDisplayTitle(latestChapter) || undefined"
              :disabled="!latestChapter?.uuid"
              @click="
                latestChapter?.uuid && handleAnyChapter(latestChapter.uuid)
              "
            >
              {{ translate("novel.detail.readLatest") }}
              <i class="ri-sparkling-2-line shrink-0" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              :title="translate('novel.detail.chapters')"
              @click="scrollToSection('novel-chapters')"
            >
              {{ translate("novel.detail.chapters") }}
              <i
                class="ri-arrow-down-s-line animate-arrow-bounce motion-reduce:animate-none translate-y-0.25"
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </div>

        <figure
          class="photo-frame relative col-span-6 col-start-1 row-start-1 box-border aspect-[2480/3508] w-full max-w-72 self-start md:col-span-1 md:max-w-none md:border-8 md:max-lg:self-end"
        >
          <client-only>
            <div
              v-show="!imageLoaded"
              class="skeleton absolute inset-0 z-10 rounded-none"
            ></div>
          </client-only>
          <img
            v-fade-in
            width="2480"
            height="3508"
            v-bind="
              getImageAttrs(novelCoverUrl, '(min-width: 768px) 320px, 288px')
            "
            :alt="translate('novel.detail.cover')"
            class="absolute inset-0 size-full object-cover"
            @load="handleImageLoad"
          />
        </figure>
      </div>

      <div
        class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-base-content/55 md:text-sm"
      >
        <CatalogMeta icon="ri-book-open-line">{{
          translate(
            "common.counts.chaptersRead",
            { count: formatNumber(readChapters.length) },
            readChapters.length,
          )
        }}</CatalogMeta>
        <CatalogMeta icon="ri-stack-line">{{
          translate(
            "common.counts.chapters",
            { count: formatNumber(flatChapters.length) },
            flatChapters.length,
          )
        }}</CatalogMeta>
        <CatalogMeta icon="ri-file-text-line">{{
          translate("novel.detail.totalCharacters", {
            count: formatNumber(totalWordCount),
          })
        }}</CatalogMeta>
        <template v-if="analyticsAvailable || commentCountsAvailable">
          <CatalogMeta
            v-if="analyticsAvailable"
            icon="ri-eye-line"
          >
            <I18nT
              keypath="common.counts.reads"
              :plural="Number.isFinite(novelTotalReads) ? novelTotalReads : 2"
              tag="span"
              scope="global"
            >
              <template #count>
                <template v-if="Number.isFinite(novelTotalReads)">{{ formatReadCount(novelTotalReads) }}</template>
                <template v-else-if="novelReadsStatus === 'error'">—</template>
                <span v-else class="loading loading-dots loading-xs align-middle" :aria-label="translate('novel.detail.loadingReads')"></span>
              </template>
            </I18nT>
          </CatalogMeta>
          <CatalogMeta
            v-if="commentCountsAvailable"
            icon="ri-chat-3-line"
          >
            <I18nT
              keypath="common.counts.comments"
              :plural="Number.isFinite(novelTotalComments) ? novelTotalComments : 2"
              tag="span"
              scope="global"
            >
              <template #count>
                <template v-if="Number.isFinite(novelTotalComments)">{{ formatReadCount(novelTotalComments) }}</template>
                <template v-else-if="novelCommentsStatus === 'error'">—</template>
                <span v-else class="loading loading-dots loading-xs align-middle" :aria-label="translate('novel.detail.loadingComments')"></span>
              </template>
            </I18nT>
          </CatalogMeta>
        </template>
      </div>
    </section>

    <div class="divider" aria-hidden="true"></div>
    <ContentRights
      kind="novel"
      title="向远方"
      url="https://komori.cc/novel"
      author="KoMoriSam (Wishwa Luo)"
      class="mt-5"
    />
    <div class="divider" aria-hidden="true"></div>

    <div
      id="novel-content"
      class="grid min-w-0 scroll-mt-(--navbar-scroll-offset) grid-cols-1 py-8 md:py-10 lg:grid-cols-[minmax(0,3fr)_auto_minmax(0,2fr)] xl:py-14"
    >
      <section
        id="novel-chapters"
        class="min-w-0 scroll-mt-(--navbar-scroll-offset)"
        :aria-label="translate('novel.detail.chapters')"
      >
        <ChapterList />
      </section>

      <div class="divider lg:divider-horizontal" aria-hidden="true"></div>
      <section
        id="novel-comments"
        class="min-w-0 scroll-mt-(--navbar-scroll-offset)"
        aria-labelledby="novel-comments-title"
      >
        <header class="mb-6">
          <p
            class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
            lang="en"
          >
            Between the lines
          </p>
          <h2
            id="novel-comments-title"
            class="font-serif text-2xl font-bold text-balance md:text-3xl"
          >
            {{ translate("novel.detail.bookComments") }}
          </h2>
        </header>
        <div class="min-w-0">
          <Thread
            scope="book"
            :compact-editor="mobile"
            :target="bookTerm"
          />
        </div>
      </section>
    </div>
    <SectionNavigation
      :label="translate('novel.detail.aboutBook')"
      :sections="sections"
      :active-section="activeSection"
      :section-position="sectionPosition"
      :section-span="sectionSpan"
      @navigate="scrollToSection"
    />
  </main>
  <Footer />
</template>
<script setup>
import { bookTerm } from "@/../shared/discussions.js";
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
import { I18nT } from "vue-i18n";
const { t: translate, number: formatNumber } = useLocale();

import { computed, ref, watch } from "vue";
import { useMediaQuery } from "@vueuse/core";
import Thread from "@/components/comments/Thread.vue";
import ContentRights from "@/components/reader/display/ContentRights.vue";

import { useChapters } from "@/composables/novel/useChapters";
import { useImageLoad } from "@/composables/useImageLoad";
import { useViewportSection } from "@/composables/layout/useViewportSection";
import { useHeightTransition } from "@/composables/layout/useHeightTransition";
import { useSectionNavigation } from "@/composables/layout/useSectionNavigation";
import {
  getChapterContextTitle,
  getChapterDisplayTitle,
} from "@/utils/novel/format-label";

import { NOVEL_COVER_URL as novelCoverUrl } from "@/constants/novel-assets";

import { storeToRefs } from "pinia";
import { useNovelStore } from "@/stores/novel";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";

import ChapterList from "@/components/novel/ChapterList.vue";
import ForestBackdrop from "@/components/novel/ForestBackdrop.vue";
import AuthorGreeting from "@/components/novel/AuthorGreeting.vue";
import Footer from "@/components/layout/Footer.vue";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";
import SectionNavigation from "@/components/interaction/navigation/SectionNavigation.vue";

const novelStore = useNovelStore();
const {
  readChapters,
  flatChapters,
  currentChapter,
  latestChapter,
  totalWordCount,
} = storeToRefs(novelStore);
const analyticsStore = useAnalyticsStore();
const commentCountsStore = useCommentCountsStore();
const { analyticsAvailable } = storeToRefs(analyticsStore);
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const readCountFormatter = { format: (value) => formatNumber(value) };
const formatReadCount = (value) => readCountFormatter.format(Number(value));
const novelTotalReads = computed(() =>
  analyticsStore.getContentTypeReads("novel"),
);
const novelReadsStatus = computed(() =>
  analyticsStore.getContentTypeStatus("novel"),
);
const chapterCommentContents = computed(() =>
  flatChapters.value
    .map((chapter) => ({
      contentId: String(chapter?.uuid || "").trim(),
      discussionTerm: getChapterContextTitle(chapter),
    }))
    .filter(({ contentId, discussionTerm }) => contentId && discussionTerm),
);
const chapterCommentIds = computed(() =>
  chapterCommentContents.value.map(({ contentId }) => contentId),
);
const novelTotalComments = computed(() =>
  commentCountsStore.getContentCollectionTotal(
    "novel",
    chapterCommentIds.value,
  ),
);
const novelCommentsStatus = computed(() =>
  commentCountsStore.getContentCollectionStatus(
    "novel",
    chapterCommentIds.value,
  ),
);

watch(
  () =>
    flatChapters.value
      .map((chapter) => String(chapter?.uuid || "").trim())
      .filter(Boolean),
  (contentIds) => {
    void analyticsStore.loadContentStats("novel", contentIds);
  },
  { immediate: true },
);

watch(
  chapterCommentContents,
  (contents) => {
    void commentCountsStore.loadContentCommentTotals("novel", contents);
  },
  { immediate: true },
);

const { imageLoaded, handleImageLoad } = useImageLoad();
const opening = useViewportSection();
const mobile = useMediaQuery("(width < 1024px)");
const isWideOpening = useMediaQuery("(min-width: 40rem)");
const sections = [
  { id: "novel-opening", titleKey: "novel.reader.cover" },
  { id: "novel-chapters", titleKey: "novel.detail.chapters" },
  { id: "novel-comments", titleKey: "novel.detail.bookComments" },
];
const { activeSection, sectionPosition, sectionSpan, scrollToSection } =
  useSectionNavigation(sections);
const openingPanel = ref("introduction");
const openingPanelSurface = ref(null);
useHeightTransition(openingPanelSurface, openingPanel, {
  enabled: () => !isWideOpening.value,
});

const { handleFirstChapter, handleAnyChapter } = useChapters();

const hasReadingHistory = computed(() => readChapters.value.length > 0);
const primaryActionLabel = computed(() =>
  hasReadingHistory.value
    ? translate("novel.detail.continueReading")
    : translate("novel.detail.startReading"),
);
const primaryChapter = computed(() =>
  hasReadingHistory.value ? currentChapter.value : flatChapters.value[0],
);
const primaryChapterTitle = computed(
  () =>
    getChapterDisplayTitle(primaryChapter.value) ||
    translate("novel.detail.loading"),
);
const primaryChapterDisabled = computed(
  () =>
    !primaryChapter.value?.uuid ||
    !novelStore.getPermalinkByUuid(primaryChapter.value.uuid),
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
