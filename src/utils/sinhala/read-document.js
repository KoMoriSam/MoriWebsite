import { extractPdfText } from "./pdf-text.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function readDocx(file, onStage) {
  const { BlobReader, TextWriter, ZipReader } = await import("@zip.js/zip.js");
  const archive = new ZipReader(new BlobReader(file));
  try {
    const entry = (await archive.getEntries()).find(
      ({ filename }) => filename === "word/document.xml",
    );
    if (!entry) throw new Error("DOCX 文档缺少正文");
    const content = await entry.getData(new TextWriter());
    onStage?.("parsing");
    const xml = new DOMParser().parseFromString(content, "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("DOCX 正文无法读取");
    const paragraphs = [...xml.getElementsByTagNameNS(WORD_NS, "p")].map(
      (paragraph) => {
        let text = "";
        const appendText = (node) => {
          if (node.namespaceURI === WORD_NS) {
            if (node.localName === "t") {
              text += node.textContent;
              return;
            }
            if (node.localName === "tab") text += "\t";
            if (node.localName === "br") text += "\n";
          }
          for (const child of node.children) appendText(child);
        };
        appendText(paragraph);
        return text;
      },
    );
    return paragraphs.join("\n");
  } finally {
    await archive.close();
  }
}

async function readPdf(file, includeLayout, onStage) {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  onStage?.("parsing");
  const task = pdfjs.getDocument({ data, fontExtraProperties: true });
  try {
    const pdf = await task.promise;
    const pages = [];
    const layouts = [];
    const readLayout = includeLayout
      ? (await import("./pdf-layout.js")).readPdfPageLayout
      : null;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        if (readLayout) {
          const layout = await readLayout(page, pdfjs);
          layouts.push(layout);
          pages.push(layout.paragraphs.map(({ text }) => text).join("\n"));
        } else {
          const content = await page.getTextContent();
          const operators = await page.getOperatorList();
          const { repairPdfUnicodeText } =
            await import("./pdf-unicode-text.js");
          pages.push(
            extractPdfText(
              await repairPdfUnicodeText(page, content, operators, pdfjs.OPS),
            ),
          );
        }
      } finally {
        page.cleanup();
      }
    }
    const text = pages.join("\n\n");
    if (!includeLayout) return text;
    const { createPdfDocx } = await import("./create-pdf-docx.js");
    const { analyzePdfDocument } = await import("./pdf-document-analysis.js");
    const analysis = analyzePdfDocument(layouts);
    return {
      text,
      sourceDocx: await createPdfDocx(analysis.pages),
      pdfPages: analysis.pages,
      pdfSuggestedFormat: analysis.format,
    };
  } finally {
    await task.destroy();
  }
}

export async function readSinhalaDocument(
  file,
  { includeLayout = false, onStage } = {},
) {
  onStage?.("reading");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "docx") {
    const text = await readDocx(file, onStage);
    return includeLayout ? { text, sourceDocx: null } : text;
  }
  if (extension === "pptx") {
    const { readPptxText } = await import("./pptx-package.js");
    const text = await readPptxText(file, onStage);
    return includeLayout ? { text, sourceDocx: null } : text;
  }
  if (extension === "pdf") return readPdf(file, includeLayout, onStage);
  throw new Error("仅支持 DOCX、PPTX 或 PDF 文件");
}
