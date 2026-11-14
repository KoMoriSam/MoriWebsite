import MarkdownIt from "markdown-it";
import { linkCardPlugin } from "./markdown-it-link-card.js";
import { wikiLinkPlugin } from "./markdown-it-wikilink.js";

export const MARKDOWN_MODE_READER = "reader";
export const MARKDOWN_MODE_STANDARD = "standard";
export const MARKDOWN_MODE_COMMENT = "comment";
export const MARKDOWN_MODES = [
  MARKDOWN_MODE_READER,
  MARKDOWN_MODE_STANDARD,
  MARKDOWN_MODE_COMMENT,
];

const MARKDOWN_OPTIONS = {
  [MARKDOWN_MODE_READER]: {
    html: true,
    typographer: true,
  },
  [MARKDOWN_MODE_STANDARD]: {
    html: true,
    linkify: true,
    typographer: true,
  },
  [MARKDOWN_MODE_COMMENT]: {
    html: false,
    linkify: true,
    breaks: true,
  },
};

export const createMarkdownRenderer = ({
  mode = MARKDOWN_MODE_READER,
  plugins = [],
  resolveWikiLink,
  parserOptions,
  wikiLinks = true,
  linkCards = mode === MARKDOWN_MODE_READER || mode === MARKDOWN_MODE_COMMENT,
} = {}) => {
  const md = new MarkdownIt({
    ...(MARKDOWN_OPTIONS[mode] || MARKDOWN_OPTIONS[MARKDOWN_MODE_READER]),
    ...parserOptions,
  });

  plugins.forEach((plugin) => {
    if (Array.isArray(plugin)) md.use(plugin[0], plugin[1]);
    else md.use(plugin);
  });
  if (wikiLinks) md.use(wikiLinkPlugin, { resolveNote: resolveWikiLink });
  if (linkCards) {
    md.use(linkCardPlugin, { articleForPath: resolveWikiLink?.articleForPath });
  }

  return (source = "", env = {}) => md.render(String(source || ""), env);
};

export const renderMarkdown = (source, { env, ...options } = {}) =>
  createMarkdownRenderer(options)(source, env);
