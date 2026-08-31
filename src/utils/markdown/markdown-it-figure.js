const WIKILINK_IMAGE_START = "![[";
const WIKILINK_IMAGE_END = "]]";
const IMAGE_ALIGNMENTS = new Set(["left", "center", "right"]);
const isSvgImage = (src = "") => /\.svg(?:[?#]|$)/iu.test(String(src));

const formatImageWidth = (raw = "") => {
  const value = String(raw || "").trim();
  if (!value || value === "%") return "";

  if (/^\d+(?:\.\d+)?$/u.test(value)) return `${value}px`;
  if (/^\d+(?:\.\d+)?%$/u.test(value)) return value;

  return "";
};

const parseWikilinkImage = (raw = "") => {
  const parts = String(raw)
    .split("|")
    .map((part) => part.trim());
  const src = parts.shift() || "";
  let align = "";

  const alignmentIndex = parts.findIndex((part) =>
    IMAGE_ALIGNMENTS.has(part.toLowerCase()),
  );
  if (alignmentIndex >= 0) {
    align = parts.splice(alignmentIndex, 1)[0].toLowerCase();
  }

  const firstOption = parts.shift() || "";
  const secondOption = parts.shift() || "";
  const firstWidth = formatImageWidth(firstOption);
  const alt = firstOption === "%" || firstWidth ? "" : firstOption;
  const width = firstWidth || formatImageWidth(secondOption);

  return { src, alt, width, align };
};

const wikilinkImageRule = (state, silent) => {
  const start = state.pos;
  if (!state.src.startsWith(WIKILINK_IMAGE_START, start)) return false;

  const end = state.src.indexOf(
    WIKILINK_IMAGE_END,
    start + WIKILINK_IMAGE_START.length,
  );
  if (end < 0) return false;

  const raw = state.src.slice(start + WIKILINK_IMAGE_START.length, end);
  const parsed = parseWikilinkImage(raw);
  const src = state.md.normalizeLink(parsed.src);
  if (!src || !state.md.validateLink(src)) return false;

  if (!silent) {
    const token = state.push("image", "img", 0);
    const altToken = new state.Token("text", "", 0);
    altToken.content = parsed.alt;

    token.attrSet("src", src);
    token.attrSet("alt", "");
    token.attrSet("loading", "lazy");
    if (parsed.width) {
      token.attrSet(
        "style",
        `max-width:100%;height:auto;width:${parsed.width};`,
      );
    }
    token.children = [altToken];
    token.content = parsed.alt;
    token.meta = {
      ...(token.meta || {}),
      markdownImageAlign: parsed.align,
      wikilinkImage: true,
    };
  }

  state.pos = end + WIKILINK_IMAGE_END.length;
  return true;
};

const isStandaloneImage = (token) =>
  token?.type === "inline" &&
  token.children?.length === 1 &&
  token.children[0].type === "image";

export const figurePlugin = (md) => {
  md.inline.ruler.before("image", "wikilink_image", wikilinkImageRule);

  md.core.ruler.after("inline", "standalone_image_figures", (state) => {
    for (let index = 0; index < state.tokens.length - 2; index += 1) {
      const figureOpen = state.tokens[index];
      const inline = state.tokens[index + 1];
      const figureClose = state.tokens[index + 2];

      if (
        figureOpen.type !== "paragraph_open" ||
        figureOpen.hidden ||
        figureClose.type !== "paragraph_close" ||
        !isStandaloneImage(inline)
      ) {
        continue;
      }

      figureOpen.tag = "figure";
      figureOpen.attrJoin("class", "markdown-figure");
      const alignment = inline.children[0].meta?.markdownImageAlign;
      if (alignment) {
        figureOpen.attrJoin("class", `markdown-figure-${alignment}`);
      }
      figureClose.tag = "figure";
      inline.children[0].meta = {
        ...(inline.children[0].meta || {}),
        markdownFigure: true,
      };
    }
  });

  const defaultImage =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const caption =
      token.attrGet("title") ||
      self.renderInlineAsText(token.children || [], options, env);

    if (isSvgImage(token.attrGet("src"))) {
      token.attrJoin("class", "markdown-svg-image");
    }
    if (token.meta?.markdownFigure) {
      token.attrJoin("class", "preview-image");
      token.attrSet("role", "button");
      token.attrSet("tabindex", "0");
      token.attrSet(
        "aria-label",
        caption ? `预览图片：${caption}` : "预览图片",
      );
    } else {
      token.attrJoin("class", "markdown-inline-image");
    }
    const image = defaultImage(tokens, idx, options, env, self);

    if (!token.meta?.markdownFigure) return image;

    return caption
      ? `${image}<figcaption>${md.utils.escapeHtml(caption)}</figcaption>`
      : image;
  };
};
