import { getLatexFormula } from "@/utils/reader/latex";
import { captureReaderShareSnapshot, READER_SHARE_SNAPSHOT_SELECTOR } from './share-snapshot.js';

const IGNORED_CONTENT_SELECTOR = [
  ".comment-trigger",
  ".paragraph-comment-count",
  ".footnote-ref",
  ".footnote-backref",
  ".header-anchor",
  ".alert-title",
  ".chat-bar",
  ".chat-header",
  ".chat-image",
  ".chat-footer",
  ".chat-input",
  ".moments-author",
  ".moments-actions",
  ".sr-only",
  ".chapter-header-volume",
  ".chapter-header-stats",
  "[data-paragraph-comment-meta]",
  "[data-footnote-ref]",
  "[data-footnote-backref]",
  "[aria-hidden='true']",
  "button",
  "script",
  "style",
  "svg",
  "canvas",
  "video",
  "audio",
].join(",");

const BLOCK_SELECTOR = [
  "[data-mermaid-viewer]",
  "[data-markdown-code-block]",
  'mjx-container[data-reader-latex-source][display="true"]',
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "p",
  "pre",
  "table",
  "figure.markdown-figure",
  "blockquote",
  "summary",
  "div",
  ".markdown-link-card",
  "[data-markdown-alert]",
  "[data-markdown-chat]",
  "[data-markdown-moment]",
].join(",");

const TASK_STATUS_MARKERS = {
  " ": "○",
  x: "✓",
  X: "✓",
  "-": "×",
  "/": "◐",
  ">": "→",
  "<": "◷",
  "?": "?",
  "!": "!",
  "*": "★",
  '"': "”",
  l: "⌖",
  b: "◆",
  i: "i",
  S: "$",
  p: "★",
  c: "−",
};

const normalizeInlineText = (value = "") =>
  String(value).replace(/[\t\n\r ]+/gu, " ");

const normalizeLabel = (value = "") => normalizeInlineText(value).trim();

const toElement = (node) =>
  node instanceof Element ? node : node?.parentElement || null;

const isIgnoredElement = (element) =>
  element.matches(IGNORED_CONTENT_SELECTOR) ||
  Boolean(element.closest(IGNORED_CONTENT_SELECTOR));

const rangeIntersectsNode = (range, node) => {
  if (!range) return true;
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
};

const selectedTextForNode = (node, range, preserveWhitespace = false) => {
  if (!rangeIntersectsNode(range, node)) return "";
  const value = node.textContent || "";
  let start = 0;
  let end = value.length;
  if (range?.startContainer === node) start = range.startOffset;
  if (range?.endContainer === node) end = range.endOffset;
  const selected = value.slice(start, end);
  return preserveWhitespace ? selected : normalizeInlineText(selected);
};

const getComputedTextStyle = (element) => {
  if (!(element instanceof Element) || !element.isConnected) return {};
  const computed = getComputedStyle(element);
  return {
    fontFamily: computed.fontFamily || "",
    fontWeight: computed.fontWeight || "",
    fontStyle: computed.fontStyle || "",
    textDecoration: computed.textDecorationLine || "",
    textAlign: computed.textAlign || "",
  };
};

const getSyntaxKind = (element) => {
  let current = element;
  while (current instanceof Element) {
    const syntaxClass = Array.from(current.classList).find((className) =>
      className.startsWith("hljs-"),
    );
    if (syntaxClass) return syntaxClass.slice(5);
    current = current.parentElement;
  }
  return "";
};

const createInlineStyle = (element, inherited = {}) => {
  const tag = element?.tagName || "";
  const computed = getComputedTextStyle(element);
  const decoration = computed.textDecoration || inherited.textDecoration || "";
  return {
    ...inherited,
    bold:
      inherited.bold ||
      tag === "STRONG" ||
      tag === "B" ||
      Number.parseInt(computed.fontWeight, 10) >= 600,
    italic:
      inherited.italic ||
      tag === "EM" ||
      tag === "I" ||
      /italic|oblique/u.test(computed.fontStyle),
    strike:
      inherited.strike ||
      tag === "DEL" ||
      tag === "S" ||
      decoration.includes("line-through"),
    underline: inherited.underline || decoration.includes("underline"),
    mark: inherited.mark || tag === "MARK",
    link: inherited.link || tag === "A",
    linkHref: tag === "A" ? element.getAttribute("href") || "" : inherited.linkHref || "",
    code: inherited.code || tag === "CODE",
    abbr: inherited.abbr || tag === "ABBR",
    baseline:
      tag === "SUB" ? "sub" : tag === "SUP" ? "sup" : inherited.baseline || "",
    syntax: getSyntaxKind(element) || inherited.syntax || "",
    fontFamily: computed.fontFamily || inherited.fontFamily || "",
    fontWeight: computed.fontWeight || inherited.fontWeight || "",
    fontStyle: computed.fontStyle || inherited.fontStyle || "",
    fontScale: tag === 'SMALL' ? Math.min(inherited.fontScale || 1, 0.833333) : inherited.fontScale || 1,
    textDecoration: decoration,
  };
};

const RUN_STYLE_KEYS = [
  "bold",
  "italic",
  "strike",
  "underline",
  "mark",
  "link",
  "code",
  "abbr",
  "baseline",
  "ruby",
  "syntax",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "fontScale",
  "textDecoration",
  "latex",
  "mathml",
  "svg",
  "mathDisplay",
  "linkIconSrc",
  "linkHref",
  "externalLinkIcon",
  "inlineImageSrc",
  "inlineImageSvg",
  "inlineImageAlt",
  "inlineImageWidthEm",
  "inlineImageHeightEm",
];

const sameRunStyle = (left, right) =>
  RUN_STYLE_KEYS.every((key) => left[key] === right[key]);

const appendRun = (runs, text, style = {}) => {
  if (!text) return;
  const next = {
    text,
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    strike: Boolean(style.strike),
    underline: Boolean(style.underline),
    mark: Boolean(style.mark),
    link: Boolean(style.link),
    code: Boolean(style.code),
    abbr: Boolean(style.abbr),
    baseline: style.baseline || "",
    ruby: style.ruby || "",
    syntax: style.syntax || "",
    fontFamily: style.fontFamily || "",
    fontWeight: style.fontWeight || "",
    fontStyle: style.fontStyle || "",
    fontScale: Number(style.fontScale) || 1,
    textDecoration: style.textDecoration || "",
    latex: style.latex || "",
    mathml: style.mathml || "",
    svg: style.svg || "",
    svgSegments: Array.isArray(style.svgSegments)
      ? style.svgSegments.map(({ svg, spaceBefore }) => ({
          svg: String(svg || ""),
          spaceBefore: Math.max(0, Number(spaceBefore) || 0),
        }))
      : [],
    mathDisplay: Boolean(style.mathDisplay),
    linkIconSrc: style.linkIconSrc || "",
    linkHref: style.linkHref || "",
    externalLinkIcon: Boolean(style.externalLinkIcon),
    inlineImageSrc: style.inlineImageSrc || "",
    inlineImageSvg: Boolean(style.inlineImageSvg),
    inlineImageAlt: style.inlineImageAlt || "",
    inlineImageWidthEm: Math.max(
      0,
      Number(style.inlineImageWidthEm) || 0,
    ),
    inlineImageHeightEm: Math.max(
      0,
      Number(style.inlineImageHeightEm) || 0,
    ),
  };
  const previous = runs.at(-1);
  if (previous && !next.inlineImageSrc && sameRunStyle(previous, next)) {
    previous.text += next.text;
  } else runs.push(next);
};

const trimRuns = (runs) => {
  while (runs.length && !runs[0].text) runs.shift();
  while (runs.length && !runs.at(-1).text) runs.pop();
  if (!runs.length) return runs;
  runs[0].text = runs[0].text.replace(/^\s+/u, "");
  runs[runs.length - 1].text = runs.at(-1).text.replace(/\s+$/u, "");
  return runs.filter(({ text }) => text);
};

const serializeRuby = (element, runs, inherited, range) => {
  const baseRuns = [];
  Array.from(element.childNodes)
    .filter(
      (node) =>
        !(node instanceof Element) || !["RT", "RP"].includes(node.tagName),
    )
    .forEach((node) =>
      serializeInlineNode(node, baseRuns, inherited, range, false),
    );
  const baseText = baseRuns
    .map(({ text }) => text)
    .join("")
    .trim();
  if (!baseText) return;
  const ruby = normalizeLabel(
    Array.from(element.querySelectorAll(":scope > rt"))
      .map(({ textContent }) => textContent)
      .join(" "),
  );
  appendRun(runs, baseText, {
    ...(baseRuns[0] || inherited),
    ruby,
  });
};

function serializeInlineNode(
  node,
  runs,
  inherited = {},
  range = null,
  preserveWhitespace = false,
) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent || isIgnoredElement(parent)) return;
    appendRun(
      runs,
      selectedTextForNode(node, range, preserveWhitespace),
      createInlineStyle(parent, inherited),
    );
    return;
  }
  if (!(node instanceof Element)) return;
  if (!rangeIntersectsNode(range, node)) return;

  const formula = getLatexFormula(node);
  if (formula?.element === node) {
    appendRun(runs, formula.text, {
      ...createInlineStyle(node, inherited),
      latex: formula.source,
      mathml: formula.mathml,
      svg: formula.svg,
      svgSegments: formula.svgSegments,
      mathDisplay: formula.display,
    });
    return;
  }
  if (isIgnoredElement(node)) return;

  const tag = node.tagName;
  if (tag === "BR") {
    appendRun(runs, "\n", inherited);
    return;
  }
  if (tag === "IMG") {
    if (node.matches("img[src]")) {
      const bounds = node.getBoundingClientRect();
      const computed = getComputedStyle(node);
      const parentFontSize = node.parentElement
        ? Number.parseFloat(getComputedStyle(node.parentElement).fontSize)
        : 0;
      const fontSize =
        Number.parseFloat(computed.fontSize) ||
        parentFontSize ||
        16;
      const width =
        bounds.width ||
        Number(node.getAttribute("width")) ||
        node.naturalWidth ||
        fontSize;
      const height =
        bounds.height ||
        Number(node.getAttribute("height")) ||
        node.naturalHeight ||
        fontSize;
      appendRun(runs, "\ufffc", {
        ...inherited,
        inlineImageSrc: node.currentSrc || node.getAttribute("src") || node.getAttribute("data-original-src") || "",
        inlineImageSvg: node.classList.contains("markdown-svg-image"),
        inlineImageAlt: normalizeLabel(node.getAttribute("alt")),
        inlineImageWidthEm: width / fontSize,
        inlineImageHeightEm: height / fontSize,
      });
      return;
    }
    appendRun(runs, normalizeLabel(node.getAttribute("alt")), inherited);
    return;
  }
  if (tag === "RUBY") {
    serializeRuby(node, runs, createInlineStyle(node, inherited), range);
    return;
  }
  if (tag === "RT" || tag === "RP") return;
  if (["UL", "OL"].includes(tag)) {
    appendSeparatedRuns(runs, serializeAlertList(node, range));
    return;
  }
  if (tag === "INPUT") return;

  const style = createInlineStyle(node, inherited);
  if (tag === "A") {
    const linkRuns = [];
    node.childNodes.forEach(child => serializeInlineNode(child, linkRuns, style, range, preserveWhitespace));
    const first = linkRuns.find(run => run.text.trim());
    if (first) {
      const icon = node.querySelector("[data-reader-link-icon] img[src]");
      if (icon && rangeIntersectsNode(range, icon)) first.linkIconSrc = icon.currentSrc || icon.getAttribute("src") || "";
    }
    linkRuns.forEach(run => appendRun(runs, run.text, run));
    const externalIcon = node.querySelector("i.ri-external-link-line");
    if (first && externalIcon && rangeIntersectsNode(range, externalIcon)) {
      const icon = getGeneratedIcon(externalIcon);
      appendRun(runs, icon?.glyph || "↗", {
        externalLinkIcon: true,
        linkHref: style.linkHref,
        fontFamily: icon?.fontFamily || style.fontFamily,
      });
    }
    return;
  }
  const separate = ["P", "DIV", "BLOCKQUOTE", "SUMMARY", "SECTION", "ARTICLE", "H1", "H2", "H3", "H4", "H5", "H6"].includes(tag);
  if (separate && runs.length && !runs.at(-1).text.endsWith("\n")) appendRun(runs, "\n", inherited);
  node.childNodes.forEach((child) =>
    serializeInlineNode(child, runs, style, range, preserveWhitespace),
  );
  if (separate && runs.length && !runs.at(-1).text.endsWith("\n")) appendRun(runs, "\n", inherited);
}

const serializeNodes = (
  nodes,
  { inherited = {}, range = null, preserveWhitespace = false } = {},
) => {
  const runs = [];
  nodes.forEach((node) =>
    serializeInlineNode(node, runs, inherited, range, preserveWhitespace),
  );
  return preserveWhitespace ? runs : trimRuns(runs);
};

const getListDepth = (item) => {
  let depth = 0;
  let current = item.parentElement?.closest("li");
  while (current) {
    depth += 1;
    current = current.parentElement?.closest("li");
  }
  return depth;
};

const formatAlphabeticMarker = (value, uppercase = false) => {
  if (!Number.isInteger(value) || value < 1) return String(value);
  let remaining = value;
  let marker = "";
  while (remaining > 0) {
    remaining -= 1;
    marker = String.fromCharCode(97 + (remaining % 26)) + marker;
    remaining = Math.floor(remaining / 26);
  }
  return uppercase ? marker.toUpperCase() : marker;
};

const formatRomanMarker = (value, uppercase = false) => {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    return String(value);
  }
  const numerals = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let remaining = value;
  let marker = "";
  numerals.forEach(([unit, numeral]) => {
    while (remaining >= unit) {
      marker += numeral;
      remaining -= unit;
    }
  });
  return uppercase ? marker.toUpperCase() : marker;
};

const formatOrderedMarker = (value, styleType) => {
  if (styleType === "lower-alpha" || styleType === "lower-latin") {
    return formatAlphabeticMarker(value);
  }
  if (styleType === "upper-alpha" || styleType === "upper-latin") {
    return formatAlphabeticMarker(value, true);
  }
  if (styleType === "lower-roman") return formatRomanMarker(value);
  if (styleType === "upper-roman") return formatRomanMarker(value, true);
  if (styleType === "decimal-leading-zero") {
    const sign = value < 0 ? "-" : "";
    return `${sign}${String(Math.abs(value)).padStart(2, "0")}`;
  }
  return String(value);
};

const getOrderedMarker = (item, list) => {
  const siblings = Array.from(list.children).filter(
    ({ tagName }) => tagName === "LI",
  );
  const reversed = list.hasAttribute("reversed");
  const explicitStart = Number(list.getAttribute("start"));
  let value =
    list.hasAttribute("start") && Number.isFinite(explicitStart)
      ? explicitStart
      : reversed
        ? siblings.length
        : 1;

  for (const sibling of siblings) {
    const explicitValue = Number(sibling.getAttribute("value"));
    if (sibling.hasAttribute("value") && Number.isFinite(explicitValue)) {
      value = explicitValue;
    }
    if (sibling === item) break;
    value += reversed ? -1 : 1;
  }

  const styleType = getComputedStyle(item).listStyleType;
  return `${formatOrderedMarker(value, styleType)}.`;
};

const getUnorderedMarker = (item) => {
  const styleType = getComputedStyle(item).listStyleType;
  if (styleType === "circle") return "◦";
  if (styleType === "square") return "▪";
  return "•";
};

const getGeneratedIcon = (element) => {
  if (!(element instanceof Element)) return null;
  const computed = getComputedStyle(element, "::before");
  const content = String(computed.content || "").trim();
  if (!content || content === "none" || content === "normal") return null;
  const unquoted =
    content.length >= 2 &&
    ['"', "'"].includes(content[0]) &&
    content[0] === content.at(-1)
      ? content.slice(1, -1)
      : content;
  const glyph = unquoted
    .replace(/\\([0-9a-f]{1,6})\s?/giu, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/\\(["'\\])/gu, "$1");
  return glyph
    ? { glyph, fontFamily: computed.fontFamily || "remixicon" }
    : null;
};

const getTaskMeta = (item) => {
  if (!item.hasAttribute("data-task-status")) return null;
  const status = item.getAttribute("data-task-status") || " ";
  const statusElement = item.querySelector(
    ":scope > .task-list-item-status, :scope > p > .task-list-item-status",
  );
  const icon = getGeneratedIcon(statusElement?.querySelector(":scope > i"));
  return {
    status,
    tone: statusElement?.dataset.taskTone || "muted",
    marker: TASK_STATUS_MARKERS[status] || "•",
    markerGlyph: icon?.glyph || "",
    markerFontFamily: icon?.fontFamily || "",
  };
};

const getListMarker = (item) => {
  const task = getTaskMeta(item);
  if (task) return task.marker;
  const checkbox = item.querySelector(
    ":scope > input[type='checkbox'], :scope > p > input[type='checkbox']",
  );
  if (checkbox) return checkbox.checked ? "☑" : "☐";
  const list = item.parentElement;
  return list?.tagName === "OL"
    ? getOrderedMarker(item, list)
    : getUnorderedMarker(item);
};

const getAlertTone = (alert) => {
  if (alert?.classList.contains("alert-error")) return "error";
  if (alert?.classList.contains("alert-warning")) return "warning";
  if (alert?.classList.contains("alert-success")) return "success";
  if (alert?.classList.contains("alert-info")) return "info";
  return "accent";
};

const getContextMeta = (block) => {
  const alert = block.closest("[data-markdown-alert]");
  if (alert) {
    return {
      type: "callout",
      systemLabel: Boolean(alert.dataset.systemLabel) || !alert.querySelector(":scope > summary.alert-title .alert-heading")?.textContent,
      tone: getAlertTone(alert),
      label: normalizeLabel(
        alert.dataset.systemLabel || alert.querySelector(":scope > summary.alert-title .alert-heading")?.textContent ||
          "提示",
      ),
    };
  }

  const chat = block.closest("[data-markdown-chat], .chat");
  if (chat) {
    return {
      type: "chat",
      systemLabel: !(block.querySelector(".chat-header")?.textContent || block.closest(".chat")?.querySelector(".chat-header")?.textContent),
      label:
        normalizeLabel(
          block.querySelector(".chat-header")?.textContent ||
            block.closest(".chat")?.querySelector(".chat-header")?.textContent,
        ) || "对话",
    };
  }

  const moment = block.closest("[data-markdown-moment], .moments-card");
  if (moment) {
    const author = block.closest('.comment-body')?.querySelector('.comments-info')?.textContent || moment.querySelector('.header-title')?.textContent;
    return {
      type: "moment",
      systemLabel: !author,
      label: normalizeLabel(author) || "动态",
    };
  }

  if (/^H[1-6]$/u.test(block.tagName)) {
    return { type: "heading", level: Number(block.tagName.slice(1)) };
  }
  if (block.tagName === "LI") {
    const task = getTaskMeta(block);
    return {
      type: "list-item",
      depth: getListDepth(block),
      marker: task?.marker || getListMarker(block),
      taskStatus: task?.status ?? null,
      taskTone: task?.tone || "",
      markerGlyph: task?.markerGlyph || "",
      markerFontFamily: task?.markerFontFamily || "",
    };
  }
  if (block.closest("blockquote")) {
    let depth = 0;
    for (let quote = block.closest('blockquote'); quote; quote = quote.parentElement?.closest('blockquote')) depth++;
    return { type: "quote", depth };
  }
  return { type: "paragraph" };
};

const serializeCodeBlock = (block, range) => {
  const runs = [];
  const lines = Array.from(block.querySelectorAll("pre"));
  const selectedLines = lines
    .filter((line) => rangeIntersectsNode(range, line))
    .map((line) => {
      const lineRuns = serializeNodes(Array.from(line.childNodes), {
        inherited: { ...getComputedTextStyle(line), code: true },
        range,
        preserveWhitespace: true,
      }).map((run) => ({
        ...run,
        text: run.text.replaceAll("\u200b", ""),
      }));
      return lineRuns;
    });

  selectedLines.forEach((lineRuns, index) => {
    if (index) {
      appendRun(runs, "\n", {
        ...(lineRuns[0] || runs.at(-1) || {}),
        code: true,
      });
    }
    lineRuns.forEach((run) => appendRun(runs, run.text, run));
  });

  if (!runs.length && !range && block.dataset.code) {
    let code = block.dataset.code;
    try {
      code = decodeURIComponent(code);
    } catch {
      // 保留原始 data-code 作为回退。
    }
    appendRun(runs, code.replace(/\r\n?/gu, "\n").replace(/\n$/u, ""), {
      ...getComputedTextStyle(block.querySelector("code") || block),
      code: true,
    });
  }

  return {
    type: "code",
    language: normalizeLabel(block.dataset.language),
    style: getComputedTextStyle(block.querySelector("code") || block),
    runs,
  };
};

const serializeTable = (table, range) => {
  const runs = [];
  const rows = [];
  Array.from(table.querySelectorAll("tr")).forEach((row) => {
    const sourceCells = Array.from(row.querySelectorAll(":scope > th, :scope > td"));
    if (!sourceCells.some(cell => rangeIntersectsNode(range, cell))) return;
    const cells = sourceCells.map(cell => ({
      runs: serializeNodes(Array.from(cell.childNodes), {
          inherited: getComputedTextStyle(cell),
          range,
        }),
      align: getComputedStyle(cell).textAlign,
      header: cell.tagName === "TH",
      colSpan: cell.colSpan || 1,
    }));
    rows.push({ cells });
    if (runs.length) appendRun(runs, "\n", runs.at(-1));
    cells.forEach((cell, index) => {
      if (index) appendRun(runs, " · ", cell.runs[0]);
      cell.runs.forEach((run) => appendRun(runs, run.text, run));
    });
  });
  return {
    type: "table",
    rows,
    style: getComputedTextStyle(table),
    runs: trimRuns(runs),
  };
};

const appendSeparatedRuns = (runs, nextRuns) => {
  if (!nextRuns.some(({ text }) => text.trim())) return;
  if (runs.length) appendRun(runs, "\n", nextRuns[0] || runs.at(-1));
  nextRuns.forEach((run) => appendRun(runs, run.text, run));
};

const serializeAlertList = (list, range, depth = 0) => {
  const runs = [];
  Array.from(list.children)
    .filter(({ tagName }) => tagName === "LI")
    .forEach((item) => {
      if (!rangeIntersectsNode(range, item)) return;
      const itemStyle = getComputedTextStyle(item);
      const itemRuns = serializeNodes(
        Array.from(item.childNodes).filter(
          (node) =>
            !(node instanceof Element) || !["UL", "OL"].includes(node.tagName),
        ),
        { inherited: itemStyle, range },
      );

      if (itemRuns.some(({ text }) => text.trim())) {
        const prefixedRuns = [];
        appendRun(
          prefixedRuns,
          `${"  ".repeat(depth)}${getListMarker(item)} `,
          itemRuns[0] || itemStyle,
        );
        itemRuns.forEach((run) => appendRun(prefixedRuns, run.text, run));
        appendSeparatedRuns(runs, prefixedRuns);
      }

      Array.from(item.children)
        .filter(({ tagName }) => ["UL", "OL"].includes(tagName))
        .forEach((nestedList) => {
          appendSeparatedRuns(
            runs,
            serializeAlertList(nestedList, range, depth + 1),
          );
        });
    });
  return runs;
};

const serializeAlertBlock = (alert, range) => {
  const runs = [];
  const inherited = getComputedTextStyle(alert);
  Array.from(alert.childNodes).forEach((node) => {
    if (node instanceof Element && node.matches(".alert-title")) return;
    if (!rangeIntersectsNode(range, node)) return;
    const nodeRuns =
      node instanceof Element && ["UL", "OL"].includes(node.tagName)
        ? serializeAlertList(node, range)
        : serializeNodes([node], { inherited, range });
    appendSeparatedRuns(runs, nodeRuns);
  });

  return {
    ...getContextMeta(alert),
    style: inherited,
    runs: trimRuns(runs),
  };
};

const getReaderFullParagraphText = (block) => {
  if (block.dataset.readerFullParagraphText) {
    return block.dataset.readerFullParagraphText;
  }
  const splitToken = block.dataset.mobileFootnoteSplit;
  if (!splitToken) return "";
  const source = Array.from(
    document.querySelectorAll(
      ".mobile-footnote-split-source[data-mobile-footnote-split]",
    ),
  ).find((candidate) => candidate.dataset.mobileFootnoteSplit === splitToken);
  return source?.dataset.readerFullParagraphText || "";
};

const serializeMermaidBlock = (viewer) => {
  const source = viewer.dataset.mermaidSource?.trim();
  if (!source) return null;

  const style = getComputedStyle(viewer);
  const theme = Object.fromEntries(
    Array.from(style)
      .filter((property) => property.startsWith("--pele-"))
      .map((property) => [property, style.getPropertyValue(property)]),
  );
  return {
    type: "mermaid",
    mermaid: { source, theme, cornerShape: style.getPropertyValue("--corner-shape") },
  };
};

const getImageDimensions = (image) => {
  const bounds = image.getBoundingClientRect();
  return {
    width:
      image.naturalWidth ||
      Number(image.getAttribute("width")) ||
      bounds.width ||
      1,
    height:
      image.naturalHeight ||
      Number(image.getAttribute("height")) ||
      bounds.height ||
      1,
  };
};

const serializeImageBlock = (figure, range) => {
  const image = figure.matches("img[src]") ? figure : figure.querySelector(":scope > img[src]");
  if (!image) return null;

  const caption = figure.querySelector(":scope > figcaption");
  const imageSelected = rangeIntersectsNode(range, image);
  const dimensions = getImageDimensions(image);
  return {
    type: "image",
    src: image.currentSrc || image.getAttribute("src") || image.getAttribute("data-original-src") || "",
    svgImage: image.classList.contains("markdown-svg-image"),
    alt: normalizeLabel(image.getAttribute("alt")),
    width: dimensions.width,
    height: dimensions.height,
    style: getComputedTextStyle(caption || figure),
    runs: caption
      ? serializeNodes(Array.from(caption.childNodes), {
          inherited: getComputedTextStyle(caption),
          range: imageSelected ? null : range,
        })
      : [],
  };
};

const serializeBlock = (block, range) => {
  const nativeBlock = block.closest('[data-markdown-chat], [data-markdown-moment]') ||
    (block.matches('table') ? block.closest('.markdown-table-wrapper') || block : block);
  if (block.matches(READER_SHARE_SNAPSHOT_SELECTOR) || nativeBlock.matches('[data-markdown-chat], [data-markdown-moment]')) {
    const meta = block.matches('table') ? serializeTable(block, range) : getContextMeta(block);
    const type = block.matches('.markdown-link-card') ? 'link-card' : meta.type;
    return {
      ...meta, type,
      snapshot: captureReaderShareSnapshot(nativeBlock, range),
      runs: meta.runs || serializeNodes(Array.from(block.childNodes), { range }),
    };
  }
  if (block.matches("[data-mermaid-viewer]")) {
    return serializeMermaidBlock(block);
  }
  if (/[\u0d80-\u0dff]/u.test(block.textContent) || /abhaya.*legacy|legacy.*abhaya/iu.test(block.className || '') || block.querySelector('[class*="abhaya-legacy"]')) {
    return { ...getContextMeta(block), snapshot: captureReaderShareSnapshot(block, range), runs: serializeNodes(Array.from(block.childNodes), { range }) };
  }
  if (block.tagName === 'HR') return { type: 'separator', runs: [] };
  if (block.matches("figure.markdown-figure, .moments-images > img[src]")) {
    return serializeImageBlock(block, range);
  }
  const blockFormula = getLatexFormula(block);
  if (blockFormula?.element === block && blockFormula.display) {
    return {
      ...getContextMeta(block),
      style: getComputedTextStyle(block),
      runs: serializeNodes([block], {
        inherited: getComputedTextStyle(block),
        range,
      }),
    };
  }
  const codeBlock = block.matches("[data-markdown-code-block]")
    ? block
    : block.closest("[data-markdown-code-block]");
  if (codeBlock) return serializeCodeBlock(codeBlock, range);
  if (block.matches("[data-markdown-alert]")) {
    return serializeAlertBlock(block, range);
  }
  const table = block.matches("table") ? block : block.closest("table");
  if (table) return serializeTable(table, range);

  const meta = getContextMeta(block);
  const fullParagraphText = range ? "" : getReaderFullParagraphText(block);
  if (
    fullParagraphText &&
    !block.querySelector("mjx-container[data-reader-latex-source]")
  ) {
    return {
      ...meta,
      style: getComputedTextStyle(block),
      runs: [
        {
          text: normalizeInlineText(fullParagraphText).trim(),
          ...createInlineStyle(block),
        },
      ],
    };
  }
  const nodes =
    block.tagName === "LI"
      ? Array.from(block.childNodes).filter(
          (node) =>
            !(node instanceof Element) || !["UL", "OL"].includes(node.tagName),
        )
      : Array.from(block.childNodes);
  return {
    ...meta,
    style: getComputedTextStyle(block),
    runs: serializeNodes(nodes, {
      inherited: getComputedTextStyle(block),
      range,
    }),
  };
};

const getOutermostQuote = (element) => {
  let quote = element.closest("blockquote");
  let parentQuote = quote?.parentElement?.closest("blockquote");
  while (parentQuote) {
    quote = parentQuote;
    parentQuote = quote.parentElement?.closest("blockquote");
  }
  return quote;
};

const getSemanticBlock = (node, fallback) => {
  const element = toElement(node);
  if (!element) return fallback;
  const closestListItem = element.closest("li");
  const priorityListItem = closestListItem;
  return (
    element.closest("[data-mermaid-viewer]") ||
    element.closest('[data-markdown-chat], [data-markdown-moment]') ||
    element.closest(".markdown-link-card") ||
    element.closest("figure.markdown-figure") ||
    element.closest(".moments-images > img[src]") ||
    element.closest("[data-markdown-code-block]") ||
    element.closest("[data-markdown-alert]") ||
    priorityListItem ||
    (element.closest('blockquote') ? element.closest('p, li, h1, h2, h3, h4, h5, h6') || getOutermostQuote(element) : null) ||
    element.closest(BLOCK_SELECTOR) ||
    fallback
  );
};

const collectRangeBlocks = (range, fallback) => {
  const common = toElement(range.commonAncestorContainer);
  if (!common) return fallback ? [fallback] : [];
  const blocks = [];
  const seen = new Set();
  const addTextNode = (node) => {
    if (!selectedTextForNode(node, range, true).trim()) return;
    const block = getSemanticBlock(node, fallback);
    const isAlertTitle = Boolean(
      node.parentElement?.closest("[data-markdown-alert] > .alert-title"),
    );
    if (isIgnoredElement(node.parentElement) && !isAlertTitle) return;
    if (!block || seen.has(block)) return;
    seen.add(block);
    blocks.push(block);
  };
  const addFormula = (element) => {
    const formula = getLatexFormula(element);
    if (!formula || !rangeIntersectsNode(range, formula.element)) return;
    const block = getSemanticBlock(formula.element, fallback);
    if (!block || seen.has(block)) return;
    seen.add(block);
    blocks.push(block);
  };
  const addMermaid = (viewer) => {
    if (!rangeIntersectsNode(range, viewer) || seen.has(viewer)) return;
    seen.add(viewer);
    blocks.push(viewer);
  };
  const addImage = (element) => {
    const figure = element.closest?.("figure.markdown-figure, .moments-images > img[src]");
    if (!figure || !rangeIntersectsNode(range, figure) || seen.has(figure)) {
      return;
    }
    seen.add(figure);
    blocks.push(figure);
  };

  if (common.nodeType === Node.TEXT_NODE) addTextNode(common);
  const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    addTextNode(node);
    node = walker.nextNode();
  }
  addFormula(common);
  common
    .querySelectorAll?.("mjx-container[data-reader-latex-source]")
    .forEach(addFormula);
  const containingMermaid = common.closest?.("[data-mermaid-viewer]");
  if (containingMermaid) addMermaid(containingMermaid);
  common.querySelectorAll?.("[data-mermaid-viewer]").forEach(addMermaid);
  addImage(common);
  common.querySelectorAll?.("figure.markdown-figure, .moments-images > img[src]").forEach(addImage);
  const addRule = rule => {
    if (rangeIntersectsNode(range, rule) && !seen.has(rule)) { seen.add(rule); blocks.push(rule); }
  };
  if (common.matches('hr')) addRule(common);
  common.querySelectorAll?.('hr').forEach(addRule);
  if (!blocks.length) return fallback ? [fallback] : [];

  blocks.sort((left, right) => {
    if (left === right) return 0;
    return left.compareDocumentPosition(right) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1;
  });

  return blocks.filter(
    (block) =>
      !blocks.some(
        (container) =>
          container !== block &&
          container.matches("[data-markdown-alert], [data-mermaid-viewer], .markdown-link-card, [data-markdown-chat], [data-markdown-moment]") &&
          container.contains(block),
      ) &&
      (!block.matches(
        "blockquote",
      ) ||
        !blocks.some(
          (nestedBlock) => nestedBlock !== block && block.contains(nestedBlock),
        )),
  );
};

export const createReaderShareContent = ({ range, element } = {}) => {
  const activeRange = range instanceof Range && !range.collapsed ? range : null;
  const fallback = element instanceof Element ? element : null;
  const containerRange = !activeRange && fallback?.matches('[data-markdown-chat], [data-markdown-moment], blockquote')
    ? document.createRange() : null;
  containerRange?.selectNodeContents(fallback);
  const blocks = activeRange
    ? collectRangeBlocks(activeRange, fallback)
    : containerRange
      ? collectRangeBlocks(containerRange, fallback)
    : fallback
      ? [fallback]
      : [];
  const serialized = blocks
    .map((block) => serializeBlock(block, activeRange))
    .filter(Boolean)
    .filter(
      (block) =>
        (block.type === "mermaid" && block.mermaid?.source) ||
        Boolean(block.snapshot) ||
        (block.type === "image" && block.src) ||
        block.type === "separator" ||
        (block.type === "link-card" && block.label) ||
        block.runs?.some(({ text }) => text.trim()),
    );
  return { blocks: serialized };
};
