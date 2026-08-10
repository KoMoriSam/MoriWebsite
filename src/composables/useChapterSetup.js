import { watch, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useNovelStore } from "@/stores/novelStore";
import ssgData from "@/router/ssg-data";

import { useToast } from "@/composables/useToast";

export function useChapterSetup() {
  const route = useRoute();
  const router = useRouter();

  const toast = useToast({ closable: false, position: "center" });

  const novelStore = useNovelStore();

  if (
    ssgData.novelChapters &&
    typeof ssgData.novelChapters === "object"
  ) {
    novelStore.hydrateChapters(ssgData.novelChapters);
  }

  const { currentChapter, currentChapterUuid } = storeToRefs(novelStore);

  const replaceToCanonical = (uuid, hash = route.hash) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return;

    const query = Object.fromEntries(
      Object.entries(route.query).filter(
        ([key]) => !["c", "chapter", "p", "page", "search"].includes(key),
      ),
    );
    if (permalink.routeCode) {
      query.c = permalink.routeCode;
    }
    router.replace({
      name: "novel-reader",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query,
      hash,
    });
  };

  const getRouteCodeQuery = () => {
    return typeof route.query.c === "string" ? route.query.c.trim() : "";
  };

  const resolveRouteToChapterUuid = () => {
    const volumeSlug = String(route.params.volumeSlug || "");
    const chapterSlug = String(route.params.chapterSlug || "");
    const routeCode = getRouteCodeQuery();
    const legacyQueryChapter =
      typeof route.query.chapter === "string" ? route.query.chapter.trim() : "";

    if (routeCode && novelStore.isRouteCode(routeCode)) {
      const chapterUuid = novelStore.resolveChapterUuidByRouteCode(routeCode);
      if (chapterUuid) {
        return chapterUuid;
      }
    }

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

  const hasLegacyQueryChapter = () => {
    return Boolean(
      typeof route.query.chapter === "string" && route.query.chapter.trim(),
    );
  };

  const hasLegacyPageQuery = () =>
    route.query.p != null || route.query.page != null;

  const isCanonicalChapterRoute = () => {
    return Boolean(route.params.volumeSlug && route.params.chapterSlug);
  };

  const hasCanonicalRouteForUuid = (uuid) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return false;

    const hasCanonicalParams =
      route.params.volumeSlug === permalink.volumeSlug &&
      route.params.chapterSlug === permalink.chapterSlug;
    const hasCanonicalRouteCode =
      !permalink.routeCode || getRouteCodeQuery() === permalink.routeCode;

    return (
      hasCanonicalParams &&
      hasCanonicalRouteCode &&
      !hasLegacyQueryChapter() &&
      !hasLegacyPageQuery()
    );
  };

  const syncChapterFromRoute = async ({ withFallback = false } = {}) => {
    const chapterUuid = resolveRouteToChapterUuid();

    if (chapterUuid) {
      await novelStore.setChapter(chapterUuid);
      novelStore.setPage(1);

      if (!hasCanonicalRouteForUuid(chapterUuid)) {
        replaceToCanonical(chapterUuid);
      }
      return;
    }

    if (withFallback && currentChapterUuid.value && isCanonicalChapterRoute()) {
      replaceToCanonical(currentChapterUuid.value);
    }
  };

  // 监听路由参数变化
  const watchRouteParams = () => {
    watch(
      () => [
        route.params.volumeSlug,
        route.params.chapterSlug,
        route.query.c,
        route.query.chapter,
        route.query.p,
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

  return {
    setupWatchers,
  };
}
