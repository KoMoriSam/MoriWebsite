import { computed } from "vue";

export const useNovelGetters = (state) => {
  const isRecent = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 14 * 24 * 60 * 60 * 1000; // 14 天内
  };

  return {
    currentChapter: computed(() => {
      return state.flatChapters.value.find(
        (chapter) => chapter.uuid === state.currentChapterUuid.value,
      );
    }),

    currentChapterIndex: computed(() => {
      return state.flatChapters.value.findIndex(
        (chapter) => chapter.uuid === state.currentChapterUuid.value,
      );
    }),

    latestChapter: computed(() => {
      const visibleChapters = state.flatChapters.value.filter((chapter) => {
        return !chapter.volumeTitle?.toLowerCase().includes("test");
      });

      const recentChapters = visibleChapters.filter((chapter) => {
        const dateToCheck = chapter.modifiedDate || chapter.uploadDate;
        return isRecent(dateToCheck);
      });

      if (recentChapters.length > 0) {
        return recentChapters[recentChapters.length - 1];
      }

      return visibleChapters[visibleChapters.length - 1];
    }),

    totalPages: computed(() => {
      const content = state.currentChapterContent.value;
      return content.length;
    }),

    totalWordCount: computed(() => {
      return state.flatChapters.value.reduce((total, chapter) => {
        return total + (chapter.length || 0);
      }, 0);
    }),

    currentPageContent: computed(
      () =>
        state.currentChapterContent.value[state.currentChapterPage.value - 1] ||
        "",
    ),
  };
};
