<template>
  <CatalogCard
    :to="chapterRoute"
    :class="featured ? 'md:h-full' : ''"
    :compact="!featured"
    :title="chapter.title"
    title-tag="h3"
    :description="featured ? translate('home.writing.novelDescription') : ''"
    :cover="NOVEL_HORIZONTAL_COVER_URL"
    :tags="[badge]"
    :action="action"
    cover-sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, calc(100vw - 3rem)"
  >
    <template #meta>
      <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <CatalogMeta v-if="publishedDate" tag="time" :datetime="publishedDate" icon="ri-calendar-line">{{
          date(publishedDate)
        }}</CatalogMeta>
        <CatalogMeta v-if="chapter?.length != null" icon="ri-file-text-line"
          >{{ translate("common.counts.characters", { count: number(chapter.length) }, chapter.length) }}</CatalogMeta
        >
      </div>
    </template>
  </CatalogCard>
</template>

<script setup>
import { computed, onMounted, ref, toRef } from "vue";
import { useLocale } from "@/i18n";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";
import { useNovelStore } from "@/stores/novel";
import { NOVEL_HORIZONTAL_COVER_URL } from "@/constants/novel-assets";

const props = defineProps({
  chapter: { type: Object, required: true },
  featured: Boolean,
});
const { t: translate, date, number } = useLocale();
const chapter = toRef(props, "chapter");
const novelStore = useNovelStore();
const historyReady = ref(false);
onMounted(() => {
  historyReady.value = true;
});
const hasReadingHistory = computed(
  () =>
    historyReady.value &&
    Array.isArray(novelStore.readChapters) &&
    novelStore.readChapters.some((entry) => entry?.uuid),
);
const permalink = computed(() =>
  novelStore.getPermalinkByUuid(chapter.value.uuid),
);
const badge = computed(() =>
  chapter.value.volumeTitle
    ? [translate("home.writing.novelTitle"), chapter.value.volumeTitle]
        .filter(Boolean)
        .join(" / ")
    : translate("common.navigation.novel"),
);
const action = computed(() => {
  if (!hasReadingHistory.value || !permalink.value)
    return translate("home.writing.openNovel");
  const read = novelStore.readChapters.some(
    (entry) => entry?.uuid === chapter.value.uuid,
  );
  const latest = chapter.value.uuid === novelStore.latestChapter?.uuid;
  return translate(
    latest
      ? read
        ? "novel.detail.rereadLatest"
        : "novel.detail.readLatest"
      : read
        ? "novel.detail.rereadChapter"
        : "novel.detail.readChapter",
  );
});
const publishedDate = computed(() => {
  const value = chapter.value.uploadDate;
  return value && Number.isFinite(new Date(value).getTime()) ? value : "";
});
const chapterRoute = computed(() => {
  const target = permalink.value;
  return hasReadingHistory.value && target
    ? {
        name: "novel-reader",
        params: {
          volumeSlug: target.volumeSlug,
          chapterSlug: target.chapterSlug,
        },
        query: target.routeCode ? { c: target.routeCode } : {},
      }
    : "/novel";
});
</script>
