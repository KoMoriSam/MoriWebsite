const OBSIDIAN_LINK_REGEX = /^\[\[(.+)\]\]$/;
const OBSIDIAN_IMAGE_REGEX = /!\[\[([^\]]+)\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

const normalizeBaseUrl = (value = "") =>
  String(value || "").replace(/\/+$/, "");

export const extractArticleImageTarget = (rawTarget = "") => {
  const target = String(rawTarget || "").trim();
  if (!target) return "";

  const obsidianMatch = target.match(OBSIDIAN_LINK_REGEX);
  const targetValue = obsidianMatch ? obsidianMatch[1] : target;

  return targetValue
    .replace(/^<([^>]+)>$/, "$1")
    .replace(/\s+"[^"]*"$/, "")
    .trim();
};

export const createArticleAssetResolver = (baseUrl = "") => {
  const contentBaseUrl = normalizeBaseUrl(baseUrl).replace(/\/images$/i, "");
  const imageBaseUrl = `${contentBaseUrl}/images`;
  const bannerDirectory = "banners";

  const normalizeImageSrc = (rawTarget = "", { bannerName = "" } = {}) => {
    const target = extractArticleImageTarget(rawTarget);
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
      .replace(/^banner\//i, `${bannerDirectory}/`)
      .replace(/^banners\//i, `${bannerDirectory}/`);

    if (!normalizedRelativeTarget) return "";

    const shouldUseBannerDirectory =
      bannerName &&
      !normalizedRelativeTarget.includes("/") &&
      normalizedRelativeTarget === bannerName;

    return `${imageBaseUrl}/${
      shouldUseBannerDirectory
        ? `${bannerDirectory}/${normalizedRelativeTarget}`
        : normalizedRelativeTarget
    }`;
  };

  const normalizeBanner = (banner = "") => {
    const value = extractArticleImageTarget(banner);
    if (!value) return "";

    const target = value.split("|")[0]?.trim() || "";
    return normalizeImageSrc(target, { bannerName: target });
  };

  const normalizeObsidianImages = (
    markdown = "",
    { bannerName = "", output = "obsidian" } = {},
  ) =>
    String(markdown || "").replaceAll(OBSIDIAN_IMAGE_REGEX, (_, inner) => {
      const parts = String(inner)
        .split("|")
        .map((item) => item.trim());
      const rawTarget = parts.shift() || "";
      const src = normalizeImageSrc(rawTarget, { bannerName });
      if (!src) return "";

      if (output === "markdown") {
        const alt = parts.find((part) => part && !/^\d+(?:x\d+)?$/i.test(part)) || "";
        return `![${alt.replaceAll("]", "\\]")}](${src})`;
      }

      const options = parts.length ? `|${parts.join("|")}` : "";
      return `![[${src}${options}]]`;
    });

  const normalizeMarkdownImages = (markdown = "", { bannerName = "" } = {}) =>
    String(markdown || "").replaceAll(
      MARKDOWN_IMAGE_REGEX,
      (match, altText, target) => {
        const src = normalizeImageSrc(target, { bannerName });
        if (!src) return match;
        return `![${String(altText || "").trim()}](${src})`;
      },
    );

  const normalizeMarkdown = (
    markdown = "",
    { bannerName = "", output = "obsidian" } = {},
  ) =>
    normalizeMarkdownImages(
      normalizeObsidianImages(markdown, { bannerName, output }),
      { bannerName },
    );

  return {
    contentBaseUrl,
    imageBaseUrl,
    normalizeImageSrc,
    normalizeBanner,
    normalizeMarkdown,
  };
};
