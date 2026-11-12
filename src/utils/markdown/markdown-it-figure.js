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
        inline?.type !== "inline"
      ) continue;

      const children = inline.children || [];
      const linked =
        children[0]?.type === "link_open" &&
        children[1]?.type === "image" &&
        children[2]?.type === "link_close";
      const image = children[linked ? 1 : 0];
      if (image?.type !== "image") continue;

      const imageEnd = linked ? 3 : 1;
      if (children.length > imageEnd) {
        const lineBreak = children[imageEnd];
        const explicitlyCaptioned = image.attrGet("title") || image.meta?.wikilinkImage;
        if (!explicitlyCaptioned ||
            !["softbreak", "hardbreak"].includes(lineBreak?.type)) continue;

        // 带图注的图片独占一行，下一行仍属于原段落。
        const tail = new state.Token("inline", "", 0);
        const lineEnd = inline.content.indexOf("\n");
        Object.assign(tail, inline, {
          children: children.slice(imageEnd + 1),
          content: lineEnd < 0 ? "" : inline.content.slice(lineEnd + 1),
        });
        const paragraphOpen = new state.Token("paragraph_open", "p", 1);
        const paragraphClose = new state.Token("paragraph_close", "p", -1);
        paragraphOpen.meta = paragraphClose.meta = { figureContinuation: true };
        paragraphOpen.level = figureOpen.level;
        paragraphClose.level = figureClose.level;
        state.tokens.splice(index + 3, 0, paragraphOpen, tail, paragraphClose);
        inline.children = children.slice(0, imageEnd);
      }

      figureOpen.tag = "figure";
      figureOpen.attrJoin("class", "markdown-figure");
      const alignment = image.meta?.markdownImageAlign;
      if (alignment) figureOpen.attrJoin("class", `markdown-figure-${alignment}`);
      figureClose.tag = "figure";
      if (linked) {
        const caption = new state.Token("figure_caption", "figcaption", 0);
        caption.meta = { image };
        inline.children.push(caption);
      } else {
        image.meta = { ...image.meta, markdownFigure: true };
      }
    }
  });

  const defaultImage =
    md.renderer.rules.image ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const captionFor = (token, options, env, self) =>
    token.attrGet("title") || self.renderInlineAsText(token.children || [], options, env);
  const captionHtml = (caption) =>
    caption ? `<figcaption>${md.utils.escapeHtml(caption)}</figcaption>` : "";
  md.renderer.rules.figure_caption = (tokens, idx, options, env, self) =>
    captionHtml(captionFor(tokens[idx].meta.image, options, env, self));

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const caption = captionFor(token, options, env, self);

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

    return image + captionHtml(caption);
  };
};
