import { joinPdfText } from "./pdf-text.js";

// Join PDF visual lines as prose while retaining inline font changes.
export function pdfParagraphSpans(paragraph) {
  const result = [];
  let text = "";
  for (const line of paragraph.lines) {
    const spans = line.spans.map((span) => ({ ...span }));
    if (!spans.length) continue;
    // Recover source tab positions only for flowing Word paragraphs; slide
    // export continues to use the original positioned text spans.
    for (let index = 0; index < spans.length; index++) {
      if (!Number.isFinite(spans[index].tabStop)) continue;
      for (let previous = index - 1; previous >= 0; previous--) {
        spans[previous].text = spans[previous].text.trimEnd();
        if (spans[previous].text) break;
      }
      spans[index].text = "\t" + spans[index].text.trimStart();
    }
    spans[0].text = spans[0].text.trimStart();
    spans.at(-1).text = spans.at(-1).text.trimEnd();
    const lineText = spans.map((span) => span.text).join("");
    const joined = joinPdfText(text, lineText);
    spans[0].text =
      joined.slice(text.length, joined.length - lineText.length) +
      spans[0].text;
    for (const span of spans) {
      const previous = result.at(-1);
      const sameStyle =
        previous &&
        span.tabStop === undefined &&
        [
          "fontFamily",
          "sizeHalfPoints",
          "bold",
          "italic",
          "underline",
          "color",
        ].every((key) => previous[key] === span[key]);
      if (sameStyle) previous.text += span.text;
      else result.push(span);
    }
    text = joined;
  }
  return result;
}
