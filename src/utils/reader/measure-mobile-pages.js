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
    if (
      node.textContent?.trim() &&
      !node.parentElement?.closest(".footnotes")
    ) {
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
  if (!article) return [];

  // 正文直接挂在 article 下（渲染层不再包裹额外 div）。章节头不是正文，
  // 其文字不能混入正文基线集合，否则第一页的首末行定位会被标题带偏。
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest(
          ".mobile-chapter-header, .chat-content, .footnotes, .footnote-ref, .mobile-footnote-page-break, button, [aria-hidden='true']",
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
      ":scope > .chat-content > .chat-leading-group, :scope > .chat-content > .chat-page-block",
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

// Markdown 渲染层不再为正文包裹额外 div（RenderedContent 以 Fragment 直接
// 挂载到 article）。移动分页遍历“正文顶层块”时直接使用 article 的直接
// 子元素，但排除章节头与末尾定位点这两个非正文成员。
export const collectMarkdownBodyChildren = (article) =>
  Array.from(article?.children || []).filter(
    (element) =>
      !element.classList.contains("mobile-chapter-header") &&
      !element.classList.contains("mobile-pagination-end"),
  );

// 正文直接挂在 article 下，媒体元素可能出现在任意深度（p、figure、div 等）。
// 旧结构用 `:scope > div img` 这样的后代选择器；现在以 article 为根做后代
// 查询即可得到同样的集合。
export const collectReaderMediaElements = (article) =>
  Array.from(
    article.querySelectorAll(
      "img, video, svg, canvas, table, pre, .chat-leading-group, .chat-content > .chat-page-block",
    ),
  );

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
    Math.floor((Math.max(0, rawLogicalLeft) + PAGE_INDEX_EPSILON) / stride) + 1
  );
};

export const createFootnoteLayoutSignature = (grouped) =>
  Object.entries(grouped)
    .map(([page, notes]) => `${page}:${notes.map((note) => note.id).join(",")}`)
    .join("|");
