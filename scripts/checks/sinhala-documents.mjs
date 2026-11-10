import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter,
} from "@zip.js/zip.js";
import {
  FM_ABHAYA_MAPPINGS, FM_ABHAYA_DERIVED_MAPPINGS,
  fmToUnicode, unicodeToFm,
} from "../../src/utils/sinhala/converter.js";
import {
  convertDocumentRuns, convertDocumentText, convertSinhalaDocx,
} from "../../src/utils/sinhala/convert-docx.js";
import { convertSinhalaPptx } from "../../src/utils/sinhala/convert-pptx.js";
import { escapeXml } from "../../src/utils/sinhala/create-docx.js";
import { createPdfPptx } from "../../src/utils/sinhala/create-pdf-pptx.js";

const require = createRequire(import.meta.url);
const ssgRequire = createRequire(require.resolve("vite-ssg/node"));
const { JSDOM } = await import(pathToFileURL(ssgRequire.resolve("jsdom")).href);
const { window } = new JSDOM("");
globalThis.DOMParser = window.DOMParser;
globalThis.XMLSerializer = window.XMLSerializer;
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const settings = {
  target: "unicode", options: {}, legacyFontFamily: "FMAbhaya",
  unicodeFontFamilies: {
    ascii: "Arial", hAnsi: "Arial", eastAsia: "Arial", cs: "Iskoola Pota",
  },
};
const outputText = (runs) => runs.flat().map(({ text }) => text).join("");
let splits = 0;
for (const options of [
  {}, { normalizeConjuncts: true }, { preserveConjuncts: false },
  { touchingConjuncts: true },
  { preserveRepaya: false, preserveYansaya: false, preserveRakaransaya: false },
]) {
  for (const { legacy } of [...FM_ABHAYA_MAPPINGS, ...FM_ABHAYA_DERIVED_MAPPINGS]) {
    for (let index = 1; index < legacy.length; index++) {
      const runs = [
        { text: legacy.slice(0, index), sourceFont: "FMAbhaya" },
        { text: legacy.slice(index), sourceFont: "FMAbabld" },
      ];
      assert.equal(
        outputText(convertDocumentRuns(runs, { ...settings, options }, true)),
        fmToUnicode(legacy, options),
        `${JSON.stringify(legacy)} split at ${index}: ${JSON.stringify(options)}`,
      );
      splits++;
    }
  }
}
for (const source of [
  "hello bkaÈhka", "English fj,dj English", "^Prime Focus Studios $ DNEG&",
  "^Price $ 20&", "fma% fmHa fÜ%", "^u:qrd-uOQrd& unearthing urns iqKs",
]) {
  const runs = [...source].map((text) => ({ text, sourceFont: "" }));
  assert.equal(
    outputText(convertDocumentRuns(runs, settings)),
    convertDocumentText(source, "", settings).map(({ text }) => text).join(""),
    "document classification must use complete words and preserve Latin wrappers",
  );
}

async function pack(parts) {
  const writer = new ZipWriter(new BlobWriter());
  for (const [path, text] of Object.entries(parts))
    await writer.add(path, new TextReader(text));
  return writer.close();
}
async function unpack(file) {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const parts = new Map();
    for (const entry of await reader.getEntries())
      parts.set(entry.filename, await entry.getData(new TextWriter()));
    return parts;
  } finally { await reader.close(); }
}
const parse = (xml) => new DOMParser().parseFromString(xml, "application/xml");
const textOf = (xml, ns, name) =>
  [...xml.getElementsByTagNameNS(ns, name)].map((node) => node.textContent);
const examples = [
  ...["ව", "ක", "ද", "ඟ", "ඳ", "ද්‍ර", "ක්‍ර", "ක්‍ය", "ක්‍ෂ", "ර්‍ක", "ර්‍ක්‍ය"]
    .flatMap((base) => ["ෙ", "ේ", "ෛ", "ො", "ෝ", "ෞ", "ි", "ී", "ු", "ූ"]
      .map((sign) => unicodeToFm(base + sign))),
  "f;a%", "fÜ%", "f.a=da",
];
const wordRun = (text, font = "FMAbhaya", color = "FF0000") =>
  `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
const drawingRun = (text, font = "FMAbhaya", color = "FF0000") =>
  `<a:r><a:rPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r>`;
const splitRuns = (legacy, makeRun) =>
  makeRun("English ", "Arial", "123456") +
  [...legacy].map((text, index) => makeRun(
    text, index % 2 ? "FMAbabld" : "FMAbhaya", index % 2 ? "00FF00" : "FF0000",
  )).join("") + makeRun(" tail", "Arial", "654321");
const expected = examples.map((legacy) => `English ${fmToUnicode(legacy)} tail`);
const untouched = "<unchanged>keep this part byte-for-byte</unchanged>";

const docx = await pack({
  "word/document.xml": `<w:document xmlns:w="${W}"><w:body>${examples.map((legacy) =>
    `<w:p>${splitRuns(legacy, wordRun)}</w:p>`).join("")}
    <w:p>${wordRun("f")}<w:r><w:tab/></w:r>${wordRun("j")}<w:r><w:br/></w:r></w:p>
    </w:body></w:document>`,
  "word/header1.xml": `<w:hdr xmlns:w="${W}"><w:p>${splitRuns("fj", wordRun)}</w:p></w:hdr>`,
  "word/comments.xml": `<w:comments xmlns:w="${W}"><w:comment><w:p>${splitRuns("ffj", wordRun)}</w:p></w:comment></w:comments>`,
  "customXml/item1.xml": untouched,
});
const docxParts = await unpack(await convertSinhalaDocx(docx, settings));
const word = parse(docxParts.get("word/document.xml"));
assert.deepEqual(textOf(word, W, "p").slice(0, examples.length), expected);
assert.equal(word.getElementsByTagNameNS(W, "tab").length, 1);
assert.equal(word.getElementsByTagNameNS(W, "br").length, 1);
assert.equal(docxParts.get("customXml/item1.xml"), untouched);
assert.equal(textOf(parse(docxParts.get("word/header1.xml")), W, "p")[0], "English වෙ tail");
assert.equal(textOf(parse(docxParts.get("word/comments.xml")), W, "p")[0], "English වෛ tail");
for (const paragraph of [...word.getElementsByTagNameNS(W, "p")].slice(0, examples.length)) {
  const runs = [...paragraph.getElementsByTagNameNS(W, "r")];
  assert.equal(textOf(runs[0], W, "t")[0], "English ");
  assert.equal(runs[0].getElementsByTagNameNS(W, "color")[0].getAttributeNS(W, "val"), "123456");
  assert.equal(runs.at(-1).getElementsByTagNameNS(W, "color")[0].getAttributeNS(W, "val"), "654321");
  assert.ok(runs.slice(1, -1).every((run) =>
    !/^[\u0dcf-\u0ddf\u200d]/u.test(textOf(run, W, "t")[0])),
  "dependent signs must stay in the same Word run as their base");
}

const pptx = await pack({
  "ppt/presentation.xml": `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`,
  "ppt/_rels/presentation.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/slide" Target="slides/slide1.xml"/></Relationships>`,
  "ppt/slides/slide1.xml": `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><p:sp><p:txBody>${examples.map((legacy) =>
    `<a:p>${splitRuns(legacy, drawingRun)}</a:p>`).join("")}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  "customXml/item1.xml": untouched,
});
const pptxParts = await unpack(await convertSinhalaPptx(pptx, settings));
const slide = parse(pptxParts.get("ppt/slides/slide1.xml"));
assert.deepEqual(textOf(slide, A, "p"), expected);
assert.equal(pptxParts.get("customXml/item1.xml"), untouched);
assert.ok([...slide.getElementsByTagNameNS(A, "t")].every((node) =>
  !/^[\u0dcf-\u0ddf\u200d]/u.test(node.textContent)),
"dependent signs must stay in the same PowerPoint run as their base");

// PDF exports have independent spans for positioned glyphs, including glyphs
// that differ only in weight/color. Exercise both slide layout paths.
for (const positioned of [false, true]) {
  const page = {
    width: 600, height: 2500,
    paragraphs: examples.map((legacy, index) => {
      const y = 20 + index * 20;
      const bounds = { x: 20, y, width: 200, height: 14 };
      return {
        text: legacy, x: 20, y, width: 200, height: 14, alignment: "left",
        leftIndent: 0, firstLineIndent: 0, leading: 18,
        lines: [{
          ...(positioned ? { bounds } : {}),
          spans: [...legacy].map((text, glyph) => ({
            text, fontFamily: "FMAbhaya", sizeHalfPoints: 28,
            bold: Boolean(glyph % 2), color: glyph % 2 ? "FF0000" : "000000",
            ...(positioned ? { bounds: { ...bounds, x: 20 + glyph * 10, width: 10 } } : {}),
          })),
        }],
      };
    }),
  };
  const parts = await unpack(await createPdfPptx([page], settings));
  assert.deepEqual(
    textOf(parse(parts.get("ppt/slides/slide1.xml")), A, "p"),
    examples.map((legacy) => fmToUnicode(legacy)),
    `PDF to PPTX with positioned=${positioned}`,
  );
}

const reverseSettings = { ...settings, target: "legacy" };
const reverseDocx = await pack({
  "word/document.xml": `<w:document xmlns:w="${W}"><w:body><w:p>${wordRun("ව", "Iskoola Pota")}${wordRun("ෙ", "Iskoola Pota")}</w:p></w:body></w:document>`,
});
const reverseWord = await unpack(await convertSinhalaDocx(reverseDocx, reverseSettings));
assert.deepEqual(textOf(parse(reverseWord.get("word/document.xml")), W, "p"), ["fj"]);
const reversePptxParts = await unpack(pptx);
reversePptxParts.set("ppt/slides/slide1.xml", `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree><p:sp><p:txBody><a:p>${drawingRun("ව", "Iskoola Pota")}${drawingRun("ෙ", "Iskoola Pota")}</a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
const reverseSlides = await unpack(await convertSinhalaPptx(await pack(Object.fromEntries(reversePptxParts)), reverseSettings));
assert.deepEqual(textOf(parse(reverseSlides.get("ppt/slides/slide1.xml")), A, "p"), ["fj"]);
window.close();
console.log(`检查通过：文档跨样式拼合 ${splits} 个拆分位置，DOCX/PPTX/PDF 导出各 ${examples.length} 组用例及反向转换回归。`);
