import {
  convertDocumentText,
  isIntrinsicBoldFont,
  isLegacyFont,
} from "./convert-docx.js";
import {
  DRAWING_NS,
  PRESENTATION_NS,
  drawingChild as child,
  readPptxParts,
  relatedPptxPart,
} from "./pptx-package.js";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const TEXT_PART =
  /^ppt\/(?:slides|slideLayouts|slideMasters|notesSlides|notesMasters|diagrams|charts)\/[^/]+\.xml$/u;
const XML_NS = "http://www.w3.org/XML/1998/namespace";

function first(element, namespace, name) {
  return element?.getElementsByTagNameNS(namespace, name)[0];
}

function ancestor(element, name) {
  let node = element.parentElement;
  while (node && node.localName !== name) node = node.parentElement;
  return node;
}

function levelProperties(element, level) {
  return (
    child(child(element, `lvl${level + 1}pPr`), "defRPr") ||
    child(child(element, "defPPr"), "defRPr")
  );
}

function placeholder(shape) {
  return first(shape, PRESENTATION_NS, "ph");
}

function matchingShape(xml, reference, byType = false) {
  if (!reference) return null;
  const shapes = [
    ...(xml?.getElementsByTagNameNS(PRESENTATION_NS, "sp") || []),
  ];
  const exact =
    !byType &&
    shapes.find(
      (shape) =>
        placeholder(shape) &&
        (placeholder(shape).getAttribute("idx") || "0") ===
          (reference.getAttribute("idx") || "0"),
    );
  return (
    exact ||
    shapes.find(
      (shape) =>
        placeholder(shape) &&
        (placeholder(shape).getAttribute("type") || "obj") ===
          (reference.getAttribute("type") || "obj"),
    )
  );
}

function shapeProperties(shape, level) {
  const body = [...(shape?.children || [])].find(
    (node) => node.localName === "txBody",
  );
  const paragraph = [...(body?.children || [])].find(
    (node) =>
      node.localName === "p" &&
      Number(child(node, "pPr")?.getAttribute("lvl") || 0) === level,
  );
  return [
    levelProperties(child(body, "lstStyle"), level),
    child(child(paragraph, "pPr"), "defRPr"),
  ];
}

function styleResolver(parts, path) {
  const layoutPath = relatedPptxPart(parts, path, "slideLayout");
  const masterPath = /\/slideMasters\/|\/notesMasters\//u.test(path)
    ? path
    : relatedPptxPart(parts, layoutPath || path, "slideMaster") ||
      relatedPptxPart(parts, path, "notesMaster");
  const layout = parts.get(layoutPath);
  const master = parts.get(masterPath);
  const themePath =
    relatedPptxPart(parts, masterPath || path, "theme") ||
    relatedPptxPart(parts, "ppt/presentation.xml", "theme");
  const scheme = first(parts.get(themePath), DRAWING_NS, "fontScheme");
  const themeFont = (name) => {
    const match = /^\+(mj|mn)-(lt|ea|cs)$/u.exec(name);
    if (!match) return name;
    const family = child(scheme, match[1] === "mj" ? "majorFont" : "minorFont");
    const slot = { lt: "latin", ea: "ea", cs: "cs" }[match[2]];
    return (
      child(family, slot)?.getAttribute("typeface") ||
      (slot === "cs"
        ? [...(family?.children || [])]
            .find(
              (node) =>
                node.localName === "font" &&
                node.getAttribute("script") === "Sinh",
            )
            ?.getAttribute("typeface")
        : "") ||
      child(family, "latin")?.getAttribute("typeface") ||
      ""
    );
  };
  const defaults = first(
    parts.get("ppt/presentation.xml"),
    PRESENTATION_NS,
    "defaultTextStyle",
  );
  return (run) => {
    const paragraph = ancestor(run, "p");
    const shape = ancestor(run, "sp");
    const reference = placeholder(shape);
    const layoutShape = matchingShape(layout, reference);
    const inheritedReference = placeholder(layoutShape) || reference;
    const level = Math.min(
      8,
      Math.max(0, Number(child(paragraph, "pPr")?.getAttribute("lvl") || 0)),
    );
    const type =
      reference?.getAttribute("type") ||
      inheritedReference?.getAttribute("type") ||
      "obj";
    const category = /^(?:title|ctrTitle)$/u.test(type)
      ? "titleStyle"
      : reference && /^(?:body|subTitle|obj)$/u.test(type)
        ? "bodyStyle"
        : "otherStyle";
    const masterStyle =
      first(master, PRESENTATION_NS, "notesStyle") ||
      first(master, PRESENTATION_NS, category);
    const layers = [
      levelProperties(defaults, level),
      levelProperties(masterStyle, level),
      ...shapeProperties(
        matchingShape(master, inheritedReference, true),
        level,
      ),
      ...shapeProperties(layoutShape, level),
      levelProperties(child(paragraph?.parentElement, "lstStyle"), level),
      child(child(paragraph, "pPr"), "defRPr"),
      child(run, "rPr"),
    ];
    const fonts = {};
    const attributes = {};
    for (const layer of layers) {
      for (const attribute of layer?.attributes || [])
        attributes[attribute.localName] = attribute.value;
      for (const slot of ["latin", "ea", "cs"]) {
        const name = child(layer, slot)?.getAttribute("typeface");
        if (name) fonts[slot] = themeFont(name);
      }
    }
    const fontRef =
      first(shape, DRAWING_NS, "fontRef")?.getAttribute("idx") === "major"
        ? "+mj-lt"
        : "+mn-lt";
    return { fonts, attributes, sourceFont: fonts.latin || themeFont(fontRef) };
  };
}

function applyFont(run, effective, settings) {
  let properties = child(run, "rPr");
  if (!properties) {
    properties = run.ownerDocument.createElementNS(DRAWING_NS, "a:rPr");
    run.insertBefore(properties, run.firstChild);
  }
  const bold =
    /^(?:1|true|on)$/iu.test(effective.attributes.b || "") ||
    isIntrinsicBoldFont(effective.sourceFont);
  const legacy =
    bold && /^FMAbhaya$/iu.test(settings.legacyFontFamily)
      ? "FMAbabld"
      : settings.legacyFontFamily;
  const fonts =
    settings.target === "unicode"
      ? {
          latin:
            settings.unicodeFontFamilies.ascii ||
            settings.unicodeFontFamilies.hAnsi,
          ea: settings.unicodeFontFamilies.eastAsia,
          cs: settings.unicodeFontFamilies.cs,
        }
      : { latin: legacy, ea: legacy, cs: legacy };
  const order = [
    "latin",
    "ea",
    "cs",
    "sym",
    "hlinkClick",
    "hlinkMouseOver",
    "rtl",
    "extLst",
  ];
  for (const [slot, family] of Object.entries(fonts)) {
    if (!family) continue;
    let font = child(properties, slot);
    if (!font) {
      font = run.ownerDocument.createElementNS(DRAWING_NS, `a:${slot}`);
      properties.insertBefore(
        font,
        [...properties.children].find(
          (node) =>
            node.namespaceURI === DRAWING_NS &&
            order.indexOf(node.localName) > order.indexOf(slot),
        ) || null,
      );
    }
    font.setAttribute("typeface", family);
    font.removeAttribute("charset");
    font.removeAttribute("pitchFamily");
  }
  // A stale symbol-font override otherwise takes precedence over the new face.
  child(properties, "sym")?.remove();
  if (bold)
    properties.setAttribute(
      "b",
      settings.target === "legacy" && isIntrinsicBoldFont(legacy) ? "0" : "1",
    );
  if (settings.target === "unicode") properties.setAttribute("lang", "si-LK");
  properties.setAttribute("dirty", "0");
}

function convertPart(xml, resolveStyle, settings, hasLegacyFonts) {
  const serializer = new XMLSerializer();
  const signature = (run) =>
    child(run, "rPr") ? serializer.serializeToString(child(run, "rPr")) : "";
  const handled = new Set();
  let changed = false;
  for (const run of [
    ...xml.getElementsByTagNameNS(DRAWING_NS, "r"),
    ...xml.getElementsByTagNameNS(DRAWING_NS, "fld"),
  ]) {
    if (handled.has(run) || !run.parentNode || !child(run, "t")) continue;
    const group = [run];
    let next = run.nextElementSibling;
    while (
      run.localName === "r" &&
      next?.namespaceURI === DRAWING_NS &&
      next.localName === "r" &&
      child(next, "t") &&
      signature(next) === signature(run)
    ) {
      group.push(next);
      next = next.nextElementSibling;
    }
    group.forEach((node) => handled.add(node));
    const text = group.map((node) => child(node, "t").textContent).join("");
    const effective = resolveStyle(run);
    // Wingdings/Symbol runs are artwork, not legacy Sinhala source text.
    if (/^(?:Wingdings|Webdings|Symbol)/iu.test(effective.sourceFont)) continue;
    const segments = convertDocumentText(
      text,
      effective.sourceFont,
      settings,
      hasLegacyFonts,
    );
    if (
      !segments.some((segment) => segment.text !== segment.source) &&
      !(
        settings.target === "unicode" &&
        isLegacyFont(effective.sourceFont) &&
        text.trim()
      )
    )
      continue;
    if (run.localName === "fld") {
      child(run, "t").textContent = segments
        .map((segment) => segment.text)
        .join("");
      if (segments.some((segment) => segment.useLegacyFont))
        applyFont(run, effective, settings);
    } else {
      const fragment = xml.createDocumentFragment();
      for (const segment of segments) {
        if (!segment.text) continue;
        const replacement = run.cloneNode(true);
        const textNode = child(replacement, "t");
        textNode.textContent = segment.text;
        textNode.setAttributeNS(XML_NS, "xml:space", "preserve");
        if (segment.useLegacyFont) applyFont(replacement, effective, settings);
        fragment.appendChild(replacement);
      }
      run.replaceWith(fragment);
      group.slice(1).forEach((node) => node.remove());
    }
    changed = true;
  }
  return changed;
}

export async function convertSinhalaPptx(file, settings) {
  const { BlobReader, BlobWriter, TextReader, ZipReader, ZipWriter } =
    await import("@zip.js/zip.js");
  const archive = new ZipReader(new BlobReader(file));
  try {
    const { entries, parts } = await readPptxParts(archive);
    const hasLegacyFonts = [...parts.values()].some((xml) =>
      [...xml.getElementsByTagNameNS(DRAWING_NS, "*")].some((node) =>
        isLegacyFont(node.getAttribute("typeface") || ""),
      ),
    );
    // Resolve every inherited style before editing any layout/master text.
    const resolvers = new Map(
      [...parts]
        .filter(([path]) => TEXT_PART.test(path))
        .map(([path]) => {
          const resolve = styleResolver(parts, path);
          const styles = new Map(
            [
              ...parts.get(path).getElementsByTagNameNS(DRAWING_NS, "r"),
              ...parts.get(path).getElementsByTagNameNS(DRAWING_NS, "fld"),
            ].map((run) => [run, resolve(run)]),
          );
          return [path, (run) => styles.get(run)];
        }),
    );
    const writer = new ZipWriter(new BlobWriter(PPTX_MIME));
    for (const entry of entries) {
      const xml = parts.get(entry.filename);
      const changed =
        resolvers.has(entry.filename) &&
        convertPart(
          xml,
          resolvers.get(entry.filename),
          settings,
          hasLegacyFonts,
        );
      const data = changed
        ? new TextReader(new XMLSerializer().serializeToString(xml))
        : entry.directory
          ? null
          : new BlobReader(await entry.getData(new BlobWriter()));
      await writer.add(entry.filename, data, {
        directory: entry.directory,
        lastModDate: entry.lastModDate,
        comment: entry.comment,
      });
    }
    return await writer.close();
  } finally {
    await archive.close();
  }
}
