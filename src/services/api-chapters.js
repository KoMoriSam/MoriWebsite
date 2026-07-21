import { useFetch } from "@vueuse/core";

const BASE_URL = import.meta.env.NOVEL_RAW;

export function useChapterApi() {
  const fetchChapters = async () => {
    const { data, error } = await useFetch(`${BASE_URL}/index.json`).json();
    if (error.value) {
      throw new Error("获取章节列表失败");
    }
    return data.value;
  };

  const fetchContent = async (path) => {
    const { data: markdownRaw, error } = await useFetch(
      `${BASE_URL}/${path}`,
    ).text();
    if (error.value) {
      throw new Error("获取内容失败");
    }
    return markdownRaw.value;
  };

  return {
    fetchChapters,
    fetchContent,
  };
}
