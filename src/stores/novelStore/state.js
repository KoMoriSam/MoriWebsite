import { ref, computed } from "vue";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";

export const useNovelState = () => {
  // 章节相关状态
  const { getState, setState } = useReadingStateStorage();
  const chapters = ref([]);
  const storedChapters = computed({
    get: () => getState("CHAPTER_LIST", {}),
    set: (value) => setState("CHAPTER_LIST", value),
  });
  const lastUpdated = computed({
    get: () => getState("CHAPTER_LIST_UPDATED_AT", 0),
    set: (value) => setState("CHAPTER_LIST_UPDATED_AT", value),
  });
  const flatChapters = ref([]);
  const chapterPermalinkToUuid = ref({});
  const chapterUuidToPermalink = ref({});
  const readChapters = computed({
    get: () => getState("READ_CHS", []),
    set: (value) => setState("READ_CHS", value),
  });

  // 内容相关状态
  const currentChapterContent = ref([]);
  const contentCache = computed({
    get: () => getState("CHAPTERS_CONTENT", {}),
    set: (value) => setState("CHAPTERS_CONTENT", value),
  });

  // 阅读进度状态
  const currentChapterUuid = computed({
    get: () => getState("READ_CH_ID", "7d5e9b50-a9cb-428a-9264-903046354e22"),
    set: (value) => setState("READ_CH_ID", value),
  });
  const currentChapterPage = computed({
    get: () => getState("READ_PAGE", 1),
    set: (value) => setState("READ_PAGE", value),
  });

  // 其他状态
  const title = ref("向远方 | KoMoriSam");
  const isLoadingList = ref(true);
  const isLoadingContent = ref(true);

  return {
    chapters,
    storedChapters,
    lastUpdated,
    flatChapters,
    chapterPermalinkToUuid,
    chapterUuidToPermalink,
    readChapters,
    currentChapterContent,
    contentCache,
    currentChapterUuid,
    currentChapterPage,
    title,
    isLoadingList,
    isLoadingContent,
  };
};
