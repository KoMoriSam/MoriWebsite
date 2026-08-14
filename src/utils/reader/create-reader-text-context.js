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

const isIgnoredTextNode = (node) =>
  node?.parentElement?.closest(IGNORED_TEXT_SELECTOR);

const getCaretAtPoint = (clientX, clientY) => {
  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(clientX, clientY);
    return range
      ? { node: range.startContainer, offset: range.startOffset }
      : null;
  }

  const position = document.caretPositionFromPoint?.(clientX, clientY);
  return position
    ? { node: position.offsetNode, offset: position.offset }
    : null;
};

const getNearestTextOffset = (text, offset) => {
  if (!text) return -1;

  let index = Math.min(Math.max(0, offset), text.length - 1);
  const codeUnit = text.charCodeAt(index);
  if (index > 0 && codeUnit >= 0xdc00 && codeUnit <= 0xdfff) index -= 1;
  if (!/\s/u.test(text[index])) return index;

  for (let distance = 1; distance < text.length; distance += 1) {
    const previous = index - distance;
    const next = index + distance;
    if (previous >= 0 && !/\s/u.test(text[previous])) return previous;
    if (next < text.length && !/\s/u.test(text[next])) return next;
  }

  return -1;
};

const getTextBoundary = (text, offset) => {
  const index = getNearestTextOffset(text, offset);
  if (index < 0) return null;

  if (typeof Intl?.Segmenter === "function") {
    const segments = new Intl.Segmenter(document.documentElement.lang || "zh", {
      granularity: "word",
    }).segment(text);
    for (const segment of segments) {
      const end = segment.index + segment.segment.length;
      if (
        segment.index <= index &&
        index < end &&
        segment.segment.trim() &&
        segment.isWordLike !== false
      ) {
        return { start: segment.index, end };
      }
    }
  }

  const character = String.fromCodePoint(text.codePointAt(index));
  let start = index;
  let end = index + character.length;
  const isWordCharacter = (value) => /[\p{L}\p{M}\p{N}_]/u.test(value);

  if (isWordCharacter(character)) {
    while (start > 0) {
      const previous = Array.from(text.slice(0, start)).at(-1);
      if (!previous || !isWordCharacter(previous)) break;
      start -= previous.length;
    }
    while (end < text.length) {
      const next = String.fromCodePoint(text.codePointAt(end));
      if (!isWordCharacter(next)) break;
      end += next.length;
    }
  }

  return { start, end };
};

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

const extractParagraphText = (commentable) => {
  if (!commentable) return "";
  if (commentable.dataset.readerFullParagraphText) {
    return normalizeReaderText(commentable.dataset.readerFullParagraphText);
  }

  const clone = commentable.cloneNode(true);
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
    "[data-reader-paragraph-id]",
  );
  const paragraphId =
    paragraph?.dataset.readerParagraphId || paragraph?.id || "";
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

export const selectReaderTextAtPoint = ({
  root,
  target,
  clientX,
  clientY,
}) => {
  if (!root || !(target instanceof Element)) return null;

  const commentable = target.closest("[data-reader-paragraph-id]");
  if (!commentable || !root.contains(commentable)) return null;

  const caret = getCaretAtPoint(clientX, clientY);
  let textNode = caret?.node;
  let offset = caret?.offset || 0;

  if (
    textNode?.nodeType !== Node.TEXT_NODE ||
    !commentable.contains(textNode.parentElement) ||
    isIgnoredTextNode(textNode)
  ) {
    const walker = document.createTreeWalker(
      commentable,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          node.textContent?.trim() && !isIgnoredTextNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      },
    );
    textNode = walker.nextNode();
    offset = 0;
  }

  const boundary = getTextBoundary(textNode?.textContent || "", offset);
  if (!textNode || !boundary) return null;

  const range = document.createRange();
  range.setStart(textNode, boundary.start);
  range.setEnd(textNode, boundary.end);

  const selection = window.getSelection?.();
  if (!selection) return null;
  selection.removeAllRanges();
  selection.addRange(range);

  return createReaderSelectionContext(root);
};
