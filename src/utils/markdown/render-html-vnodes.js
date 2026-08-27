import { h } from "vue";
import { parseFragment } from "parse5";

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

  return props;
};

export const parseHtmlFragment = (html = "") =>
  parseFragment(String(html || ""));

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

  if (resolved !== undefined && resolved !== null) return resolved;

  return h(node.tagName, { ...props, key }, children);
};

export const renderHtmlFragment = (fragment, resolver) =>
  (fragment?.childNodes || [])
    .map((node, index) => renderNode(node, resolver, `markdown-node-${index}`))
    .filter((node) => node !== null);
