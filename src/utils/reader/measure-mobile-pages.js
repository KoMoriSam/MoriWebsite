const PAGE_INDEX_EPSILON = 0.5;

export const roundLayoutPixel = (value) => Math.max(0, Math.round(value));

export const waitForReaderLayout = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });

export const findLastTextRect = (article) => {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  let lastTextNode = null;
  let node = walker.nextNode();

  while (node) {
    if (node.textContent?.trim() && !node.parentElement?.closest(".footnotes")) {
      lastTextNode = node;
    }
    node = walker.nextNode();
  }
  if (!lastTextNode) return null;

  const range = document.createRange();
  const endOffset = lastTextNode.textContent.length;
  range.setStart(lastTextNode, Math.max(0, endOffset - 1));
  range.setEnd(lastTextNode, endOffset);
  const rects = range.getClientRects();
  const rect = rects[rects.length - 1] || null;
  range.detach?.();
  return rect;
};

export const collectReaderBodyTextRects = (article) => {
  const contentRoot = article.querySelector(":scope > div");
  if (!contentRoot) return [];

  const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest(
          ".chat-content, .footnotes, .footnote-ref, .mobile-footnote-page-break, button, [aria-hidden='true']",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const range = document.createRange();
  const rects = [];
  let node = walker.nextNode();

  while (node) {
    range.selectNodeContents(node);
    Array.from(range.getClientRects()).forEach((rect) => {
      if (rect.width > 0 && rect.height > 0) {
        rects.push({
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
          textElement: node.parentElement,
        });
      }
    });
    node = walker.nextNode();
  }
  range.detach?.();
  return rects;
};

export const collectReaderChatFlowRects = (article) =>
  Array.from(
    article.querySelectorAll(
      ":scope > div > .chat-content > .chat-leading-group, :scope > div > .chat-content > .chat-page-block",
    ),
  ).flatMap((element) => {
    const style = window.getComputedStyle(element);
    const marginEnd = Number.parseFloat(style.marginBlockEnd) || 0;
    return Array.from(element.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        textElement: element,
        flowBlock: true,
        flowMarginEnd: marginEnd,
      }));
  });

export const collectReaderPageFlowRects = (article) => [
  ...collectReaderBodyTextRects(article),
  ...collectReaderChatFlowRects(article),
];

let metricsContext;
let baselineMetricsCache = new WeakMap();

export const resetTextBaselineMetrics = () => {
  baselineMetricsCache = new WeakMap();
};

export const calculateTextRectBaseline = (rect) => {
  const element = rect?.textElement;
  if (!metricsContext) {
    metricsContext = document.createElement("canvas").getContext("2d");
  }
  if (!element || !metricsContext) return rect?.bottom || 0;

  let fontMetrics = baselineMetricsCache.get(element);
  if (!fontMetrics) {
    const style = window.getComputedStyle(element);
    metricsContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = metricsContext.measureText("国Ag");
    const ascent =
      metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || 0;
    const descent =
      metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || 0;
    fontMetrics = { descent, height: ascent + descent };
    baselineMetricsCache.set(element, fontMetrics);
  }

  const halfLeading = Math.max(0, rect.height - fontMetrics.height) / 2;
  return fontMetrics.height > 0
    ? rect.bottom - fontMetrics.descent - halfLeading
    : rect.bottom;
};

export const calculateReaderFlowBaseline = (rect, baselineOffset) =>
  rect.flowBlock
    ? rect.bottom + (rect.flowMarginEnd || 0) + baselineOffset
    : calculateTextRectBaseline(rect);

export const calculateRawColumnPage = ({
  rect,
  viewport,
  renderedOffset,
  chapterOffset,
  stride,
}) => {
  if (!viewport || !rect || !stride) return 1;
  const rawLogicalLeft =
    rect.left -
    viewport.getBoundingClientRect().left +
    renderedOffset -
    chapterOffset;
  return (
    Math.floor((Math.max(0, rawLogicalLeft) + PAGE_INDEX_EPSILON) / stride) +
    1
  );
};

export const createFootnoteLayoutSignature = (grouped) =>
  Object.entries(grouped)
    .map(([page, notes]) => `${page}:${notes.map((note) => note.id).join(",")}`)
    .join("|");
