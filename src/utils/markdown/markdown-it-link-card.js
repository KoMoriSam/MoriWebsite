import { getGithubRepository } from "./github-repository-link.js";

function getLinkCard(inline, articleForPath) {
  const bareUrl = inline.content.trim();
  if (getGithubRepository(bareUrl)) return { kind: "github", href: bareUrl };

  const [link, text, close] = inline.children || [];
  if (
    inline.children?.length !== 3 ||
    link.type !== "link_open" ||
    text.type !== "text" ||
    close.type !== "link_close" ||
    link.attrs?.some(([name]) => name !== "href")
  ) {
    return null;
  }

  const href = link.attrGet("href");
  const wikiLabel = link.meta?.wikiArticleLabel;
  if (wikiLabel != null && articleForPath?.(href.split("#", 1)[0])) {
    return { kind: "article", href, label: wikiLabel };
  }
  if (getGithubRepository(href)) {
    return {
      kind: "github",
      href,
      label: text.content === href ? "" : text.content,
    };
  }
  return null;
}

export function linkCardPlugin(md, { articleForPath } = {}) {
  md.core.ruler.push("standalone_link_cards", (state) => {
    const { tokens } = state;
    for (let index = 0; index < tokens.length - 2; index += 1) {
      const open = tokens[index];
      const inline = tokens[index + 1];
      const close = tokens[index + 2];
      if (
        open.type !== "paragraph_open" ||
        open.tag !== "p" ||
        open.level !== 0 ||
        inline.type !== "inline" ||
        close.type !== "paragraph_close"
      ) {
        continue;
      }

      const card = getLinkCard(inline, articleForPath);
      if (!card) continue;

      // Retain the paragraph rules so comment IDs after the card stay stable.
      open.tag = close.tag = "div";
      open.attrJoin("class", "markdown-link-card relative my-(--para-margin-inline) break-inside-avoid-column");
      const token = new state.Token("link_card", "markdown-link-card", 0);
      token.meta = card;
      inline.children = [token];
    }
  });

  md.renderer.rules.link_card = (tokens, index) => {
    const props = encodeURIComponent(JSON.stringify(tokens[index].meta));
    return `<markdown-link-card data-markdown-props="${props}"></markdown-link-card>`;
  };
}
