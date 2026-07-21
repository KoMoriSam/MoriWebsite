import fm from "front-matter";

const BASE_URL = import.meta.env.VITE_API_ARTICLE_URL;
const OBSIDIAN_LINK_REGEX = /^\[\[(.+)\]\]$/;
const OBSIDIAN_IMAGE_REGEX = /!\[\[([^\]]+)\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

const normalizeBaseUrl = (value = "") =>
  String(value || "").replace(/\/+$/, "");

const BASE_URL_NORMALIZED = normalizeBaseUrl(BASE_URL);
const CONTENT_BASE_URL = BASE_URL_NORMALIZED.replace(/\/images$/i, "");
const IMAGE_BASE_URL = `${CONTENT_BASE_URL}/images`;
const BANNER_DIRECTORY = "banners";

const escapeHtmlAttr = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const extractImageTarget = (rawTarget = "") => {
  const target = String(rawTarget || "").trim();
  if (!target) return "";

  const obsidianMatch = target.match(OBSIDIAN_LINK_REGEX);
  const targetValue = obsidianMatch ? obsidianMatch[1] : target;

  return targetValue
    .replace(/^<([^>]+)>$/, "$1")
    .replace(/\s+"[^"]*"$/, "")
    .trim();
};

const normalizeImageSrc = (rawTarget = "", { bannerName = "" } = {}) => {
  const target = extractImageTarget(rawTarget);
  if (!target) return "";

  if (
    target.startsWith("/") ||
    target.startsWith("data:") ||
    /^(https?:)?\/\//i.test(target)
  ) {
    return target;
  }

  const normalizedRelativeTarget = target
    .replace(/^\.\//, "")
    .replace(/^images\//i, "")
    .replace(/^banner\//i, `${BANNER_DIRECTORY}/`)
    .replace(/^banners\//i, `${BANNER_DIRECTORY}/`);

  if (!normalizedRelativeTarget) return "";

  const shouldUseBannerDirectory =
    bannerName &&
    !normalizedRelativeTarget.includes("/") &&
    normalizedRelativeTarget === bannerName;

  return `${IMAGE_BASE_URL}/${
    shouldUseBannerDirectory
      ? `${BANNER_DIRECTORY}/${normalizedRelativeTarget}`
      : normalizedRelativeTarget
  }`;
};

const normalizeBanner = (banner) => {
  const value = extractImageTarget(banner);
  if (!value) return "";

  const target = value.split("|")[0]?.trim() || "";

  return normalizeImageSrc(target, { bannerName: target });
};

const formatImageWidth = (raw = "") => {
  const value = String(raw || "").trim();
  if (!value || value === "%") return "";

  if (/^\d+(\.\d+)?$/.test(value)) {
    return `${value}px`;
  }

  if (/^\d+(\.\d+)?%$/.test(value)) {
    return value;
  }

  return "";
};

const normalizeObsidianImages = (markdown = "", { bannerName = "" } = {}) => {
  return String(markdown || "").replaceAll(OBSIDIAN_IMAGE_REGEX, (_, inner) => {
    const parts = String(inner)
      .split("|")
      .map((item) => item.trim());

    const rawTarget = parts.shift() || "";
    const src = normalizeImageSrc(rawTarget, { bannerName });
    if (!src) return "";

    let align = "";
    if (["left", "center", "right"].includes((parts[0] || "").toLowerCase())) {
      align = (parts.shift() || "").toLowerCase();
    }

    const [rawAlt = "", rawWidth = ""] = parts;
    const alt = rawAlt === "%" ? "" : rawAlt;
    const width = formatImageWidth(
      rawWidth || (parts.length === 1 ? rawAlt : ""),
    );

    const styleTokens = ["max-width:100%", "height:auto"];
    if (width) {
      styleTokens.push(`width:${width}`);
    }

    const alignClass =
      align === "center"
        ? "mx-auto block"
        : align === "right"
          ? "ml-auto block"
          : align === "left"
            ? "mr-auto block"
            : "";

    return `<img class="${alignClass}" src=\"${escapeHtmlAttr(src)}\" alt=\"${escapeHtmlAttr(alt)}\" loading=\"lazy\" style=\"${styleTokens.join(";")};\" />`;
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
 * - 生产环境：由 VITE_API_ARTICLE_URL 环境变量指定
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

  /**
   * 获取单篇文章的 Markdown 内容（已剥离 frontmatter）
   * @param {string} path - 文章文件路径（扁平结构下即文件名，如 "2024-07-07.md"）
   * @returns {Promise<string>}
   */
  const fetchArticleContent = async (path) => {
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

    return normalizeMarkdownImages(normalizedObsidian, {
      bannerName,
    });
  };

  return {
    fetchArticleList,
    fetchArticleContent,
  };
}
