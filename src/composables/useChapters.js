import { computed, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useToast } from "@/composables/useToast";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";

import { useNovelStore } from "@/stores/novelStore";

export function useChapters() {
  const toast = useToast({ position: "center", closable: false });

  const novelStore = useNovelStore();
  const { getState, setState } = useReadingStateStorage();
  const {
    currentChapterUuid,
    currentChapterIndex,
    latestChapter,
    flatChapters,
    readChapters,
    isLoadingContent,
  } = storeToRefs(novelStore);

  const route = useRoute();
  const router = useRouter();

  const isReaderRoute = computed(() => {
    return Boolean(route.params.volumeSlug && route.params.chapterSlug);
  });

  const waitForChapterRender = (uuid) => {
    const isReady = () =>
      currentChapterUuid.value === uuid &&
      !isLoadingContent.value;

    if (isReady()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        stop();
        resolve();
      };
      const stop = watch(isReady, (ready) => {
        if (ready) finish();
      });
      const timeoutId = window.setTimeout(finish, 10000);
    });
  };

  const scrollToReadingStart = async (uuid) => {
    if (import.meta.env.SSR || typeof window === "undefined") return;

    await waitForChapterRender(uuid);
    await nextTick();
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });

    if (
      currentChapterUuid.value !== uuid ||
      route.name !== "novel-reader"
    ) {
      return;
    }

    const target = document.getElementById("novel-reading-start");
    if (!target) return;

    const targetTop = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - 96,
    );
    window.scrollTo({ top: targetTop, behavior: "auto" });
  };

  const handleChapter = (uuid, options = {}) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return;

    const targetHash = String(options.hash || "").trim();
    const query = {};

    // 主动切换章节时从新内容顶部开始，避免位置追踪器恢复上一章锚点。
    // “继续阅读”等显式 hash 跳转保留已记录的位置。
    if (!targetHash) {
      setState("READ_POS", "");
    }

    if (permalink.routeCode) {
      query.c = permalink.routeCode;
    }
    const navigate = options.replaceDialogHistory
      ? router.replace
      : router.push;
    const navigation = navigate.call(router, {
      name: "novel-reader",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query,
      hash: targetHash,
      state: options.state,
    });

    if (!targetHash) {
      void navigation.then(() => scrollToReadingStart(uuid));
    }

    return navigation;
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

      const canUseStoredChapter =
        Boolean(storedChapterId) &&
        Boolean(novelStore.getPermalinkByUuid(storedChapterId));
      const targetUuid = canUseStoredChapter ? storedChapterId : uuid;
      const resumeHash = storedPos ? `#${storedPos}` : "";

      const targetRouteCode = String(
        novelStore.getPermalinkByUuid(targetUuid)?.routeCode || "",
      );
      const sameRouteTarget =
        targetUuid === currentChapterUuid.value &&
        isReaderRoute.value &&
        route.hash === resumeHash &&
        (!targetRouteCode || route.query.c === targetRouteCode);

      if (sameRouteTarget) {
        toast.info("已经是当前阅读位置啦！");
        return;
      }

      handleChapter(targetUuid, {
        hash: resumeHash,
        replaceDialogHistory: options.replaceDialogHistory,
      });
      return;
    }

    if (uuid === currentChapterUuid.value && isReaderRoute.value) {
      toast.info("已经是当前章啦！");
    } else {
      handleChapter(uuid, {
        replaceDialogHistory: options.replaceDialogHistory,
      });
    }
  };

  const handleRecentChapter = (options = {}) => {
    if (
      latestChapter.value.uuid === currentChapterUuid.value &&
      isReaderRoute.value
    ) {
      toast.info("已经是最新章啦！");
    } else {
      handleChapter(latestChapter.value.uuid, {
        replaceDialogHistory: options.replaceDialogHistory,
      });
    }
  };

  const hasPrevious = computed(() => currentChapterIndex.value > 0);

  const hasNext = computed(
    () => currentChapterIndex.value + 1 < flatChapters.value.length,
  );

  const handlePrev = async ({ lastPage = false } = {}) => {
    const previousChapter = flatChapters.value[currentChapterIndex.value - 1];
    if (!previousChapter) return;

    return handleChapter(previousChapter.uuid, {
      state: lastPage
        ? {
            mobileReaderEdge: {
              chapterUuid: previousChapter.uuid,
              edge: "end",
            },
          }
        : undefined,
    });
  };

  const handleNext = () => {
    const nextChapter = flatChapters.value[currentChapterIndex.value + 1];
    if (!nextChapter) return;

    return handleChapter(nextChapter.uuid);
  };

  const isWithinRecentPeriod = (dateStr) => {
    const time = new Date(dateStr).getTime();
    if (!Number.isFinite(time)) return false;

    const diff = Date.now() - time;
    return diff >= 0 && diff < 14 * 24 * 60 * 60 * 1000;
  };

  const isRecent = (uuid, dateStr) => {
    return (
      isWithinRecentPeriod(dateStr) || uuid === latestChapter.value?.uuid
    );
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
    isRecent,
  };
}
