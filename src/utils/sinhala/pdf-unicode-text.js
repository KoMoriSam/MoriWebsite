const FONT_MAPS = new WeakMap();
const SINHALA = /[\u0D80-\u0DFF]/u;
const CONSONANTS = "[\\u0D9A-\\u0DC6]";
const CLUSTER = new RegExp(
  `^((?:ර්‍)?${CONSONANTS}(?:්[‍‌]?${CONSONANTS})*)`,
  "u",
);
const REPHA = new RegExp(`^(${CONSONANTS}.*?)ර්‍`, "u");
const normalize = (text) => text.normalize("NFKC").replace(/\s/gu, "");

function logicalGlyphs(glyphs) {
  for (const glyph of glyphs) glyph.text = glyph.text.replace(REPHA, "ර්‍$1");
  for (let index = 0; index < glyphs.length - 1; index++) {
    const mark = glyphs[index];
    if (!/^[ෙෛ]$/u.test(mark.text)) continue;
    const next = glyphs[index + 1];
    if (!CLUSTER.test(next.text)) continue;
    // Rakaransaya/yansaya may themselves be separate painted glyphs.
    let following = index + 2;
    for (
      ;
      following < glyphs.length &&
      /^්[‍‌][\u0D9A-\u0DC6]/u.test(glyphs[following].text);
      following++
    ) {
      next.text += glyphs[following].text;
      glyphs[following].text = "";
    }
    // Some fonts map a right-hand component to the complete split vowel.
    // Resolve this before distributing characters back into PDF text items.
    const suffix =
      next.text.slice(next.text.match(CLUSTER)[1].length) ||
      glyphs[following]?.text ||
      "";
    if (!(mark.text === "ෙ" && /^[ේොෝෞ]/u.test(suffix))) {
      next.text = next.text.replace(CLUSTER, `$1${mark.text}`);
    }
    mark.text = "";
  }
  let previous;
  for (const glyph of glyphs) {
    if (!glyph.text) continue;
    if (
      /^[\u0DCA\u0DCF-\u0DDF\u0DF2\u0DF3]+$/u.test(glyph.text) &&
      SINHALA.test(previous?.text || "") &&
      !/\s$/u.test(previous.text)
    ) {
      previous.text = (previous.text + glyph.text).normalize("NFC");
      previous.width += glyph.width;
      previous.adjustment =
        (previous.adjustment || 0) + (glyph.adjustment || 0);
      glyph.text = "";
      glyph.width = 0;
      glyph.adjustment = 0;
    } else {
      glyph.text = glyph.text.normalize("NFC");
      previous = glyph;
    }
  }
}

function textRuns(item, glyphs, start, broken) {
  const styles = [];
  for (const run of item.inlineStyles || []) {
    for (const character of normalize(run.text))
      styles.push({ bold: run.bold, color: run.color });
  }
  const runs = [];
  for (const glyph of glyphs) {
    const style = styles[Math.max(0, glyph.start - start)] || {
      bold: item.bold,
      color: item.color,
    };
    const previous = runs.at(-1);
    if (
      previous &&
      previous.bold === style.bold &&
      previous.color === style.color
    ) {
      previous.text += glyph.text;
      previous.advance += glyph.width;
    } else runs.push({ ...style, text: glyph.text, advance: glyph.width });
  }
  for (const run of runs) {
    if (broken) run.text = run.text.replace(/ෙ([ේොෝෞ])/gu, "$1");
    run.text = run.text.normalize("NFC");
  }
  return runs;
}

// Keep PDF.js geometry/structure, but recover text from the actual painted
// glyphs where a producer supplied a demonstrably incorrect ToUnicode map.
export async function repairPdfUnicodeText(page, content, operators, OPS) {
  const candidates = new Set(
    content.items
      .filter((item) => SINHALA.test(item.str || ""))
      .map((item) => item.fontName),
  );
  if (!candidates.size) return content.items;
  const dependencies = new Set(
    operators.fnArray.flatMap((op, index) =>
      op === OPS.dependency ? operators.argsArray[index] : [],
    ),
  );
  const maps = new Map();
  for (const id of candidates) {
    maps.set(id, new Map());
    if (!dependencies.has(id)) continue;
    const font = await new Promise((resolve) =>
      page.commonObjs.get(id, resolve),
    );
    if (!font?.data) continue;
    if (!FONT_MAPS.has(font)) {
      const { sinhalaGlyphMap } = await import("./pdf-unicode-fonts.js");
      FONT_MAPS.set(font, sinhalaGlyphMap(font.data));
    }
    const map = FONT_MAPS.get(font);
    maps.set(id, map);
  }
  if (!maps.size) return content.items;
  const operations = new Set([
    OPS.showText,
    OPS.showSpacedText,
    OPS.nextLineShowText,
    OPS.nextLineSetSpacingShowText,
  ]);
  const streams = new Map();
  let font;
  const stack = [];
  for (let index = 0; index < operators.fnArray.length; index++) {
    const operation = operators.fnArray[index];
    const args = operators.argsArray[index];
    if (operation === OPS.save) stack.push(font);
    else if (operation === OPS.restore) font = stack.pop();
    else if (operation === OPS.setFont) font = args[0];
    else if (operations.has(operation) && maps.has(font)) {
      if (!streams.has(font))
        streams.set(font, {
          source: "",
          glyphs: [],
          broken: false,
          cursor: 0,
          glyphCursor: 0,
        });
      const stream = streams.get(font);
      for (const glyph of args.find(Array.isArray) || []) {
        if (typeof glyph === "number") {
          const previous = stream.glyphs.at(-1);
          if (previous)
            previous.adjustment = (previous.adjustment || 0) + glyph;
          continue;
        }
        if (!glyph || typeof glyph !== "object") continue;
        const source = normalize(glyph.unicode || "");
        const mapped = maps.get(font).get(glyph.fontChar?.codePointAt(0));
        if (
          mapped &&
          mapped.normalize("NFC") !== (glyph.unicode || "").normalize("NFC")
        ) {
          stream.broken = true;
        }
        stream.glyphs.push({
          start: stream.source.length,
          end: stream.source.length + source.length,
          text: glyph.unicode || "",
          mapped,
          width: glyph.width || 0,
          operation: index,
        });
        stream.source += source;
      }
    }
  }
  for (const stream of streams.values()) {
    if (stream.broken) {
      for (const glyph of stream.glyphs)
        glyph.text = glyph.mapped || glyph.text;
    }
    for (let index = 0; index < stream.glyphs.length; index++) {
      const glyph = stream.glyphs[index];
      // Word exports some unsupported joiners as a space immediately undone
      // by TJ. It has no word-space advance and must not split the syllable.
      if (
        glyph.text === " " &&
        glyph.adjustment &&
        Math.abs(glyph.width - glyph.adjustment) < 8
      ) {
        glyph.text =
          /්$/u.test(stream.glyphs[index - 1]?.text || "") &&
          /^[\u0D9A-\u0DC6]/u.test(stream.glyphs[index + 1]?.text || "")
            ? "‍"
            : "";
      }
    }
    if (stream.broken) logicalGlyphs(stream.glyphs);
  }
  // If PDF.js reordered or substituted a run in a way we cannot align, keep
  // that font's original items rather than applying only part of a repair.
  for (const [id, stream] of streams) {
    let cursor = 0;
    for (const item of content.items) {
      if (item.fontName !== id || !item.str?.trim()) continue;
      const value = normalize(item.str);
      const start = stream.source.indexOf(value, cursor);
      if (start < 0) {
        stream.unaligned = true;
        break;
      }
      cursor = start + value.length;
    }
  }
  const nextFonts = [];
  let nextFont;
  for (let index = content.items.length - 1; index >= 0; index--) {
    nextFonts[index] = nextFont;
    if (content.items[index].str?.trim())
      nextFont = content.items[index].fontName;
  }
  return content.items.map((item, itemIndex) => {
    const stream = streams.get(item.fontName);
    if (!stream || stream.unaligned || typeof item.str !== "string")
      return item;
    if (!item.str.trim()) {
      // Retain genuine spaces at a font boundary (e.g. Sinhala/Latin/CJK).
      if (item.str && !item.hasEOL && nextFonts[itemIndex] !== item.fontName) {
        const glyph = stream.glyphs[stream.glyphCursor];
        if (
          glyph?.start === stream.cursor &&
          glyph.end === stream.cursor &&
          /^\s+$/u.test(glyph.text)
        ) {
          stream.glyphCursor++;
        }
        return item;
      }
      return { ...item, str: "", width: 0 };
    }
    const value = normalize(item.str);
    const start = stream.source.indexOf(value, stream.cursor);
    if (!value || start < 0) return item;
    const end = start + value.length;
    const selected = [];
    while (
      stream.glyphCursor < stream.glyphs.length &&
      stream.glyphs[stream.glyphCursor].start < end
    ) {
      selected.push(stream.glyphs[stream.glyphCursor++]);
    }
    // A real consonant can itself have been incorrectly mapped to a space,
    // including at the end of a run where no later character can anchor it.
    while (
      stream.glyphs[stream.glyphCursor]?.start === end &&
      stream.glyphs[stream.glyphCursor].end === end &&
      stream.glyphs[stream.glyphCursor].operation ===
        selected.at(-1)?.operation &&
      stream.glyphs[stream.glyphCursor].mapped &&
      stream.glyphs[stream.glyphCursor].text.trim()
    ) {
      selected.push(stream.glyphs[stream.glyphCursor++]);
    }
    if (!selected.length) return { ...item, str: "", width: 0 };
    const runs = textRuns(item, selected, start, stream.broken);
    const text = runs.map((run) => run.text).join("");
    const size = Math.hypot(item.transform[0], item.transform[1]);
    const width =
      (selected.reduce(
        (sum, glyph) => sum + glyph.width - (glyph.adjustment || 0),
        0,
      ) *
        size) /
      1000;
    const withinPaint =
      stream.lastOperation ===
      selected.find((glyph) => glyph.text.trim())?.operation;
    const combining = /^[\u0DCA\u0DCF-\u0DDF\u0DF2\u0DF3\u200C\u200D]/u.test(
      text,
    );
    const noSpaceBefore =
      (stream.broken || withinPaint || combining) &&
      start === stream.cursor &&
      !/^\s/u.test(text);
    stream.cursor = end;
    stream.lastOperation = selected.at(-1).operation;
    return {
      ...item,
      str: text,
      width: stream.broken ? Math.max(0, width) : item.width,
      noSpaceBefore,
      inlineStyles:
        runs.length > 1 && runs.some((run) => run.advance > 0)
          ? runs
          : undefined,
    };
  });
}
