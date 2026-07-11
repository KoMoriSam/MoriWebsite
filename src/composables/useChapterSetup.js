import { watch, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import { useNovelStore } from "@/stores/novelStore";

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

  const {
    currentComponent,
    currentChapter,
    currentChapterUuid,
    currentChapterPage,
  } = storeToRefs(novelStore);

  const replaceToCanonical = (uuid, page) => {
    const permalink = novelStore.getPermalinkByUuid(uuid);
    if (!permalink) return;

    router.replace({
      name: "novel",
      params: {
        volumeSlug: permalink.volumeSlug,
        chapterSlug: permalink.chapterSlug,
      },
      query: { page },
      hash: route.hash,
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

  // 检查并补充路由参数
  const checkAndSupplementRouteParams = () => {
    watch(
      () => currentComponent.value,
      async (newComponent) => {
        if (newComponent !== "Reader") return;

        const page = normalizePageQuery(route.query.page);
        const chapterUuid = resolveRouteToChapterUuid();
        if (chapterUuid) {
          await novelStore.setChapter(chapterUuid);
          novelStore.setPage(page);

          const hasCanonicalParams =
            route.params.volumeSlug && route.params.chapterSlug;
          const hasLegacyQuery =
            typeof route.query.chapter === "string" &&
            route.query.chapter.trim();

          if (!hasCanonicalParams || hasLegacyQuery) {
            replaceToCanonical(chapterUuid, page);
          }
          return;
        }

        if (currentChapterUuid.value) {
          replaceToCanonical(
            currentChapterUuid.value,
            currentChapterPage.value,
          );
        }
      },
      { immediate: true },
    );
  };

  // 监听路由参数变化
  const watchRouteParams = () => {
    watch(
      () => [
        route.params.volumeSlug,
        route.params.chapterSlug,
        route.query.chapter,
      ],
      async () => {
        const chapterUuid = resolveRouteToChapterUuid();
        if (chapterUuid) {
          await novelStore.setChapter(chapterUuid);

          const hasCanonicalParams =
            route.params.volumeSlug && route.params.chapterSlug;
          const hasLegacyQuery =
            typeof route.query.chapter === "string" &&
            route.query.chapter.trim();
          if (!hasCanonicalParams || hasLegacyQuery) {
            replaceToCanonical(
              chapterUuid,
              normalizePageQuery(route.query.page),
            );
          }
        }
      },
    );

    watch(
      () => route.query.page,
      (newPage) => {
        novelStore.setPage(normalizePageQuery(newPage));
      },
    );
  };

  // 监听当前组件变化
  const watchCurrentComponent = () => {
    watch(
      () => currentComponent.value,
      () => {
        console.log("currentComponent changed:", currentComponent.value);
        novelStore.updateTitle();
      },
    );
  };

  // 初始化加载
  const initialize = async () => {
    try {
      await novelStore.setChapters();
      checkAndSupplementRouteParams();
      novelStore.updateTitle();
      usePosTracker(router, () => novelStore.updateTitle());
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
      () => [currentChapter.value, currentComponent.value],
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
    watchCurrentComponent();
    handleActivation();
  };

  onMounted(() => {
    initialize();
  });

  return {
    setupWatchers,
  };
}
