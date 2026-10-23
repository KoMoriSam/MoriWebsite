const LIST_START = /^(?:[•●▪◦‣⁃]|\p{N}+[.)、]|[A-Za-z][.)]|[-–—])\s+/u;
const CJK_END = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u;
const CJK_START =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，。！？；：、）》」』】]/u;

export function pdfTextSize([a, b, c, d]) {
  // A synthetic italic shear changes the vertical vector's length, but not
  // the font size perpendicular to its baseline.
  return Math.abs(a * d - b * c) / (Math.hypot(a, b) || 1);
}

export function joinPdfText(left, right) {
  if (!left || !right || /\s$/u.test(left) || /^\s/u.test(right))
    return left + right;
  return (
    left + (CJK_END.test(left) && CJK_START.test(right) ? "" : " ") + right
  );
}

function textLines(items) {
  const lines = [];
  let line = null;
  const flush = () => {
    if (line?.text.trim()) {
      // A superscript or inline emphasis must not set the whole line's size.
      const sizes = line.spans
        .filter((span) => span.str.trim())
        .map((span) => ({
          size: pdfTextSize(span.transform) || line.height,
          weight: span.str.trim().length,
        }))
        .sort((a, b) => a.size - b.size);
      let weight = sizes.reduce((sum, span) => sum + span.weight, 0) / 2;
      line.height =
        sizes.find((span) => (weight -= span.weight) <= 0)?.size || line.height;
      lines.push({ ...line, text: line.text.trim() });
    }
    line = null;
  };
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    if (!item.str.trim()) {
      // Empty PDF.js EOL markers are not blank paragraphs. Actual blank lines
      // are detected from baseline distances; retain only inline spaces here.
      if (!item.hasEOL && line) {
        line.text += item.str;
        line.spans.push({ ...item });
      }
      continue;
    }
    const [a, b, , , x, y] = item.transform;
    const angle = Math.atan2(b, a);
    const left = x * Math.cos(angle) + y * Math.sin(angle);
    const baseline = -x * Math.sin(angle) + y * Math.cos(angle);
    const height = pdfTextSize(item.transform) || item.height || 12;
    const right = left + item.width;
    const sameTaggedParagraph =
      item.paragraphId && item.paragraphId === line?.paragraphId;
    if (
      line &&
      (Math.abs(baseline - line.baseline) >
        Math.max(height, line.height) * 0.45 ||
        Math.abs(angle - line.angle) > 0.05 ||
        (!sameTaggedParagraph && left - line.right > height * 3) ||
        left < line.left - height ||
        (item.paintGroup !== undefined &&
          line.paintGroup !== undefined &&
          item.paintGroup !== line.paintGroup) ||
        (item.paragraphId &&
          line.paragraphId &&
          item.paragraphId !== line.paragraphId))
    )
      flush();
    if (!line) {
      line = {
        text: item.str,
        left,
        right,
        baseline,
        height,
        angle,
        paragraphId: item.paragraphId,
        structureRole: item.structureRole,
        tableCell: item.tableCell,
        textBoxId: item.textBoxId,
        figureId: item.figureId,
        paintGroup: item.paintGroup,
        artifact: item.artifact,
        spans: [{ ...item }],
      };
    } else {
      const tab =
        !item.noSpaceBefore &&
        sameTaggedParagraph &&
        left - line.right > height;
      // Some PDFs omit spaces between separately positioned words.
      const combined =
        !item.noSpaceBefore && left - line.right > height * 0.12
          ? joinPdfText(line.text, item.str)
          : line.text + item.str;
      const separator = combined.slice(
        line.text.length,
        combined.length - item.str.length,
      );
      line.text = combined;
      line.left = Math.min(line.left, left);
      line.right = Math.max(line.right, right);
      line.height = Math.max(line.height, height);
      line.spans.push({
        ...item,
        str: separator + item.str,
        separator,
        tabStop: tab ? left : undefined,
      });
    }
  }
  flush();
  return lines;
}

function overlap(left, right) {
  return Math.min(left.right, right.right) - Math.max(left.left, right.left);
}

function lineSpacing(lines) {
  const gaps = [];
  for (let index = 1; index < lines.length; index++) {
    const previous = lines[index - 1];
    const current = lines[index];
    const gap =
      (previous.baseline - current.baseline) /
      Math.max(previous.height, current.height);
    if (
      gap >= 0.7 &&
      gap <= 3 &&
      overlap(previous, current) > 0 &&
      Math.abs(previous.angle - current.angle) < 0.05
    )
      gaps.push(gap);
  }
  gaps.sort((left, right) => left - right);
  // The lower half avoids treating extra paragraph spacing as normal leading.
  const spacing = gaps.length
    ? gaps[Math.floor((gaps.length - 1) * 0.35)]
    : 1.2;
  return gaps.length < 3 && spacing > 1.8 ? 1.2 : spacing;
}

function endsShort(lines, index) {
  const previous = lines[index - 1];
  let right = previous.right;
  for (
    let neighbor = Math.max(0, index - 4);
    neighbor < Math.min(lines.length, index + 4);
    neighbor++
  ) {
    const line = lines[neighbor];
    if (
      Math.abs(line.left - previous.left) <= previous.height * 3 &&
      Math.abs(line.height - previous.height) <= previous.height * 0.15 &&
      Math.abs(line.angle - previous.angle) < 0.05
    )
      right = Math.max(right, line.right);
  }
  return (
    right - previous.right > previous.height * 2 &&
    previous.right - previous.left < (right - previous.left) * 0.85
  );
}

export function extractPdfParagraphs(items) {
  const lines = textLines(items);
  const spacing = lineSpacing(lines);
  const paragraphs = [];
  let paragraph = null;
  let paragraphLines = 0;
  for (let index = 0; index < lines.length; index++) {
    const current = lines[index];
    const previous = lines[index - 1];
    let startsParagraph = !previous;
    if (previous) {
      const height = Math.max(previous.height, current.height);
      const gap = (previous.baseline - current.baseline) / height;
      const indent = current.left - previous.left;
      const bodyLeft = Math.min(...paragraph.lines.map((line) => line.left));
      const hangingList =
        paragraphLines === 1 &&
        LIST_START.test(previous.text) &&
        indent >= 0 &&
        indent <= height * 4;
      const sizeChange =
        Math.abs(previous.height - current.height) > height * 0.25;
      const terminal = /[.!?。！？෴][”’"')\]）】]*$/u.test(previous.text);
      const shortEnding = terminal && endsShort(lines, index);
      // Short PDF lines and minor shifts alone are not paragraph boundaries.
      // Require an actual paragraph gap, a new first-line indent, a heading,
      // list marker, column change, or several agreeing boundary signals.
      startsParagraph =
        Math.abs(current.angle - previous.angle) > 0.05 ||
        gap < 0.5 ||
        gap > Math.max(spacing * 1.45, spacing + 0.4) ||
        overlap(previous, current) <= 0 ||
        (sizeChange &&
          (gap > spacing * 1.1 ||
            shortEnding ||
            previous.height > current.height * 1.3)) ||
        LIST_START.test(current.text) ||
        (!hangingList &&
          ((current.left > bodyLeft + height * 0.8 &&
            indent > height * 0.8 &&
            (paragraphLines > 1 || shortEnding)) ||
            indent < -height * 4 ||
            (shortEnding && gap > spacing * 1.15)));
      if (current.paragraphId && previous.paragraphId) {
        startsParagraph = current.paragraphId !== previous.paragraphId;
      } else if (Boolean(current.artifact) !== Boolean(previous.artifact))
        startsParagraph = true;
    }
    if (startsParagraph) {
      if (paragraph) paragraphs.push(paragraph);
      paragraph = { text: current.text, lines: [current] };
      paragraphLines = 1;
    } else {
      paragraph.text = joinPdfText(paragraph.text, current.text);
      paragraph.lines.push(current);
      paragraphLines++;
    }
  }
  if (paragraph) paragraphs.push(paragraph);
  return paragraphs;
}

export function extractPdfText(items) {
  return extractPdfParagraphs(items)
    .map(({ text }) => text)
    .join("\n");
}
