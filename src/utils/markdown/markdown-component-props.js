import { sanitizeMarkdownResourceUrl } from "./sanitize-html.js";

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const stringValue = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;

const booleanValue = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const stringArray = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const projectChatMessage = (message) => {
  if (!isRecord(message)) return null;
  if (message.type === "system") {
    return {
      type: "system",
      contentHtml: stringValue(message.contentHtml),
    };
  }

  if (message.type !== "message") return null;
  return {
    type: "message",
    username: stringValue(message.username),
    time: stringValue(message.time),
    contentHtml: stringValue(message.contentHtml),
    footers: stringArray(message.footers),
  };
};

const projectMomentReply = (reply) =>
  isRecord(reply)
    ? {
        replier: stringValue(reply.replier),
        target: stringValue(reply.target),
        time: stringValue(reply.time),
        contentHtml: stringValue(reply.contentHtml),
      }
    : null;

const projectMomentComment = (comment) =>
  isRecord(comment)
    ? {
        username: stringValue(comment.username),
        time: stringValue(comment.time),
        contentHtml: stringValue(comment.contentHtml),
        replies: Array.isArray(comment.replies)
          ? comment.replies.map(projectMomentReply).filter(Boolean)
          : [],
      }
    : null;

const PROJECTORS = {
  "markdown-alert": (value) => ({
    type: stringValue(value.type, "info"),
    icon: stringValue(value.icon, "ri-information-line"),
    titleHtml: stringValue(value.titleHtml),
    foldable: booleanValue(value.foldable),
    collapsed: booleanValue(value.collapsed),
  }),
  "markdown-chat": (value) => ({
    ui: isRecord(value.ui)
      ? {
          title: stringValue(value.ui.title),
          extra: stringValue(value.ui.extra),
        }
      : null,
    messages: Array.isArray(value.messages)
      ? value.messages.map(projectChatMessage).filter(Boolean)
      : [],
  }),
  "markdown-moment": (value) => ({
    username: stringValue(value.username, "用户"),
    time: stringValue(value.time),
    location: stringValue(value.location),
    contentHtml: stringValue(value.contentHtml),
    images: Array.isArray(value.images)
      ? value.images
          .filter(isRecord)
          .map((image) => ({
            url: sanitizeMarkdownResourceUrl(image.url),
            alt: stringValue(image.alt),
          }))
          .filter((image) => image.url)
      : [],
    stats: isRecord(value.stats)
      ? {
          like: stringValue(value.stats.like),
          comment: stringValue(value.stats.comment),
          share: stringValue(value.stats.share),
        }
      : {},
    comments: Array.isArray(value.comments)
      ? value.comments.map(projectMomentComment).filter(Boolean)
      : [],
  }),
  "markdown-code": (value) => ({
    code: stringValue(value.code),
    language: stringValue(value.language, "plaintext"),
  }),
  "markdown-link-icon": (value) => {
    const src = sanitizeMarkdownResourceUrl(value.src);
    return src ? { src } : null;
  },
  "markdown-mermaid": (value) => ({
    source: stringValue(value.source),
  }),
};

export const projectMarkdownComponentProps = (tagName, encodedValue) => {
  const projector = PROJECTORS[tagName];
  if (!projector || typeof encodedValue !== "string" || !encodedValue) {
    return null;
  }

  try {
    const decoded = JSON.parse(decodeURIComponent(encodedValue));
    if (!isRecord(decoded)) return null;
    return projector(decoded);
  } catch {
    return null;
  }
};

