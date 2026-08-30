import fm from "front-matter";
import {
  createArticleAssetResolver,
  extractArticleImageTarget,
} from "@/utils/resolve-article-assets";

const BASE_URL = import.meta.env.VITE_BLOG_RAW;
const OBSIDIAN_IMAGE_REGEX = /!\[\[([^\]]+)\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

const {
  contentBaseUrl: CONTENT_BASE_URL,
  normalizeImageSrc,
  normalizeBanner,
} = createArticleAssetResolver(BASE_URL);

const extractImageTarget = extractArticleImageTarget;

const normalizeObsidianImages = (markdown = "", { bannerName = "" } = {}) => {
  return String(markdown || "").replaceAll(OBSIDIAN_IMAGE_REGEX, (_, inner) => {
    const parts = String(inner)
      .split("|")
      .map((item) => item.trim());

    const rawTarget = parts.shift() || "";
    const src = normalizeImageSrc(rawTarget, { bannerName });
    if (!src) return "";

    const options = parts.length ? `|${parts.join("|")}` : "";
    return `![[${src}${options}]]`;
  });
};

const normalizeMarkdownImages = (markdown = "", { bannerName = "" } = {}) => {
  return String(markdown || "").replaceAll(
    MARKDOWN_IMAGE_REGEX,
    (_, altText, target) => {
      const src = normalizeImageSrc(target, { bannerName });
      if (!src) return _;

      const alt = String(altText || "").trim();
      return `![${alt}](${src})`;
    },
  );
};

const normalizeArticleMeta = (article = {}) => {
  if (!article || typeof article !== "object") return article;

  return {
    ...article,
    banner: normalizeBanner(article.banner),
  };
};

/**
 * 文章 API 服务
 * - 开发环境：读取 /mock/article（本地静态文件）
 * - 生产环境：由 VITE_BLOG_RAW 环境变量指定
 */
export function useArticleApi() {
  /**
   * 获取文章列表（索引）
   * 索引为扁平数组；兼容旧的嵌套格式 { tagName: { articles: [...] } }
   * @returns {Promise<Array<{id, title, summary, date, tags, path, banner?}>>}
   */
  const fetchArticleList = async () => {
    const res = await fetch(`${CONTENT_BASE_URL}/index.json`);

    if (!res.ok) {
      throw new Error(`获取文章列表失败: ${res.status}`);
    }

    const raw = await res.json();

    // 新格式：数组
    if (Array.isArray(raw)) {
      return raw.map(normalizeArticleMeta);
    }

    // 防止错误数据
    if (!raw || typeof raw !== "object") {
      throw new Error("index.json 格式错误");
    }

    // 兼容旧格式
    const flat = [];

    for (const tag of Object.values(raw)) {
      if (tag && Array.isArray(tag.articles)) {
        flat.push(...tag.articles);
      }
    }

    return flat.map(normalizeArticleMeta);
  };

  const fetchArticleDocument = async (path) => {
    const res = await fetch(`${CONTENT_BASE_URL}/${path}`);

    if (!res.ok) {
      throw new Error(`获取文章内容失败: ${res.status}`);
    }

    const raw = await res.text();

    const parsed = fm(raw);

    const bannerName = extractImageTarget(parsed?.attributes?.banner || "")
      .split("|")[0]
      .trim();

    const normalizedObsidian = normalizeObsidianImages(parsed.body, {
      bannerName,
    });

    return {
      attributes: parsed?.attributes || {},
      content: normalizeMarkdownImages(normalizedObsidian, {
        bannerName,
      }),
    };
  };

  /**
   * 获取单篇文章的 Markdown 内容（已剥离 frontmatter）
   * @param {string} path - 文章文件路径（扁平结构下即文件名，如 "2024-07-07.md"）
   * @returns {Promise<string>}
   */
  const fetchArticleContent = async (path) => {
    const document = await fetchArticleDocument(path);
    return document.content;
  };

  return {
    fetchArticleList,
    fetchArticleDocument,
    fetchArticleContent,
  };
}
