export const DRAWING_NS =
  "http://schemas.openxmlformats.org/drawingml/2006/main";
export const PRESENTATION_NS =
  "http://schemas.openxmlformats.org/presentationml/2006/main";
const RELATIONSHIP_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function drawingChild(element, name) {
  return [...(element?.children || [])].find(
    (node) => node.namespaceURI === DRAWING_NS && node.localName === name,
  );
}

export function parsePptxXml(source) {
  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (xml.getElementsByTagName("parsererror").length)
    throw new Error("PPTX XML 无法读取");
  return xml;
}

function resolvePart(source, target) {
  const components = target.startsWith("/")
    ? []
    : source.split("/").slice(0, -1);
  for (const component of target.split("/")) {
    if (component === "..") components.pop();
    else if (component && component !== ".") components.push(component);
  }
  return components.join("/");
}

export function pptxRelationships(parts, source) {
  const components = source.split("/");
  const name = components.pop();
  const xml = parts.get([...components, "_rels", `${name}.rels`].join("/"));
  return new Map(
    [...(xml?.documentElement.children || [])]
      .filter(
        (node) =>
          node.localName === "Relationship" &&
          node.getAttribute("TargetMode") !== "External",
      )
      .map((node) => [
        node.getAttribute("Id"),
        {
          type: node.getAttribute("Type"),
          path: resolvePart(source, node.getAttribute("Target") || ""),
        },
      ]),
  );
}

export function relatedPptxPart(parts, source, type) {
  return [...pptxRelationships(parts, source).values()].find((entry) =>
    entry.type.endsWith(`/${type}`),
  )?.path;
}

export function pptxSlidePaths(parts) {
  const presentation = parts.get("ppt/presentation.xml");
  if (!presentation) throw new Error("PPTX 文档缺少演示文稿");
  const relationships = pptxRelationships(parts, "ppt/presentation.xml");
  const paths = [
    ...presentation.getElementsByTagNameNS(PRESENTATION_NS, "sldId"),
  ].map((slide) => {
    const reference = relationships.get(
      slide.getAttributeNS(RELATIONSHIP_NS, "id"),
    );
    if (!reference?.type.endsWith("/slide") || !parts.has(reference.path)) {
      throw new Error("PPTX 幻灯片无法读取");
    }
    return reference.path;
  });
  if (!paths.length) throw new Error("PPTX 文档缺少幻灯片");
  return paths;
}

export async function readPptxParts(archive, onStage) {
  const { TextWriter } = await import("@zip.js/zip.js");
  const entries = await archive.getEntries();
  onStage?.("parsing");
  const parts = new Map();
  for (const entry of entries) {
    if (!entry.directory && /^ppt\/.*\.(?:xml|rels)$/u.test(entry.filename)) {
      parts.set(
        entry.filename,
        parsePptxXml(await entry.getData(new TextWriter())),
      );
    }
  }
  pptxSlidePaths(parts);
  return { entries, parts };
}

export async function readPptxText(file, onStage) {
  const { BlobReader, ZipReader } = await import("@zip.js/zip.js");
  const archive = new ZipReader(new BlobReader(file));
  try {
    const { parts } = await readPptxParts(archive, onStage);
    return pptxSlidePaths(parts)
      .map((path) =>
        [...parts.get(path).getElementsByTagNameNS(DRAWING_NS, "p")]
          .map((paragraph) => {
            const text = (node) => {
              if (node.namespaceURI === DRAWING_NS && node.localName === "t")
                return node.textContent;
              if (node.namespaceURI === DRAWING_NS && node.localName === "br")
                return "\n";
              return [...node.children].map(text).join("");
            };
            return text(paragraph);
          })
          .join("\n"),
      )
      .join("\n\n");
  } finally {
    await archive.close();
  }
}
