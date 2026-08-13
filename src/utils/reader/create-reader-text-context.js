const IGNORED_TEXT_SELECTOR = [
  ".comment-trigger",
  ".paragraph-comment-count",
  ".footnote-ref",
  ".footnote-backref",
  "[data-paragraph-comment-meta]",
  "[data-footnote-ref]",
  "[data-footnote-backref]",
].join(",");

const normalizeReaderText = (value = "") =>
  String(value).replace(/\s+/g, " ").trim();

const extractSelectionDetails = (root) => {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const rects = Array.from(range.getClientRects()).filter(
    (rect) =>
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight,
  );
  const fallbackRect = range.getBoundingClientRect();
  const visibleRects = rects.length ? rects : [fallbackRect];
  const left = Math.min(...visibleRects.map((rect) => rect.left));
  const right = Math.max(...visibleRects.map((rect) => rect.right));
  const top = Math.min(...visibleRects.map((rect) => rect.top));
  const bottom = Math.max(...visibleRects.map((rect) => rect.bottom));

  return {
    text: normalizeReaderText(selection.toString()),
    range,
    anchorRect: { left, right, top, bottom, width: right - left, height: bottom - top },
  };
};

const extractParagraphText = (paragraph) => {
  if (!paragraph) return "";
  if (paragraph.dataset.readerFullParagraphText) {
    return normalizeReaderText(paragraph.dataset.readerFullParagraphText);
  }

  const clone = paragraph.cloneNode(true);
  clone.querySelectorAll(IGNORED_TEXT_SELECTOR).forEach((node) => node.remove());
  return normalizeReaderText(clone.textContent);
};

export const createReaderTextContext = ({ root, target, clientX, clientY }) => {
  if (!root || !(target instanceof Element)) return null;

  const selectionDetails = extractSelectionDetails(root);
  const selectionNode = selectionDetails?.range.startContainer;
  const selectionElement =
    selectionNode instanceof Element ? selectionNode : selectionNode?.parentElement;
  const paragraph = (selectionElement || target).closest(
    "p[id], p[data-reader-paragraph-id]",
  );
  const paragraphId =
    paragraph?.id || paragraph?.dataset.readerParagraphId || "";
  const selectedText = selectionDetails?.text || "";
  const paragraphText = extractParagraphText(paragraph);
  const text = selectedText || paragraphText;

  if (!text && !paragraphId) return null;

  return {
    clientX,
    clientY,
    anchorRect: selectionDetails?.anchorRect || null,
    text,
    selectedText,
    paragraphText,
    paragraphId,
    sourceType: paragraph?.dataset.sourceType || "novel",
  };
};

export const createReaderSelectionContext = (root) => {
  const selection = window.getSelection?.();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const node = range?.startContainer;
  const target = node instanceof Element ? node : node?.parentElement;
  if (!target) return null;

  const context = createReaderTextContext({
    root,
    target,
    clientX: 0,
    clientY: 0,
  });
  return context?.selectedText ? context : null;
};
