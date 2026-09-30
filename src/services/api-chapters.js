import { useFetch } from "@vueuse/core";

import { githubSession } from '@/composables/auth/useGithubSession';

const BASE_URL = import.meta.env.VITE_NOVEL_RAW;

export function useChapterApi() {
  const fetchChapters = async () => {
    const { data, error } = await useFetch(`${BASE_URL}/index.json`).json();
    if (error.value) {
      throw new Error("获取章节列表失败");
    }
    return data.value;
  };

  const fetchContent = async (path) => {
    if (!githubSession.authenticated) throw new Error('LOGIN_REQUIRED');
    const revision = githubSession.revision;
    const { data: markdownRaw, error } = await useFetch(
      `${BASE_URL}/${path}`,
    ).text();
    if (error.value) {
      throw new Error("获取内容失败");
    }
    if (!githubSession.authenticated || revision !== githubSession.revision) throw new Error('LOGIN_REQUIRED');
    return markdownRaw.value;
  };

  return {
    fetchChapters,
    fetchContent,
  };
}
