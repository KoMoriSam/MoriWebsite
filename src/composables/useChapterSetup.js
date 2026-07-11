import { watch, onMounted, onActivated, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useNovelStore } from "@/stores/novelStore";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";

import { useToast } from "@/composables/useToast";
import { usePosTracker } from "@/composables/usePosTracker";

const normalizePageQuery = (page) => {
  const n = Number(page);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export function useChapterSetup() {
  const route = useRoute();
  const router = useRouter();

  const toast = useToast({ closable: false, position: "center" });

  const novelStore = useNovelStore();
  const { getState } = useReadingStateStorage();

  const {
    currentChapter,
    currentChapterUuid,
    currentChapterPage,
    readChapters,
  } = storeToRefs(novelStore);
  let disposePosTracker = null;

  const replaceToCanonical = (uuid, page, hash = route.hash) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return;

    router.replace({
      name: "novel",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query: { page },
      hash,
    });
  };

  const resolveRouteToChapterUuid = () => {
    const volumeSlug = String(route.params.volumeSlug || "");
    const chapterSlug = String(route.params.chapterSlug || "");
    const legacyQueryChapter =
      typeof route.query.chapter === "string" ? route.query.chapter.trim() : "";

    if (volumeSlug && chapterSlug) {
      return novelStore.resolveChapterUuidByPermalink(volumeSlug, chapterSlug);
    }

    if (legacyQueryChapter && novelStore.isUuid(legacyQueryChapter)) {
      return legacyQueryChapter;
    }

    if (volumeSlug && !chapterSlug && novelStore.isUuid(volumeSlug)) {
      return volumeSlug;
    }

    return "";
  };

  const isCanonicalChapterRoute = () => {
    return Boolean(route.params.volumeSlug && route.params.chapterSlug);
  };

  const hasLegacyQueryChapter = () => {
    return Boolean(
      typeof route.query.chapter === "string" && route.query.chapter.trim(),
    );
  };

  const hasReadingHistory = () => {
    const pos = String(getState("READ_POS", "") || "").trim();
    const readList = getState("READ_CHS", []);
    return Boolean(pos || (Array.isArray(readList) && readList.length > 0));
  };

  const getHistoryHash = () => {
    const pos = String(getState("READ_POS", "") || "").trim();
    if (!pos) return "";
    return `#${pos}`;
  };

  const canRedirectFromNovelHome = () => {
    const isNovelHomePath = route.path === "/novel";
    return (
      isNovelHomePath &&
      !route.params.volumeSlug &&
      !route.params.chapterSlug &&
      !hasLegacyQueryChapter()
    );
  };

  const syncChapterFromRoute = async ({ withFallback = false } = {}) => {
    const page = normalizePageQuery(route.query.page);
    const chapterUuid = resolveRouteToChapterUuid();

    if (chapterUuid) {
      await novelStore.setChapter(chapterUuid);
      novelStore.setPage(page);

      if (!isCanonicalChapterRoute() || hasLegacyQueryChapter()) {
        replaceToCanonical(chapterUuid, page);
      }
      return;
    }

    if (withFallback && canRedirectFromNovelHome() && hasReadingHistory()) {
      const fallbackPage = normalizePageQuery(currentChapterPage.value);
      replaceToCanonical(
        currentChapterUuid.value,
        fallbackPage,
        getHistoryHash(),
      );
      return;
    }

    if (withFallback && currentChapterUuid.value && isCanonicalChapterRoute()) {
      replaceToCanonical(currentChapterUuid.value, currentChapterPage.value);
    }
  };

  // 监听路由参数变化
  const watchRouteParams = () => {
    watch(
      () => [
        route.params.volumeSlug,
        route.params.chapterSlug,
        route.query.chapter,
        route.query.page,
      ],
      async () => {
        await syncChapterFromRoute();
      },
      { immediate: true },
    );
  };

  // 初始化加载
  const initialize = async () => {
    try {
      await novelStore.setChapters();
      await syncChapterFromRoute({ withFallback: true });
      novelStore.updateTitle();
      if (typeof disposePosTracker === "function") {
        disposePosTracker();
      }

      disposePosTracker = usePosTracker(router, () => novelStore.updateTitle());
      setTimeout(() => {
        toast.success("已继续上次阅读！");
      }, 750);
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  };

  // 监听章节变化，自动更新标题
  const watchChapterChanges = () => {
    watch(
      () => [
        currentChapter.value,
        route.params.volumeSlug,
        route.params.chapterSlug,
      ],
      () => {
        novelStore.updateTitle();
      },
      { immediate: true },
    );
  };

  // 在组件挂载或激活时重新更新标题
  const handleActivation = () => {
    onActivated(() => {
      novelStore.updateTitle();
    });
  };

  // 调用所有监听和初始化逻辑
  const setupWatchers = () => {
    watchRouteParams();
    watchChapterChanges();
    handleActivation();
  };

  onMounted(() => {
    initialize();
  });

  onBeforeUnmount(() => {
    if (typeof disposePosTracker === "function") {
      disposePosTracker();
      disposePosTracker = null;
    }
  });

  return {
    setupWatchers,
  };
}
