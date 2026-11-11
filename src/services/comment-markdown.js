import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });
export const renderCommentMarkdown = (body) => markdown.render(typeof body === "string" ? body : "");
