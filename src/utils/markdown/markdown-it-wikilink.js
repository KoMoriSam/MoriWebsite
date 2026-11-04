import MarkdownItAnchor from "markdown-it-anchor";

export const WIKI_LINK_RESOLVER = Symbol("wiki-link-resolver");

const wikiLink = /(?<!!)\[\[([^\[\]\r\n]+)\]\]/gu;
const inlineWikiLink = new RegExp(wikiLink.source, "uy");
const blockId = /^\^[\w-]+$/u;
const { slugify, getTokensText } = MarkdownItAnchor.defaults;

const headingId = (slugs) =>
  slugs.length > 1 ? `wiki-heading/${slugs.join("/")}` : slugs[0] || "";

function parseWikiLink(raw) {
  const pipe = raw.indexOf("|");
  const target = (pipe < 0 ? raw : raw.slice(0, pipe)).trim();
  const [note, ...sections] = target.split("#").map((part) => part.trim());
  const fragment = sections.at(-1) || "";
  const label =
    (pipe >= 0 && raw.slice(pipe + 1).trim()) ||
    [note.split("/").at(-1)?.replace(/\.md$/iu, ""), fragment]
      .filter(Boolean)
      .join(" › ");
  if (!target || !label || sections.some((part) => !part)) return null;
  const block = blockId.test(fragment);
  if (block && sections.length > 1) return null;
  return {
    note,
    label,
    id: block ? fragment : headingId(sections.map(slugify)),
    heading: Boolean(fragment) && !block,
  };
}

// Include the resolution of missing targets so publishing one invalidates its referrers.
export function wikiLinkDependencies(source, resolveNote) {
  const dependencies = new Map();
  for (const [, raw] of String(source || "").matchAll(wikiLink)) {
    const link = parseWikiLink(raw);
    if (link?.note && !dependencies.has(link.note))
      dependencies.set(link.note, resolveNote(link.note) || null);
  }
  return [...dependencies];
}

export function wikiLinkPlugin(md, { resolveNote } = {}) {
  md.inline.ruler.before("link", "wiki_link", (state, silent) => {
    if (silent || state.linkLevel || !state.src.startsWith("[[", state.pos))
      return false;
    inlineWikiLink.lastIndex = state.pos;
    const match = inlineWikiLink.exec(state.src);
    if (!match || inlineWikiLink.lastIndex > state.posMax) return false;
    const link = parseWikiLink(match[1]);
    if (
      !link ||
      (link.note && !resolveNote) ||
      state.src[inlineWikiLink.lastIndex] === "{"
    )
      return false;
    state.pos = inlineWikiLink.lastIndex;

    const path = link.note ? resolveNote?.(link.note) : "";
    const canLink = link.note
      ? typeof path === "string" &&
        /^\/(?!\/)[^\\\s\p{Cc}]*$/u.test(path)
      : Boolean(link.id);
    if (canLink) {
      const { id } = link;
      const token = state.push("link_open", "a", 1);
      token.attrSet("href", path + (id ? `#${encodeURIComponent(id)}` : ""));
      if (!path && link.heading) token.meta = { wikiHeading: id };
    }
    state.push("text", "", 0).content = link.label;
    if (canLink) state.push("link_close", "a", -1);
    return true;
  });

  md.core.ruler.push("wiki_anchors", (state) => {
    const headings = new Map();
    const headingIds = new Set();
    const localLinks = [];
    const blocks = new Set();
    const sectionSlugs = [];
    const addAnchor = (token, id) => {
      const open = new state.Token("span_open", "span", 1);
      open.attrSet("id", id);
      token.children.unshift(open, new state.Token("span_close", "span", -1));
    };
    for (const [index, token] of state.tokens.entries()) {
      if (token.type !== "inline" || !token.children) continue;
      const parent = state.tokens[index - 1];
      if (parent?.type === "heading_open") {
        const slug = slugify(getTokensText(token.children));
        const level = Number(parent.tag.slice(1));
        while (sectionSlugs.at(-1)?.level >= level) sectionSlugs.pop();
        if (slug) {
          sectionSlugs.push({ level, slug });
          const path = sectionSlugs.map((section) => section.slug);
          for (let start = 0; start < path.length; start++) {
            const id = headingId(path.slice(start));
            if (!headings.has(id)) headings.set(id, { parent, token });
          }
        }
        if (parent.attrGet("id")) headingIds.add(parent.attrGet("id"));
      }
      for (const child of token.children)
        if (child.meta?.wikiHeading) localLinks.push(child);

      if (parent?.type !== "paragraph_open") continue;
      const last = token.children.at(-1);
      if (last?.type !== "text") continue;
      const marker = /(?:^|\s)(\^[\w-]+)\s*$/u.exec(last.content);
      if (!marker || !/(?:^|\s)\^[\w-]+\s*$/u.test(token.content)) continue;
      last.content = last.content.slice(0, marker.index);
      if (blocks.has(marker[1])) continue;
      blocks.add(marker[1]);
      addAnchor(token, marker[1]);
    }
    // Keep explicit heading IDs and provide the text-based anchor used by other notes.
    for (const [slug, { parent, token }] of headings) {
      if (!parent.attrGet("id") || headingIds.has(slug)) continue;
      addAnchor(token, slug);
    }
    for (const link of localLinks) {
      const slug = link.meta.wikiHeading;
      const heading = headings.get(slug)?.parent;
      if (!heading) continue;
      if (!heading.attrGet("id")) heading.attrSet("id", slug);
      link.attrSet("href", `#${encodeURIComponent(heading.attrGet("id"))}`);
    }
  });
}
