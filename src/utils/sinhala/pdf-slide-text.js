import { pdfSlideTextShape } from "./pdf-slide-shape-text.js";

const symbolFont = (span) =>
  /^(?:Wingdings|Webdings|Symbol)/iu.test(span.fontFamily);
const fontSize = (line) =>
  Math.max(
    ...line.spans
      .filter((span) => span.text.trim())
      .map((span) => span.sizePoints ?? span.sizeHalfPoints / 2),
    1,
  );
const linesOf = (block) =>
  block.paragraphs.flatMap((paragraph) => paragraph.lines);
const firstLine = (block) => linesOf(block)[0];
const lastLine = (block) => linesOf(block).at(-1);
const bullet = (paragraph) =>
  symbolFont(paragraph.lines[0].spans.find((span) => span.text.trim()) || {});

export function slideParagraphAlignment(paragraph, pageWidth) {
  const bounds = paragraph.lines.map((line) => line.bounds);
  if (bounds.some((bound) => !bound)) return paragraph.alignment;
  const tolerance = fontSize(paragraph.lines[0]) * 0.3;
  const spread = (values) => Math.max(...values) - Math.min(...values);
  if (bounds.length > 1) {
    if (spread(bounds.map((line) => line.x)) < tolerance) return "left";
    if (spread(bounds.map((line) => line.x + line.width / 2)) < tolerance)
      return "center";
    if (spread(bounds.map((line) => line.x + line.width)) < tolerance)
      return "right";
    return "left";
  }
  return Math.abs(bounds[0].x + bounds[0].width / 2 - pageWidth / 2) <
    tolerance * 2
    ? "center"
    : paragraph.alignment === "right"
      ? "right"
      : "left";
}

function canMerge(previous, current, page, native) {
  if ([...linesOf(previous), ...linesOf(current)].some((line) => !line.bounds))
    return false;
  const a = lastLine(previous),
    b = firstLine(current);
  if (
    !a.bounds ||
    !b.bounds ||
    previous.figureId !== current.figureId ||
    previous.slot !== current.slot ||
    previous.shapeIndex !== current.shapeIndex
  )
    return false;
  const size = Math.max(fontSize(a), fontSize(b));
  const gap = b.bounds.y - a.bounds.y;
  if (gap < size * 0.45 || gap > size * (native ? 4 : 2.8)) return false;
  const left = Math.min(...linesOf(previous).map((line) => line.bounds.x));
  const right = Math.max(
    ...linesOf(previous).map((line) => line.bounds.x + line.bounds.width),
  );
  if (
    Math.min(right, b.bounds.x + b.bounds.width) <= Math.max(left, b.bounds.x)
  )
    return false;
  if (native) return true;
  const p = previous.paragraphs.at(-1),
    q = current.paragraphs[0];
  if (
    Boolean(p.pageNumber || p.runningPosition) ||
    Boolean(q.pageNumber || q.runningPosition) ||
    bullet(p) !== bullet(q) ||
    Math.max(fontSize(a), fontSize(b)) / Math.min(fontSize(a), fontSize(b)) >
      1.35 ||
    Math.abs(left - b.bounds.x) > size * 1.5
  )
    return false;
  if (
    (page.graphics || []).some(
      (graphic) =>
        graphic.y > a.bounds.y + size * 0.5 &&
        graphic.y < b.bounds.y &&
        graphic.x < Math.max(right, b.bounds.x + b.bounds.width) &&
        graphic.x + graphic.width > Math.min(left, b.bounds.x),
    )
  )
    return false;
  const prose = (paragraph) =>
    paragraph.lines.length > 1 ||
    paragraph.text.length >= 35 ||
    /^\d{1,3}[.)&、]/u.test(paragraph.text.trim());
  return (
    bullet(p) ||
    prose(p) ||
    prose(q) ||
    (Math.abs(left - b.bounds.x) < 2 && gap <= size * 1.3)
  );
}

// Recover editable slide text areas, rather than grouping separately positioned
// line shapes. Native PDF containers take priority; nearby prose/list paragraphs
// can share a frame when columns, figure ownership and artwork order agree.
export function pdfSlideTextBlocks(page) {
  const nativeBlocks = [];
  const layers = page.artworkLayers || [];
  for (const paragraph of page.paragraphs) {
    let part;
    for (const line of paragraph.lines) {
      const slot = layers.filter(
        (layer) => layer.paintOrder < (line.paintOrder ?? Infinity),
      ).length;
      const shapeIndex = pdfSlideTextShape(line, page);
      if (!part || part.slot !== slot || part.shapeIndex !== shapeIndex) {
        part = {
          slot,
          shapeIndex,
          figureId: paragraph.figureId,
          textBoxId: paragraph.textBoxId,
          paragraphs: [{ ...paragraph, lines: [] }],
        };
        nativeBlocks.push(part);
      }
      part.paragraphs[0].lines.push(line);
    }
  }
  const containers = [];
  for (const block of nativeBlocks) {
    const previous =
      block.textBoxId &&
      containers.findLast(
        (candidate) =>
          candidate.textBoxId === block.textBoxId &&
          canMerge(candidate, block, page, true),
      );
    if (previous) previous.paragraphs.push(...block.paragraphs);
    else containers.push(block);
  }
  const result = [];
  for (const block of containers.sort(
    (a, b) =>
      (firstLine(a).bounds?.y ?? a.paragraphs[0].y) -
      (firstLine(b).bounds?.y ?? b.paragraphs[0].y),
  )) {
    const previous = result
      .filter((candidate) => canMerge(candidate, block, page, false))
      .sort((a, b) => lastLine(b).bounds.y - lastLine(a).bounds.y)[0];
    if (previous) previous.paragraphs.push(...block.paragraphs);
    else result.push(block);
  }
  return result;
}
