import { escapeXml } from "./create-docx.js";
import {
  convertDocumentText,
  isLegacyFont,
  isIntrinsicBoldFont,
} from "./convert-docx.js";
import {
  pdfSlideTextBlocks,
  slideParagraphAlignment,
} from "./pdf-slide-text.js";
import { pdfSlideBackground } from "./pdf-slide-background.js";

const MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_R =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const emus = (points) => Math.round(points * 12700);
const group =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const relationships = (items) =>
  `${HEADER}<Relationships xmlns="${PACKAGE_R}">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join("")}</Relationships>`;

function textRuns(span, settings, hasLegacyFonts, scale) {
  return convertDocumentText(
    span.text,
    span.fontFamily,
    settings,
    hasLegacyFonts,
  )
    .map((segment) => {
      let family = span.fontFamily;
      let fonts;
      let bold = span.bold;
      if (segment.useLegacyFont) {
        if (settings.target === "unicode") {
          fonts = settings.unicodeFontFamilies;
          bold ||= isIntrinsicBoldFont(family);
        } else {
          family =
            bold && /^FMAbhaya$/iu.test(settings.legacyFontFamily)
              ? "FMAbabld"
              : settings.legacyFontFamily;
          if (/fmababld/iu.test(family)) bold = false;
        }
      }
      const latin = fonts?.ascii || family;
      const ea = fonts?.eastAsia || family;
      const cs = fonts?.cs || family;
      const size = Math.max(
        100,
        Math.round((span.sizePoints ?? span.sizeHalfPoints / 2) * 100 * scale),
      );
      const symbol = /^(?:Wingdings|Webdings|Symbol)/iu.test(family)
        ? `<a:sym typeface="${escapeXml(family)}" charset="02"/>`
        : "";
      const shadow = span.shadow
        ? `<a:effectLst><a:outerShdw blurRad="${emus(span.shadow.blur * scale)}" dist="${emus(span.shadow.distance * scale)}" dir="2700000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="${Math.round(span.shadow.opacity * 100000)}"/></a:srgbClr></a:outerShdw></a:effectLst>`
        : "";
      return `<a:r><a:rPr sz="${size}" b="${bold ? 1 : 0}" i="${span.italic ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${span.color || "000000"}"/></a:solidFill>${shadow}<a:latin typeface="${escapeXml(latin)}"/><a:ea typeface="${escapeXml(ea)}"/><a:cs typeface="${escapeXml(cs)}"/>${symbol}</a:rPr><a:t xml:space="preserve">${escapeXml(segment.text.replace(/[^\P{Cc}\t]/gu, ""))}</a:t></a:r>`;
    })
    .join("");
}

function textBox(
  paragraph,
  id,
  transform,
  settings,
  hasLegacyFonts,
  positionedLine = false,
) {
  const { scale, x, y } = transform;
  const align = { left: "l", center: "ctr", right: "r", both: "just" }[
    paragraph.alignment
  ];
  const vertical =
    paragraph.textDirection === "tbRl"
      ? "vert"
      : paragraph.textDirection === "btLr"
        ? "vert270"
        : "horz";
  const content = paragraph.lines
    .map(({ spans }) =>
      mergedSpans(spans)
        .map((span) => textRuns(span, settings, hasLegacyFonts, scale))
        .join(""),
    )
    .join("<a:br/>");
  const properties = `<a:pPr marL="${emus(paragraph.leftIndent * scale)}" indent="${emus(paragraph.firstLineIndent * scale)}" algn="${align}"><a:lnSpc><a:spcPts val="${Math.round(paragraph.leading * scale * 100)}"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emus(x + paragraph.x * scale)}" y="${emus(y + paragraph.y * scale)}"/><a:ext cx="${emus(paragraph.width * scale)}" cy="${emus(paragraph.height * scale)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="${positionedLine ? "none" : "square"}" lIns="0" tIns="0" rIns="0" bIns="0" vert="${vertical}" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/><a:p>${properties}${content}</a:p></p:txBody></p:sp>`;
}

function mergedSpans(spans) {
  const merged = [];
  for (const span of spans) {
    const previous = merged.at(-1);
    const sameShadow =
      (!previous?.shadow && !span.shadow) ||
      (previous?.shadow &&
        span.shadow &&
        ["opacity", "blur", "distance"].every(
          (key) => Math.abs(previous.shadow[key] - span.shadow[key]) < 0.01,
        ));
    if (
      previous &&
      sameShadow &&
      [
        "fontFamily",
        "sizePoints",
        "sizeHalfPoints",
        "bold",
        "italic",
        "color",
      ].every((key) => previous[key] === span[key])
    )
      previous.text += span.text;
    else merged.push({ ...span });
  }
  return merged;
}

function contentLine(line) {
  const first = line.spans.findIndex((span) => span.text.trim());
  const marker = line.spans[first];
  if (!marker || !/^(?:Wingdings|Webdings|Symbol)/iu.test(marker.fontFamily))
    return { ...line };
  const start = line.spans.findIndex(
    (span, index) =>
      index > first &&
      span.text.trim() &&
      !/^(?:Wingdings|Webdings|Symbol)/iu.test(span.fontFamily),
  );
  if (start < 0 || !line.spans[start].bounds) return { ...line };
  const spans = line.spans.slice(start).map((span) => ({ ...span }));
  if (spans[0].separator)
    spans[0].text = spans[0].text.slice(spans[0].separator.length);
  const bounds = {
    ...line.bounds,
    x: spans[0].bounds.x,
    y: Math.min(...spans.map((span) => span.bounds.y)),
  };
  bounds.width = line.bounds.x + line.bounds.width - bounds.x;
  return {
    ...line,
    spans,
    bounds,
    leading: Math.max(...spans.map((span) => span.bounds.height)),
    marker,
  };
}

function paragraphUnits(paragraph, pageWidth) {
  const lines = paragraph.lines.map(contentLine);
  const alignment = lines[0].marker
    ? "left"
    : slideParagraphAlignment(paragraph, pageWidth);
  const size = (line) =>
    Math.max(
      ...line.spans.map((span) => span.sizePoints ?? span.sizeHalfPoints / 2),
    );
  const leading = (line) => line.leading ?? size(line) * 1.2;
  const bottom = (line) => line.bounds.y + leading(line);
  const gaps = lines.slice(1).map((line, i) => bottom(line) - bottom(lines[i]));
  const anchor = (line) =>
    alignment === "center"
      ? line.bounds.x + line.bounds.width / 2
      : alignment === "right"
        ? line.bounds.x + line.bounds.width
        : line.bounds.x;
  const anchors = (alignment === "left" ? lines.slice(1) : lines).map(anchor);
  const consistent =
    lines.length > 1 &&
    gaps.every((gap) => gap > 0 && Math.abs(gap - gaps[0]) < 0.5) &&
    Math.max(...lines.map(size)) / Math.min(...lines.map(size)) < 1.1 &&
    (!anchors.length || Math.max(...anchors) - Math.min(...anchors) < 2);
  return (consistent ? [lines] : lines.map((line) => [line])).map((rows) => ({
    lines: rows,
    alignment,
    marker: rows[0].marker,
    leading: rows.length > 1 ? gaps[0] : leading(rows[0]),
    start: bottom(rows[0]),
    end: bottom(rows.at(-1)),
  }));
}

function editableTextLayout(
  block,
  transform,
  settings,
  hasLegacyFonts,
  pageWidth,
  container = null,
) {
  const sourceLines = block.paragraphs.flatMap((paragraph) => paragraph.lines);
  const units = [];
  for (const unit of block.paragraphs.flatMap((paragraph) =>
    paragraphUnits(paragraph, pageWidth),
  )) {
    // A tightly preceding heading can leave less room for the first line than
    // subsequent lines need. Keep those lines in the same frame, using native
    // paragraph spacing rather than shortening every line and shifting the rest.
    if (
      unit.lines.length > 1 &&
      units.length &&
      unit.start - units.at(-1).end < unit.leading - 0.05
    ) {
      for (const line of unit.lines) {
        const size = Math.max(
          ...line.spans.map(
            (span) => span.sizePoints ?? span.sizeHalfPoints / 2,
          ),
        );
        const leading = line.leading ?? size * 1.2;
        units.push({
          ...unit,
          lines: [line],
          marker: line.marker,
          leading,
          start: line.bounds.y + leading,
          end: line.bounds.y + leading,
        });
      }
    } else units.push(unit);
  }
  const padding = Math.max(
    ...sourceLines.flatMap((line) =>
      line.spans.map(
        (span) => (span.sizePoints ?? span.sizeHalfPoints / 2) * 0.5,
      ),
    ),
    2,
  );
  // Leave room for font shaping differences and subsequent edits. Paragraph
  // margins keep the original text anchors while the frame wraps normally.
  const left =
    container?.x ??
    Math.max(
      0,
      Math.min(...sourceLines.map((line) => line.bounds.x)) - padding,
    );
  const right = container
    ? container.x + container.width
    : Math.min(
        pageWidth,
        Math.max(
          ...sourceLines.map((line) => line.bounds.x + line.bounds.width),
        ) + padding,
      );
  const top = Math.max(0, units[0].start - units[0].leading);
  const height =
    container?.height ??
    Math.max(
      ...sourceLines.map(
        (line) =>
          line.bounds.y +
          Math.max(
            line.bounds.height,
            ...line.spans.map(
              (span) => (span.sizePoints ?? span.sizeHalfPoints / 2) * 1.5,
            ),
          ),
      ),
    ) - top;
  let previous = top;
  const paragraphs = units
    .map((unit) => {
      const first = unit.lines[0],
        last = unit.lines.at(-1);
      const advance = unit.start - previous;
      const leading = Math.max(0.01, Math.min(unit.leading, advance));
      const before = Math.max(0, advance - leading);
      previous = unit.end;
      let marginLeft = 0,
        marginRight = 0,
        indent = 0;
      if (unit.alignment === "center") {
        const offset =
          first.bounds.x + first.bounds.width / 2 - (left + right) / 2;
        marginLeft = Math.max(0, offset * 2);
        marginRight = Math.max(0, -offset * 2);
      } else if (unit.alignment === "right")
        marginRight = right - first.bounds.x - first.bounds.width;
      else {
        marginLeft = last.bounds.x - left;
        indent = first.bounds.x - last.bounds.x;
      }
      let bullet = "<a:buNone/>";
      if (unit.marker) {
        marginLeft = first.bounds.x - left;
        indent =
          (unit.marker.bounds?.x ?? sourceLines[0].bounds.x) - first.bounds.x;
        bullet = `<a:buClr><a:srgbClr val="${unit.marker.color || "000000"}"/></a:buClr><a:buSzPts val="${Math.round((unit.marker.sizePoints ?? unit.marker.sizeHalfPoints / 2) * 100 * transform.scale)}"/><a:buFont typeface="${escapeXml(unit.marker.fontFamily)}" charset="02"/><a:buChar char="${escapeXml(unit.marker.text.trim())}"/>`;
      }
      const content = unit.lines
        .map((line) =>
          mergedSpans(line.spans)
            .map((span) =>
              textRuns(span, settings, hasLegacyFonts, transform.scale),
            )
            .join(""),
        )
        .join("<a:br/>");
      const alignment = { left: "l", center: "ctr", right: "r", both: "just" }[
        unit.alignment
      ];
      return `<a:p><a:pPr marL="${emus(marginLeft * transform.scale)}" marR="${emus(marginRight * transform.scale)}" indent="${emus(indent * transform.scale)}" algn="${alignment}"><a:lnSpc><a:spcPts val="${Math.round(leading * transform.scale * 100)}"/></a:lnSpc><a:spcBef><a:spcPts val="${Math.round(before * transform.scale * 100)}"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft>${bullet}</a:pPr>${content}</a:p>`;
    })
    .join("");
  // A shape's first paragraph ignores space-before. Use its text inset to keep
  // the original baseline, including the inscribed text rectangle of ellipses.
  const insetX =
    container?.preset === "ellipse"
      ? (container.width * (1 - Math.SQRT1_2)) / 2
      : 0;
  const insetY =
    container?.preset === "ellipse"
      ? (container.height * (1 - Math.SQRT1_2)) / 2
      : 0;
  const topInset = container ? top - container.y - insetY : 0;
  return {
    left,
    right,
    top,
    height,
    body: `<p:txBody><a:bodyPr wrap="square" lIns="${emus(-insetX * transform.scale)}" tIns="${emus(topInset * transform.scale)}" rIns="${emus(-insetX * transform.scale)}" bIns="${emus(-insetY * transform.scale)}" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody>`,
  };
}

function editableTextBox(
  block,
  id,
  transform,
  settings,
  hasLegacyFonts,
  pageWidth,
) {
  const { left, right, top, height, body } = editableTextLayout(
    block,
    transform,
    settings,
    hasLegacyFonts,
    pageWidth,
  );
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emus(transform.x + left * transform.scale)}" y="${emus(transform.y + top * transform.scale)}"/><a:ext cx="${emus((right - left) * transform.scale)}" cy="${emus(height * transform.scale)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>${body}</p:sp>`;
}

function slideText(page, blocks, transform, settings, hasLegacyFonts) {
  let id = (page.artworkLayers?.length || 0) + 3;
  return blocks.flatMap((block) => {
    const lines = block.paragraphs.flatMap((paragraph) => paragraph.lines);
    if (lines.some((line) => !line.bounds))
      return block.paragraphs.map((paragraph) => ({
        paintOrder: paragraph.lines[0]?.paintOrder ?? Infinity,
        xml: textBox(paragraph, id++, transform, settings, hasLegacyFonts),
      }));
    return [
      {
        paintOrder: Math.min(
          ...lines.map((line) => line.paintOrder ?? Infinity),
        ),
        xml: editableTextBox(
          block,
          id++,
          transform,
          settings,
          hasLegacyFonts,
          page.width,
        ),
      },
    ];
  });
}

function picture(page, transform, id = 2, relationship = "rIdArtwork") {
  const { x, y, scale } = transform;
  const name = page.kind === "image" ? `Image ${id}` : `Artwork ${id}`;
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${name}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${emus(x + (page.x || 0) * scale)}" y="${emus(y + (page.y || 0) * scale)}"/><a:ext cx="${emus(page.width * scale)}" cy="${emus(page.height * scale)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function vectorShape(shape, transform, id, textBody = "") {
  const { scale, x, y } = transform;
  const width = Math.max(1, emus(shape.width * scale));
  const height = Math.max(1, emus(shape.height * scale));
  const color = (value, alpha) =>
    `<a:solidFill><a:srgbClr val="${value}"><a:alpha val="${Math.round(alpha * 100000)}"/></a:srgbClr></a:solidFill>`;
  const fill = shape.fill ? color(shape.fill, shape.fillAlpha) : "<a:noFill/>";
  const dash =
    shape.dash.length % 2 ? [...shape.dash, ...shape.dash] : shape.dash;
  const dashXml = dash.length
    ? `<a:custDash>${dash
        .filter((_, i) => i % 2 === 0)
        .map(
          (value, i) =>
            `<a:ds d="${Math.max(1, Math.round((value / shape.lineWidth) * 100000))}" sp="${Math.max(1, Math.round((dash[i * 2 + 1] / shape.lineWidth) * 100000))}"/>`,
        )
        .join("")}</a:custDash>`
    : '<a:prstDash val="solid"/>';
  const join =
    shape.join === 1
      ? "<a:round/>"
      : shape.join === 2
        ? "<a:bevel/>"
        : `<a:miter lim="${Math.round(shape.miter * 100000)}"/>`;
  const line = shape.stroke
    ? `<a:ln w="${emus(shape.lineWidth * scale)}" cap="${["flat", "rnd", "sq"][shape.cap] || "flat"}" cmpd="sng" algn="ctr">${color(shape.stroke, shape.strokeAlpha)}${dashXml}${join}</a:ln>`
    : "<a:ln><a:noFill/></a:ln>";
  const tags = {
    move: "moveTo",
    line: "lnTo",
    cubic: "cubicBezTo",
    quadratic: "quadBezTo",
  };
  const path = shape.commands
    .map((command) => {
      if (command.type === "close") return "<a:close/>";
      const points = [];
      for (let i = 0; i < command.points.length; i += 2)
        points.push(
          `<a:pt x="${emus((command.points[i] - shape.x) * scale)}" y="${emus((command.points[i + 1] - shape.y) * scale)}"/>`,
        );
      return `<a:${tags[command.type]}>${points.join("")}</a:${tags[command.type]}>`;
    })
    .join("");
  const geometry = shape.preset
    ? `<a:prstGeom prst="${shape.preset}"><a:avLst/></a:prstGeom>`
    : `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${width}" h="${height}" fill="${shape.fill ? "norm" : "none"}" stroke="${shape.stroke ? 1 : 0}" extrusionOk="0">${path}</a:path></a:pathLst></a:custGeom>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emus(x + shape.x * scale)}" y="${emus(y + shape.y * scale)}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm>${geometry}${fill}${line}</p:spPr>${textBody}</p:sp>`;
}

function slideBackground(page, background, transform, width, height) {
  const layer = background?.layer;
  let fill = '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>';
  if (layer?.kind === "shape") {
    fill = `<a:solidFill><a:srgbClr val="${layer.fill}"><a:alpha val="${Math.round((layer.fillAlpha ?? 1) * 100000)}"/></a:srgbClr></a:solidFill>`;
  } else if (layer?.data || (!page.artworkLayers?.length && page.artwork)) {
    const relationship = layer ? `rIdLayer${background.index}` : "rIdArtwork";
    const left = Math.round((transform.x / width) * 100000);
    const top = Math.round((transform.y / height) * 100000);
    const right = Math.round(
      ((width - transform.x - page.width * transform.scale) / width) * 100000,
    );
    const bottom = Math.round(
      ((height - transform.y - page.height * transform.scale) / height) *
        100000,
    );
    fill = `<a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect l="${left}" t="${top}" r="${right}" b="${bottom}"/></a:stretch></a:blipFill>`;
  }
  return `<p:bg><p:bgPr>${fill}<a:effectLst/></p:bgPr></p:bg>`;
}

export async function createPdfPptx(pages, settings) {
  if (!pages.length) throw new Error("PDF 没有页面");
  const { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } =
    await import("@zip.js/zip.js");
  const writer = new ZipWriter(new BlobWriter(MIME));
  const xml = (path, source) => writer.add(path, new TextReader(source));
  // PowerPoint uses a single slide size. Mixed PDF page sizes fit proportionally
  // on this canvas; neither the artwork nor editable text is stretched.
  const width = pages[0].width;
  const height = pages[0].height;
  const hasLegacyFonts = pages.some((page) =>
    page.paragraphs.some((paragraph) =>
      paragraph.lines.some((line) =>
        line.spans.some((span) => isLegacyFont(span.fontFamily)),
      ),
    ),
  );
  const parts = [
    ["/ppt/presentation.xml", "presentationml.presentation.main"],
    ["/ppt/slideMasters/slideMaster1.xml", "presentationml.slideMaster"],
    ["/ppt/slideLayouts/slideLayout1.xml", "presentationml.slideLayout"],
    ["/ppt/theme/theme1.xml", "theme"],
    ...pages.map((_, index) => [
      `/ppt/slides/slide${index + 1}.xml`,
      "presentationml.slide",
    ]),
  ];
  await xml(
    "[Content_Types].xml",
    `${HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${parts.map(([path, type]) => `<Override PartName="${path}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`).join("")}</Types>`,
  );
  await xml(
    "_rels/.rels",
    relationships([["rId1", "officeDocument", "ppt/presentation.xml"]]),
  );
  await xml(
    "ppt/presentation.xml",
    `${HEADER}<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst><p:sldIdLst>${pages.map((_, index) => `<p:sldId id="${256 + index}" r:id="rIdSlide${index + 1}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${emus(width)}" cy="${emus(height)}" type="custom"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`,
  );
  await xml(
    "ppt/_rels/presentation.xml.rels",
    relationships([
      ["rIdMaster", "slideMaster", "slideMasters/slideMaster1.xml"],
      ...pages.map((_, index) => [
        `rIdSlide${index + 1}`,
        "slide",
        `slides/slide${index + 1}.xml`,
      ]),
    ]),
  );
  const colorMap =
    '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';
  await xml(
    "ppt/slideMasters/slideMaster1.xml",
    `${HEADER}<p:sldMaster xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld>${colorMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rIdLayout"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
  );
  await xml(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    relationships([
      ["rIdLayout", "slideLayout", "../slideLayouts/slideLayout1.xml"],
      ["rIdTheme", "theme", "../theme/theme1.xml"],
    ]),
  );
  await xml(
    "ppt/slideLayouts/slideLayout1.xml",
    `${HEADER}<p:sldLayout xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  );
  await xml(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    relationships([
      ["rIdMaster", "slideMaster", "../slideMasters/slideMaster1.xml"],
    ]),
  );
  const colors = {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "333333",
    lt2: "EEEEEE",
    accent1: "4472C4",
    accent2: "ED7D31",
    accent3: "A5A5A5",
    accent4: "FFC000",
    accent5: "5B9BD5",
    accent6: "70AD47",
    hlink: "0563C1",
    folHlink: "954F72",
  };
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  await xml(
    "ppt/theme/theme1.xml",
    `${HEADER}<a:theme xmlns:a="${A}" name="PDF"><a:themeElements><a:clrScheme name="PDF">${Object.entries(
      colors,
    )
      .map(
        ([name, color]) => `<a:${name}><a:srgbClr val="${color}"/></a:${name}>`,
      )
      .join(
        "",
      )}</a:clrScheme><a:fontScheme name="PDF"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface="Iskoola Pota"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface="Iskoola Pota"/></a:minorFont></a:fontScheme><a:fmtScheme name="PDF"><a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${`<a:ln w="12700">${fill}<a:prstDash val="solid"/></a:ln>`.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${"<a:effectStyle><a:effectLst/></a:effectStyle>".repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
  );
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const number = index + 1;
    const scale = Math.min(width / page.width, height / page.height);
    const transform = {
      scale,
      x: (width - page.width * scale) / 2,
      y: (height - page.height * scale) / 2,
    };
    const layers = page.artworkLayers || [];
    const background = pdfSlideBackground(page);
    const blocks = pdfSlideTextBlocks(page);
    const shapeText = new Map();
    for (const block of blocks) {
      if (block.shapeIndex === undefined) continue;
      if (!shapeText.has(block.shapeIndex))
        shapeText.set(block.shapeIndex, { paragraphs: [] });
      shapeText.get(block.shapeIndex).paragraphs.push(...block.paragraphs);
    }
    const elements = slideText(
      page,
      blocks.filter((block) => block.shapeIndex === undefined),
      transform,
      settings,
      hasLegacyFonts,
    );
    if (layers.length)
      elements.push(
        ...layers.flatMap((layer, i) =>
          i === background?.index
            ? []
            : [
                {
                  paintOrder: layer.paintOrder,
                  xml:
                    layer.kind === "shape"
                      ? vectorShape(
                          layer,
                          transform,
                          i + 2,
                          shapeText.has(i)
                            ? editableTextLayout(
                                shapeText.get(i),
                                transform,
                                settings,
                                hasLegacyFonts,
                                page.width,
                                layer,
                              ).body
                            : "",
                        )
                      : picture(
                          { ...page, ...layer },
                          transform,
                          i + 2,
                          `rIdLayer${i}`,
                        ),
                },
              ],
        ),
      );
    const content = elements
      .sort((left, right) => left.paintOrder - right.paintOrder)
      .map((element) => element.xml)
      .join("");
    await xml(
      `ppt/slides/slide${number}.xml`,
      `${HEADER}<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld>${slideBackground(page, background, transform, width, height)}<p:spTree>${group}${content}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    );
    await xml(
      `ppt/slides/_rels/slide${number}.xml.rels`,
      relationships([
        ["rIdLayout", "slideLayout", "../slideLayouts/slideLayout1.xml"],
        ...(page.artwork && !layers.length
          ? [["rIdArtwork", "image", `../media/page-${number}.png`]]
          : []),
        ...layers.flatMap((layer, i) =>
          layer.kind === "shape"
            ? []
            : [
                [
                  `rIdLayer${i}`,
                  "image",
                  `../media/page-${number}-layer-${i}.png`,
                ],
              ],
        ),
      ]),
    );
    if (page.artwork && !layers.length) {
      await writer.add(
        `ppt/media/page-${number}.png`,
        new Uint8ArrayReader(page.artwork),
      );
    }
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].kind === "shape") continue;
      await writer.add(
        `ppt/media/page-${number}-layer-${i}.png`,
        new Uint8ArrayReader(layers[i].data),
      );
    }
  }
  return writer.close();
}
