import { nextTick } from "vue";

import {
  collectPageFootnotes,
  extractParagraphCommentText,
  removeFootnotePageBreaks,
  restoreFootnoteParagraphSplits,
} from "@/utils/reader/layout-mobile-footnotes";

export const usePagedFootnoteLayout = ({
  footnoteMeasureRef,
  footnotesByPage,
  footnoteReservesByPage,
  measuringFootnotes,
  totalPages,
  pageHeight,
  pageLineHeight,
  leadingEmptyPages,
  paginationLayoutResetting,
  pageVerticalPadding,
  minimumBodyLines,
  maximumPasses,
  getElementPage,
  getRectPage,
  getMeasuredPageCount,
  clearPageBaselineAdjustments,
  clearPageFlowGridAdjustments,
  prepareMobileTables,
  restoreMobileTables,
  splitMobileTables,
  alignChapterHeaderBlock,
  alignPageFlowBlocksToGrid,
  alignPageStartBaselines,
  normalizeLeadingEmptyPages,
  alignPageEdgeBaselines,
  waitForLayout,
  isCurrent,
  takeMutationRecords,
}) => {
  let paginationDepth = 0;
  let splitSequence = 0;

  const collect = (article) =>
    collectPageFootnotes({ article, getElementPage });

  const measureReserve = async (notes) => {
    if (!notes.length) return 0;
    measuringFootnotes.value = notes;
    await nextTick();
    await waitForLayout();

    const measuredHeight = footnoteMeasureRef.value?.scrollHeight || 0;
    const lineHeight = pageLineHeight.value;
    const contentLines = Math.max(
      1,
      Math.floor((pageHeight.value - pageVerticalPadding * 2) / lineHeight),
    );
    const maximumHeight =
      Math.max(1, contentLines - minimumBodyLines) * lineHeight;
    return Math.min(
      Math.max(lineHeight, Math.ceil(measuredHeight / lineHeight) * lineHeight),
      maximumHeight,
    );
  };

  const findBreakPosition = (article, viewport, page, reserve) => {
    const footerTop =
      viewport.getBoundingClientRect().top +
      pageHeight.value -
      pageVerticalPadding -
      reserve;
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (
          !parent ||
          parent.closest(
            ".chat-content, .footnotes, .mobile-footnote-page-break, button, [aria-hidden='true']",
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const range = document.createRange();
    let node = walker.nextNode();

    while (node) {
      range.selectNodeContents(node);
      const overflows = Array.from(range.getClientRects()).some(
        (rect) =>
          getRectPage(rect, viewport) === page && rect.bottom > footerTop,
      );
      if (overflows) {
        for (let offset = 0; offset < node.textContent.length; offset += 1) {
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          const rect = range.getClientRects()[0];
          if (
            rect &&
            getRectPage(rect, viewport) === page &&
            rect.bottom > footerTop
          ) {
            range.detach?.();
            return { node, offset };
          }
        }
      }
      node = walker.nextNode();
    }
    range.detach?.();
    return null;
  };

  const splitParagraphAtBreak = ({ node, offset }) => {
    const footnoteReference = node.parentElement?.closest(".footnote-ref");
    const paragraph = (footnoteReference || node.parentElement)?.closest("p");
    if (!paragraph?.parentNode || !node.parentNode) return false;
    // 渲染层不再包裹额外 div，正文段落直接挂在 .mobile-page-article 下。
    const article = paragraph.closest(".mobile-page-article");
    if (paragraph.parentElement !== article) return false;

    const sourceWasContinuation = paragraph.classList.contains(
      "mobile-footnote-continuation",
    );
    const paragraphStartIndent = window.getComputedStyle(paragraph).textIndent;
    let splitToken = paragraph.dataset.mobileFootnoteSplit;
    if (!splitToken) {
      splitToken = `footnote-split-${(splitSequence += 1)}`;
      paragraph.dataset.mobileFootnoteSplit = splitToken;
      paragraph.classList.add("mobile-footnote-split-source");
      if (paragraph.id) {
        paragraph.dataset.readerFullParagraphText =
          extractParagraphCommentText(paragraph);
      }
    }

    const range = document.createRange();
    if (footnoteReference) range.setStartBefore(footnoteReference);
    else range.setStart(node, offset);
    range.setEndAfter(paragraph.lastChild);
    const trailingContent = range.extractContents();
    range.detach?.();
    if (!trailingContent.hasChildNodes()) return false;

    const continuation = paragraph.cloneNode(false);
    continuation.removeAttribute("id");
    continuation.classList.remove(
      "mobile-footnote-split-source",
      "mobile-footnote-split-empty",
      "mobile-footnote-paragraph-start",
      "mobile-page-baseline-adjusted",
    );
    continuation.classList.add("mobile-footnote-continuation");
    continuation.style.removeProperty("--reader-page-baseline-adjust");
    continuation.style.removeProperty("--reader-page-baseline-base-margin");
    continuation.style.removeProperty("--reader-footnote-continuation-indent");
    continuation.dataset.mobileFootnoteSplit = splitToken;
    delete continuation.dataset.readerFullParagraphText;
    continuation.appendChild(trailingContent);
    paragraph.after(continuation);

    if (!extractParagraphCommentText(paragraph).trim()) {
      paragraph.classList.add("mobile-footnote-split-empty");
      if (!sourceWasContinuation) {
        continuation.classList.add("mobile-footnote-paragraph-start");
        continuation.style.setProperty(
          "--reader-footnote-continuation-indent",
          paragraphStartIndent,
        );
      }
    }
    return true;
  };

  const insertPageBreak = (breakPosition) => {
    if (splitParagraphAtBreak(breakPosition)) return;
    const { node, offset } = breakPosition;
    const footnoteReference = node.parentElement?.closest(".footnote-ref");
    const breakElement = document.createElement("span");
    breakElement.className = "mobile-footnote-page-break";
    breakElement.setAttribute("aria-hidden", "true");

    if (footnoteReference?.parentNode) {
      footnoteReference.parentNode.insertBefore(
        breakElement,
        footnoteReference,
      );
    } else if (node.parentNode && offset <= 0) {
      node.parentNode.insertBefore(breakElement, node);
    } else if (node.parentNode) {
      const trailingText = node.splitText(offset);
      trailingText.parentNode?.insertBefore(breakElement, trailingText);
    }
  };

  const rollback = (article) => {
    if (!article?.isConnected) return;
    clearPageBaselineAdjustments(article);
    clearPageFlowGridAdjustments(article);
    restoreMobileTables(article);
    removeFootnotePageBreaks(article);
    restoreFootnoteParagraphSplits(article);
    footnotesByPage.value = {};
    footnoteReservesByPage.value = {};
    measuringFootnotes.value = [];
  };

  const resetPaginationLayout = async (article, token) => {
    if (!article?.isConnected) return false;
    rollback(article);
    leadingEmptyPages.value = 0;
    paginationLayoutResetting.value = true;
    try {
      await nextTick();
      await waitForLayout();
      if (!isCurrent(token) || !article.isConnected) return false;
    } finally {
      paginationLayoutResetting.value = false;
    }
    await nextTick();
    await waitForLayout();
    return isCurrent(token) && article.isConnected;
  };

  const paginate = async (article, viewport, token) => {
    paginationDepth += 1;
    let completed = false;
    try {
      clearPageBaselineAdjustments(article);
      removeFootnotePageBreaks(article);
      restoreFootnoteParagraphSplits(article);
      prepareMobileTables(article);
      if (!(await alignChapterHeaderBlock(article, token))) return false;
      if (!(await alignPageFlowBlocksToGrid(article, token))) return false;
      try {
        const splitOk = await splitMobileTables(article, viewport, token);
        if (!splitOk) {
          console.warn("splitMobileTables returned false", { token });
          return false;
        }
      } catch (error) {
        console.error("splitMobileTables threw", error);
        return false;
      }
      if (!(await alignPageStartBaselines(article, viewport, token)))
        return false;
      if (!(await normalizeLeadingEmptyPages(article, viewport, token)))
        return false;

      footnotesByPage.value = {};
      footnoteReservesByPage.value = {};
      measuringFootnotes.value = [];
      await nextTick();
      await waitForLayout();

      const reserveCache = new Map();
      let page = 1;
      let insertedBreaks = 0;
      while (insertedBreaks < maximumPasses) {
        if (!isCurrent(token)) return false;
        totalPages.value = getMeasuredPageCount(article, viewport);
        if (page > totalPages.value) break;

        const notes = collect(article)[page] || [];
        if (notes.length) {
          const cacheKey = notes.map((note) => note.id).join("|");
          let reserve = reserveCache.get(cacheKey);
          if (reserve == null) {
            reserve = await measureReserve(notes);
            reserveCache.set(cacheKey, reserve);
          }
          if (!isCurrent(token)) return false;
          const breakPosition = findBreakPosition(
            article,
            viewport,
            page,
            reserve,
          );
          if (breakPosition) {
            insertPageBreak(breakPosition);
            insertedBreaks += 1;
            await nextTick();
            await waitForLayout();
          }
        }
        page += 1;
      }

      if (!(await alignPageStartBaselines(article, viewport, token)))
        return false;
      if (!(await normalizeLeadingEmptyPages(article, viewport, token)))
        return false;

      totalPages.value = getMeasuredPageCount(article, viewport);
      const finalFootnotes = collect(article);
      const finalReserves = {};
      for (const [pageNumber, notes] of Object.entries(finalFootnotes)) {
        const cacheKey = notes.map((note) => note.id).join("|");
        let reserve = reserveCache.get(cacheKey);
        if (reserve == null) {
          reserve = await measureReserve(notes);
          reserveCache.set(cacheKey, reserve);
        }
        finalReserves[pageNumber] = reserve;
      }

      if (!isCurrent(token)) return false;
      await alignPageEdgeBaselines(article, viewport, finalReserves, token);
      if (!isCurrent(token)) return false;
      if (!(await normalizeLeadingEmptyPages(article, viewport, token)))
        return false;

      totalPages.value = getMeasuredPageCount(article, viewport);
      footnotesByPage.value = collect(article);
      footnoteReservesByPage.value = finalReserves;
      measuringFootnotes.value = [];
      completed = true;
      return true;
    } finally {
      if (!completed) rollback(article);
      takeMutationRecords();
      paginationDepth = Math.max(0, paginationDepth - 1);
    }
  };

  return {
    collectPageFootnotes: collect,
    isPaginating: () => paginationDepth > 0,
    paginatePageFootnotes: paginate,
    resetPaginationLayout,
    rollbackIncompleteFootnoteLayout: rollback,
  };
};
