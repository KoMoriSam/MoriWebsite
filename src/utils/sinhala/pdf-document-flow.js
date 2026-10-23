import { fmToUnicode } from "./converter.js";
import { joinPdfText } from "./pdf-text.js";
import {
  pdfDocumentContent,
  continuesPdfTable,
  mergePdfTables,
} from "./pdf-document-tables.js";

const ITEM_START = /^(?:[•●▪◦‣⁃]|\d{1,3}[.)、]?\s+|[A-Za-z][.)]\s+)/u;
const TERMINAL = /[.!?。！？෴﹒:：][”’"')\]）】]*$/u;

function style(paragraph) {
  const spans = paragraph.lines
    .flatMap((line) => line.spans)
    .filter((span) => span.text.trim());
  const weights = new Map();
  for (const span of spans) {
    const key = `${span.fontFamily}:${span.sizeHalfPoints}:${Boolean(span.bold)}:${Boolean(span.italic)}`;
    const entry = weights.get(key) || { span, weight: 0 };
    entry.weight += span.text.length;
    weights.set(key, entry);
  }
  return [...weights.values()].sort((a, b) => b.weight - a.weight)[0]?.span;
}

function compatibleText(previous, current) {
  const a = style(previous);
  const b = style(current);
  return (
    a &&
    b &&
    a.fontFamily === b.fontFamily &&
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.italic) === Boolean(b.italic) &&
    Math.abs(a.sizeHalfPoints - b.sizeHalfPoints) <= 1 &&
    ["left", "both"].includes(previous.alignment) &&
    ["left", "both"].includes(current.alignment) &&
    !/^H/u.test(current.structureRole || "") &&
    !ITEM_START.test(current.text.trim())
  );
}

function readableEnd(paragraph) {
  const font = style(paragraph);
  return /^FM/iu.test(font?.fontFamily || "")
    ? fmToUnicode(paragraph.text).trim()
    : paragraph.text.trim();
}

function lastLine(paragraph) {
  const line = paragraph.lines.at(-1);
  return (
    line.bounds || {
      x: paragraph.flowLeft,
      y: paragraph.y + paragraph.height - paragraph.leading,
      width: paragraph.textWidth ?? paragraph.width,
      height: paragraph.leading,
    }
  );
}

function mergeParagraphs(previous, current) {
  const lines = [...previous.lines, ...current.lines];
  const continued = lines
    .slice(1)
    .map((line) => line.bounds?.x)
    .filter(Number.isFinite);
  const flowLeft = continued.length
    ? Math.min(...continued)
    : previous.flowLeft;
  const firstLeft =
    previous.lines[0].bounds?.x ?? previous.flowLeft + previous.firstLineIndent;
  return {
    ...previous,
    lines,
    text: joinPdfText(previous.text, current.text),
    flowLeft,
    firstLineIndent: firstLeft - flowLeft,
    leading: Math.max(previous.leading, current.leading),
    alignment: current.alignment === "both" ? "both" : previous.alignment,
    textWidth: Math.max(
      previous.textWidth ?? previous.width,
      current.textWidth ?? current.width,
    ),
  };
}

function crossesPage(previous, current, previousPage, currentPage) {
  if (
    Math.abs(previousPage.width - currentPage.width) > 1 ||
    Math.abs(previousPage.height - currentPage.height) > 1 ||
    !compatibleText(previous, current)
  )
    return false;
  if (previous.structureId && previous.structureId === current.structureId)
    return true;
  const size = style(previous).sizeHalfPoints / 2;
  const end = lastLine(previous);
  const first = current.lines[0].bounds || {
    x: current.flowLeft + current.firstLineIndent,
    y: current.y,
  };
  const footer = previousPage.paragraphs.filter(
    (paragraph) =>
      paragraph.pageNumber?.position === "footer" ||
      paragraph.runningPosition === "footer",
  );
  const contentBottom = footer.length
    ? Math.min(...footer.map((paragraph) => paragraph.y))
    : previousPage.height - 36;
  if (
    end.y + end.height <
      contentBottom - Math.max(size * 5, previous.leading * 2) ||
    first.y > Math.min(108, currentPage.height * 0.16) ||
    Math.abs(first.x - end.x) > size * 0.8 ||
    current.firstLineIndent > size * 0.6
  )
    return false;
  const width =
    previousPage.width - (previousPage.margins?.right ?? 72) - end.x;
  const fullEnding = end.width >= width * 0.83;
  // A full line near the page bottom plus an unindented continuation is strong
  // evidence; a short, completed sentence is kept as a separate paragraph.
  return fullEnding && !TERMINAL.test(readableEnd(previous));
}

export function buildPdfDocumentFlow(pages, { preservePages = false } = {}) {
  const result = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const content = pdfDocumentContent(page);
    const blocks = [
      ...content.paragraphs
        .filter(
          (paragraph) => !paragraph.pageNumber && !paragraph.runningPosition,
        )
        .map((paragraph) => ({
          type: "text",
          paragraph,
          x: paragraph.x,
          y: paragraph.y,
          height: paragraph.height,
        })),
      ...content.tables.map((table) => ({
        type: "table",
        table,
        x: table.x,
        y: table.y,
        height: table.height,
      })),
      ...content.graphics.map((graphic) => ({
        type: "image",
        graphic,
        ...graphic,
      })),
    ].sort((a, b) => a.y - b.y || a.x - b.x);
    let bottom = Math.min(72, Math.max(0, blocks[0]?.y || 0));
    let first = true;
    for (const block of blocks) {
      const entry = {
        ...block,
        pageIndex,
        endPageIndex: pageIndex,
        before: Math.min(
          preservePages ? 24 : Infinity,
          Math.max(0, block.y - bottom),
        ),
        pageBreakBefore: first && pageIndex > 0,
      };
      // A paragraph occupies full line boxes in Word, not just the PDF glyph
      // bounds. Otherwise the extra line-box height is added again as spacing
      // before every following paragraph and gradually creates extra pages.
      const occupied =
        block.type === "text"
          ? Math.max(
              block.height,
              block.paragraph.leading * block.paragraph.lines.length,
            )
          : block.height;
      bottom = Math.max(
        bottom,
        block.y + occupied + (block.type === "table" ? 1 : 0),
      );
      const previous = result.at(-1);
      if (
        !preservePages &&
        first &&
        previous?.type === "table" &&
        entry.type === "table" &&
        previous.endPageIndex === pageIndex - 1 &&
        continuesPdfTable(previous.table, entry.table)
      ) {
        previous.table = mergePdfTables(previous.table, entry.table);
        previous.endPageIndex = pageIndex;
        first = false;
        continue;
      }
      let merge = false;
      if (previous?.type === "text" && entry.type === "text") {
        if (first && previous.endPageIndex === pageIndex - 1) {
          merge =
            !preservePages &&
            crossesPage(
              previous.paragraph,
              entry.paragraph,
              pages[previous.endPageIndex],
              page,
            );
        } else if (
          previous.endPageIndex === pageIndex &&
          compatibleText(previous.paragraph, entry.paragraph)
        ) {
          const end = lastLine(previous.paragraph);
          const size = style(previous.paragraph).sizeHalfPoints / 2;
          // Some Word PDFs encode indented, wrapped list descriptions as new
          // P tags. Rejoin only clear unfinished descriptions, not new items.
          merge =
            ITEM_START.test(previous.paragraph.text.trim()) &&
            /[-–—]/u.test(previous.paragraph.text) &&
            !TERMINAL.test(readableEnd(previous.paragraph)) &&
            entry.paragraph.flowLeft > previous.paragraph.x + size * 1.5 &&
            entry.y - end.y <= size * 2.9 &&
            entry.y >= end.y &&
            end.width >=
              (page.width - (page.margins?.right ?? 72) - end.x) * 0.8;
        }
      }
      if (merge) {
        previous.paragraph = mergeParagraphs(
          previous.paragraph,
          entry.paragraph,
        );
        previous.endPageIndex = pageIndex;
      } else result.push(entry);
      first = false;
    }
    if (!blocks.length)
      result.push({
        type: "blank",
        pageIndex,
        endPageIndex: pageIndex,
        pageBreakBefore: pageIndex > 0,
      });
  }
  return result;
}
