import { useFetch } from "@vueuse/core";
import { loadImageManifest } from "@/utils/images/responsive-images";
import { createArticleAssetResolver } from "@/utils/resolve-article-assets";

import { githubSession } from '@/composables/auth/useGithubSession';

const BASE_URL = import.meta.env.VITE_NOVEL_RAW;
const { normalizeMarkdown } = createArticleAssetResolver(BASE_URL);

export function useChapterApi() {
  const fetchChapters = async () => {
    const images = loadImageManifest(BASE_URL);
    const { data, error } = await useFetch(`${BASE_URL}/index.json`).json();
    if (error.value) {
      throw new Error("获取章节列表失败");
    }
    await images;
    return data.value;
  };

  const fetchContent = async (path) => {
    if (!githubSession.authenticated) throw new Error('LOGIN_REQUIRED');
    const revision = githubSession.revision;
    const images = loadImageManifest(BASE_URL);
    const { data: markdownRaw, error } = await useFetch(
      `${BASE_URL}/${path}`,
    ).text();
    if (error.value) {
      throw new Error("获取内容失败");
    }
    await images;
    if (!githubSession.authenticated || revision !== githubSession.revision) throw new Error('LOGIN_REQUIRED');
    return normalizeMarkdown(markdownRaw.value.replaceAll("/assets/images/emotes/", "images/emotes/"));
  };

  return {
    fetchChapters,
    fetchContent,
  };
}
