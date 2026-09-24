const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PARAGRAPH_PROPERTIES =
  '<w:pPr><w:overflowPunct w:val="0"/><w:topLinePunct w:val="1"/><w:snapToGrid w:val="1"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>';
const SECTION_PROPERTIES =
  '<w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1366" w:right="1633" w:bottom="1366" w:left="1633" w:header="850" w:footer="992" w:gutter="0"/><w:cols w:num="1"/><w:vAlign w:val="top"/><w:docGrid w:type="lines" w:linePitch="440"/></w:sectPr>';

function escapeXml(value) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

function textRunsXml(text, segment) {
  const {
    fontFamily,
    fontFamilies,
    bold = false,
    complexScript = false,
    sizeHalfPoints = 28,
    complexSizeHalfPoints = sizeHalfPoints,
    language = "",
    eastAsiaLanguage = language,
    bidiLanguage = language,
    noProof = false,
  } = segment;
  const fonts = fontFamilies || {
    ascii: fontFamily,
    hAnsi: fontFamily,
    eastAsia: fontFamily,
    cs: fontFamily,
  };
  const fontAttributes = Object.entries(fonts)
    .map(([slot, family]) => `w:${slot}="${escapeXml(family)}"`)
    .join(" ");
  const lang = language ? escapeXml(language) : "";
  const eastAsiaLang = escapeXml(eastAsiaLanguage);
  const bidiLang = escapeXml(bidiLanguage);
  return text.split("\t").map((part, index) => {
    const tab = index ? "<w:r><w:tab/></w:r>" : "";
    return `${tab}<w:r><w:rPr><w:rFonts ${fontAttributes}/>${bold ? "<w:b/><w:bCs/>" : ""}${complexScript ? "<w:cs/>" : ""}${noProof ? "<w:noProof/>" : ""}<w:sz w:val="${sizeHalfPoints}"/><w:szCs w:val="${complexSizeHalfPoints}"/>${lang ? `<w:lang w:val="${lang}" w:eastAsia="${eastAsiaLang}" w:bidi="${bidiLang}"/>` : ""}</w:rPr><w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
  }).join("");
}

export async function createSinhalaDocx(segments) {
  const lines = [""];
  for (const segment of segments) {
    const parts = segment.text
      .replace(/\r\n?/gu, "\n")
      .replace(/[^\P{Cc}\n\t]/gu, "")
      .split("\n");
    parts.forEach((part, index) => {
      if (index) lines.push("");
      if (part) lines[lines.length - 1] += textRunsXml(part, segment);
    });
  }
  const paragraphs = lines
    .map((line) => `<w:p>${PARAGRAPH_PROPERTIES}${line}</w:p>`)
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}${SECTION_PROPERTIES}</w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const { BlobWriter, TextReader, ZipWriter } = await import("@zip.js/zip.js");
  const writer = new ZipWriter(new BlobWriter(DOCX_MIME));
  await writer.add("[Content_Types].xml", new TextReader(contentTypes));
  await writer.add("_rels/.rels", new TextReader(relationships));
  await writer.add("word/document.xml", new TextReader(documentXml));
  return writer.close();
}
