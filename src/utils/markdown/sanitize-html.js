import DOMPurify from "isomorphic-dompurify";
import { parseFragment, serialize } from "parse5";

const MARKDOWN_COMPONENT_TAGS = [
  "markdown-alert",
  "markdown-chat",
  "markdown-moment",
  "markdown-code",
  "markdown-link-icon",
  "markdown-mermaid",
];

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "button",
  "caption",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "input",
  "kbd",
  "li",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "mjx-break",
  "mjx-container",
  "svg",
  "defs",
  "g",
  "path",
  "use",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "title",
  "desc",
  ...MARKDOWN_COMPONENT_TAGS,
];

const FORBID_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "base",
  "link",
  "meta",
  "form",
  "textarea",
  "select",
  "option",
  "template",
  "noscript",
  "marquee",
];

const DATA_ATTRIBUTES = [
  "data-footnote-backref",
  "data-footnote-ref",
  "data-markdown-props",
  "data-paragraph-comment-content",
  "data-paragraph-comment-meta",
  "data-paragraph-id",
  "data-reader-comment-scope",
  "data-reader-latex-source",
  "data-reader-math-display",
  "data-reader-paragraph-id",
  "data-source-type",
  "data-task-status",
  "data-task-tone",
  "data-mml-node",
  "data-c",
  "data-latex",
  "data-mjx-linestack",
  "data-mjx-linebox",
  "data-mjx-lineno",
  "data-mjx-texclass",
];

const ARIA_ATTRIBUTES = [
  "aria-busy",
  "aria-describedby",
  "aria-expanded",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "aria-pressed",
];

const ALLOWED_ATTRIBUTES = [
  "alt",
  "checked",
  "class",
  "colspan",
  "datetime",
  "disabled",
  "display",
  "download",
  "d",
  "dx",
  "dy",
  "fill",
  "focusable",
  "height",
  "href",
  "id",
  "jax",
  "lang",
  "loading",
  "open",
  "overflow",
  "preserveaspectratio",
  "rel",
  "reversed",
  "role",
  "rowspan",
  "scope",
  "size",
  "src",
  "start",
  "stroke",
  "stroke-width",
  "style",
  "tabindex",
  "target",
  "title",
  "transform",
  "type",
  "viewbox",
  "width",
  "x",
  "xlink:href",
  "xmlns",
  "xmlns:xlink",
  "y",
  ...DATA_ATTRIBUTES,
  ...ARIA_ATTRIBUTES,
];

const FORBID_ATTRIBUTES = [
  "srcdoc",
  "action",
  "formaction",
  "autofocus",
  "ping",
  "is",
  "name",
];

const ALLOWED_ATTRIBUTE_SET = new Set(ALLOWED_ATTRIBUTES);
const DATA_ATTRIBUTE_SET = new Set(DATA_ATTRIBUTES);
const ARIA_ATTRIBUTE_SET = new Set(ARIA_ATTRIBUTES);
const MARKDOWN_COMPONENT_TAG_SET = new Set(MARKDOWN_COMPONENT_TAGS);
const URL_ATTRIBUTES = new Set(["href", "src"]);

const SANITIZE_OPTIONS = Object.freeze({
  ALLOWED_TAGS,
  ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_TAGS,
  FORBID_ATTR: FORBID_ATTRIBUTES,
  KEEP_CONTENT: true,
  SANITIZE_DOM: true,
});

const getAttributeName = (attribute) =>
  attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;

const hasUnsafeUrlCharacters = (value) =>
  /[\u0000-\u001f\u007f\\]/u.test(value);

export const sanitizeMarkdownUrl = (
  value,
  { allowDataImage = false, allowMailto = true } = {},
) => {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url || hasUnsafeUrlCharacters(url)) return "";

  if (url.startsWith("#")) return url;
  if (url.startsWith("//")) return "";

  if (
    allowDataImage &&
    /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z\d+/]+={0,2}$/iu.test(url)
  ) {
    return url;
  }

  const scheme = url.match(/^([a-z][a-z\d+.-]*):/iu)?.[1]?.toLowerCase();
  if (scheme) {
    if (scheme === "http" || scheme === "https") return url;
    if (allowMailto && scheme === "mailto") return url;
    return "";
  }

  return url;
};

export const sanitizeMarkdownResourceUrl = (
  value,
  { allowDataImage = false } = {},
) => sanitizeMarkdownUrl(value, { allowDataImage, allowMailto: false });

const sanitizeStyle = (tagName, value) => {
  const declarations = String(value || "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean);
  const safe = [];

  for (const declaration of declarations) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const propertyValue = declaration.slice(separator + 1).trim().toLowerCase();

    if (tagName === "img") {
      if (property === "max-width" && propertyValue === "100%") {
        safe.push("max-width: 100%");
      } else if (property === "height" && propertyValue === "auto") {
        safe.push("height: auto");
      } else if (
        property === "width" &&
        /^(?:\d+(?:\.\d+)?)(?:px|%)$/u.test(propertyValue)
      ) {
        safe.push(`width: ${propertyValue}`);
      }
      continue;
    }

    if (
      tagName === "mjx-container" &&
      property === "position" &&
      propertyValue === "relative"
    ) {
      safe.push("position: relative");
      continue;
    }

    if (
      tagName === "svg" &&
      property === "vertical-align" &&
      /^-?\d+(?:\.\d+)?(?:em|ex|px)$/u.test(propertyValue)
    ) {
      safe.push(`vertical-align: ${propertyValue}`);
    }
  }

  return safe.join("; ");
};

const sanitizeSvgPaint = (value) => {
  const paint = String(value || "").trim();
  return /^(?:none|currentcolor|transparent|#[\da-f]{3,8}|url\(#[\w:.-]+\))$/iu.test(
    paint,
  )
    ? paint
    : "";
};

const sanitizeAttributes = (node) => {
  const tagName = node.tagName.toLowerCase();
  const attributes = [];

  for (const attribute of node.attrs || []) {
    const name = getAttributeName(attribute).toLowerCase();
    let value = attribute.value;

    if (
      name.startsWith("on") ||
      FORBID_ATTRIBUTES.includes(name) ||
      !ALLOWED_ATTRIBUTE_SET.has(name)
    ) {
      continue;
    }

    if (name.startsWith("data-") && !DATA_ATTRIBUTE_SET.has(name)) continue;
    if (name.startsWith("aria-") && !ARIA_ATTRIBUTE_SET.has(name)) continue;
    if (name === "data-markdown-props" && !MARKDOWN_COMPONENT_TAG_SET.has(tagName)) {
      continue;
    }

    if (URL_ATTRIBUTES.has(name)) {
      if (tagName === "use" && name === "href") {
        value = String(value || "").trim();
        if (!/^#[\w:.-]+$/u.test(value)) continue;
        attributes.push({ ...attribute, value });
        continue;
      }

      const isImageSource = tagName === "img" && name === "src";
      value = sanitizeMarkdownUrl(value, {
        allowDataImage: isImageSource,
        allowMailto: name === "href",
      });
      if (!value) continue;
    }

    if (name === "xlink:href") {
      value = String(value || "").trim();
      if (!/^#[\w:.-]+$/u.test(value)) continue;
    }

    if (name === "style") {
      value = sanitizeStyle(tagName, value);
      if (!value) continue;
    }

    if (
      name === "display" &&
      (tagName !== "mjx-container" || !/^(?:true|false)$/u.test(value))
    ) {
      continue;
    }

    if (name === "jax" && (tagName !== "mjx-container" || value !== "SVG")) {
      continue;
    }

    if (
      name === "overflow" &&
      (tagName !== "mjx-container" || value !== "overflow")
    ) {
      continue;
    }

    if (name === "size" && (tagName !== "mjx-break" || !/^\d+$/u.test(value))) {
      continue;
    }

    if (name === "fill" || name === "stroke") {
      value = sanitizeSvgPaint(value);
      if (!value) continue;
    }

    if (name === "type" && tagName === "input" && value.toLowerCase() !== "checkbox") {
      continue;
    }

    attributes.push({ ...attribute, value });
  }

  if (tagName === "input") {
    const type = attributes.find((attribute) => attribute.name === "type");
    if (!type) return false;

    node.attrs = attributes.filter((attribute) =>
      ["type", "checked", "disabled", "class", "aria-label"].includes(
        getAttributeName(attribute).toLowerCase(),
      ),
    );
    if (!node.attrs.some((attribute) => attribute.name === "disabled")) {
      node.attrs.push({ name: "disabled", value: "" });
    }
    return true;
  }

  if (tagName === "a" && attributes.some((attribute) => attribute.name === "href")) {
    const target = attributes.find((attribute) => attribute.name === "target");
    if (target?.value === "_blank") {
      const rel = attributes.find((attribute) => attribute.name === "rel");
      if (rel) rel.value = "noopener noreferrer";
      else attributes.push({ name: "rel", value: "noopener noreferrer" });
    }
  }

  node.attrs = attributes;
  return true;
};

const sanitizeTree = (node) => {
  if (!node?.childNodes) return;

  node.childNodes = node.childNodes.filter((child) => {
    if (!child.tagName) return child.nodeName !== "#comment";
    if (!sanitizeAttributes(child)) return false;
    sanitizeTree(child);
    return true;
  });
};

export const sanitizeMarkdownHtml = (html = "") => {
  const purified = DOMPurify.sanitize(String(html || ""), SANITIZE_OPTIONS);
  const fragment = parseFragment(purified);
  sanitizeTree(fragment);
  return serialize(fragment);
};
