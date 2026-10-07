import { h } from "vue";
import { parseFragment } from "parse5";
import { sanitizeMarkdownHtml } from "./sanitize-html.js";
import { getImageAttrs, restoreOriginalImage } from "../images/responsive-images.js";

export const MARKDOWN_COMPONENT_RESOLVER = Symbol(
  "markdown-component-resolver",
);

const BOOLEAN_ATTRIBUTES = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

const getChildNodes = (node) =>
  node?.tagName === "template"
    ? node.content?.childNodes || []
    : node.childNodes || [];

const getAttributeName = (attribute) =>
  attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;

const getVNodeProps = (node) => {
  const props = {};

  for (const attribute of node.attrs || []) {
    const name = getAttributeName(attribute);
    if (name.toLowerCase().startsWith("on")) continue;
    props[name] = BOOLEAN_ATTRIBUTES.has(name.toLowerCase())
      ? true
      : attribute.value;
  }

  if (node.tagName === "img" && props.src) {
    const inline = /(?:^|\s)markdown-inline-image(?:\s|$)/u.test(props.class || "");
    const fixedWidth = String(props.style || "").match(/(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)px/iu)?.[1];
    const sizes = fixedWidth ? `(max-width: ${Number(fixedWidth) + 32}px) calc(100vw - 2rem), ${fixedWidth}px` : inline ? "32px" : undefined;
    Object.assign(props, getImageAttrs(props.src, sizes));
    if (props["data-original-src"]) {
      props.width ||= props["data-original-width"];
      props.height ||= props["data-original-height"];
      props.onError = restoreOriginalImage;
    }
    if (!inline) props.loading ||= "lazy";
  }

  return props;
};

export const parseHtmlFragment = (html = "") =>
  parseFragment(sanitizeMarkdownHtml(html));

const renderNode = (node, resolver, key) => {
  if (node.nodeName === "#text") return node.value || "";
  if (node.nodeName === "#comment") return null;
  if (!node.tagName) return null;

  const props = getVNodeProps(node);
  const children = getChildNodes(node)
    .map((child, index) => renderNode(child, resolver, `${key}-${index}`))
    .filter((child) => child !== null);
  const resolved = resolver?.({
    tagName: node.tagName,
    props,
    children,
    key,
  });

  if (resolved === false) return null;
  if (resolved !== undefined && resolved !== null) return resolved;

  return h(node.tagName, { ...props, key }, children);
};

export const renderHtmlFragment = (fragment, resolver) =>
  (fragment?.childNodes || [])
    .map((node, index) => renderNode(node, resolver, `markdown-node-${index}`))
    .filter((node) => node !== null);
