import {
  fmToUnicode,
  fmToUnicodeSegments,
  unicodeToFmSegments,
} from "./converter.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TEXT_PART =
  /^word\/(?:document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/u;
export const isLegacyFont = (family = "") =>
  /^(?:FM|Bu_?Nisansala$)/iu.test(family.replace(/\s/gu, ""));
export const isIntrinsicBoldFont = (family = "") =>
  /fm(?:ababld|ganganee)/iu.test(family);

export function convertDocumentText(
  text,
  sourceFont,
  settings,
  hasLegacyFonts = false,
) {
  if (settings.target === "legacy") {
    return text
      .split(/([\u0d80-\u0dff\u200c\u200d]+)/gu)
      .filter(Boolean)
      .flatMap((part) =>
        /[\u0d80-\u0dff]/u.test(part)
          ? unicodeToFmSegments(part, settings.options)
          : [{ source: part, text: part, useLegacyFont: false }],
      );
  }
  if (isLegacyFont(sourceFont)) {
    // Nisansala shares the FM letter encoding but uses this smart-quote slot
    // for a comma; the FM font's slot is a square symbol instead.
    const encoded = /^Bu_?Nisansala$/iu.test(sourceFont.replace(/\s/gu, ""))
      ? text.replace(/”/gu, '"')
      : text;
    return [
      {
        source: text,
        text: fmToUnicode(encoded, settings.options),
        useLegacyFont: true,
      },
    ];
  }
  if (hasLegacyFonts && sourceFont)
    return [{ source: text, text, useLegacyFont: false }];
  return fmToUnicodeSegments(text, settings.options);
}

function parseXml(source) {
  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) {
    throw new Error("DOCX XML 无法读取");
  }
  return xml;
}

function child(element, name) {
  return [...(element?.children || [])].find(
    (node) => node.namespaceURI === WORD_NS && node.localName === name,
  );
}

function value(element, name = "val") {
  return element?.getAttributeNS(WORD_NS, name) || "";
}

function enabled(element) {
  return element && !/^(?:0|false|off)$/iu.test(value(element));
}

function styleResolver(styles) {
  const definitions = new Map();
  const defaults = {};
  for (const style of styles?.getElementsByTagNameNS(WORD_NS, "style") || []) {
    definitions.set(value(style, "styleId"), style);
    if (/^(?:1|true|on)$/iu.test(value(style, "default"))) {
      defaults[value(style, "type")] = value(style, "styleId");
    }
  }
  const inherited = (id, seen = new Set()) => {
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const style = definitions.get(id);
    return [
      ...inherited(value(child(style, "basedOn")), seen),
      child(style, "rPr"),
    ];
  };
  const defaultProperties = styles?.getElementsByTagNameNS(
    WORD_NS,
    "rPrDefault",
  )[0];

  return (run) => {
    let paragraph = run.parentElement;
    while (
      paragraph &&
      !(paragraph.namespaceURI === WORD_NS && paragraph.localName === "p")
    ) {
      paragraph = paragraph.parentElement;
    }
    const runProperties = child(run, "rPr");
    const layers = [
      child(defaultProperties, "rPr"),
      ...inherited(
        value(child(child(paragraph, "pPr"), "pStyle")) || defaults.paragraph,
      ),
      ...inherited(value(child(runProperties, "rStyle")) || defaults.character),
      runProperties,
    ];
    const properties = new Map();
    const fonts = {};
    for (const layer of layers) {
      for (const property of layer?.children || []) {
        if (property.namespaceURI !== WORD_NS) continue;
        properties.set(property.localName, property);
        if (property.localName === "rFonts") {
          for (const attribute of property.attributes) {
            if (attribute.namespaceURI === WORD_NS)
              fonts[attribute.localName] = attribute.value;
          }
        }
      }
    }
    return { properties, fonts };
  };
}

function setProperty(run, name, attributes) {
  const xml = run.ownerDocument;
  let properties = child(run, "rPr");
  if (!properties) {
    properties = xml.createElementNS(WORD_NS, "w:rPr");
    run.insertBefore(properties, run.firstChild);
  }
  let property = child(properties, name);
  if (!property) {
    property = xml.createElementNS(WORD_NS, `w:${name}`);
    if (name === "rFonts") {
      const style = child(properties, "rStyle");
      properties.insertBefore(
        property,
        style ? style.nextSibling : properties.firstChild,
      );
    } else properties.appendChild(property);
  }
  for (const [key, text] of Object.entries(attributes)) {
    property.setAttributeNS(WORD_NS, `w:${key}`, text);
  }
  return property;
}

function applyConvertedFont(run, target, settings, effective) {
  const { properties, fonts } = effective;
  const sourceIsComplex = target === "legacy";
  const bold =
    enabled(
      properties.get(sourceIsComplex ? "bCs" : "b") || properties.get("b"),
    ) || isIntrinsicBoldFont(fonts.hAnsi || fonts.ascii || "");
  const family =
    bold && /^FMAbhaya$/iu.test(settings.legacyFontFamily)
      ? "FMAbabld"
      : settings.legacyFontFamily;
  const replacement =
    target === "unicode"
      ? settings.unicodeFontFamilies
      : { ascii: family, hAnsi: family, eastAsia: family, cs: family };
  const font = setProperty(run, "rFonts", replacement);
  for (const attribute of [...font.attributes]) {
    if (
      attribute.namespaceURI === WORD_NS &&
      /Theme$/u.test(attribute.localName)
    ) {
      font.removeAttributeNode(attribute);
    }
  }
  font.setAttributeNS(
    WORD_NS,
    "w:hint",
    target === "unicode" ? "cs" : "default",
  );
  setProperty(run, "cs", { val: target === "unicode" ? "1" : "0" });
  // Word uses separate size/weight/italic slots for complex scripts.
  for (const name of ["sz", "b", "i"]) {
    const original =
      properties.get(sourceIsComplex ? `${name}Cs` : name) ||
      properties.get(name);
    if (!original && !(name === "b" && bold)) continue;
    const val =
      name === "b" && target === "legacy" && /fmababld/iu.test(family)
        ? "0"
        : name === "b" && bold
          ? "1"
          : value(original) || "1";
    setProperty(run, name, { val });
    setProperty(run, `${name}Cs`, { val });
  }
  if (target === "legacy") setProperty(run, "noProof", { val: "1" });
}

// Keep tabs, breaks, drawings and field codes in their original order and runs.
function separateTextRuns(xml) {
  for (const run of [...xml.getElementsByTagNameNS(WORD_NS, "r")]) {
    const content = [...run.children].filter(
      (node) => node !== child(run, "rPr"),
    );
    if (
      !content.some(
        (node) => node.namespaceURI === WORD_NS && node.localName === "t",
      ) ||
      content.every(
        (node) => node.namespaceURI === WORD_NS && node.localName === "t",
      )
    )
      continue;
    const fragment = xml.createDocumentFragment();
    for (const node of content) {
      const replacement = run.cloneNode(false);
      const properties = child(run, "rPr");
      if (properties) replacement.appendChild(properties.cloneNode(true));
      replacement.appendChild(node);
      fragment.appendChild(replacement);
    }
    run.replaceWith(fragment);
  }
}

function textOnly(run) {
  return (
    [...run.children].every(
      (node) =>
        node.namespaceURI === WORD_NS &&
        (node.localName === "rPr" || node.localName === "t"),
    ) && Boolean(child(run, "t"))
  );
}

function convertTextPart(xml, resolveStyle, settings, hasLegacyFonts) {
  separateTextRuns(xml);
  const serializer = new XMLSerializer();
  const handled = new Set();
  let changed = false;
  for (const run of [...xml.getElementsByTagNameNS(WORD_NS, "r")]) {
    if (handled.has(run) || !run.parentNode || !textOnly(run)) continue;
    const signature = child(run, "rPr")
      ? serializer.serializeToString(child(run, "rPr"))
      : "";
    const group = [run];
    let next = run.nextElementSibling;
    while (
      next?.namespaceURI === WORD_NS &&
      next.localName === "r" &&
      textOnly(next) &&
      (child(next, "rPr")
        ? serializer.serializeToString(child(next, "rPr"))
        : "") === signature
    ) {
      group.push(next);
      next = next.nextElementSibling;
    }
    for (const item of group) handled.add(item);
    const text = group
      .map((item) =>
        [...item.children]
          .filter((node) => node.localName === "t")
          .map((node) => node.textContent)
          .join(""),
      )
      .join("");
    const effective = resolveStyle(run);
    const sourceFont = effective.fonts.hAnsi || effective.fonts.ascii || "";
    const explicitLegacy = isLegacyFont(sourceFont);
    const segments = convertDocumentText(
      text,
      sourceFont,
      settings,
      hasLegacyFonts,
    );
    if (
      !segments.some((segment) => segment.text !== segment.source) &&
      !(settings.target === "unicode" && explicitLegacy && text.trim())
    )
      continue;
    const fragment = xml.createDocumentFragment();
    for (const segment of segments) {
      if (!segment.text) continue;
      const replacement = run.cloneNode(false);
      const properties = child(run, "rPr");
      if (properties) replacement.appendChild(properties.cloneNode(true));
      const textNode = xml.createElementNS(WORD_NS, "w:t");
      textNode.setAttributeNS(XML_NS, "xml:space", "preserve");
      textNode.textContent = segment.text;
      replacement.appendChild(textNode);
      if (segment.useLegacyFont)
        applyConvertedFont(replacement, settings.target, settings, effective);
      fragment.appendChild(replacement);
    }
    run.replaceWith(fragment);
    for (const extra of group.slice(1)) extra.remove();
    changed = true;
  }
  return changed;
}

export async function convertSinhalaDocx(file, settings) {
  const {
    BlobReader,
    BlobWriter,
    TextReader,
    TextWriter,
    ZipReader,
    ZipWriter,
  } = await import("@zip.js/zip.js");
  const archive = new ZipReader(new BlobReader(file));
  const writer = new ZipWriter(new BlobWriter(DOCX_MIME));
  try {
    const entries = await archive.getEntries();
    if (!entries.some(({ filename }) => filename === "word/document.xml")) {
      throw new Error("DOCX 文档缺少正文");
    }
    const parts = new Map();
    for (const entry of entries) {
      if (
        TEXT_PART.test(entry.filename) ||
        entry.filename === "word/styles.xml"
      ) {
        parts.set(
          entry.filename,
          parseXml(await entry.getData(new TextWriter())),
        );
      }
    }
    const resolveStyle = styleResolver(parts.get("word/styles.xml"));
    const hasLegacyFonts = [...parts.values()].some((xml) =>
      [...xml.getElementsByTagNameNS(WORD_NS, "rFonts")].some((fonts) =>
        [...fonts.attributes].some((attribute) =>
          isLegacyFont(attribute.value),
        ),
      ),
    );
    for (const entry of entries) {
      const xml = parts.get(entry.filename);
      const changed =
        TEXT_PART.test(entry.filename) &&
        convertTextPart(xml, resolveStyle, settings, hasLegacyFonts);
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
