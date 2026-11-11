import { parseFragment, serialize } from "parse5";
import abbr from "markdown-it-abbr";
import attrs from "markdown-it-attrs";
import bracketedSpans from "markdown-it-bracketed-spans";
import { full as emoji } from "markdown-it-emoji";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import MarkdownIt from "markdown-it";

import { alertPlugin } from "../../src/utils/markdown/markdown-it-alert.js";
import { chatContainerPlugin } from "../../src/utils/markdown/markdown-it-chat.js";
import { parseCodeFenceInfo } from "../../src/utils/markdown/markdown-it-code.js";
import { figurePlugin } from "../../src/utils/markdown/markdown-it-figure.js";
import { footnotePlugin } from "../../src/utils/markdown/markdown-it-footnote.js";
import { rubyPlugin } from "../../src/utils/markdown/markdown-it-ruby.js";
import { taskStatusPlugin } from "../../src/utils/markdown/markdown-it-task-status.js";
import { projectMarkdownComponentProps } from "../../src/utils/markdown/markdown-component-props.js";
import { MARKDOWN_MODE_STANDARD, renderMarkdown } from "../../src/utils/markdown/render-markdown.js";
import { sanitizeMarkdownHtml } from "../../src/utils/markdown/sanitize-html.js";

const { escapeHtml } = MarkdownIt().utils;
const getAttribute = (node, name) => node.attrs?.find((attr) => attr.name === name)?.value;
const hasClass = (node, name) => getAttribute(node, "class")?.split(/\s+/u).includes(name);

const renderByline = (...fields) => {
  const text = fields.filter(Boolean).join(" · ");
  return text ? `<p><strong>${escapeHtml(text)}</strong></p>` : "";
};

const componentRenderers = {
  "markdown-alert": ({ titleHtml }, body) => {
    const title = titleHtml ? `<p>${titleHtml}</p>` : "";
    return `<blockquote>${title}${body}</blockquote>`;
  },
  "markdown-chat": ({ ui, messages }) => {
    const content = messages.map(({ username, time, contentHtml, footers = [] }) =>
      renderByline(username, time, ...footers) + contentHtml,
    ).join("");
    return `<blockquote>${renderByline(ui?.title, ui?.extra)}${content}</blockquote>`;
  },
  "markdown-moment": ({ username, time, location, contentHtml, images, stats, comments }) => {
    const photos = images.map(({ url, alt }) =>
      `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"></p>`,
    ).join("");
    const discussion = comments.map((comment) => {
      const replies = comment.replies.map(({ replier, target, time, contentHtml }) =>
        renderByline([replier, target].filter(Boolean).join(" → "), time) + contentHtml,
      ).join("");
      return renderByline(comment.username, comment.time) + comment.contentHtml + replies;
    }).join("");
    const counts = [
      stats.like && `❤️ ${stats.like}`,
      stats.comment && `💬 ${stats.comment}`,
      stats.share && `🔁 ${stats.share}`,
    ];
    const byline = renderByline(username, time, location);
    return `<blockquote>${byline}${contentHtml}${photos}${renderByline(...counts)}${discussion}</blockquote>`;
  },
};

const renderFeedFences = (md) => {
  const renderFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const html = renderFence(tokens, index, options, env, self);
    const { language, title } = parseCodeFenceInfo(tokens[index].info);
    const diagramLink = language.toLowerCase() === "mermaid"
      ? `<p><a href="${escapeHtml(env.articleUrl)}">在原文查看图表 / View diagram in the article</a></p>`
      : "";
    return renderByline(title) + diagramLink + html;
  };
};

const portableHtml = (node) => {
  node.childNodes = (node.childNodes || []).flatMap((child) => {
    const tag = child.tagName;
    if (!tag) return [child];
    if (hasClass(child, "task-list-item-checkbox") || hasClass(child, "task-list-item-status")) {
      const status = getAttribute(child, "aria-label");
      return status ? [{ nodeName: "#text", value: `[${status}] ` }] : [];
    }
    if (tag.startsWith("markdown-")) {
      const props = projectMarkdownComponentProps(tag, getAttribute(child, "data-markdown-props"));
      const render = componentRenderers[tag];
      if (props && render) {
        const fragment = parseFragment(render(props, serialize(child)));
        portableHtml(fragment);
        return fragment.childNodes;
      }
      portableHtml(child);
      return child.childNodes;
    }
    portableHtml(child);
    const tip = getAttribute(child, "data-tip");
    if (tip) child.childNodes.push({ nodeName: "#text", value: `（${tip}）`, parentNode: child });
    return [child];
  });
  for (const child of node.childNodes) child.parentNode = node;
};

export function renderRssMarkdown(source, { articleUrl, resolveWikiLink, mathPlugin }) {
  const fragment = parseFragment(renderMarkdown(source, {
    mode: MARKDOWN_MODE_STANDARD,
    resolveWikiLink,
    env: { articleUrl },
    plugins: [
      abbr,
      bracketedSpans,
      [attrs, { allowedAttributes: ["id", "class", "data-tip"] }],
      alertPlugin,
      chatContainerPlugin,
      emoji,
      footnotePlugin,
      [rubyPlugin, { rp: ["（", "）"] }],
      sub,
      sup,
      taskStatusPlugin,
      mark,
      figurePlugin,
      renderFeedFences,
      ...(mathPlugin ? [mathPlugin] : []),
    ],
  }));
  portableHtml(fragment);
  return sanitizeMarkdownHtml(serialize(fragment));
}
