import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useScrollTo } from "@/composables/useScrollTo";
import { useToast } from "@/composables/useToast";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";

import { useNovelStore } from "@/stores/novelStore";

export function useChapters() {
  const toast = useToast({ position: "center", closable: false });

  const { scrollToTop } = useScrollTo();

  const novelStore = useNovelStore();
  const { getState } = useReadingStateStorage();
  const {
    currentChapter,
    currentChapterUuid,
    currentChapterPage,
    currentChapterIndex,
    latestChapter,
    flatChapters,
    readChapters,
  } = storeToRefs(novelStore);

  const route = useRoute();
  const router = useRouter();

  const isReaderRoute = computed(() => {
    return Boolean(route.params.volumeSlug && route.params.chapterSlug);
  });

  const handleChapter = (uuid, options = {}) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return;

    const targetPage =
      Number.isFinite(Number(options.page)) && Number(options.page) > 0
        ? Number(options.page)
        : 1;
    const targetHash = String(options.hash || "").trim();
    const shouldScrollTop = options.scrollTop !== false;

    router.push({
      name: "novel",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query: { page: targetPage },
      hash: targetHash,
    });
    if (shouldScrollTop) {
      scrollToTop(80);
    }
  };

  const handleFirstChapter = () => {
    if (currentChapterIndex.value === 0 && isReaderRoute.value) {
      toast.info("已经是第一章啦！");
    } else {
      handleChapter("7d5e9b50-a9cb-428a-9264-903046354e22");
    }
  };

  const handleAnyChapter = (uuid, options = {}) => {
    if (options.resume) {
      const storedChapterId = String(getState("READ_CH_ID", "") || "").trim();
      const storedPos = String(getState("READ_POS", "") || "").trim();
      const storedPage = Number(
        getState("READ_PAGE", currentChapterPage.value),
      );

      const canUseStoredChapter =
        Boolean(storedChapterId) &&
        Boolean(novelStore.getPermalinkByUuid(storedChapterId));
      const targetUuid = canUseStoredChapter ? storedChapterId : uuid;
      const resumePage =
        Number.isFinite(storedPage) && storedPage > 0 ? storedPage : 1;
      const resumeHash = storedPos ? `#${storedPos}` : "";

      const currentPage = Number(route.query.page);
      const normalizedCurrentPage =
        Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1;
      const sameRouteTarget =
        targetUuid === currentChapterUuid.value &&
        isReaderRoute.value &&
        normalizedCurrentPage === resumePage &&
        route.hash === resumeHash;

      if (sameRouteTarget) {
        toast.info("已经是当前阅读位置啦！");
        return;
      }

      handleChapter(targetUuid, {
        page: resumePage,
        hash: resumeHash,
        scrollTop: false,
      });
      return;
    }

    if (uuid === currentChapterUuid.value && isReaderRoute.value) {
      toast.info("已经是当前章啦！");
    } else {
      handleChapter(uuid);
    }
  };

  const handleRecentChapter = () => {
    if (
      latestChapter.value.uuid === currentChapterUuid.value &&
      isReaderRoute.value
    ) {
      toast.info("已经是最新章啦！");
    } else {
      handleChapter(latestChapter.value.uuid);
    }
  };

  const hasPrevious = computed(() => currentChapterIndex.value > 0);

  const hasNext = computed(
    () => currentChapterIndex.value + 1 < flatChapters.value.length,
  );

  const handlePrev = () => {
    handleChapter(flatChapters.value[currentChapterIndex.value - 1].uuid);
  };

  const handleNext = () => {
    handleChapter(flatChapters.value[currentChapterIndex.value + 1].uuid);
  };

  const handleAnyPage = (index) => {
    const permalink = novelStore.getPermalinkByUuid(currentChapter.value.uuid);
    if (!permalink) return;

    router.push({
      name: "novel",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query: { page: index },
    });
    scrollToTop(80);
  };

  const isRecent = (uuid, dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 14 * 24 * 60 * 60 * 1000 || uuid === latestChapter.value.uuid; // 14 天内和最新章
  };

  const isRead = computed(() => (uuid) => {
    return readChapters.value.some((g) => g.uuid === uuid);
  });

  return {
    hasPrevious,
    hasNext,
    isRead,
    handleFirstChapter,
    handleAnyChapter,
    handleRecentChapter,
    handlePrev,
    handleNext,
    handleAnyPage,
    isRecent,
  };
}
