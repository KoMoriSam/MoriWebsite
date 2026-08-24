const IGNORED_CONTENT_SELECTOR = [
  ".comment-trigger",
  ".paragraph-comment-count",
  ".footnote-ref",
  ".footnote-backref",
  ".header-anchor",
  ".alert-title",
  ".chat-bar",
  ".chat-header",
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
  "[data-markdown-code-block]",
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
  "blockquote",
  "[data-markdown-alert]",
  "[data-markdown-chat]",
  "[data-markdown-moment]",
].join(",");

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
    code: inherited.code || tag === "CODE",
    abbr: inherited.abbr || tag === "ABBR",
    baseline:
      tag === "SUB" ? "sub" : tag === "SUP" ? "sup" : inherited.baseline || "",
    syntax: getSyntaxKind(element) || inherited.syntax || "",
    fontFamily: computed.fontFamily || inherited.fontFamily || "",
    fontWeight: computed.fontWeight || inherited.fontWeight || "",
    fontStyle: computed.fontStyle || inherited.fontStyle || "",
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
  "textDecoration",
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
    textDecoration: style.textDecoration || "",
  };
  const previous = runs.at(-1);
  if (previous && sameRunStyle(previous, next)) previous.text += next.text;
  else runs.push(next);
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
  if (!(node instanceof Element) || isIgnoredElement(node)) return;
  if (!rangeIntersectsNode(range, node)) return;

  const tag = node.tagName;
  if (tag === "BR") {
    appendRun(runs, "\n", inherited);
    return;
  }
  if (tag === "IMG") {
    appendRun(runs, normalizeLabel(node.getAttribute("alt")), inherited);
    return;
  }
  if (tag === "RUBY") {
    serializeRuby(node, runs, createInlineStyle(node, inherited), range);
    return;
  }
  if (tag === "RT" || tag === "RP") return;
  if (["UL", "OL"].includes(tag)) return;
  if (tag === "INPUT") return;

  const style = createInlineStyle(node, inherited);
  node.childNodes.forEach((child) =>
    serializeInlineNode(child, runs, style, range, preserveWhitespace),
  );
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

const getOrderedMarker = (item, list) => {
  const explicitValue = Number(item.getAttribute("value"));
  if (Number.isFinite(explicitValue) && item.hasAttribute("value")) {
    return `${explicitValue}.`;
  }
  const start = Number(list.getAttribute("start")) || 1;
  const siblings = Array.from(list.children).filter(
    ({ tagName }) => tagName === "LI",
  );
  return `${start + Math.max(0, siblings.indexOf(item))}.`;
};

const getListMarker = (item) => {
  const checkbox = item.querySelector(
    ":scope > input[type='checkbox'], :scope > p > input[type='checkbox']",
  );
  if (checkbox) return checkbox.checked ? "☑" : "☐";
  const list = item.parentElement;
  return list?.tagName === "OL" ? getOrderedMarker(item, list) : "•";
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
      tone: getAlertTone(alert),
      label: normalizeLabel(
        alert.querySelector(":scope > summary.alert-title h6")?.textContent ||
          "提示",
      ),
    };
  }

  const chat = block.closest("[data-markdown-chat], .chat");
  if (chat) {
    return {
      type: "chat",
      label:
        normalizeLabel(
          block.querySelector(".chat-header")?.textContent ||
            block.closest(".chat")?.querySelector(".chat-header")?.textContent,
        ) || "对话",
    };
  }

  const moment = block.closest("[data-markdown-moment], .moments-card");
  if (moment) {
    return {
      type: "moment",
      label:
        normalizeLabel(moment.querySelector(".header-title")?.textContent) ||
        "动态",
    };
  }

  if (/^H[1-6]$/u.test(block.tagName)) {
    return { type: "heading", level: Number(block.tagName.slice(1)) };
  }
  if (block.tagName === "LI") {
    return {
      type: "list-item",
      depth: getListDepth(block),
      marker: getListMarker(block),
    };
  }
  if (block.closest("blockquote")) return { type: "quote" };
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
  Array.from(table.querySelectorAll("tr")).forEach((row) => {
    const cells = Array.from(row.querySelectorAll(":scope > th, :scope > td"))
      .map((cell) =>
        serializeNodes(Array.from(cell.childNodes), {
          inherited: getComputedTextStyle(cell),
          range,
        }),
      )
      .filter((cellRuns) => cellRuns.some(({ text }) => text.trim()));
    if (!cells.length) return;
    if (runs.length) appendRun(runs, "\n", runs.at(-1));
    cells.forEach((cellRuns, index) => {
      if (index) appendRun(runs, " · ", cellRuns[0]);
      cellRuns.forEach((run) => appendRun(runs, run.text, run));
    });
  });
  return {
    type: "table",
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

const serializeBlock = (block, range) => {
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
  if (fullParagraphText) {
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
  return (
    element.closest("[data-markdown-code-block]") ||
    element.closest("[data-markdown-alert]") ||
    getOutermostQuote(element) ||
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
    if (!selectedTextForNode(node, range, true)) return;
    const block = getSemanticBlock(node, fallback);
    const isAlertTitle = Boolean(
      node.parentElement?.closest("[data-markdown-alert] > .alert-title"),
    );
    if (isIgnoredElement(node.parentElement) && !isAlertTitle) return;
    if (!block || seen.has(block)) return;
    seen.add(block);
    blocks.push(block);
  };

  if (common.nodeType === Node.TEXT_NODE) addTextNode(common);
  const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    addTextNode(node);
    node = walker.nextNode();
  }
  if (!blocks.length) return fallback ? [fallback] : [];

  return blocks.filter(
    (block) =>
      !block.matches(
        "[data-markdown-chat], [data-markdown-moment], blockquote",
      ) ||
      !blocks.some(
        (nestedBlock) => nestedBlock !== block && block.contains(nestedBlock),
      ),
  );
};

export const createReaderShareContent = ({ range, element } = {}) => {
  const activeRange = range instanceof Range && !range.collapsed ? range : null;
  const fallback = element instanceof Element ? element : null;
  const blocks = activeRange
    ? collectRangeBlocks(activeRange, fallback)
    : fallback
      ? [fallback]
      : [];
  const serialized = blocks
    .map((block) => serializeBlock(block, activeRange))
    .filter(({ runs }) => runs?.some(({ text }) => text.trim()));
  return { blocks: serialized };
};
