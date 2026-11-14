import MarkdownItAnchor from "markdown-it-anchor";

export function anchorPlugin(md) {
  md.use(MarkdownItAnchor, {
    permalink(slug, options, state, index) {
      const title = options.getTokensText(state.tokens[index + 1].children);
      const close = state.tokens[index + 2];
      close.meta = { ...close.meta, headingLink: { slug, title } };
    },
  });

  md.renderer.rules.heading_close = (tokens, index, options, _env, renderer) => {
    const close = renderer.renderToken(tokens, index, options);
    const link = tokens[index].meta?.headingLink;
    if (!link) return close;

    const href = md.utils.escapeHtml(`#${link.slug}`);
    const label = md.utils.escapeHtml(`跳转至 “${link.title}”`);
    return `<a class="header-anchor" href="${href}" aria-label="${label}"><span aria-hidden="true">#</span></a>${close}`;
  };
}
