import MarkdownIt from "markdown-it";
import { wikiLinkPlugin } from "./markdown-it-wikilink.js";

export const MARKDOWN_MODE_READER = "reader";
export const MARKDOWN_MODE_STANDARD = "standard";
export const MARKDOWN_MODES = [
  MARKDOWN_MODE_READER,
  MARKDOWN_MODE_STANDARD,
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
};

export const renderMarkdown = (
  source = "",
  { mode = MARKDOWN_MODE_READER, plugins = [], resolveWikiLink } = {},
) => {
  const md = new MarkdownIt(
    MARKDOWN_OPTIONS[mode] || MARKDOWN_OPTIONS[MARKDOWN_MODE_READER],
  );

  plugins.forEach((plugin) => {
    if (Array.isArray(plugin)) md.use(plugin[0], plugin[1]);
    else md.use(plugin);
  });
  md.use(wikiLinkPlugin, { resolveNote: resolveWikiLink });

  return md.render(String(source || ""));
};
