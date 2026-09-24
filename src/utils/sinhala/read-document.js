const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function readDocx(file) {
  const { BlobReader, TextWriter, ZipReader } = await import("@zip.js/zip.js");
  const archive = new ZipReader(new BlobReader(file));
  try {
    const entry = (await archive.getEntries()).find(
      ({ filename }) => filename === "word/document.xml",
    );
    if (!entry) throw new Error("DOCX 文档缺少正文");
    const xml = new DOMParser().parseFromString(
      await entry.getData(new TextWriter()),
      "application/xml",
    );
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

async function readPdf(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const { items } = await page.getTextContent();
      let text = "";
      for (const item of items) {
        if (typeof item.str !== "string") continue;
        text += item.str;
        if (item.hasEOL) text += "\n";
      }
      pages.push(text.trimEnd());
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}

export async function readSinhalaDocument(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "docx") return readDocx(file);
  if (extension === "pdf") return readPdf(file);
  throw new Error("仅支持 DOCX 或 PDF 文件");
}
