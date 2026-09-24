export function editablePlainText(element) {
  return element.innerText.replace(/\r\n?/gu, "\n");
}

export function editableRange(element) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    return null;
  }

  return range;
}

export function editableSelection(element) {
  const range = editableRange(element);
  if (!range) return null;

  const beforeStart = range.cloneRange();
  beforeStart.selectNodeContents(element);
  beforeStart.setEnd(range.startContainer, range.startOffset);
  const beforeEnd = range.cloneRange();
  beforeEnd.selectNodeContents(element);
  beforeEnd.setEnd(range.endContainer, range.endOffset);
  return {
    start: beforeStart.toString().length,
    end: beforeEnd.toString().length,
  };
}

function editablePosition(element, offset) {
  const walker = document.createTreeWalker(
    element,
    window.NodeFilter.SHOW_TEXT,
  );
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();

  while (node) {
    if (remaining <= node.data.length) {
      return { node, offset: remaining };
    }
    remaining -= node.data.length;
    node = walker.nextNode();
  }

  return { node: element, offset: element.childNodes.length };
}

export function restoreEditableSelection(element, selection) {
  if (!element || !selection || document.activeElement !== element) return;
  const start = editablePosition(element, selection.start);
  const end = editablePosition(element, selection.end);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const currentSelection = window.getSelection();
  currentSelection?.removeAllRanges();
  currentSelection?.addRange(range);
}
