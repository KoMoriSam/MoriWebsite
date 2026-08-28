const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

const getFaviconUrl = (href = "") => {
  try {
    const normalizedHref = String(href || "").trim();

    if (!/^(?:https?:)?\/\//i.test(normalizedHref)) return "";

    const url = new URL(normalizedHref, "https://markdown.invalid");

    if (!["http:", "https:"].includes(url.protocol)) return "";

    return `https://t0.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(url.hostname)}&size=32`;
  } catch {
    return "";
  }
};

export function linkIconPlugin(md) {
  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const openingTag = defaultLinkOpen(tokens, idx, options, env, self);
    const src = getFaviconUrl(tokens[idx].attrGet("href"));

    if (!src) return openingTag;

    const props = encodeProps({ src });
    return `${openingTag}<markdown-link-icon data-markdown-props="${props}"></markdown-link-icon>`;
  };
}
