const OBSIDIAN_LINK_REGEX = /^\[\[(.+)\]\]$/;

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

  return {
    contentBaseUrl,
    imageBaseUrl,
    normalizeImageSrc,
    normalizeBanner,
  };
};
