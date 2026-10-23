import { createDocxPackage, escapeXml, textRunsXml } from "./create-docx.js";
import { pdfParagraphSpans } from "./pdf-paragraph-spans.js";
import { analyzePdfDocument } from "./pdf-document-analysis.js";
import { buildPdfDocumentFlow } from "./pdf-document-flow.js";

const twips = (points) => Math.round(points * 20);
const emus = (points) => Math.round(points * 12700);
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SMALL_PARAGRAPH =
  '<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>';

function sectionXml(page, scale, margins, pagination) {
  const measure = (points) => twips(points * scale);
  return `<w:sectPr>${pagination.references}<w:type w:val="nextPage"/><w:pgSz w:w="${measure(page.width)}" w:h="${measure(page.height)}"${page.width > page.height ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${measure(margins.top)}" w:right="${measure(margins.right)}" w:bottom="${measure(margins.bottom)}" w:left="${measure(margins.left)}" w:header="${measure(pagination.header)}" w:footer="${measure(pagination.footer)}" w:gutter="0"/>${pagination.numbering}<w:cols w:num="1"/></w:sectPr>`;
}

function scaledTextXml(span, scale) {
  const sizeHalfPoints = Math.max(2, Math.round(span.sizeHalfPoints * scale));
  return textRunsXml(span.text.replace(/[^\P{Cc}\t]/gu, ""), {
    ...span,
    sizeHalfPoints,
    complexSizeHalfPoints: sizeHalfPoints,
    // Flowing documents use a white page rather than slide backgrounds.
    color: flowingTextColor(span.color),
  });
}

function flowingTextColor(color) {
  if (!/^[\da-f]{6}$/iu.test(color || "")) return color;
  const channels = [0, 2, 4].map((start) =>
    parseInt(color.slice(start, start + 2), 16),
  );
  // Light lettering from dark slides needs dark ink on the white Word page.
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    170
    ? "000000"
    : color;
}

function pageNumberRunsXml(paragraph, scale, pageCount) {
  const number = paragraph.pageNumber;
  const source = paragraph.lines[0].spans[0];
  const sizeHalfPoints = Math.max(2, Math.round(source.sizeHalfPoints * scale));
  const span = {
    ...source,
    sizeHalfPoints,
    complexSizeHalfPoints: sizeHalfPoints,
    color: flowingTextColor(source.color),
  };
  const text = (value) => (value ? textRunsXml(value, span) : "");
  // Only field results need a normal number font. Running titles accompanying
  // the number retain their source fonts for the encoding conversion.
  const numberSpan = {
    ...span,
    fontFamily: /^FM/iu.test(span.fontFamily)
      ? "Times New Roman"
      : span.fontFamily,
  };
  const field = (instruction, value) =>
    `<w:fldSimple w:instr="${instruction}" w:dirty="true">${textRunsXml(value, numberSpan)}</w:fldSimple>`;
  const suffix = number.suffix.replace(/\d+/u, "\u0000").split("\u0000");
  const total =
    suffix.length > 1
      ? text(suffix[0]) + field("NUMPAGES", String(pageCount)) + text(suffix[1])
      : text(number.suffix);
  return `${text(number.prefix)}${field("PAGE", number.label)}${total}`;
}

function headerFooterXml(paragraphs, scale, margins, page, pageCount) {
  const rows = [];
  for (const paragraph of [...paragraphs].sort(
    (a, b) => a.y - b.y || a.flowLeft - b.flowLeft,
  )) {
    const row = rows.at(-1);
    if (
      row &&
      Math.abs(paragraph.y - row.y) <
        Math.min(paragraph.height, row.height) * 0.6
    )
      row.parts.push(paragraph);
    else
      rows.push({
        y: paragraph.y,
        height: paragraph.height,
        parts: [paragraph],
      });
  }
  let bottom = rows[0]?.y || 0;
  return rows
    .map((row) => {
      const parts = row.parts.sort(
        (a, b) => (a.flowLeft ?? a.x) - (b.flowLeft ?? b.x),
      );
      const alignment =
        parts.length > 1
          ? "left"
          : parts[0].alignment === "both"
            ? "left"
            : parts[0].alignment;
      const stops = parts
        .slice(1)
        .map((part) => {
          const align = part.alignment === "both" ? "left" : part.alignment;
          const width = part.textWidth ?? part.width;
          const anchor =
            (part.flowLeft ?? part.x) +
            (align === "right" ? width : align === "center" ? width / 2 : 0);
          const position = Math.max(
            0,
            Math.min(
              page.width - margins.left - margins.right,
              anchor - margins.left,
            ),
          );
          return `<w:tab w:val="${align}" w:pos="${twips(position * scale)}"/>`;
        })
        .join("");
      const before = Math.min(12, Math.max(0, row.y - bottom));
      bottom = Math.max(...parts.map((part) => part.y + part.height));
      const content = parts
        .map(
          (part, index) =>
            (index ? "<w:r><w:tab/></w:r>" : "") +
            (part.pageNumber
              ? pageNumberRunsXml(part, scale, pageCount)
              : pdfParagraphSpans(part)
                  .map((span) => scaledTextXml(span, scale))
                  .join("")),
        )
        .join("");
      const left =
        alignment === "left"
          ? Math.max(0, (parts[0].flowLeft ?? parts[0].x) - margins.left)
          : 0;
      return `<w:p><w:pPr>${stops ? `<w:tabs>${stops}</w:tabs>` : ""}<w:snapToGrid w:val="0"/><w:spacing w:before="${twips(before * scale)}" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="${twips(left * scale)}"/><w:jc w:val="${alignment}"/></w:pPr>${content}</w:p>`;
    })
    .join("");
}

function pictureXml(index, width, height) {
  const cx = emus(width);
  const cy = emus(height);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index}" name="Image ${index}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${index}" name="image-${index}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage${index}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function paragraphXml(
  paragraph,
  scale,
  margins,
  before,
  pageBreakBefore = false,
  fit = { text: 1, spacing: 1 },
) {
  const measure = (points) => twips(points * scale);
  const firstLine =
    paragraph.firstLineIndent < 0
      ? `w:hanging="${measure(-paragraph.firstLineIndent)}"`
      : `w:firstLine="${measure(paragraph.firstLineIndent)}"`;
  const left =
    paragraph.alignment === "left" || paragraph.alignment === "both"
      ? Math.max(0, paragraph.flowLeft - margins.left)
      : 0;
  const stops = [
    ...new Set(
      paragraph.lines
        .flatMap((line) => line.spans.map((span) => span.tabStop))
        .filter(Number.isFinite),
    ),
  ];
  const tabs = stops.length
    ? `<w:tabs>${stops
        .sort((a, b) => a - b)
        .map(
          (stop) =>
            `<w:tab w:val="left" w:pos="${measure(Math.max(0, stop - margins.left))}"/>`,
        )
        .join("")}</w:tabs>`
    : "";
  const properties = `<w:pPr>${pageBreakBefore ? "<w:pageBreakBefore/>" : ""}${paragraph.keepLines ? "<w:keepLines/>" : ""}${tabs}<w:widowControl/><w:snapToGrid w:val="0"/><w:spacing w:before="${measure(before * fit.spacing)}" w:after="0" w:line="${measure(paragraph.leading * fit.text)}" w:lineRule="atLeast"/><w:ind w:left="${measure(left)}" ${firstLine}/><w:jc w:val="${paragraph.alignment}"/></w:pPr>`;
  const content = pdfParagraphSpans(paragraph)
    .map((span) => scaledTextXml(span, scale * fit.text))
    .join("");
  return `<w:p>${properties}${content}</w:p>`;
}

function tableXml(table, scale, margins, before, pageBreakBefore, fit) {
  const measure = (points) => twips(points * scale);
  const width = measure(table.width);
  const grid = table.columns
    .slice(1)
    .map((position, index) => position - table.columns[index]);
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:color="000000"/>`)
    .join("");
  const properties = `<w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblInd w:w="${measure(table.x - margins.left)}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="${measure(5.4)}" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="${measure(5.4)}" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const rows = table.rows
    .map((row) => {
      // A continued cell must be allowed to split. Its page-fragment heights
      // cannot become a minimum height that pushes the whole row to the next page.
      const header = `<w:trPr>${row.crossesPage ? '<w:cantSplit w:val="0"/>' : row.startsPage ? "<w:cantSplit/>" : ""}${row.cells.every((cell) => cell.header) ? "<w:tblHeader/>" : ""}${
        row.height && !row.crossesPage
          ? `<w:trHeight w:val="${measure(Math.max(1, row.height - 2.5))}" w:hRule="atLeast"/>`
          : ""
      }</w:trPr>`;
      const cells = row.cells
        .map((cell, column) => {
          let bottom = null;
          const content =
            cell.paragraphs
              .map((paragraph) => {
                const gap =
                  bottom === null
                    ? Math.max(0, paragraph.y - (row.y ?? paragraph.y) - 1)
                    : Math.max(0, paragraph.y - bottom);
                bottom =
                  paragraph.y +
                  Math.max(
                    paragraph.height,
                    paragraph.leading * paragraph.lines.length,
                  );
                return paragraphXml(
                  paragraph,
                  scale,
                  { left: table.columns[column] + 5.4 },
                  gap,
                  false,
                  fit,
                );
              })
              .join("") || `<w:p><w:pPr>${SMALL_PARAGRAPH}</w:pPr></w:p>`;
          return `<w:tc><w:tcPr><w:tcW w:w="${measure(grid[column])}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${content}</w:tc>`;
        })
        .join("");
      // The minimum excludes cell padding and borders, which Word adds back.
      // Rows can still expand and split when the converted text needs room.
      return `<w:tr>${header}${cells}</w:tr>`;
    })
    .join("");
  const start =
    before || pageBreakBefore
      ? `<w:p><w:pPr>${pageBreakBefore ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="${Math.max(0, measure(before * fit.spacing) - 20)}" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`
      : "";
  return `${start}<w:tbl>${properties}<w:tblGrid>${grid.map((width) => `<w:gridCol w:w="${measure(width)}"/>`).join("")}</w:tblGrid>${rows}</w:tbl><w:p><w:pPr>${SMALL_PARAGRAPH}</w:pPr></w:p>`;
}

function sharedMargins(pages, page) {
  const peers = pages.filter(
    (other) =>
      Math.abs(other.width - page.width) < 1 &&
      Math.abs(other.height - page.height) < 1,
  );
  const left = peers.flatMap((other) =>
    other.paragraphs
      .filter(
        (paragraph) =>
          !paragraph.pageNumber &&
          !paragraph.runningPosition &&
          ["left", "both"].includes(paragraph.alignment),
      )
      .map((paragraph) => paragraph.flowLeft)
      .filter((value) => Number.isFinite(value) && value >= 0),
  );
  const right = peers
    .map((other) => other.margins?.right)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    left: Math.min(left.length ? Math.min(...left) : 72, page.width * 0.15),
    right: Math.max(
      0,
      Math.min(right[Math.floor(right.length * 0.2)] ?? 72, page.width * 0.15),
    ),
  };
}

function furnitureSignature(page) {
  return page.paragraphs
    .filter((paragraph) => paragraph.pageNumber || paragraph.runningPosition)
    .map((paragraph) => {
      const number = paragraph.pageNumber;
      const width = paragraph.textWidth ?? paragraph.width;
      const anchor =
        (paragraph.flowLeft ?? paragraph.x) +
        (paragraph.alignment === "right"
          ? width
          : paragraph.alignment === "center"
            ? width / 2
            : 0);
      return {
        position: number?.position || paragraph.runningPosition,
        text: number
          ? `${number.prefix}{PAGE}${number.suffix.replace(/\d+/u, "{NUMPAGES}")}`
          : paragraph.text,
        format: number?.format,
        alignment: paragraph.alignment,
        anchor: Math.round(anchor / 2),
        fonts: paragraph.lines
          .flatMap((line) => line.spans)
          .map(({ fontFamily, sizeHalfPoints, bold, italic, color }) => ({
            fontFamily,
            sizeHalfPoints,
            bold,
            italic,
            color,
          })),
      };
    });
}

function fitSlidePage(blocks, { page, margins }) {
  const width = page.width - margins.left - margins.right;
  // Inline pictures also need room for their paragraph's baseline/descender.
  const pictures = blocks.filter((block) => block.type === "image");
  const available = Math.max(
    1,
    page.height - margins.top - margins.bottom - 6 - pictures.length * 2,
  );
  let textHeight = 0;
  let imageHeight = 0;
  let spacing = 0;
  for (const block of blocks) {
    spacing += block.before || 0;
    if (block.type === "image") {
      imageHeight += block.height * Math.min(1, width / block.width);
    } else if (block.type === "table") {
      textHeight += block.height * 1.4;
    } else if (block.type === "text") {
      const paragraph = block.paragraph;
      const size = Math.max(
        1,
        ...paragraph.lines
          .flatMap((line) => line.spans)
          .map((span) => span.sizeHalfPoints / 2),
      );
      const left = ["left", "both"].includes(paragraph.alignment)
        ? Math.max(0, paragraph.flowLeft - margins.left)
        : 0;
      const lineWidth = Math.max(
        size * 2,
        width - left - Math.max(0, paragraph.firstLineIndent),
      );
      const sourceWidth = paragraph.lines.reduce(
        (sum, line) =>
          sum + (line.bounds?.width ?? paragraph.textWidth ?? paragraph.width),
        0,
      );
      const lines = Math.max(
        paragraph.lines.length,
        Math.ceil((sourceWidth * 1.2) / lineWidth),
      );
      // Word's complex-script line boxes can be taller than PDF glyph bounds.
      textHeight += lines * Math.max(paragraph.leading, size * 1.6);
    }
  }
  const total = textHeight + imageHeight + spacing;
  if (total <= available) return { text: 1, image: 1, spacing: 1 };
  const gapScale = available / total;
  const remaining = Math.max(1, available - spacing * gapScale);
  const text = imageHeight
    ? Math.min(
        1,
        Math.sqrt(remaining / Math.max(1, textHeight + imageHeight)),
        (remaining - Math.min(imageHeight, remaining * 0.15)) /
          Math.max(1, textHeight),
      )
    : Math.min(1, remaining / Math.max(1, textHeight));
  return {
    text,
    image: Math.min(
      1,
      Math.max(0.01, remaining - textHeight * text) / Math.max(1, imageHeight),
    ),
    spacing: gapScale,
  };
}

export async function createPdfDocx(pages, { preservePages } = {}) {
  const analysis = analyzePdfDocument(pages);
  pages = analysis.pages;
  preservePages ??= analysis.format === "pptx";
  const images = [];
  // Word 2007 compatibility ignores paragraph pagination controls in cells.
  // Modern layout keeps continuation paragraphs together within a split row.
  const textParts = [
    {
      id: "rIdSettings",
      filename: "settings.xml",
      type: "settings",
      xml: `${XML_HEADER}<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
    },
  ];
  const hasPageFurniture = pages.some((page) =>
    page.paragraphs.some(
      (paragraph) => paragraph.pageNumber || paragraph.runningPosition,
    ),
  );
  let previousNumber = null;
  const contexts = [];
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    // Source coordinates estimate margins/spacing, never position text frames.
    const scale = Math.min(1, 1584 / page.width, 1584 / page.height);
    const blocks = [
      ...page.paragraphs
        .filter(
          (paragraph) => !paragraph.pageNumber && !paragraph.runningPosition,
        )
        .map((paragraph) => ({ ...paragraph, type: "text" })),
      ...(page.graphics || []).map((graphic) => ({
        ...graphic,
        type: "image",
      })),
    ].sort((a, b) => a.y - b.y || a.x - b.x);
    const margins = {
      ...sharedMargins(pages, page),
      top: blocks.length
        ? Math.min(72, Math.max(0, blocks[0].y))
        : Math.min(72, page.height * 0.1),
      bottom: Math.min(36, page.height * 0.05),
    };
    const pagination = { references: "", numbering: "", header: 0, footer: 0 };
    const parts = [];
    let restartNumber = false;
    if (hasPageFurniture) {
      for (const type of ["header", "footer"]) {
        const furniture = page.paragraphs.filter(
          (paragraph) =>
            (paragraph.pageNumber?.position || paragraph.runningPosition) ===
            type,
        );
        const id = `rId${type}${index + 1}`;
        const tag = type === "header" ? "hdr" : "ftr";
        const content =
          headerFooterXml(furniture, scale, margins, page, pages.length) ||
          "<w:p/>";
        parts.push({
          id,
          filename: `${type}${index + 1}.xml`,
          type,
          xml: `${XML_HEADER}<w:${tag} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${content}</w:${tag}>`,
        });
        // Explicit empty parts keep a previous section's pagination off blank
        // pages and covers; numbered pages use real PAGE/NUMPAGES fields.
        pagination.references += `<w:${type}Reference w:type="default" r:id="${id}"/>`;
        if (furniture.length) {
          const top = Math.min(...furniture.map((paragraph) => paragraph.y));
          const bottom = Math.max(
            ...furniture.map((paragraph) => paragraph.y + paragraph.height),
          );
          pagination[type] = Math.max(
            12,
            Math.min(72, type === "header" ? top : page.height - bottom),
          );
          const margin = type === "header" ? "top" : "bottom";
          margins[margin] = Math.max(
            margins[margin],
            pagination[type] + bottom - top + 8,
          );
        }
      }
      const number = page.paragraphs.find(
        (paragraph) => paragraph.pageNumber,
      )?.pageNumber;
      if (number) {
        const restart =
          !previousNumber ||
          number.format !== previousNumber.format ||
          number.number - previousNumber.number !==
            index - previousNumber.index;
        restartNumber = Boolean(previousNumber) && restart;
        pagination.numbering = `<w:pgNumType w:fmt="${escapeXml(number.format)}"${restart ? ` w:start="${number.number}"` : ""}/>`;
        previousNumber = { ...number, index };
      }
    }
    const signature = JSON.stringify({
      width: page.width,
      height: page.height,
      margins: { left: margins.left, right: margins.right },
      furniture: furnitureSignature(page),
    });
    contexts.push({
      page,
      scale,
      margins,
      pagination,
      parts,
      signature,
      restartNumber,
    });
  }
  const groups = [];
  for (const block of buildPdfDocumentFlow(pages, { preservePages })) {
    const context = contexts[block.pageIndex];
    const previous = groups.at(-1);
    if (
      !previous ||
      (preservePages && previous.blocks.at(-1).pageIndex !== block.pageIndex) ||
      previous.context.signature !== context.signature ||
      (context.restartNumber &&
        previous.blocks.at(-1)?.pageIndex !== block.pageIndex)
    ) {
      groups.push({ context, blocks: [block] });
    } else previous.blocks.push(block);
  }
  let body = "";
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const { context, blocks } = groups[groupIndex];
    const { page, scale, margins, pagination } = context;
    const fitPage = preservePages
      ? fitSlidePage(blocks, context)
      : { text: 1, image: 1, spacing: 1 };
    textParts.push(...context.parts);
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      const pageBreakBefore =
        block.pageBreakBefore && !(groupIndex > 0 && index === 0);
      const before = block.pageBreakBefore
        ? Math.max(0, block.y - margins.top)
        : block.before;
      let paragraph;
      if (block.type === "text")
        paragraph = paragraphXml(
          block.paragraph,
          scale,
          margins,
          before,
          pageBreakBefore,
          fitPage,
        );
      else if (block.type === "table")
        paragraph = tableXml(
          block.table,
          scale,
          margins,
          before,
          pageBreakBefore,
          fitPage,
        );
      else if (block.type === "image") {
        const number = images.length + 1;
        images.push({
          id: `rIdImage${number}`,
          filename: `image-${number}.png`,
          data: block.data,
        });
        const fit = Math.min(
          scale * fitPage.image,
          ((page.width - margins.left - margins.right) * scale) / block.width,
          ((page.height - margins.top - margins.bottom) * scale) / block.height,
        );
        const left = Math.max(
          0,
          Math.min(
            block.x - margins.left,
            page.width -
              margins.right -
              (block.width * fit) / scale -
              margins.left,
          ),
        );
        const marker = preservePages
          ? '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>'
          : "";
        paragraph = `<w:p><w:pPr><w:keepLines/>${pageBreakBefore ? "<w:pageBreakBefore/>" : ""}<w:snapToGrid w:val="0"/><w:spacing w:before="${twips(before * scale * fitPage.spacing)}" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="${twips(left * scale)}"/>${marker}</w:pPr>${pictureXml(number, block.width * fit, block.height * fit)}</w:p>`;
      } else
        paragraph = `<w:p><w:pPr>${pageBreakBefore ? "<w:pageBreakBefore/>" : ""}${SMALL_PARAGRAPH}</w:pPr></w:p>`;
      // A section boundary belongs to the end of a complete body paragraph.
      // Prose shares sections across pages; slides retain each source page.
      if (index === blocks.length - 1 && groupIndex < groups.length - 1) {
        const boundary = sectionXml(page, scale, margins, pagination);
        paragraph =
          block.type === "table"
            ? paragraph.replace(
                /<\/w:pPr><\/w:p>$/u,
                `${boundary}</w:pPr></w:p>`,
              )
            : paragraph.replace("</w:pPr>", `${boundary}</w:pPr>`);
      }
      body += paragraph;
    }
    if (groupIndex === groups.length - 1)
      body += sectionXml(page, scale, margins, pagination);
  }
  return createDocxPackage(
    `${XML_HEADER}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`,
    images,
    textParts,
  );
}
