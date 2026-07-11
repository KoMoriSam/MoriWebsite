import { useTitle, useDebounceFn } from "@vueuse/core";

import { useToast } from "@/composables/useToast";

import { useChapterApi } from "@/services/api-chapters";

import { splitMarkdown } from "@/utils/markdown/split-markdown";

import CONFIG from "@/constants/config.js";
import fm from "front-matter";

export const useNovelActions = (state, getters) => {
  const CACHE_EXPIRATION = CONFIG.getDynamicCacheExpiration();
  const { fetchChapters, fetchContent } = useChapterApi();

  const toast = useToast({ position: "center-top", closable: false });

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const slugifySegment = (value, fallback = "item") => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    const normalized = raw
      .toLowerCase()
      .replace(/\.md$/i, "")
      .replace(/[\\/]+/g, "-")
      .replace(/[“”"'`]/g, "")
      .replace(/[。！？：；，、·]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return normalized || fallback;
  };

  const buildPermalinkMaps = () => {
    const permalinkToUuid = {};
    const uuidToPermalink = {};
    const volumeSlugCounter = {};

    for (const chapter of state.flatChapters.value) {
      const chapterPath = String(chapter.path || "");
      const [volumeRaw = "", chapterFileRaw = ""] = chapterPath.split("/");

      const volumeSlug = slugifySegment(volumeRaw, "volume");
      const chapterBaseSlug = slugifySegment(chapterFileRaw, "chapter");

      const volumeChapterKey = `${volumeSlug}/${chapterBaseSlug}`;
      const duplicateIndex = (volumeSlugCounter[volumeChapterKey] || 0) + 1;
      volumeSlugCounter[volumeChapterKey] = duplicateIndex;

      const chapterSlug =
        duplicateIndex > 1
          ? `${chapterBaseSlug}-${duplicateIndex}`
          : chapterBaseSlug;

      const permalink = {
        volumeSlug,
        chapterSlug,
      };
      const permalinkKey = `${permalink.volumeSlug}/${permalink.chapterSlug}`;

      permalinkToUuid[permalinkKey] = chapter.uuid;
      uuidToPermalink[chapter.uuid] = permalink;
    }

    state.chapterPermalinkToUuid.value = permalinkToUuid;
    state.chapterUuidToPermalink.value = uuidToPermalink;
  };

  const flatList = (list) => {
    state.flatChapters.value = Object.values(list).flatMap((volume) =>
      volume.chapters.map((chapter) => ({
        ...chapter,
        volumeTitle: volume.volumeInfo.title,
        volumeUuid: volume.volumeInfo.uuid,
      })),
    );
    buildPermalinkMaps();
  };

  const resolveChapterUuidByPermalink = (volumeSlug, chapterSlug) => {
    const key = `${String(volumeSlug || "")}/${String(chapterSlug || "")}`;
    return state.chapterPermalinkToUuid.value[key] || "";
  };

  const getPermalinkByUuid = (uuid) => {
    return state.chapterUuidToPermalink.value[String(uuid || "")] || null;
  };

  const isUuid = (value) => UUID_PATTERN.test(String(value || "").trim());

  const isReaderRoute = () => {
    if (typeof window === "undefined") return false;

    const path = String(window.location?.pathname || "").replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    const query = new URLSearchParams(String(window.location?.search || ""));

    if (segments[0] !== "novel") {
      return false;
    }

    if (segments.length >= 3) {
      return true;
    }

    return Boolean(query.get("chapter"));
  };

  const setRead = () => {
    if (!isReaderRoute()) {
      console.log("setRead: not in Reader component, skipping");
      return;
    }

    if (!getters.currentChapter.value) return;

    const chapterSet = new Set(
      state.readChapters.value.map((item) => item.uuid),
    );
    if (!chapterSet.has(getters.currentChapter.value.uuid)) {
      state.readChapters.value = [
        ...state.readChapters.value,
        getters.currentChapter.value,
      ];
      console.log("setRead: new read", getters.currentChapter.value.title);
    } else {
      console.log("setRead: already read", getters.currentChapter.value.title);
    }
  };

  // 章节相关操作
  const setChapters = useDebounceFn(async (forceUpdate = false) => {
    const now = Date.now();

    if (
      !forceUpdate &&
      Object.keys(state.storedChapters.value).length > 0 &&
      now - state.lastUpdated.value < CACHE_EXPIRATION
    ) {
      console.log("setChapters: Call cache");
      state.chapters.value = state.storedChapters.value;
      flatList(state.storedChapters.value);
      state.isLoadingList.value = false;
      if (state.currentChapterContent.value.length === 0) {
        await loadChapterContent();
      }
      return;
    }

    const loadingToast = toast.loading("章节目录加载中……");

    try {
      state.isLoadingList.value = true;
      const data = await fetchChapters();
      state.chapters.value = data;
      state.storedChapters.value = state.chapters.value;
      state.lastUpdated.value = now;
      flatList(data);
      if (forceUpdate) {
        console.log("setChapters: Force update");
        toast.success("章节目录已刷新！");
      } else {
        console.log("setChapters: First loading");
        toast.success("章节目录加载完成！");
      }
      if (state.currentChapterContent.value.length === 0) {
        await loadChapterContent();
      }
    } catch (error) {
      console.error("章节目录加载失败:", error);
      toast.error("章节目录加载失败！");
    } finally {
      state.isLoadingList.value = false;
      toast.remove(loadingToast.id, loadingToast.position);
    }
  }, 500);

  const refreshChapters = useDebounceFn(async () => {
    await setChapters(true);
    state.contentCache.value = {};
    await loadChapterContent(true);
  }, 500);

  const refreshReadChapters = useDebounceFn(async () => {
    state.readChapters.value = [];
    toast.success("已清空阅读记录！");
    await loadChapterContent(true);
  }, 500);

  // 内容相关操作
  const loadChapterContent = async (forceUpdate = false) => {
    if (
      !forceUpdate &&
      state.contentCache.value[state.currentChapterUuid.value]
    ) {
      state.isLoadingContent.value = true;
      console.log("loadChapterContent: Call cache");
      state.currentChapterContent.value =
        state.contentCache.value[state.currentChapterUuid.value];
      setRead();
      state.isLoadingContent.value = false;
      return;
    }

    const loadingToast = toast.loading("章节内容加载中……");

    try {
      state.isLoadingContent.value = true;

      const markdownRaw = await fetchContent(getters.currentChapter.value.path);
      const { body: content } = fm(markdownRaw);
      const parsedContent = splitMarkdown(content);
      state.currentChapterContent.value = parsedContent;

      state.contentCache.value = {
        ...state.contentCache.value,
        [state.currentChapterUuid.value]: state.currentChapterContent.value,
      };
      if (forceUpdate) {
        console.log("loadChapterContent: Force update");
        toast.success("章节内容已刷新！");
      } else {
        console.log("loadChapterContent: First loading");
        toast.success("章节内容加载完成！");
      }
      setRead();
    } catch (error) {
      console.error("章节内容加载失败:", error);
      toast.error("章节内容加载失败！");
    } finally {
      state.isLoadingContent.value = false;
      toast.remove(loadingToast.id, loadingToast.position);
    }
  };

  const refreshContent = useDebounceFn(async () => {
    try {
      state.isLoadingContent.value = true;
      const { [state.currentChapterUuid.value]: _removed, ...rest } =
        state.contentCache.value;
      state.contentCache.value = rest;
      console.log("refreshContent: Clear cache");
      await loadChapterContent(true);

      console.log("refreshContent: Reload content");
    } catch (error) {
      console.error("刷新内容失败:", error);
      toast.error("刷新内容失败！");
      throw error;
    } finally {
      state.isLoadingContent.value = false;
    }
  }, 500);

  // 阅读进度相关操作
  const setChapter = useDebounceFn(async (uuid) => {
    state.currentChapterUuid.value = uuid;
    console.log("setChapter:", uuid);
    await loadChapterContent();
  }, 500);

  const setPage = useDebounceFn((page) => {
    state.currentChapterPage.value = page;
    console.log("setPage:", page);
  }, 500);

  const updateTitle = () => {
    if (!isReaderRoute()) {
      state.title.value = "向远方 | KoMoriSam";
      useTitle(state.title.value);
      return;
    }

    if (getters.currentChapter.value) {
      state.title.value = `${getters.currentChapter.value.title} | KoMoriSam`;
      useTitle(state.title.value);
    }
  };

  return {
    // 章节操作
    setChapters,
    refreshChapters,
    refreshReadChapters,

    // 内容操作
    loadChapterContent,
    refreshContent,

    // 阅读进度操作
    setChapter,
    setPage,
    updateTitle,
    setRead,
    resolveChapterUuidByPermalink,
    getPermalinkByUuid,
    isUuid,
  };
};
