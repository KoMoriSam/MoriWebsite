import { loadImageManifest } from "@/utils/images/responsive-images";
import { createArticleAssetResolver } from "@/utils/resolve-article-assets";
import { moriSession } from "@/composables/auth/useMoriAuth";
import { checkNovelResponse, encodeNovelPath, loadNovelRelease, novelBase } from "./novel-release";

const publicBase = import.meta.env.VITE_NOVEL_RAW;

export function useChapterApi() {
  const fetchChapters = async ({ force = false } = {}) => {
    const images = loadImageManifest(publicBase);
    if (!import.meta.env.DEV) {
      const [{ catalog }] = await Promise.all([loadNovelRelease({ force }), images]);
      return catalog;
    }
    const response = await fetch(`${publicBase}/index.json`, { cache: force ? "reload" : "default" });
    if (!response.ok) throw new Error("获取章节列表失败");
    await images;
    return response.json();
  };

  const fetchContent = async (path) => {
    const revision = moriSession.revision;
    const base = await novelBase();
    const assets = base + "/assets";
    const [response] = await Promise.all([
      fetch(`${base}/chapters/${encodeNovelPath(path)}`).then(checkNovelResponse),
      loadImageManifest(assets),
    ]);
    const markdown = await response.text();
    if (!moriSession.authenticated || revision !== moriSession.revision) throw new Error("LOGIN_REQUIRED");
    return createArticleAssetResolver(assets).normalizeMarkdown(markdown
      .replaceAll("/assets/images/emotes/", "images/emotes/")
      .replaceAll(/https?:\/\/raw\.komori\.cc\/novel\//gu, assets + "/")
      .replaceAll(/(?<![\w./-])\/novel\/images\//gu, assets + "/images/"));
  };

  return { fetchChapters, fetchContent };
}
