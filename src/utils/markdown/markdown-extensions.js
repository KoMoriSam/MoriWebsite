import {
  MARKDOWN_MODE_CUSTOM,
  MARKDOWN_MODE_READER,
  MARKDOWN_MODE_STANDARD,
} from "./render-markdown.js";

const standardExtensions = ["alerts", "code", "tables", "wikiLinks"];
const richExtensions = [
  ...standardExtensions, "abbreviations", "attributes", "headingAnchors",
  "social", "emoji", "footnotes", "ruby", "subscript", "superscript",
  "tasks", "math", "mark", "mermaid", "figures", "linkIcons", "linkCards",
];
const defaults = {
  [MARKDOWN_MODE_READER]: [...richExtensions, "paragraphComments", "searchAnchors"],
  [MARKDOWN_MODE_STANDARD]: standardExtensions,
  [MARKDOWN_MODE_CUSTOM]: [],
};

export const resolveMarkdownExtensions = (mode, config) =>
  new Set(config?.extensions ?? defaults[mode]);
