import { READER_STYLE_DEFAULTS } from "../../constants/reader.js";

export function resolveReaderTypography(styles = {}) {
  const number = (key, minimum = -Infinity) => {
    const input = styles?.[key];
    const hasValue = typeof input === "number" ||
      (typeof input === "string" && input.trim() !== "");
    const value = hasValue ? Number(input) : NaN;
    return Number.isFinite(value) && value >= minimum
      ? value
      : READER_STYLE_DEFAULTS[key];
  };
  return {
    fontSize: number("fontSize", 1),
    fontGap: number("fontGap"),
    lineHeight: number("lineHeight", 1),
    paraHeight: number("paraHeight", 0),
  };
}

export function readerTypographyMetrics(styles) {
  const { fontSize, fontGap, lineHeight, paraHeight } = resolveReaderTypography(styles);
  const linePixels = fontSize * lineHeight;
  return {
    fontSize,
    lineHeight,
    paraHeight,
    linePixels,
    paragraphGap: linePixels * paraHeight,
    letterSpacing: `${fontGap * 0.25}rem`,
    textIndent: `calc(${fontSize * 2}px + ${fontGap * 0.7}rem)`,
  };
}

export function readerTypographyStyle(styles = {}, useReaderColors = false) {
  const { fontSize, lineHeight, paragraphGap, letterSpacing, textIndent } =
    readerTypographyMetrics(styles);
  return {
    "--para-font-size": `${fontSize}px`,
    "--para-letter-spacing": letterSpacing,
    "--para-line-height": lineHeight,
    "--para-margin-inline": `${paragraphGap}px`,
    "--para-text-indent": textIndent,
    "--reader-text-color": useReaderColors ? styles.textColor || undefined : undefined,
    fontFamily: styles.fontFamily || undefined,
  };
}
