<template>
  <TocFrame
    ref="tocFrame"
    :mobile="mobile"
    :compact="compact"
    :progress="chapterProgress"
    :progress-label="chapterProgressLabel"
    :current-label="currentChapterTitle"
    title="阅读进度"
    aria-label="章节目录"
    icon-class="ri-book-2-line"
    desktop-content-class="flex min-h-0 flex-1 flex-col"
    @toggle-compact="emit('toggle-compact')"
    @menu-open-change="emit('menu-open-change', $event)"
    @visibility-change="tocVisible = $event"
  >
    <button
      v-if="latestChapter && !isRead(latestChapter.uuid)"
      type="button"
      class="btn btn-ghost mb-3 h-auto min-h-0 w-full min-w-0 justify-start gap-2 px-2 py-2 text-left"
      :disabled="isDisabled"
      @click="onLatestChapterSelect"
    >
      <i
        class="ri-sparkling-2-line shrink-0 text-base text-primary"
        aria-hidden="true"
      ></i>
      <span class="min-w-0 flex-1">
        <span class="block text-xs font-semibold text-base-content/45">
          最新章节
        </span>
        <span class="block truncate text-sm" :title="latestChapterTitle">
          {{ latestChapterTitle }}
        </span>
      </span>
      <i
        class="ri-arrow-right-line shrink-0 text-base-content/45"
        aria-hidden="true"
      ></i>
    </button>

    <div
      v-if="isLoadingList"
      :class="[
        'flex items-center justify-center',
        mobile ? 'min-h-32' : 'min-h-0 flex-1',
      ]"
      role="status"
      aria-label="章节目录加载中"
    >
      <span class="loading loading-spinner loading-sm text-primary"></span>
    </div>

    <ol
      v-else-if="chapterVolumes.length"
      ref="listElement"
      :class="[
        'space-y-4 overflow-y-auto overscroll-contain pr-1 scrollbar-none',
        mobile ? 'max-h-[min(55vh,32rem)]' : 'min-h-0 flex-1',
      ]"
      :style="
        mobile
          ? undefined
          : {
              maskImage: listMaskImage,
              WebkitMaskImage: listMaskImage,
            }
      "
    >
      <li
        v-for="volume in chapterVolumes"
        :key="volume.volumeInfo.uuid"
        class="min-w-0"
      >
        <button
          type="button"
          class="group/volume mb-1.5 flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-base-content/45 transition-colors hover:bg-base-200/70 hover:text-base-content/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-expanded="isVolumeExpanded(volume)"
          :aria-controls="getVolumeListId(volume)"
          @click="toggleVolume(volume)"
        >
          <i
            class="ri-arrow-down-s-line shrink-0 text-sm transition-transform duration-150"
            :class="{ '-rotate-90': !isVolumeExpanded(volume) }"
            aria-hidden="true"
          ></i>
          <span class="truncate" :title="volume.volumeInfo.title">
            {{ volume.volumeInfo.title }}
          </span>
          <small
            class="ml-auto shrink-0 whitespace-nowrap tabular-nums text-base-content/35"
            :title="`共 ${volume.chapters?.length || 0} 章，已读 ${getVolumeReadCount(volume)} 章`"
          >
            共 {{ volume.chapters?.length || 0 }} 章 · 已读
            {{ getVolumeReadCount(volume) }} 章
          </small>
        </button>

        <ol
          v-show="isVolumeExpanded(volume)"
          :id="getVolumeListId(volume)"
          class="space-y-0.5"
        >
          <li
            v-for="chapter in volume.chapters || []"
            :key="chapter.uuid"
            class="min-w-0"
          >
            <button
              type="button"
              class="flex w-full min-w-0 items-center gap-1.5 rounded-lg py-1.5 pr-2 pl-4 text-left text-sm leading-snug transition-[background-color,color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :class="[
                chapter.uuid === currentChapterUuid
                  ? 'bg-primary/10 font-black text-primary'
                  : 'text-base-content/80 hover:bg-base-200 hover:text-base-content',
                {
                  'opacity-50 hover:opacity-80':
                    isRead(chapter.uuid) && chapter.uuid !== currentChapterUuid,
                },
              ]"
              :title="chapter.title"
              :aria-current="
                chapter.uuid === currentChapterUuid ? 'page' : undefined
              "
              :data-current="
                chapter.uuid === currentChapterUuid ? 'true' : undefined
              "
              :disabled="isDisabled"
              @click="onChapterSelect(chapter.uuid)"
            >
              <span class="min-w-0 flex-1 truncate">
                {{ chapter.title }}
              </span>
              <ChapterStatusBadges
                :chapter="chapter"
                :latest-chapter-uuid="latestChapter?.uuid"
                :read="isRead(chapter.uuid)"
                latest-label="NEW!"
              />
            </button>
          </li>
        </ol>
      </li>
    </ol>

    <p
      v-else
      :class="[
        'flex items-center justify-center text-center text-sm text-base-content/55',
        mobile ? 'min-h-32' : 'min-h-0 flex-1',
      ]"
    >
      暂时没有可阅读的章节
    </p>
  </TocFrame>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { computed, ref, useId } from "vue";

import ChapterStatusBadges from "@/components/novel/ChapterStatusBadges.vue";
import TocFrame from "@/components/reader/TocFrame.vue";
import { useChapters } from "@/composables/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";
import { useRevealCurrentItem } from "@/composables/useRevealCurrentItem";
import { useScrollMask } from "@/composables/useScrollMask";
import { useNovelStore } from "@/stores/novelStore";
import { getChapterDisplayTitle } from "@/utils/format-chapter-label";

const props = defineProps({
  mobile: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  pageProgress: {
    type: Number,
    default: 0,
  },
});

const novelStore = useNovelStore();
const {
  chapterCount,
  chapterVolumes,
  currentChapter,
  currentChapterContent,
  currentChapterIndex,
  currentChapterPage,
  currentChapterUuid,
  flatChapters,
  isLoadingList,
  latestChapter,
  totalPages,
} = storeToRefs(novelStore);

const tocFrame = ref(null);
const collapsedVolumeUuids = ref(new Set());
const listElement = ref(null);
const listId = useId();
const { maskImage: listMaskImage } = useScrollMask(listElement);
const tocVisible = ref(!props.mobile);

const emit = defineEmits(["toggle-compact", "menu-open-change"]);

const latestChapterTitle = computed(() =>
  getChapterDisplayTitle(latestChapter.value),
);
const currentChapterTitle = computed(() =>
  getChapterDisplayTitle(currentChapter.value),
);
const getContentWeight = (content) =>
  Array.from(String(content || "")).reduce(
    (weight, character) => weight + (/^[\x00-\xFF]$/.test(character) ? 0.6 : 1),
    0,
  );

const chapterProgress = computed(() => {
  const chapterIndex = currentChapterIndex.value;
  if (chapterIndex < 0 || !chapterCount.value) return 0;

  const pageCount = Math.max(Number(totalPages.value) || 1, 1);
  const page = Math.min(
    pageCount,
    Math.max(Number(currentChapterPage.value) || 1, 1),
  );
  const pageFraction = Math.min(
    1,
    Math.max(Number(props.pageProgress) || 0, 0) / 100,
  );
  const pageWeights = currentChapterContent.value.map(getContentWeight);
  const totalPageWeight = pageWeights.reduce(
    (total, weight) => total + weight,
    0,
  );
  const currentChapterFraction =
    totalPageWeight > 0
      ? (pageWeights
          .slice(0, page - 1)
          .reduce((total, weight) => total + weight, 0) +
          (pageWeights[page - 1] || 0) * pageFraction) /
        totalPageWeight
      : (page - 1 + pageFraction) / pageCount;

  const rawChapterWeights = flatChapters.value.map((chapter) =>
    Math.max(Number(chapter.length) || 0, 0),
  );
  const measuredChapterWeights = rawChapterWeights.filter(
    (weight) => weight > 0,
  );
  const fallbackChapterWeight = measuredChapterWeights.length
    ? measuredChapterWeights.reduce((total, weight) => total + weight, 0) /
      measuredChapterWeights.length
    : 1;
  const chapterWeights = rawChapterWeights.map(
    (weight) => weight || fallbackChapterWeight,
  );
  const totalWeight = chapterWeights.reduce(
    (total, weight) => total + weight,
    0,
  );

  const completedWeight = chapterWeights
    .slice(0, chapterIndex)
    .reduce((total, weight) => total + weight, 0);
  const currentWeight = chapterWeights[chapterIndex] || 0;
  const progress =
    ((completedWeight + currentWeight * currentChapterFraction) / totalWeight) *
    100;

  return Math.min(100, Math.max(0, progress));
});
const chapterProgressLabel = computed(
  () => `${chapterProgress.value.toFixed(1)}%`,
);

const { handleAnyChapter, handleRecentChapter, isRead } = useChapters();
const { isDisabled, handleClick } = useClickLimit();

const getVolumeReadCount = (volume) =>
  (volume.chapters || []).filter((chapter) => isRead.value(chapter.uuid))
    .length;

const getVolumeUuid = (volume) => volume.volumeInfo?.uuid || "";
const getVolumeListId = (volume) => `${listId}-volume-${getVolumeUuid(volume)}`;
const isVolumeExpanded = (volume) =>
  !collapsedVolumeUuids.value.has(getVolumeUuid(volume));
const toggleVolume = (volume) => {
  const volumeUuid = getVolumeUuid(volume);
  if (!volumeUuid) return;

  const nextCollapsedVolumeUuids = new Set(collapsedVolumeUuids.value);
  if (nextCollapsedVolumeUuids.has(volumeUuid)) {
    nextCollapsedVolumeUuids.delete(volumeUuid);
  } else {
    nextCollapsedVolumeUuids.add(volumeUuid);
  }
  collapsedVolumeUuids.value = nextCollapsedVolumeUuids;
};

const expandCurrentChapterVolume = () => {
  const currentVolume = chapterVolumes.value.find((volume) =>
    (volume.chapters || []).some(
      (chapter) => chapter.uuid === currentChapterUuid.value,
    ),
  );
  const volumeUuid = getVolumeUuid(currentVolume || {});
  if (!volumeUuid || !collapsedVolumeUuids.value.has(volumeUuid)) return;

  const nextCollapsedVolumeUuids = new Set(collapsedVolumeUuids.value);
  nextCollapsedVolumeUuids.delete(volumeUuid);
  collapsedVolumeUuids.value = nextCollapsedVolumeUuids;
};

const onChapterSelect = (uuid) => {
  tocFrame.value?.closeMenu();
  handleClick(handleAnyChapter, uuid);
};

const onLatestChapterSelect = () => {
  tocFrame.value?.closeMenu();
  handleClick(handleRecentChapter);
};

useRevealCurrentItem({
  containerRef: listElement,
  currentKey: currentChapterUuid,
  enabled: tocVisible,
  refreshSources: [isLoadingList],
  beforeReveal: expandCurrentChapterVolume,
});
</script>
