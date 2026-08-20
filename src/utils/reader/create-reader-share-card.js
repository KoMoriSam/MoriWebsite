export const READER_SHARE_CARD_WIDTH = 1080;
export const READER_SHARE_CARD_HEIGHT = 1350;

const CARD_PADDING = 96;
const TEXT_TOP = 208;
const TEXT_BOTTOM = 928;
const TEXT_WIDTH = READER_SHARE_CARD_WIDTH - CARD_PADDING * 2;
const BODY_FONT_SIZES = [48, 46, 44, 42, 40, 38, 36];
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_FOREGROUND = "#1f2937";
const DEFAULT_ACCENT = "#6b7280";
const FAVICON_PATH = "/favicon.webp";
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "list-item",
  "quote",
  "code",
  "callout",
  "chat",
  "moment",
  "table",
]);
const SYNTAX_COLOR_KEYS = [
  "keyword",
  "title",
  "constant",
  "string",
  "symbol",
  "comment",
  "tag",
  "bullet",
  "addition",
  "deletion",
  "attr",
  "attribute",
  "number",
  "literal",
  "meta",
  "name",
  "regexp",
  "selector-class",
  "selector-id",
  "type",
  "variable",
];
const KINSOKU_LINE_START = new Set(
  Array.from("、。，．？！‼⁇⁈⁉：；…‥—～ー·）〕］｝〉》」』】〗〙〛’”»％‰℃°′″!?;:,.%)]}"),
);
const KINSOKU_LINE_END = new Set(
  Array.from("（〔［｛〈《「『【〖〘〚‘“«([{"),
);

let faviconPromise;

const normalizeText = (value = "") =>
  String(value).replace(/\s+/gu, " ").trim();

const getGraphemes = (value = "") => {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(document.documentElement.lang || "zh", {
        granularity: "grapheme",
      }).segment(value),
      ({ segment }) => segment,
    );
  }

  return Array.from(value);
};

const getFirstGrapheme = (value = "") => getGraphemes(value)[0] || "";
const getLastGrapheme = (value = "") => getGraphemes(value).at(-1) || "";
const isKinsokuLineStart = (value) =>
  KINSOKU_LINE_START.has(getFirstGrapheme(value));
const isKinsokuLineEnd = (value) =>
  KINSOKU_LINE_END.has(getLastGrapheme(value));

const takeKinsokuCarry = (items, nextValue, getValue) => {
  while (items.length && /^\s+$/u.test(getValue(items.at(-1)))) items.pop();
  const carry = [];
  if (isKinsokuLineStart(nextValue) && items.length > 1) {
    carry.unshift(items.pop());
  }
  while (items.length > 1 && isKinsokuLineEnd(getValue(items.at(-1)))) {
    carry.unshift(items.pop());
  }
  return carry;
};

const toCanvasColor = (value, fallback) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = fallback;
  try {
    context.fillStyle = String(value || fallback).trim();
  } catch {
    context.fillStyle = fallback;
  }
  context.fillRect(0, 0, 1, 1);

  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  if (!alpha) return fallback;
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

const hexToRgb = (color) => ({
  red: Number.parseInt(color.slice(1, 3), 16),
  green: Number.parseInt(color.slice(3, 5), 16),
  blue: Number.parseInt(color.slice(5, 7), 16),
});

const rgbToHex = ({ red, green, blue }) =>
  `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;

const mixColors = (from, to, amount) => {
  const left = hexToRgb(from);
  const right = hexToRgb(to);
  return rgbToHex({
    red: left.red + (right.red - left.red) * amount,
    green: left.green + (right.green - left.green) * amount,
    blue: left.blue + (right.blue - left.blue) * amount,
  });
};

const withAlpha = (color, alpha) =>
  `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

const relativeLuminance = (color) => {
  const { red, green, blue } = hexToRgb(color);
  const channels = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (left, right) => {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};

const resolveQrColors = ({ base, baseContent, foreground, background }) => {
  const themePair = [base, baseContent].sort(
    (left, right) => relativeLuminance(left) - relativeLuminance(right),
  );
  if (contrastRatio(themePair[0], themePair[1]) >= 4.5) {
    return { qrDark: themePair[0], qrLight: themePair[1] };
  }

  const available = [base, baseContent, foreground, background].sort(
    (left, right) => relativeLuminance(left) - relativeLuminance(right),
  );
  const darkest = available[0];
  const lightest = available.at(-1);
  for (let step = 1; step <= 10; step += 1) {
    const amount = step / 10;
    const qrDark = mixColors(themePair[0], darkest, amount);
    const qrLight = mixColors(themePair[1], lightest, amount);
    if (contrastRatio(qrDark, qrLight) >= 4.5) return { qrDark, qrLight };
  }

  return { qrDark: darkest, qrLight: lightest };
};

const resolveAppearance = () => {
  const rootComputed = getComputedStyle(document.documentElement);
  const themeColor = (property, fallback) =>
    toCanvasColor(rootComputed.getPropertyValue(property), fallback);
  const background = themeColor("--color-base-100", DEFAULT_BACKGROUND);
  const foreground = themeColor("--color-base-content", DEFAULT_FOREGROUND);
  const accent = themeColor("--color-primary", DEFAULT_ACCENT);
  const base = themeColor("--color-base-200", foreground);
  const baseContent = themeColor("--color-base-content", background);
  const syntax = Object.fromEntries(
    SYNTAX_COLOR_KEYS.map((key) => [
      key,
      themeColor(`--hljs-${key}`, foreground),
    ]),
  );

  return {
    background,
    foreground,
    accent,
    base,
    baseContent,
    base200: themeColor("--color-base-200", background),
    base300: themeColor("--color-base-300", background),
    warning: themeColor("--color-warning", accent),
    warningContent: themeColor("--color-warning-content", foreground),
    info: themeColor("--color-info", accent),
    infoContent: themeColor("--color-info-content", foreground),
    success: themeColor("--color-success", accent),
    successContent: themeColor("--color-success-content", foreground),
    error: themeColor("--color-error", accent),
    errorContent: themeColor("--color-error-content", foreground),
    syntax,
    ...resolveQrColors({ base, baseContent, foreground, background }),
    contentFontFamily:
      rootComputed.getPropertyValue("--font-serif").trim() ||
      'ui-serif, "Noto Serif SC", "Source Han Serif SC", serif',
    uiFontFamily:
      rootComputed.getPropertyValue("--font-sans").trim() ||
      'ui-sans-serif, system-ui, sans-serif',
    serifFontFamily:
      rootComputed.getPropertyValue("--font-serif").trim() ||
      'ui-serif, "Noto Serif SC", serif',
    monoFamily:
      rootComputed.getPropertyValue("--font-mono").trim() ||
      'ui-monospace, "Cascadia Code", monospace',
    contentFontWeight: "400",
  };
};

const setFont = (context, { size, family, weight = "400", italic = false }) => {
  context.font = `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
};

const drawRoundedRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

const loadFavicon = () => {
  if (faviconPromise) return faviconPromise;
  faviconPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = FAVICON_PATH;
  });
  return faviconPromise;
};

const normalizeRuns = (runs = []) =>
  runs
    .map((run) => ({
      text: String(run?.text || ""),
      bold: Boolean(run?.bold),
      italic: Boolean(run?.italic),
      strike: Boolean(run?.strike),
      underline: Boolean(run?.underline),
      mark: Boolean(run?.mark),
      link: Boolean(run?.link),
      code: Boolean(run?.code),
      abbr: Boolean(run?.abbr),
      baseline: ["sub", "sup"].includes(run?.baseline) ? run.baseline : "",
      ruby: String(run?.ruby || ""),
      syntax: String(run?.syntax || ""),
      fontFamily: String(run?.fontFamily || ""),
      fontWeight: String(run?.fontWeight || ""),
      fontStyle: String(run?.fontStyle || ""),
      textDecoration: String(run?.textDecoration || ""),
    }))
    .filter(({ text }) => text);

const normalizeContentKey = (value = "") =>
  normalizeText(value).replace(/\s+/gu, "");

const normalizeShareContent = (
  shareContent,
  fallbackText,
  excludeFromContent = [],
) => {
  const excludedContent = new Set(
    (Array.isArray(excludeFromContent) ? excludeFromContent : [])
      .map(normalizeContentKey)
      .filter(Boolean),
  );
  const hasSerializedContent = Array.isArray(shareContent?.blocks);
  const blocks = hasSerializedContent
    ? shareContent.blocks
        .map((block) => ({
          type: BLOCK_TYPES.has(block?.type) ? block.type : "paragraph",
          level: Math.min(6, Math.max(1, Number(block?.level) || 1)),
          depth: Math.max(0, Number(block?.depth) || 0),
          marker: normalizeText(block?.marker),
          label: normalizeText(block?.label),
          language: normalizeText(block?.language),
          tone: ["info", "success", "warning", "error", "accent"].includes(
            block?.tone,
          )
            ? block.tone
            : "accent",
          style: {
            fontFamily: String(block?.style?.fontFamily || ""),
            fontWeight: String(block?.style?.fontWeight || ""),
            fontStyle: String(block?.style?.fontStyle || ""),
            textDecoration: String(block?.style?.textDecoration || ""),
          },
          runs: normalizeRuns(block?.runs),
        }))
        .filter(({ runs }) => runs.some(({ text }) => text.trim()))
        .filter(
          ({ runs }) =>
            !excludedContent.has(
              normalizeContentKey(runs.map(({ text }) => text).join("")),
            ),
        )
    : [];

  if (blocks.length || hasSerializedContent) return blocks;
  const text = String(fallbackText || "").trim();
  return text && !excludedContent.has(normalizeContentKey(text))
    ? [{ type: "paragraph", runs: [{ text }] }]
    : [];
};

const getRunFont = (run, config, appearance, size = config.fontSize) => {
  const inlineCode = run.code && !config.codeBlock;
  return {
    size: run.baseline
      ? Math.round(size * 0.68)
      : inlineCode
        ? Math.round(size * 0.875)
        : size,
    family:
      run.fontFamily ||
      (run.code
        ? appearance.monoFamily
        : config.family || appearance.contentFontFamily),
    weight:
      run.fontWeight ||
      (run.bold || config.bold
        ? "700"
        : inlineCode
          ? "600"
          : appearance.contentFontWeight),
    italic: run.italic || /italic|oblique/u.test(run.fontStyle) || config.italic,
  };
};

const getBlockConfig = (block, baseSize, appearance) => {
  const common = {
    x: CARD_PADDING,
    width: TEXT_WIDTH,
    fontSize: baseSize,
    lineHeight: Math.round(baseSize * 1.5),
    family: block.style?.fontFamily || appearance.contentFontFamily,
    bold: false,
    italic: false,
    paddingTop: 0,
    paddingBottom: 0,
    gap: Math.round(baseSize * 0.45),
    justify: true,
  };

  if (block.type === "heading") {
    const fontSize = Math.round(baseSize * (block.level <= 2 ? 1.16 : 1.08));
    return {
      ...common,
      fontSize,
      lineHeight: Math.round(fontSize * 1.34),
      bold: true,
      gap: Math.round(baseSize * 0.5),
      justify: false,
    };
  }
  if (block.type === "list-item") {
    const indent = 48 + Math.min(block.depth, 4) * 28;
    return {
      ...common,
      x: CARD_PADDING + indent,
      width: TEXT_WIDTH - indent,
      markerX: CARD_PADDING + Math.min(block.depth, 4) * 28,
    };
  }
  if (block.type === "quote") {
    return {
      ...common,
      x: CARD_PADDING + 34,
      width: TEXT_WIDTH - 34,
      fontSize: Math.round(baseSize * 0.96),
      lineHeight: Math.round(baseSize * 1.48),
      quoteBarX: CARD_PADDING,
    };
  }
  if (block.type === "code") {
    const fontSize = Math.round(baseSize * 0.74);
    const labelHeight = block.language ? Math.round(fontSize * 0.82) : 0;
    return {
      ...common,
      x: CARD_PADDING + 28,
      width: TEXT_WIDTH - 56,
      fontSize,
      lineHeight: Math.round(fontSize * 1.5),
      family: appearance.monoFamily,
      paddingTop: 20 + labelHeight,
      paddingBottom: 20,
      gap: Math.round(baseSize * 0.45),
      justify: false,
      codeBlock: true,
      labelHeight,
    };
  }
  if (["callout", "chat", "moment"].includes(block.type)) {
    const fontSize = Math.round(baseSize * 0.9);
    const labelHeight = block.label ? Math.round(fontSize * 0.82) : 0;
    return {
      ...common,
      x: CARD_PADDING + 28,
      width: TEXT_WIDTH - 56,
      fontSize,
      lineHeight: Math.round(fontSize * 1.48),
      paddingTop: 20 + labelHeight,
      paddingBottom: 20,
      gap: Math.round(baseSize * 0.45),
      labelHeight,
      panel: block.type,
      justify: block.type === "callout",
    };
  }
  if (block.type === "table") {
    const fontSize = Math.round(baseSize * 0.8);
    return {
      ...common,
      x: CARD_PADDING + 24,
      width: TEXT_WIDTH - 48,
      fontSize,
      lineHeight: Math.round(fontSize * 1.45),
      paddingTop: 20,
      paddingBottom: 20,
      gap: Math.round(baseSize * 0.45),
      panel: "table",
      justify: false,
    };
  }
  return common;
};

const createToken = (context, grapheme, run, config, appearance) => {
  const style = { ...run };
  setFont(context, getRunFont(style, config, appearance));
  const textWidth = context.measureText(grapheme).width;
  let rubyWidth = 0;
  if (style.ruby) {
    setFont(
      context,
      getRunFont(
        { ...style, baseline: "", fontWeight: "" },
        config,
        appearance,
        Math.round(config.fontSize * 0.46),
      ),
    );
    rubyWidth = context.measureText(style.ruby).width;
  }
  return {
    text: grapheme,
    style,
    textWidth,
    rubyWidth,
    width: Math.max(textWidth, rubyWidth),
  };
};

const trimLineEnd = (tokens) => {
  const trimmed = [...tokens];
  while (trimmed.length && /^\s+$/u.test(trimmed.at(-1).text)) trimmed.pop();
  return trimmed;
};

const createLine = (tokens, hardBreak = false) => {
  const trimmed = trimLineEnd(tokens);
  return {
    tokens: trimmed,
    width: trimmed.reduce((total, token) => total + token.width, 0),
    hardBreak,
    isLast: false,
  };
};

const wrapRuns = (context, runs, config, appearance) => {
  const lines = [];
  let tokens = [];
  let width = 0;

  const commitLine = (hardBreak = false) => {
    lines.push(createLine(tokens, hardBreak));
    tokens = [];
    width = 0;
  };

  const pushToken = (token) => {
    if (!tokens.length && /^\s+$/u.test(token.text) && !config.codeBlock) {
      return;
    }
    if (tokens.length && width + token.width > config.width) {
      const carry = config.codeBlock
        ? []
        : takeKinsokuCarry(tokens, token.text, ({ text }) => text);
      width = tokens.reduce((total, item) => total + item.width, 0);
      if (tokens.length) {
        commitLine();
        tokens = carry;
        width = carry.reduce((total, item) => total + item.width, 0);
      }
    }
    if (!tokens.length && /^\s+$/u.test(token.text) && !config.codeBlock) {
      return;
    }
    tokens.push(token);
    width += token.width;
  };

  runs.forEach((run) => {
    if (run.ruby) {
      const token = createToken(context, run.text, run, config, appearance);
      pushToken(token);
      return;
    }
    getGraphemes(run.text).forEach((grapheme) => {
      if (grapheme === "\n") {
        commitLine(true);
        return;
      }

      const token = createToken(context, grapheme, run, config, appearance);
      pushToken(token);
    });
  });

  if (tokens.length || !lines.length) commitLine();
  lines.at(-1).isLast = true;
  return lines;
};

const isCjkDominant = (block) => {
  const text = block.runs.map(({ text: value }) => value).join("");
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return han > 0 && han >= latin;
};

const appendEllipsis = (context, line, config, appearance) => {
  const tokens = trimLineEnd(line.tokens);
  const fallbackStyle = { ...config, text: "" };
  const style = tokens.at(-1)?.style || fallbackStyle;
  const ellipsis = createToken(context, "…", style, config, appearance);
  let width = tokens.reduce((total, token) => total + token.width, 0);
  while (tokens.length && width + ellipsis.width > config.width) {
    width -= tokens.pop().width;
  }
  while (tokens.length && isKinsokuLineEnd(tokens.at(-1).text)) {
    width -= tokens.pop().width;
  }
  tokens.push(ellipsis);
  return {
    tokens,
    width: width + ellipsis.width,
    hardBreak: false,
    isLast: true,
  };
};

const createBlockLayout = (context, block, baseSize, appearance) => {
  const config = getBlockConfig(block, baseSize, appearance);
  const lines = wrapRuns(context, block.runs, config, appearance);
  return {
    block,
    config,
    lines,
    height:
      config.paddingTop +
      config.paddingBottom +
      lines.length * config.lineHeight,
    cjkDominant: isCjkDominant(block),
  };
};

const layoutBlocks = (context, blocks, baseSize, appearance, maxHeight) => {
  const layouts = [];
  let usedHeight = 0;
  let truncated = false;

  for (const block of blocks) {
    const layout = createBlockLayout(context, block, baseSize, appearance);
    const gap = layouts.length ? layout.config.gap : 0;
    const available = maxHeight - usedHeight - gap;
    if (layout.height <= available) {
      layouts.push(layout);
      usedHeight += gap + layout.height;
      continue;
    }

    truncated = true;
    const lineRoom = Math.floor(
      (available - layout.config.paddingTop - layout.config.paddingBottom) /
        layout.config.lineHeight,
    );
    if (lineRoom > 0) {
      layout.lines = layout.lines.slice(0, lineRoom);
      layout.lines[layout.lines.length - 1] = appendEllipsis(
        context,
        layout.lines.at(-1),
        layout.config,
        appearance,
      );
      layout.height =
        layout.config.paddingTop +
        layout.config.paddingBottom +
        layout.lines.length * layout.config.lineHeight;
      layouts.push(layout);
      usedHeight += gap + layout.height;
    } else if (layouts.length) {
      const previous = layouts.at(-1);
      previous.lines[previous.lines.length - 1] = appendEllipsis(
        context,
        previous.lines.at(-1),
        previous.config,
        appearance,
      );
    }
    break;
  }

  if (layouts.length < blocks.length) truncated = true;
  return { layouts, usedHeight, truncated };
};

const resolveBodyLayout = (context, blocks, appearance) => {
  const maxHeight = TEXT_BOTTOM - TEXT_TOP;
  for (const fontSize of BODY_FONT_SIZES) {
    const full = layoutBlocks(context, blocks, fontSize, appearance, Infinity);
    if (full.usedHeight <= maxHeight) return full;
  }
  return layoutBlocks(
    context,
    blocks,
    BODY_FONT_SIZES.at(-1),
    appearance,
    maxHeight,
  );
};

const isJustifyGap = (left, right) => {
  if (!left || !right) return false;
  if (/^\s+$/u.test(left.text) || /^\s+$/u.test(right.text)) return false;
  return /[\p{Script=Han}\u3000-\u303f\uff01-\uff60]/u.test(
    `${left.text}${right.text}`,
  );
};

const getTokenPositions = (line, config, justify) => {
  const gapIndexes = justify
    ? line.tokens
        .map((token, index) =>
          isJustifyGap(token, line.tokens[index + 1]) ? index : -1,
        )
        .filter((index) => index >= 0)
    : [];
  const extra = gapIndexes.length
    ? Math.max(0, config.width - line.width) / gapIndexes.length
    : 0;
  const gaps = new Set(gapIndexes);
  let x = config.x;
  return line.tokens.map((token, index) => {
    const position = { token, x };
    x += token.width + (gaps.has(index) ? extra : 0);
    return position;
  });
};

const drawTokenBackgrounds = (
  context,
  positions,
  baseline,
  config,
  appearance,
) => {
  let group = null;
  const flush = () => {
    if (!group) return;
    context.fillStyle = withAlpha(appearance.warning, 0.88);
    drawRoundedRect(
      context,
      group.x - 3,
      baseline - config.fontSize * 0.84,
      group.width + 6,
      config.fontSize * 1.08,
      5,
    );
    context.fill();
    group = null;
  };

  positions.forEach(({ token, x }, index) => {
    const kind = token.style.mark ? "mark" : "";
    const nextX = positions[index + 1]?.x ?? x + token.width;
    if (!kind) {
      flush();
      return;
    }
    if (!group || group.kind !== kind) {
      flush();
      group = { kind, x, width: nextX - x };
    } else {
      group.width = nextX - group.x;
    }
  });
  flush();
};

const resolveSyntaxColor = (syntax, appearance) => {
  if (!syntax) return "";
  const aliases = {
    built_in: "title",
    class: "title",
    function: "title",
    params: "variable",
    property: "attr",
    "selector-tag": "tag",
    template_variable: "variable",
  };
  return appearance.syntax[syntax] || appearance.syntax[aliases[syntax]] || "";
};

const drawRichLine = (context, line, baseline, layout, appearance) => {
  const { config } = layout;
  const shouldJustify =
    config.justify && layout.cjkDominant && !line.isLast && !line.hardBreak;
  const positions = getTokenPositions(line, config, shouldJustify);
  drawTokenBackgrounds(context, positions, baseline, config, appearance);

  positions.forEach(({ token, x }) => {
    setFont(context, getRunFont(token.style, config, appearance));
    const syntaxColor = resolveSyntaxColor(token.style.syntax, appearance);
    context.fillStyle = token.style.mark
      ? appearance.warningContent
      : token.style.link
        ? appearance.accent
        : syntaxColor || appearance.foreground;
    const textX = x + (token.width - token.textWidth) / 2;
    const textY =
      token.style.baseline === "sup"
        ? baseline - config.fontSize * 0.38
        : token.style.baseline === "sub"
          ? baseline + config.fontSize * 0.2
          : baseline;
    context.fillText(token.text, textX, textY);

    if (token.style.ruby) {
      setFont(
        context,
        getRunFont(
          { ...token.style, baseline: "", fontWeight: "" },
          config,
          appearance,
          Math.round(config.fontSize * 0.46),
        ),
      );
      context.fillText(
        token.style.ruby,
        x + (token.width - token.rubyWidth) / 2,
        baseline - config.fontSize * 0.82,
      );
    }

    if (
      token.style.link ||
      token.style.underline ||
      token.style.abbr ||
      token.style.strike
    ) {
      context.save();
      context.strokeStyle = context.fillStyle;
      context.lineWidth = Math.max(1.5, config.fontSize / 28);
      if (token.style.abbr) {
        context.setLineDash([context.lineWidth, context.lineWidth * 1.5]);
      }
      const y = token.style.strike
        ? textY - config.fontSize * 0.3
        : textY + config.fontSize * 0.12;
      context.beginPath();
      context.moveTo(textX, y);
      context.lineTo(textX + token.textWidth, y);
      context.stroke();
      context.restore();
    }
  });
};

const drawBodyLayout = (context, bodyLayout, appearance) => {
  let y = TEXT_TOP;
  bodyLayout.layouts.forEach((layout, blockIndex) => {
    const { block, config, lines } = layout;
    if (blockIndex) y += config.gap;

    if (config.codeBlock) {
      context.fillStyle = appearance.base200;
      drawRoundedRect(context, CARD_PADDING, y, TEXT_WIDTH, layout.height, 16);
      context.fill();
    }
    if (config.panel) {
      const toneColor =
        config.panel === "callout"
          ? appearance[block.tone] || appearance.accent
          : appearance.base300;
      context.fillStyle =
        config.panel === "callout"
          ? withAlpha(toneColor, 0.14)
          : withAlpha(appearance.base200, 0.92);
      drawRoundedRect(context, CARD_PADDING, y, TEXT_WIDTH, layout.height, 16);
      context.fill();
      if (config.panel === "callout") {
        context.fillStyle = toneColor;
        drawRoundedRect(context, CARD_PADDING, y, 7, layout.height, 4);
        context.fill();
      }
    }
    if (config.quoteBarX !== undefined) {
      context.fillStyle = withAlpha(appearance.accent, 0.72);
      drawRoundedRect(context, config.quoteBarX, y, 7, layout.height, 4);
      context.fill();
    }

    if (config.labelHeight && (block.label || block.language)) {
      const label = block.label || block.language;
      const labelColor =
        block.type === "callout"
          ? appearance[block.tone] || appearance.accent
          : appearance.accent;
      setFont(context, {
        size: Math.max(22, Math.round(config.fontSize * 0.5)),
        family: config.family,
        weight: "700",
      });
      context.fillStyle = labelColor;
      context.fillText(label, config.x, y + 20 + config.fontSize * 0.48);
    }

    lines.forEach((line, lineIndex) => {
      const baseline =
        y + config.paddingTop + config.fontSize + lineIndex * config.lineHeight;
      if (block.type === "list-item" && lineIndex === 0) {
        setFont(context, {
          size: config.fontSize,
          family: config.family,
          weight: "600",
        });
        context.fillStyle = appearance.accent;
        context.fillText(block.marker || "•", config.markerX, baseline);
      }
      drawRichLine(context, line, baseline, layout, appearance);
    });

    y += layout.height;
  });
};

const fitEllipsis = (context, value, maxWidth) => {
  const graphemes = getGraphemes(value.trimEnd());
  while (
    graphemes.length &&
    context.measureText(`${graphemes.join("")}…`).width > maxWidth
  ) {
    graphemes.pop();
  }
  while (graphemes.length && isKinsokuLineEnd(graphemes.at(-1))) {
    graphemes.pop();
  }
  return `${graphemes.join("").trimEnd()}…`;
};

const wrapPlainText = (context, value, maxWidth, maxLines) => {
  const graphemes = getGraphemes(value);
  const lines = [];
  let line = [];
  let lineWidth = 0;
  let consumed = 0;

  for (const grapheme of graphemes) {
    const graphemeWidth = context.measureText(grapheme).width;
    if (line.length && lineWidth + graphemeWidth > maxWidth) {
      const carry = takeKinsokuCarry(line, grapheme, (item) => item);
      lineWidth = context.measureText(line.join("")).width;
      if (line.length) {
        lines.push(line.join("").trimEnd());
        if (lines.length >= maxLines) break;
        line = carry;
        lineWidth = context.measureText(line.join("")).width;
      }
    }
    if (!line.length && /^\s$/u.test(grapheme)) {
      consumed += 1;
      continue;
    }
    line.push(grapheme);
    lineWidth += graphemeWidth;
    consumed += 1;
  }
  if (lines.length < maxLines && line.length) {
    lines.push(line.join("").trimEnd());
  }
  if (consumed < graphemes.length && lines.length) {
    lines[lines.length - 1] = fitEllipsis(context, lines.at(-1), maxWidth);
  }
  return lines;
};

const drawWrappedTitle = (context, title, appearance) => {
  setFont(context, {
    size: 38,
    family: appearance.serifFontFamily,
    weight: "700",
  });
  const lines = wrapPlainText(context, title, 610, 2);
  lines.forEach((line, index) =>
    context.fillText(line, CARD_PADDING, 1082 + index * 50),
  );
  return 1082 + Math.max(0, lines.length - 1) * 50;
};

const drawWrappedDetail = (
  context,
  detail,
  detailLines,
  detailList,
  baseline,
  appearance,
) => {
  setFont(context, {
    size: 25,
    family: appearance.serifFontFamily,
    weight: "400",
  });
  const explicitLines = Array.isArray(detailLines)
    ? detailLines
        .map(normalizeText)
        .filter(Boolean)
        .slice(0, detailList ? 3 : 2)
    : [];
  const lines = explicitLines.length
    ? explicitLines.map((line) => {
        const displayLine = detailList ? `• ${line}` : line;
        return context.measureText(displayLine).width > 650
          ? fitEllipsis(context, displayLine, 650)
          : displayLine;
      })
    : wrapPlainText(context, detail, 650, 2);
  lines.forEach((line, index) => {
    context.fillText(
      line,
      CARD_PADDING,
      baseline + index * (detailList ? 32 : 34),
    );
  });
};

const drawBrandSignature = (context, favicon, appearance) => {
  const iconSize = favicon ? 28 : 0;
  const gap = favicon ? 8 : 0;
  setFont(context, {
    size: 23,
    family: appearance.uiFontFamily,
    weight: "600",
  });
  const label = "komori.cc";
  const labelWidth = context.measureText(label).width;
  const startX = 904 - (iconSize + gap + labelWidth) / 2;

  if (favicon) {
    context.save();
    drawRoundedRect(context, startX, 1231, iconSize, iconSize, 6);
    context.clip();
    context.imageSmoothingEnabled = false;
    context.drawImage(favicon, startX, 1231, iconSize, iconSize);
    context.restore();
  }

  context.fillStyle = appearance.foreground;
  context.fillText(label, startX + iconSize + gap, 1253);
};

const drawQrCode = async (context, shareUrl, appearance) => {
  const { default: QRCode } = await import("qrcode");
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, shareUrl, {
    width: 164,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: `${appearance.qrDark}ff`,
      light: `${appearance.qrLight}ff`,
    },
  });

  context.save();
  context.fillStyle = appearance.qrLight;
  drawRoundedRect(context, 812, 1040, 184, 184, 18);
  context.fill();
  context.strokeStyle = withAlpha(appearance.qrDark, 0.25);
  context.lineWidth = 2;
  context.stroke();
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, 822, 1050, 164, 164);
  context.restore();
};

const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成分享卡片图片"));
    }, "image/png");
  });

const sanitizeFileName = (value) =>
  normalizeText(value)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 48);

export const buildReaderShareUrl = ({ path, paragraphId } = {}) => {
  const url = new URL(path || window.location.pathname, window.location.origin);
  url.search = "";
  url.hash = paragraphId || "";
  return url.href;
};

export const createReaderShareCard = async ({
  text,
  shareContent,
  paragraphId,
  meta = {},
}) => {
  const blocks = normalizeShareContent(
    shareContent,
    text,
    meta.excludeFromContent,
  );
  if (!blocks.length) throw new Error("没有可分享的正文");

  await document.fonts?.ready;
  const [appearance, favicon] = await Promise.all([
    Promise.resolve(resolveAppearance()),
    loadFavicon(),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = READER_SHARE_CARD_WIDTH;
  canvas.height = READER_SHARE_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成分享卡片");

  context.textBaseline = "alphabetic";
  context.fillStyle = appearance.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.globalAlpha = 0.22;
  context.strokeStyle = appearance.accent;
  context.lineWidth = 2;
  drawRoundedRect(context, 54, 54, canvas.width - 108, canvas.height - 108, 30);
  context.stroke();
  context.restore();

  context.fillStyle = appearance.accent;
  drawRoundedRect(context, CARD_PADDING, 108, 78, 8, 4);
  context.fill();

  setFont(context, {
    size: 30,
    family: appearance.serifFontFamily,
    weight: "600",
  });
  context.fillStyle = appearance.foreground;
  const sourceLabel = normalizeText(meta.sourceLabel) || "远方之森";
  context.fillText(
    context.measureText(sourceLabel).width > TEXT_WIDTH
      ? fitEllipsis(context, sourceLabel, TEXT_WIDTH)
      : sourceLabel,
    CARD_PADDING,
    174,
  );

  context.save();
  context.globalAlpha = 0.2;
  context.fillStyle = appearance.accent;
  setFont(context, {
    size: 150,
    family: appearance.serifFontFamily,
    weight: "700",
  });
  context.fillText("“", 70, 258);
  context.restore();

  const bodyLayout = resolveBodyLayout(context, blocks, appearance);
  drawBodyLayout(context, bodyLayout, appearance);

  context.save();
  context.globalAlpha = 0.2;
  context.strokeStyle = appearance.foreground;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(CARD_PADDING, 986);
  context.lineTo(canvas.width - CARD_PADDING, 986);
  context.stroke();
  context.restore();

  context.fillStyle = appearance.foreground;
  const titleBaseline = drawWrappedTitle(
    context,
    normalizeText(meta.title) || normalizeText(meta.sourceLabel) || "远方之森",
    appearance,
  );

  const detail = normalizeText(meta.detail);
  const detailLines = Array.isArray(meta.detailLines)
    ? meta.detailLines.map(normalizeText).filter(Boolean)
    : [];
  if (detail || detailLines.length) {
    context.save();
    context.globalAlpha = 0.65;
    drawWrappedDetail(
      context,
      detail,
      detailLines,
      Boolean(meta.detailList),
      titleBaseline + 44,
      appearance,
    );
    context.restore();
  }

  const shareUrl = buildReaderShareUrl({ path: meta.path, paragraphId });
  await drawQrCode(context, shareUrl, appearance);
  drawBrandSignature(context, favicon, appearance);

  const blob = await canvasToBlob(canvas);
  const fileBase =
    sanitizeFileName(meta.title || meta.sourceLabel) || "远方之森";
  return {
    blob,
    canvas,
    fileName: `${fileBase}-分享卡片.png`,
    shareUrl,
    truncated: bodyLayout.truncated,
  };
};
