import { cloneVNode, h } from "vue";
import { RouterLink } from "vue-router";
import { parseSanitizedMarkdownHtml } from "./sanitize-html.js";
import {
  getImageAttrs,
  restoreOriginalImage,
} from "../images/responsive-images.js";

export const MARKDOWN_COMPONENT_RESOLVER = Symbol(
  "markdown-component-resolver",
);

const SITE_ORIGIN = "https://komori.cc";
const EXTERNAL_ICON_LAYOUT = "ms-[0.25em] inline-block align-middle leading-none tracking-normal no-underline";
const graphemeSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;
const wordSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "word" })
  : null;

function hasExternalIcon(node) {
  return node.tagName === "i" && node.attrs?.some((attribute) =>
    attribute.name === "class" && attribute.value.split(/\s+/).includes("ri-external-link-line"),
  ) || getChildNodes(node).some(hasExternalIcon);
}

function getLinkText(child) {
  if (typeof child === "string") return child;
  if (typeof child?.type === "string" && Array.isArray(child.children) &&
      !["svg", "img", "br"].includes(child.type)) {
    return child.children.map(getLinkText).join("");
  }
  return "\uFFFC";
}

function normalizeLinkSpaceNodes(children) {
  return children.map((child) => {
    if (typeof child === "string") return child.replace(/[\u00a0\u202f]/gu, " ");
    if (typeof child?.type !== "string" || !Array.isArray(child.children)) return child;
    const normalized = cloneVNode(child);
    normalized.children = normalizeLinkSpaceNodes(child.children);
    return normalized;
  });
}

function decorateLinkText(children) {
  return children.flatMap((child) => {
    if (typeof child === "string") {
      return child ? [h("span", { class: "markdown-link-text" }, [child])] : [];
    }
    if (typeof child?.type !== "string" || !Array.isArray(child.children) ||
        child.props?.["aria-hidden"] === "true" ||
        ["svg", "img"].includes(child.type)) return [child];
    const decorated = cloneVNode(child);
    decorated.children = decorateLinkText(child.children);
    return [decorated];
  });
}

function splitLinkChildren(children, offset) {
  const before = [];
  const ending = [];
  for (const child of children) {
    const length = getLinkText(child).length;
    if (offset >= length) {
      before.push(child);
      offset -= length;
    } else if (offset === 0) {
      ending.push(child);
    } else if (typeof child === "string") {
      before.push(child.slice(0, offset));
      ending.push(child.slice(offset));
      offset = 0;
    } else {
      const split = splitLinkChildren(child.children, offset);
      const prefix = cloneVNode(child);
      prefix.children = split.before;
      before.push(prefix);
      const suffix = cloneVNode(child);
      suffix.props = { ...suffix.props };
      delete suffix.props.id;
      suffix.children = split.ending;
      ending.push(suffix);
      offset = 0;
    }
  }
  return { before, ending };
}

function getLinkBoundary(text, fromEnd) {
  const words = wordSegmenter ? [...wordSegmenter.segment(text)] : [];
  let wordIndex = fromEnd ? words.length - 1 : 0;
  while (words[wordIndex] && /^\p{P}+$/u.test(words[wordIndex].segment)) {
    wordIndex += fromEnd ? -1 : 1;
  }
  const word = words[wordIndex];
  const unitText = word?.isWordLike ? word.segment : text;
  const graphemes = graphemeSegmenter
    ? [...graphemeSegmenter.segment(unitText)].map(({ segment }) => segment)
    : Array.from(unitText);
  // CJK text breaks by character; alphabetic scripts keep the final word intact.
  if (word?.isWordLike && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(word.segment)) {
    return word.index + (fromEnd ? 0 : word.segment.length);
  }
  return fromEnd
    ? (word?.isWordLike ? word.index + word.segment.length : text.length) - graphemes.at(-1).length
    : (word?.isWordLike ? word.index : 0) + graphemes[0].length;
}

function groupLinkIcons(children, favicon, externalIcon) {
  const content = favicon ? children.slice(1) : children;
  const rawText = content.map(getLinkText).join("");
  // Copied link labels can contain NBSP. At link boundaries these should behave
  // like ordinary spaces, outside the atomic icon groups.
  const leadingLength = rawText.match(/^[\t\n\f\r \u00a0\u202f]*/u)[0].length;
  const trailingLength = rawText.slice(leadingLength).match(/[\t\n\f\r \u00a0\u202f]*$/u)[0].length;
  const text = rawText.slice(leadingLength, rawText.length - trailingLength);
  const group = (nodes) => h("span", {
    class: "inline-block whitespace-nowrap align-baseline text-start indent-0",
  }, nodes);
  if (!text) return [...children, ...(externalIcon ? [externalIcon] : [])];

  const leading = splitLinkChildren(content, leadingLength);
  const trailing = splitLinkChildren(leading.ending, text.length);
  leading.before = normalizeLinkSpaceNodes(leading.before);
  trailing.ending = normalizeLinkSpaceNodes(trailing.ending);
  const trimmed = trailing.before;
  const withBoundarySpaces = (nodes) => [
    ...leading.before,
    ...decorateLinkText(nodes),
    ...trailing.ending,
  ];
  const headEnd = favicon ? getLinkBoundary(text, false) : 0;
  const tailStart = externalIcon ? getLinkBoundary(text, true) : text.length;
  // A one-word link shares both icons in one group; longer labels remain inline.
  if (favicon && externalIcon && headEnd > tailStart) {
    return withBoundarySpaces([group([favicon, ...trimmed, externalIcon])]);
  }
  const head = splitLinkChildren(trimmed, headEnd);
  const tail = splitLinkChildren(head.ending, tailStart - headEnd);
  return withBoundarySpaces([
    ...(favicon ? [group([favicon, ...head.before])] : head.before),
    ...tail.before,
    ...(externalIcon ? [group([...tail.ending, externalIcon])] : tail.ending),
  ]);
}

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

// Keep native numbering, including start and reversed, and size the gutter
// for the widest number. Nested alphabetic and Roman markers use wider glyphs.
function orderedMarkerSpace(node, { start, reversed, type }) {
  const count = getChildNodes(node).filter((child) => child.tagName === "li").length;
  const parsedStart = Number.parseInt(start, 10);
  const first = Number.isFinite(parsedStart) ? parsedStart : reversed ? count : 1;
  const last = first + Math.max(0, count - 1) * (reversed ? -1 : 1);
  const largest = Math.max(first, last);
  const digits = Math.max(String(first).length, String(last).length);

  let depth = 0;
  for (let parent = node.parentNode; parent; parent = parent.parentNode) {
    if (parent.tagName === "ol") depth += 1;
  }

  const roman = type === "I" || type === "i" || (!type && depth >= 2);
  const alphabetic = type === "A" || type === "a" || (!type && depth === 1);
  let width = digits === 1 ? 1 : digits * 0.65 + 0.4;
  if (roman && largest > 0 && largest <= 3999) {
    width = largest <= 3 ? 1.5 : largest <= 9 ? 2.5 : largest <= 39 ? 3 : largest <= 99 ? 4 : 9;
  } else if (alphabetic && Math.min(first, last) > 0) {
    let letters = 1;
    for (let number = largest; number > 26; number = Math.floor((number - 1) / 26)) {
      letters += 1;
    }
    width = letters * (type === "A" ? 0.85 : 0.7) + 0.3;
  }
  return `${Math.max(1, Math.ceil(width * 2) / 2)}em`;
}

function getLinkType(href) {
  if (!href) return null;
  const currentOrigin = globalThis.location?.origin || SITE_ORIGIN;
  try {
    const url = new URL(href, currentOrigin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin === currentOrigin || url.origin === SITE_ORIGIN
      ? "internal"
      : "external";
  } catch {
    return null;
  }
}

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

  if (props.class?.split(/\s+/).includes("ri-external-link-line")) {
    props.class += ` ${EXTERNAL_ICON_LAYOUT}`;
  }

  if (node.tagName === "img" && props.src) {
    const inline = /(?:^|\s)markdown-inline-image(?:\s|$)/u.test(
      props.class || "",
    );
    const fixedWidth = String(props.style || "").match(
      /(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)px/iu,
    )?.[1];
    const sizes = fixedWidth
      ? `(max-width: ${Number(fixedWidth) + 32}px) calc(100vw - 2rem), ${fixedWidth}px`
      : inline
        ? "32px"
        : undefined;
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

const scopedAnchorTargets = new WeakMap();

function scopeHtmlAnchors(fragment, prefix) {
  const ids = new Map();
  const references = [];
  const visit = (node) => {
    if (node.namespaceURI && node.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
    for (const attribute of node.attrs || []) {
      if (attribute.name === "id" && attribute.value) {
        const id = attribute.value;
        attribute.value = prefix + id;
        ids.set(id, attribute.value);
      } else if (
        (attribute.name === "href" && attribute.value.startsWith("#")) ||
        attribute.name === "aria-labelledby" || attribute.name === "aria-describedby"
      ) {
        references.push({ node, attribute });
      }
    }
    getChildNodes(node).forEach(visit);
  };
  visit(fragment);

  for (const { node, attribute } of references) {
    if (attribute.name !== "href") {
      attribute.value = attribute.value.split(/\s+/u).map((id) => ids.get(id) || id).join(" ");
      continue;
    }
    const hash = attribute.value.slice(1);
    let id = ids.get(hash);
    try {
      id = ids.get(decodeURIComponent(hash)) || id;
    } catch {
      // Keep literal fragments containing an invalid percent escape.
    }
    if (id) {
      attribute.value = "#" + encodeURIComponent(id);
      if (node.tagName === "a") scopedAnchorTargets.set(node, id);
    }
  }
}

export const parseHtmlFragment = (html = "", anchorPrefix = "") => {
  const fragment = parseSanitizedMarkdownHtml(html);
  if (anchorPrefix) scopeHtmlAnchors(fragment, anchorPrefix);
  return fragment;
};

const renderNode = (node, resolver, key, parent, router) => {
  if (node.nodeName === "#text") {
    let value = node.value || "";
    if (/[\u00a0\u202f]/u.test(value)) {
      const siblings = getChildNodes(parent);
      const index = siblings.indexOf(node);
      const isLink = (sibling) => sibling?.tagName === "a" &&
        sibling.attrs?.some(({ name }) => name === "href");
      if (isLink(siblings[index - 1])) {
        value = value.replace(/^[\t\n\f\r \u00a0\u202f]+/u, (spaces) => spaces.replace(/[\u00a0\u202f]/gu, " "));
      }
      if (isLink(siblings[index + 1])) {
        value = value.replace(/[\t\n\f\r \u00a0\u202f]+$/u, (spaces) => spaces.replace(/[\u00a0\u202f]/gu, " "));
      }
    }
    return value;
  }
  if (node.nodeName === "#comment") return null;
  if (!node.tagName) return null;

  const props = getVNodeProps(node);
  if (node.tagName === "ol") {
    props.style = [props.style, { "--md-ordered-marker-space": orderedMarkerSpace(node, props) }];
  }
  const linkType =
    node.tagName === "a" && node.namespaceURI === "http://www.w3.org/1999/xhtml"
      ? getLinkType(props.href)
      : null;
  if (linkType === "external") {
    props.target = "_blank";
    props.rel = [
      ...new Set([
        ...String(props.rel || "")
          .split(/\s+/)
          .filter(Boolean),
        "noopener",
        "noreferrer",
      ]),
    ].join(" ");
  } else if (linkType === "internal") {
    delete props.target;
  }
  let children = getChildNodes(node)
    .map((child, index) => renderNode(child, resolver, `${key}-${index}`, node, router))
    .filter((child) => child !== null);
  const firstChild = getChildNodes(node)[0];
  const favicon = linkType && (
    firstChild?.tagName === "markdown-link-icon" ||
    firstChild?.attrs?.some(({ name }) => name === "data-reader-link-icon")
  ) ? children[0] : null;
  const externalIcon = linkType === "external" &&
    !getChildNodes(node).some(hasExternalIcon)
    ? h("i", {
      class: `ri-external-link-line text-[0.625em] text-base-content/25 font-normal ${EXTERNAL_ICON_LAYOUT}`,
      "aria-hidden": "true",
    }) : null;
  if (favicon || externalIcon) {
    children = groupLinkIcons(children, favicon, externalIcon);
    props.class = `${props.class || ""} markdown-inline-link`.trim();
  }
  const resolved = resolver?.({
    tagName: node.tagName,
    props,
    children,
    key,
    parentClass:
      parent?.attrs?.find((attribute) => attribute.name === "class")?.value ||
      "",
  });

  if (resolved === false) return null;
  if (resolved !== undefined && resolved !== null) return resolved;

  const localTarget = scopedAnchorTargets.get(node);
  if (localTarget) {
    props.onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.currentTarget.ownerDocument.getElementById(localTarget);
      if (!target) return;
      event.preventDefault();
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    return h(node.tagName, { ...props, key }, children);
  }

  // The pagination engine places footnotes using their literal fragment URLs.
  const footnoteLink = props.href?.startsWith("#") &&
    (parent?.attrs?.some(({ name, value }) =>
      name === "class" && value.split(/\s+/u).includes("footnote-ref"),
    ) || props.class?.split(/\s+/u).includes("footnote-backref"));
  if (linkType === "internal" && router && props.download == null && !footnoteLink) {
    const { href, ...linkProps } = props;
    const base = new URL(router.currentRoute.value.fullPath, SITE_ORIGIN);
    const url = new URL(href, base);
    return h(RouterLink, {
      ...linkProps,
      key,
      to: url.pathname + url.search + url.hash,
    }, { default: () => children });
  }

  return h(node.tagName, { ...props, key }, children);
};

export const renderHtmlFragment = (fragment, resolver, router) =>
  (fragment?.childNodes || [])
    .map((node, index) => renderNode(node, resolver, `markdown-node-${index}`, fragment, router))
    .filter((node) => node !== null);
