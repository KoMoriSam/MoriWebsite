import { joinPdfText } from "./pdf-text.js";

const NUMBER = String.raw`(?:\d{1,5}|[ivxlcdmIVXLCDM]{1,12})`;
const PAGE_NUMBER = new RegExp(
  String.raw`^(?<prefix>\s*(?:(?:page|p\.|පිටුව)\s*|第\s*)?[-–—(（\[]?\s*)(?<number>${NUMBER})(?<suffix>\s*(?:\/\s*\d{1,5}|of\s+\d{1,5}|页(?:\s*[,，/／]?\s*共\s*\d{1,5}\s*页)?)?\s*[-–—)）\]]?\s*)$`,
  "iu",
);
const romanValues = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanNumber(number) {
  let text = "";
  for (const [value, symbol] of [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ]) {
    while (number >= value) {
      text += symbol;
      number -= value;
    }
  }
  return text;
}

function parsePageNumber(text) {
  // Normalize common decimal digits without mistaking arbitrary footnote text
  // or dates for pagination. NFKC also handles full-width and Roman numerals.
  const normalized = text
    .normalize("NFKC")
    .replace(/[٠-٩۰-۹෦-෯०-९]/gu, (digit) => {
      const point = digit.codePointAt(0);
      const zero = [0x660, 0x6f0, 0xde6, 0x966].find(
        (start) => point >= start && point <= start + 9,
      );
      return String(point - zero);
    });
  const match = PAGE_NUMBER.exec(normalized);
  if (!match) return null;
  const { prefix, number: label, suffix } = match.groups;
  let number = Number(label);
  const roman = Number.isNaN(number);
  if (roman) {
    const letters = label.toUpperCase();
    number = [...letters].reduce(
      (sum, letter, index) =>
        sum +
        (romanValues[letter] < (romanValues[letters[index + 1]] || 0)
          ? -1
          : 1) *
          romanValues[letter],
      0,
    );
    if (number < 1 || number > 3999 || romanNumber(number) !== letters)
      return null;
  }
  if (number < 1) return null;
  return {
    number,
    label,
    prefix,
    suffix,
    format: roman
      ? label === label.toLowerCase()
        ? "lowerRoman"
        : "upperRoman"
      : "decimal",
    explicit: /page|p\.|පිටුව|第|页|\/|\bof\b/iu.test(prefix + suffix),
  };
}

function fontSize(paragraph) {
  const spans = paragraph.lines.flatMap((line) => line.spans);
  const total = spans.reduce((sum, span) => sum + span.text.length, 0);
  return total
    ? spans.reduce(
        (sum, span) => sum + (span.sizeHalfPoints / 2) * span.text.length,
        0,
      ) / total
    : 12;
}

function pageNumberCandidate(paragraph, page, index) {
  if (paragraph.tableCell) return null;
  if (
    paragraph.lines.length !== 1 ||
    paragraph.textDirection !== "lrTb" ||
    fontSize(paragraph) > 14
  )
    return null;
  const parsed = parsePageNumber(paragraph.text);
  if (!parsed || (paragraph.textWidth ?? paragraph.width) > page.width * 0.4)
    return null;
  const band = Math.min(72, page.height * 0.12);
  const position =
    paragraph.y < band
      ? "header"
      : paragraph.y + paragraph.height > page.height - band
        ? "footer"
        : null;
  if (!position) return null;
  // A detached margin label is plausible; a number adjacent to a body line is
  // more likely a list item, formula, or footnote reference.
  const separation = Math.min(
    Infinity,
    ...page.paragraphs
      .filter((other) => other !== paragraph)
      .map((other) =>
        position === "footer"
          ? paragraph.y - (other.y + other.height)
          : other.y - (paragraph.y + paragraph.height),
      )
      .filter((gap) => gap >= 0),
  );
  const sameLine = page.paragraphs.some(
    (other) =>
      other !== paragraph &&
      Math.abs(other.y - paragraph.y) < fontSize(paragraph) * 0.7 &&
      !parsePageNumber(other.text) &&
      (other.textWidth ?? other.width) > page.width * 0.3,
  );
  if (separation < fontSize(paragraph) * 0.7) return null;
  const center =
    (paragraph.flowLeft ?? paragraph.x) +
    (paragraph.textWidth ?? paragraph.width) / 2;
  const alignment =
    Math.abs(center - page.width / 2) < page.width * 0.08
      ? "center"
      : center > page.width * 0.65
        ? "right"
        : "left";
  return {
    ...parsed,
    position,
    index,
    paragraph,
    alignment,
    sameLine,
    edge:
      position === "footer"
        ? (page.height - paragraph.y - paragraph.height) / page.height
        : paragraph.y / page.height,
  };
}

export function detectPdfPageNumbers(pages) {
  const candidates = pages.flatMap((page, index) =>
    page.paragraphs
      .map((paragraph) => pageNumberCandidate(paragraph, page, index))
      .filter(Boolean),
  );
  const accepted = new Map();
  for (const candidate of candidates) {
    const sequence = candidates.some(
      (other) =>
        other.index !== candidate.index &&
        other.position === candidate.position &&
        other.format === candidate.format &&
        Math.abs(other.edge - candidate.edge) < 0.035 &&
        other.number - candidate.number === other.index - candidate.index,
    );
    const singlePageNumber =
      !candidate.sameLine &&
      candidate.number === candidate.index + 1 &&
      candidate.edge < 0.065 &&
      fontSize(candidate.paragraph) <= 12;
    if (candidate.explicit || sequence || singlePageNumber) {
      const {
        paragraph,
        index,
        edge,
        explicit,
        sameLine,
        alignment,
        ...pageNumber
      } = candidate;
      accepted.set(paragraph, { pageNumber, alignment });
    }
  }
  return pages.map((page) => ({
    ...page,
    paragraphs: page.paragraphs.map((paragraph) => {
      const { pageNumber: previous, ...content } = paragraph;
      return accepted.has(paragraph)
        ? { ...content, ...accepted.get(paragraph) }
        : content;
    }),
  }));
}

function marginPosition(paragraph, page) {
  if (paragraph.tableCell) return null;
  const band = Math.min(72, page.height * 0.12);
  if (paragraph.y < band && paragraph.y + paragraph.height <= band * 1.5)
    return "header";
  if (
    paragraph.y > page.height - band * 1.5 &&
    paragraph.y + paragraph.height > page.height - band
  )
    return "footer";
  return null;
}

function paragraphSlice(paragraph, start, end, page) {
  const lines = paragraph.lines.slice(start, end);
  const left = Math.min(...lines.map((line) => line.bounds.x));
  const right = Math.max(
    ...lines.map((line) => line.bounds.x + line.bounds.width),
  );
  const top = Math.min(...lines.map((line) => line.bounds.y));
  const bottom = Math.max(
    ...lines.map((line) => line.bounds.y + line.bounds.height),
  );
  const flowLeft =
    lines.length > 1
      ? Math.min(...lines.slice(1).map((line) => line.bounds.x))
      : left;
  const centered =
    lines.length === 1 &&
    Math.abs((left + right) / 2 - page.width / 2) < fontSize(paragraph) * 0.7;
  const { pageNumber, runningPosition, ...source } = paragraph;
  return {
    ...source,
    lines,
    text: lines
      .map((line) => line.text ?? line.spans.map((span) => span.text).join(""))
      .reduce(joinPdfText, ""),
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    textWidth: right - left,
    flowLeft,
    firstLineIndent: lines[0].bounds.x - flowLeft,
    alignment: centered
      ? "center"
      : paragraph.alignment === "both" && lines.length > 1
        ? "both"
        : "left",
  };
}

function repeatedMarginText(pages) {
  const normalize = (text) =>
    text.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase();
  const continuesIntoBody = (paragraph, page) => {
    const visited = new Set([paragraph]);
    const queue = [paragraph];
    const font = (part) =>
      part.lines.flatMap((line) => line.spans).find((span) => span.text.trim());
    for (const current of queue) {
      if (!marginPosition(current, page)) return true;
      const currentFont = font(current);
      for (const other of page.paragraphs) {
        if (
          visited.has(other) ||
          other.pageNumber ||
          Math.abs(fontSize(current) - fontSize(other)) > 0.8
        )
          continue;
        const otherFont = font(other);
        if (
          !currentFont ||
          !otherFont ||
          ["fontFamily", "bold", "italic"].some(
            (key) => currentFont[key] !== otherFont[key],
          )
        )
          continue;
        const gap =
          other.y > current.y
            ? other.y - current.y - current.height
            : current.y - other.y - other.height;
        const overlap =
          Math.min(other.x + other.width, current.x + current.width) -
          Math.max(other.x, current.x);
        if (
          gap >= -fontSize(current) * 0.2 &&
          gap <= fontSize(current) * 0.6 &&
          overlap > 0
        ) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
    return false;
  };
  const candidates = pages.flatMap((page, index) =>
    page.paragraphs.flatMap((paragraph, paragraphIndex) => {
      if (
        paragraph.pageNumber ||
        paragraph.lines.length > 3 ||
        paragraph.textDirection !== "lrTb" ||
        paragraph.text.length > 180 ||
        !/\p{L}/u.test(paragraph.text) ||
        fontSize(paragraph) > 16
      )
        return [];
      const position = marginPosition(paragraph, page);
      if (!position || continuesIntoBody(paragraph, page)) return [];
      const text = normalize(paragraph.text);
      // A running title can share its line with a page number ("Title | 3").
      // Only treat the suffix as a field if its sequence agrees across pages.
      const suffix = new RegExp(
        String.raw`^(.*\p{L}.*?[\s|·•—–:\-]+)(${NUMBER})(\s*(?:/\s*\d{1,5})?\s*)$`,
        "iu",
      ).exec(paragraph.text);
      const number = suffix ? parsePageNumber(suffix[2] + suffix[3]) : null;
      if (number) number.prefix = suffix[1];
      return [
        {
          index,
          paragraphIndex,
          paragraph,
          position,
          text,
          number,
          template: number
            ? normalize(number.prefix) + "#" + normalize(number.suffix)
            : null,
          edge:
            (position === "header"
              ? paragraph.y
              : page.height - paragraph.y - paragraph.height) / page.height,
          left: (paragraph.flowLeft ?? paragraph.x) / page.width,
        },
      ];
    }),
  );
  const accepted = new Map();
  for (const candidate of candidates) {
    const peers = candidates.filter(
      (other) =>
        other.index !== candidate.index &&
        other.position === candidate.position &&
        Math.abs(other.edge - candidate.edge) < 0.025 &&
        Math.abs(other.left - candidate.left) < 0.06 &&
        Math.abs(fontSize(other.paragraph) - fontSize(candidate.paragraph)) < 2,
    );
    const sequence =
      candidate.number &&
      peers.some(
        (other) =>
          other.number &&
          other.template === candidate.template &&
          other.number.format === candidate.number.format &&
          other.number.number - candidate.number.number ===
            other.index - candidate.index,
      );
    if (sequence || peers.some((other) => other.text === candidate.text)) {
      accepted.set(`${candidate.index}:${candidate.paragraphIndex}`, {
        runningPosition: candidate.position,
        ...(sequence
          ? {
              pageNumber: { ...candidate.number, position: candidate.position },
            }
          : {}),
      });
    }
  }
  return pages.map((page, index) => ({
    ...page,
    paragraphs: page.paragraphs.map((paragraph, paragraphIndex) => {
      const { runningPosition, ...content } = paragraph;
      return { ...content, ...accepted.get(`${index}:${paragraphIndex}`) };
    }),
  }));
}

export function detectPdfPageFurniture(pages) {
  const ranges = [];
  const expanded = pages.map((page, index) => {
    ranges[index] = [];
    const paragraphs = page.paragraphs.flatMap((paragraph) => {
      const split =
        paragraph.lines.length > 1 &&
        paragraph.textDirection === "lrTb" &&
        paragraph.lines.every((line) => line.bounds) &&
        paragraph.lines.some((_, line) =>
          marginPosition(paragraphSlice(paragraph, line, line + 1, page), page),
        );
      const slices = split
        ? paragraph.lines.map((_, line) =>
            paragraphSlice(paragraph, line, line + 1, page),
          )
        : [paragraph];
      ranges[index].push({ paragraph, count: slices.length, split });
      return slices;
    });
    return { ...page, paragraphs };
  });
  const detected = repeatedMarginText(detectPdfPageNumbers(expanded));
  return detected.map((page, index) => {
    let cursor = 0;
    const paragraphs = ranges[index].flatMap(({ paragraph, count, split }) => {
      const slices = page.paragraphs.slice(cursor, (cursor += count));
      if (!split) return slices;
      const furniture = (part) => part.pageNumber || part.runningPosition;
      if (!slices.some(furniture)) {
        const { pageNumber, runningPosition, ...content } = paragraph;
        return [content];
      }
      const result = [];
      for (let start = 0; start < slices.length; ) {
        if (furniture(slices[start])) result.push(slices[start++]);
        else {
          let end = start + 1;
          while (end < slices.length && !furniture(slices[end])) end++;
          result.push(paragraphSlice(paragraph, start, end, page));
          start = end;
        }
      }
      return result;
    });
    return { ...page, paragraphs };
  });
}

function slideScore(page) {
  const paragraphs = page.paragraphs.filter(
    (paragraph) => !paragraph.pageNumber && !paragraph.runningPosition,
  );
  const lines = paragraphs.flatMap((paragraph) => paragraph.lines);
  if (!lines.length) return null;
  const characters = paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.text.length,
    0,
  );
  const prose =
    paragraphs
      .filter((paragraph) => paragraph.lines.length >= 3)
      .reduce((sum, paragraph) => sum + paragraph.text.length, 0) /
    Math.max(1, characters);
  const sizes = paragraphs
    .map((paragraph) => ({
      size: fontSize(paragraph),
      weight: paragraph.text.length,
    }))
    .sort((a, b) => a.size - b.size);
  let weight = characters / 2;
  const bodySize =
    sizes.find((entry) => (weight -= entry.weight) <= 0)?.size || 12;
  const ratio = page.width / page.height;
  let score = ratio >= 1.5 ? 2.2 : ratio >= 1.2 ? 0.8 : ratio < 0.9 ? -0.8 : 0;
  if (bodySize >= 18) score += 1.6;
  else if (bodySize >= 15) score += 0.8;
  if (characters < 600 && lines.length < 16) score += 0.6;
  if (
    paragraphs.length >= 3 &&
    lines.length < 16 &&
    characters / lines.length < 55
  )
    score += 0.8;
  if (characters > 1400 || (lines.length > 22 && bodySize < 15)) score -= 3;
  if (prose > 0.65 && lines.length >= 12 && bodySize < 16) score -= 2.5;
  return score;
}

export function analyzePdfDocument(pages) {
  const analyzed = detectPdfPageFurniture(pages);
  const scores = analyzed
    .map(slideScore)
    .filter((score) => score !== null)
    .sort((a, b) => a - b);
  // A landscape report or an illustrated cover alone must not turn a prose
  // document into a deck. Prefer DOCX unless most nonblank pages agree.
  const slides = scores.filter((score) => score >= 1.8).length;
  const format =
    scores.length &&
    slides / scores.length >= 0.6 &&
    scores[Math.floor(scores.length / 2)] >= 1.8
      ? "pptx"
      : "docx";
  return { pages: analyzed, format };
}
