import { computed } from "vue";

export const useNovelGetters = (state) => {
  const getVisibleChapters = () =>
    state.flatChapters.value.filter((chapter) => {
      return !chapter.volumeTitle?.toLowerCase().includes("test");
    });

  const getLatestByDate = (chapters, dateKey) => {
    const latestChapter = chapters.reduce((latest, chapter) => {
      const chapterTime = new Date(chapter[dateKey]).getTime();
      if (!Number.isFinite(chapterTime)) return latest;

      const latestTime = latest
        ? new Date(latest[dateKey]).getTime()
        : Number.NEGATIVE_INFINITY;

      return chapterTime >= latestTime ? chapter : latest;
    }, null);

    return latestChapter || chapters[chapters.length - 1];
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
      return getLatestByDate(getVisibleChapters(), "uploadDate");
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
