import { createApp } from "vue";

import Chat from "@/components/markdown/Chat.vue";
import Moment from "@/components/markdown/Moment.vue";

const CHAT_SELECTOR = "[data-markdown-chat]";
const MOMENT_SELECTOR = "[data-markdown-moment]";
const mountedChatBlocks = new WeakMap();

const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

const decodeProps = (value = "") => {
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return {};
  }
};

export function mountChatBlocks(root) {
  if (!root || import.meta.env.SSR) return;

  let mounts = mountedChatBlocks.get(root);
  if (!mounts) {
    mounts = new Map();
    mountedChatBlocks.set(root, mounts);
  }

  for (const [element, app] of mounts) {
    if (!root.contains(element)) {
      app.unmount();
      mounts.delete(element);
    }
  }

  root
    .querySelectorAll(`${CHAT_SELECTOR}, ${MOMENT_SELECTOR}`)
    .forEach((element) => {
      if (mounts.has(element) || !root.contains(element)) return;

      // 客户端始终挂载 Chat/Moment 组件以启用完整交互，
      // 组件渲染结果会替换 SSR 预渲染的静态结构。
      const component = element.matches(CHAT_SELECTOR) ? Chat : Moment;
      const app = createApp(component, decodeProps(element.dataset.props));
      app.mount(element);
      mounts.set(element, app);
    });
}

export function unmountChatBlocks(root) {
  const mounts = root ? mountedChatBlocks.get(root) : null;
  if (!mounts) return;

  mounts.forEach((app) => app.unmount());
  mounts.clear();
  mountedChatBlocks.delete(root);
}

function installInlineCollector(md) {
  if (md.__komorisamInlineCollectorInstalled) return;
  md.__komorisamInlineCollectorInstalled = true;

  md.core.ruler.at("inline", (state) => {
    const { tokens } = state;

    for (const token of tokens) {
      if (token.type === "inline") {
        token.children = [];
        state.md.inline.parse(
          token.content,
          state.md,
          state.env,
          token.children,
        );
        continue;
      }

      if (token.type === "komorisam_collect_inline") {
        const targetToken = token.meta?.targetToken || token;
        const children = [];
        state.md.inline.parse(
          targetToken.content || token.content || "",
          state.md,
          state.env,
          children,
        );
        targetToken.children = children;
        token.children = children;
      }
    }
  });

  md.renderer.rules.komorisam_collect_inline = () => "";
}

function parsePreparedMarkdownTokens(md, source = "", env) {
  const content = String(source || "").trim();
  if (!content) return [];

  const tokens = [];
  md.block.parse(content, md, env, tokens);
  return tokens;
}

function createInlineCollectorToken(targetToken) {
  const token = new targetToken.constructor("komorisam_collect_inline", "", 0);
  token.content = targetToken.content || "";
  token.children = [];
  token.meta = { ...(token.meta || {}), targetToken };
  return token;
}

function collectInlineCollectorTokens(tokens = []) {
  const collectorTokens = [];

  for (const token of tokens) {
    if (token.type === "inline") {
      collectorTokens.push(createInlineCollectorToken(token));
    }
  }

  return collectorTokens;
}

function renderPreparedMarkdownTokens(tokens, options, env, self) {
  if (!tokens?.length) return "";
  return self.render(tokens, options, env).trim();
}

function stripOuterQuote(line) {
  return line.replace(/^[ \t]{0,3}> ?/, "");
}

function stripInnerQuote(line) {
  return line.replace(/^> ?/, "");
}

function stripMarkdownStrong(value = "") {
  return value.replace(/^\*\*(.+?)\*\*$/, "$1").trim();
}

function parseStrongHead(line = "") {
  const cleaned = line.trim().replace(/\s+$/g, "");
  const match = cleaned.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (!match) return null;
  return {
    name: match[1].trim(),
    rest: match[2].trim(),
  };
}

function splitMeta(rest = "") {
  return rest
    .split("·")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCalloutHead(line, type) {
  const match = line.trim().match(new RegExp(`^\\[!${type}\\]\\s*(.*)$`));
  return match?.[1]?.trim() || "";
}

function parseChatHeader(headLine) {
  const head = parseStrongHead(headLine);
  const title = head?.name || stripMarkdownStrong(headLine) || "聊天对象";
  const extra = head?.rest?.replace(/^·\s*/, "").trim();
  return { title, extra };
}

function parseChatMessages(lines) {
  const messages = [];
  let current = null;
  let systemLines = [];

  const pushSystem = () => {
    if (!systemLines.length) return;
    messages.push({
      type: "system",
      content: systemLines.join("\n").trim(),
    });
    systemLines = [];
  };

  const pushCurrent = () => {
    if (current) {
      current.content = current.content.join("\n").trim();
      messages.push(current);
      current = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) continue;

    if (!line.startsWith(">")) {
      pushCurrent();
      systemLines.push(line.trim());
      continue;
    }

    pushSystem();

    const innerLine = stripInnerQuote(line).trimEnd();
    const head = parseStrongHead(innerLine);
    const looksLikeMessageHead = Boolean(head?.name && head?.rest);

    if (looksLikeMessageHead) {
      pushCurrent();
      const meta = splitMeta(head.rest);
      current = {
        username: head.name,
        time: meta.shift() || "",
        footers: meta,
        content: [],
      };
      continue;
    }

    if (current) current.content.push(innerLine);
  }

  pushCurrent();
  pushSystem();
  return messages;
}

function toChatMessageProps(message, options, env, self) {
  if (message.type === "system") {
    return {
      type: "system",
      lines: String(message.content || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
  }

  return {
    type: "message",
    username: message.username || "用户",
    time: message.time || "",
    footers: message.footers || [],
    contentHtml: message.contentTokens?.length
      ? renderPreparedMarkdownTokens(message.contentTokens, options, env, self)
      : "",
  };
}

function prepareChatCallout(md, lines, env) {
  const headLine = parseCalloutHead(lines[0] || "", "chat");
  return {
    headLine,
    ...prepareChatMessages(md, lines.slice(1), env),
  };
}

function prepareChatMessages(md, lines, env) {
  const messages = parseChatMessages(lines);

  for (const message of messages) {
    if (message.type === "system") continue;
    message.contentTokens = parsePreparedMarkdownTokens(
      md,
      message.content,
      env,
    );
  }

  return {
    messages,
    collectorTokens: messages.flatMap((message) =>
      collectInlineCollectorTokens(message.contentTokens || []),
    ),
  };
}

function prepareChatMessagesOnly(md, lines, env) {
  const messageLines = lines.map((line, index) =>
    index === 0 ? line.replace(/^>\s*\[!chat\]\s*/i, "> ") : line,
  );

  return prepareChatMessages(md, messageLines, env);
}

function renderChatMessages(messages, options, env, self) {
  return messages.map((message) =>
    toChatMessageProps(message, options, env, self),
  );
}

// 与 Chat.vue 一致的聊天样式常量（SSR 预渲染复刻用）
const CHAT_SELF_NAMES = new Set(["我", "小群主", "Mori", "KoMoriSam"]);
const CHAT_AVATAR_MAP = {
  "🈚️内👻，LG": "/assets/images/avatar/lg.webp",
  小群主: "/assets/images/avatar/komorisam.webp",
  Mori: "/assets/images/avatar/komorisam.webp",
  真正群主: "/assets/images/avatar/talloran.webp",
  牛子: "/assets/images/avatar/niuzi.webp",
  欢乐豆人: "/assets/images/avatar/joybean.webp",
  天天: "/assets/images/avatar/smellycat7.webp",
  量子: "/assets/images/avatar/quantum.webp",
  泡泡冰: "/assets/images/avatar/paopao.webp",
  李焰老师: "/assets/images/avatar/liyan.webp",
  赵天明老师: "/assets/images/avatar/zhaotianming.webp",
  爸: "/assets/images/avatar/dad.webp",
  妈: "/assets/images/avatar/mom.webp",
};
const CHAT_FOOTER_STYLE_MAP = [
  ["已送达", "badge-info"],
  ["已读", "badge-success"],
  ["发送失败", "badge-error"],
  ["已删除", "badge-neutral"],
  ["已编辑", "badge-primary"],
  ["已转发", "badge-secondary"],
  ["已回复", "badge-accent"],
  ["已引用", "badge-info"],
  ["精华消息", "badge-secondary"],
  ["👍", "badge-success"],
  ["👎", "badge-error"],
  ["💬", "badge-info"],
  ["🔗", "badge-primary"],
  ["📎", "badge-secondary"],
  ["📷", "badge-accent"],
  ["🎥", "badge-warning"],
];
const CHAT_DEFAULT_AVATAR = "/assets/images/avatar/default.webp";

const chatAvatarFor = (username = "") =>
  CHAT_AVATAR_MAP[String(username).trim()] || CHAT_DEFAULT_AVATAR;

const chatFooterClass = (footer = "") =>
  CHAT_FOOTER_STYLE_MAP.find(([keyword]) => footer.includes(keyword))?.[1] ||
  "";

const chatBadgeClass = (extra = "") => {
  if (!extra || /^\d+$/.test(extra)) return "badge-soft";

  return (
    {
      在线: "badge-soft badge-success",
      离线: "badge-soft badge-outline",
      忙碌: "badge-soft badge-error",
    }[extra] || "badge-soft"
  );
};

const renderChatSystemMessage = (message) => {
  const lines = Array.isArray(message.lines) ? message.lines : [];
  const content = lines
    .map((line, index) => `${index ? "<br>" : ""}${line}`)
    .join("");

  return `<div class="chat-page-block"><p class="chat-info">${content}</p></div>`;
};

const renderChatMessage = (message) => {
  const username = message.username || "用户";
  const isSelf = CHAT_SELF_NAMES.has(username);
  const footersHtml = (message.footers || [])
    .map(
      (footer) =>
        `<span class="join-item badge badge-soft ${chatFooterClass(
          footer,
        )}">${footer}</span>`,
    )
    .join("");
  const bubbleClass = isSelf ? "chat chat-end" : "chat chat-start";
  const bubbleExtra = isSelf ? " chat-bubble-primary" : "";

  return `<div class="chat-page-block"><div class="${bubbleClass}"><div class="chat-image avatar"><div class="w-10 rounded-full"><img alt="${username}" src="${chatAvatarFor(
    username,
  )}"></div></div><div class="chat-header">${username} <time class="opacity-50">${
    message.time || ""
  }</time></div>${
    footersHtml
      ? `<div class="chat-footer join mt-1.5">${footersHtml}</div>`
      : ""
  }<div class="chat-bubble${bubbleExtra}">${
    message.contentHtml || ""
  }</div></div></div>`;
};

const renderChatStaticHtml = (header, messages) => {
  const headerHtml = header
    ? `<div class="chat-leading-group"><div class="chat-bar"><i class="ri-arrow-left-wide-line ml-0.5 sm:ml-2 mr-0"></i><div class="chat-image avatar"><div class="w-8 sm:w-10 rounded-full"><img alt="${header.title}" src="${chatAvatarFor(
        header.title,
      )}"></div></div><span class="font-bold">${header.title}</span>${
        header.extra
          ? `<span class="badge max-sm:badge-xs ${chatBadgeClass(
              header.extra,
            )}">${header.extra}</span>`
          : ""
      }<i class="ri-menu-line ml-auto mr-0.5 sm:mr-2"></i></div>${
        messages[0] ? renderChatMessage(messages[0]) : ""
      }</div>`
    : "";

  const remaining = header ? messages.slice(1) : messages;
  const messagesHtml = remaining.map(renderChatMessage).join("");

  return headerHtml + messagesHtml;
};

function renderChatCallout(prepared, options, env, self) {
  const renderedMessages = renderChatMessages(
    prepared.messages,
    options,
    env,
    self,
  );
  const header = parseChatHeader(prepared.headLine);

  // SSR 预渲染输出与 Chat.vue 一致的完整聊天界面，避免首屏空白占位
  if (import.meta.env.SSR) {
    return `<div class="chat-content" data-markdown-chat data-props="${encodeProps(
      { header, messages: renderedMessages },
    )}">${renderChatStaticHtml(header, renderedMessages)}</div>\n`;
  }

  return `<div class="chat-content" data-markdown-chat data-props="${encodeProps(
    {
      header,
      messages: renderedMessages,
    },
  )}"></div>\n`;
}

function renderChatMessagesOnly(prepared, options, env, self) {
  const messages = renderChatMessages(prepared.messages, options, env, self);

  // SSR 预渲染输出完整聊天界面
  if (import.meta.env.SSR) {
    return `<div class="chat-content" data-markdown-chat data-props="${encodeProps(
      { header: null, messages },
    )}">${renderChatStaticHtml(null, messages)}</div>\n`;
  }

  return `<div class="chat-content" data-markdown-chat data-props="${encodeProps(
    {
      header: null,
      messages,
    },
  )}"></div>\n`;
}

function parseMomentHead(line) {
  const headLine = parseCalloutHead(line, "moment");
  const head = parseStrongHead(headLine);
  const username = head?.name || stripMarkdownStrong(headLine) || "用户";
  const meta = splitMeta(head?.rest || "");

  return {
    username,
    time: meta.shift() || "",
    location: meta.join(" · "),
  };
}

function parseMomentStats(line = "") {
  const like =
    line.match(/❤️\s*(\d+)/)?.[1] || line.match(/Likes?:\s*(\d+)/i)?.[1] || "";
  const comment =
    line.match(/💬\s*(\d+)/)?.[1] ||
    line.match(/Comments?:\s*(\d+)/i)?.[1] ||
    "";
  const share =
    line.match(/🔁\s*(\d+)/)?.[1] || line.match(/Shares?:\s*(\d+)/i)?.[1] || "";

  return { like, comment, share };
}

function isMomentStatsLine(line = "") {
  return /❤️\s*\d+|💬\s*\d+|🔁\s*\d+|Likes?:\s*\d+|Comments?:\s*\d+|Shares?:\s*\d+/i.test(
    line,
  );
}

function parseMarkdownImage(line = "") {
  const match = line.trim().match(/^!\[([^\]]*)\]\((.+?)\)$/);
  if (!match) return null;

  let url = match[2].trim();
  const titleMatch = url.match(/^(.+?)\s+["'].*["']$/);
  if (titleMatch) url = titleMatch[1].trim();

  return {
    alt: match[1].trim(),
    url,
  };
}

function parseCommentHead(line = "") {
  const match = line.match(/^-\s+\*\*(.+?)\*\*\s+(.+?)(?:：\s*(.*))?$/);
  if (!match) return null;
  return {
    username: match[1].trim(),
    time: match[2].trim(),
    content: match[3]?.trim() || "",
    replies: [],
  };
}

function parseReplyHead(line = "") {
  const match = line.match(
    /^\s+-\s+\*\*(.+?)\*\*\s+回复\s+\*\*(.+?)\*\*\s+(.+?)(?:：\s*(.*))?$/,
  );
  if (!match) return null;
  return {
    replier: match[1].trim(),
    target: match[2].trim(),
    time: match[3].trim(),
    content: match[4]?.trim() || "",
  };
}

function parseMomentComments(lines) {
  const comments = [];
  let currentComment = null;
  let currentReply = null;

  const pushReply = () => {
    if (currentReply && currentComment) {
      currentReply.content = currentReply.content.trim();
      currentComment.replies.push(currentReply);
    }
    currentReply = null;
  };

  const pushComment = () => {
    pushReply();
    if (currentComment) {
      currentComment.content = currentComment.content.trim();
      comments.push(currentComment);
    }
    currentComment = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;

    const reply = parseReplyHead(line);
    if (reply) {
      pushReply();
      currentReply = reply;
      continue;
    }

    const comment = parseCommentHead(line);
    if (comment) {
      pushComment();
      currentComment = comment;
      continue;
    }

    if (currentReply) {
      currentReply.content += `${currentReply.content ? "\n" : ""}${line.trim()}`;
    } else if (currentComment) {
      currentComment.content += `${currentComment.content ? "\n" : ""}${line.trim()}`;
    }
  }

  pushComment();
  return comments;
}

function parseMomentCalloutData(lines) {
  const { username, time, location } = parseMomentHead(lines[0] || "");
  const contentLines = [];
  const images = [];
  let stats = { like: "", comment: "", share: "" };
  const commentLines = [];
  let inComments = false;

  for (const rawLine of lines.slice(1)) {
    // Keep trailing spaces so markdown line-break markers (two-space newline) still work.
    const line = rawLine;
    const trimmed = rawLine.trim();

    if (/^\*\*评论\*\*$/.test(trimmed)) {
      inComments = true;
      continue;
    }

    if (inComments || /^-\s+\*\*/.test(line)) {
      inComments = true;
      commentLines.push(line);
      continue;
    }

    const image = parseMarkdownImage(trimmed);
    if (image) {
      images.push(image);
      continue;
    }

    if (isMomentStatsLine(trimmed)) {
      stats = parseMomentStats(trimmed);
      continue;
    }

    contentLines.push(line);
  }

  return {
    username,
    time,
    location,
    content: contentLines.join("\n").trim(),
    images,
    stats,
    comments: parseMomentComments(commentLines),
  };
}

function prepareMomentCallout(md, lines, env) {
  const data = parseMomentCalloutData(lines);
  data.contentTokens = parsePreparedMarkdownTokens(md, data.content, env);

  for (const comment of data.comments) {
    comment.contentTokens = parsePreparedMarkdownTokens(
      md,
      comment.content,
      env,
    );
    for (const reply of comment.replies) {
      reply.contentTokens = parsePreparedMarkdownTokens(md, reply.content, env);
    }
  }

  data.collectorTokens = [
    ...collectInlineCollectorTokens(data.contentTokens),
    ...data.comments.flatMap((comment) => [
      ...collectInlineCollectorTokens(comment.contentTokens),
      ...comment.replies.flatMap((reply) =>
        collectInlineCollectorTokens(reply.contentTokens),
      ),
    ]),
  ];

  return data;
}

function renderMomentCallout(prepared, options, env, self) {
  const { username, time, location, images, stats, comments } = prepared;
  const contentHtml = prepared.contentTokens?.length
    ? renderPreparedMarkdownTokens(prepared.contentTokens, options, env, self)
    : "";

  const renderedComments = comments.map((comment) => ({
    username: comment.username,
    time: comment.time,
    contentHtml: comment.contentTokens?.length
      ? renderPreparedMarkdownTokens(comment.contentTokens, options, env, self)
      : "",
    replies: comment.replies.map((reply) => ({
      replier: reply.replier,
      target: reply.target,
      time: reply.time,
      contentHtml: reply.contentTokens?.length
        ? renderPreparedMarkdownTokens(reply.contentTokens, options, env, self)
        : "",
    })),
  }));

  const props = {
    username,
    time,
    location,
    contentHtml,
    images,
    stats,
    comments: renderedComments,
  };

  // SSR 预渲染输出与 Moment.vue 一致的完整结构，避免首屏空白占位
  if (import.meta.env.SSR) {
    return `<div class="moments-card not-prose" data-markdown-moment data-props="${encodeProps(
      props,
    )}">${renderMomentStaticHtml(props)}</div>\n`;
  }

  return `<div class="moments-card not-prose" data-markdown-moment data-props="${encodeProps(
    props,
  )}"></div>\n`;
}

const renderMomentStaticHtml = ({
  username,
  time,
  location,
  contentHtml,
  images = [],
  stats = {},
  comments = [],
}) => {
  const avatar = chatAvatarFor(username);
  const isSelf = CHAT_SELF_NAMES.has(username);
  const infoHtml = `<span class="comments-info" data-paragraph-comment-meta="true"><span class="user-name">${isSelf ? "我" : escapeHtml(username)}</span>${time ? `<span class="comment-time">${escapeHtml(time)}</span>` : ""}</span>`;

  const contentHtmlWithInfo = (() => {
    const trimmed = String(contentHtml || "").trim();
    if (!trimmed) return `<p>${infoHtml}</p>`;

    return trimmed.replace(
      /<p([^>]*)>([\s\S]*?)<\/p>/,
      (match, attrs, body) => {
        const triggerMatch = body.match(
          /([\s\S]*?)(<button\b[^>]*\bcomment-trigger\b[\s\S]*?<\/button>\s*)$/,
        );
        const bodyHtml = triggerMatch ? triggerMatch[1] : body;
        const triggerHtml = triggerMatch ? triggerMatch[2] : "";

        return `<p${attrs}>${infoHtml}<span data-paragraph-comment-content="true">${bodyHtml}</span>${triggerHtml}</p>`;
      },
    );
  })();

  const imagesHtml = images.length
    ? `<div class="moments-images not-prose">${images
        .map(
          ({ url, alt }) =>
            `<img src="${url}" alt="${alt || ""}" loading="lazy">`,
        )
        .join("")}</div>`
    : "";

  const actionsHtml = [
    { label: "点赞", icon: "ri-thumb-up-line", value: stats.like || "" },
    { label: "评论", icon: "ri-chat-3-line", value: stats.comment || "" },
    { label: "分享", icon: "ri-share-forward-line", value: stats.share || "" },
  ]
    .map(
      ({ label, icon, value }) =>
        `<button type="button" class="btn btn-ghost btn-sm"><i class="${icon}"></i><span class="hidden sm:inline">${label}</span>${
          value
            ? `<span class="hidden sm:inline">·</span><span>${value}</span>`
            : ""
        }</button>`,
    )
    .join("");

  const commentsHtml = comments.length
    ? `<div class="moments-comments"><div class="flex items-center gap-2 mb-2 w-full"><div class="avatar"><div class="w-8 rounded-full"><img src="${chatAvatarFor(
        "小群主",
      )}" alt="小群主"></div></div><div class="join w-full"><input type="text" placeholder="说点什么……" class="input input-bordered input-sm join-item w-full"><button type="button" class="btn btn-primary btn-sm join-item">发送</button></div></div><div class="comments-list">${comments
        .map((comment) => {
          const commentUsername = comment.username || "用户";
          const commentIsSelf = CHAT_SELF_NAMES.has(commentUsername);
          const commentInfo = `<span class="comments-info" data-paragraph-comment-meta="true"><span class="user-name">${
            commentIsSelf ? "我" : escapeHtml(commentUsername)
          }</span>${
            comment.time
              ? `<span class="comment-time">${escapeHtml(comment.time)}</span>`
              : ""
          }</span>`;
          const commentBody = comment.contentHtml || "";
          const commentHtml = commentBody.trim()
            ? commentBody.replace(
                /<p([^>]*)>([\s\S]*?)<\/p>/,
                (match, attrs, body) => {
                  const triggerMatch = body.match(
                    /([\s\S]*?)(<button\b[^>]*\bcomment-trigger\b[\s\S]*?<\/button>\s*)$/,
                  );
                  const bodyHtml = triggerMatch ? triggerMatch[1] : body;
                  const triggerHtml = triggerMatch ? triggerMatch[2] : "";
                  return `<p${attrs}>${commentInfo}<span data-paragraph-comment-content="true">${bodyHtml}</span>${triggerHtml}</p>`;
                },
              )
            : `<p>${commentInfo}</p>`;

          const repliesHtml = (comment.replies || [])
            .map((reply) => {
              const replier = reply.replier || "用户";
              const target = reply.target || "用户";
              const replierIsSelf = CHAT_SELF_NAMES.has(replier);
              const replyInfo = `<span class="comments-info" data-paragraph-comment-meta="true"><span class="user-name">${
                replierIsSelf ? "我" : escapeHtml(replier)
              }<span class="opacity-60"> 回复 </span>${escapeHtml(
                target,
              )}</span>${
                reply.time
                  ? `<span class="comment-time">${escapeHtml(
                      reply.time,
                    )}</span>`
                  : ""
              }</span>`;
              const replyBody = reply.contentHtml || "";
              const replyContent = replyBody.trim()
                ? replyBody.replace(
                    /<p([^>]*)>([\s\S]*?)<\/p>/,
                    (match, attrs, body) => {
                      const triggerMatch = body.match(
                        /([\s\S]*?)(<button\b[^>]*\bcomment-trigger\b[\s\S]*?<\/button>\s*)$/,
                      );
                      const bodyHtml = triggerMatch ? triggerMatch[1] : body;
                      const triggerHtml = triggerMatch ? triggerMatch[2] : "";
                      return `<p${attrs}>${replyInfo}<span data-paragraph-comment-content="true">${bodyHtml}</span>${triggerHtml}</p>`;
                    },
                  )
                : `<p>${replyInfo}</p>`;

              return `<div class="flex items-center gap-2 ml-10 -translate-y-1.5 not-prose"><div class="avatar"><div class="w-8 h-8 rounded-full"><img class="m-0!" src="${chatAvatarFor(
                replier,
              )}" alt="${replier}"></div></div>${replyContent}</div>`;
            })
            .join("");

          return `<div class="flex items-center gap-2 not-prose"><div class="avatar"><div class="w-8 h-8 rounded-full"><img class="m-0!" src="${chatAvatarFor(
            commentUsername,
          )}" alt="${commentUsername}"></div></div>${commentHtml}</div>${repliesHtml}`;
        })
        .join("")}</div></div>`
    : "";

  return `<div class="card-body"><div class="flex items-center gap-3"><div class="avatar"><div class="w-12 rounded-full"><img class="m-0!" src="${avatar}" alt="${username}"></div></div><div class="moments-header"><div class="header-title">${username}</div><div class="header-info">${
    time ? `<span><i class="ri-time-line"></i> ${escapeHtml(time)}</span>` : ""
  }${
    location
      ? `<span><i class="ri-map-pin-2-line"></i> ${escapeHtml(location)}</span>`
      : ""
  }</div></div>${
    isSelf ? '<i class="ri-more-2-line"></i>' : ""
  }</div><div class="moments-content mt-3">${contentHtmlWithInfo}${imagesHtml}</div><div class="moments-actions">${actionsHtml}</div>${commentsHtml}</div>`;
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function installCalloutPlugin(md) {
  if (md.__komorisamChatCalloutPluginInstalled) return;
  md.__komorisamChatCalloutPluginInstalled = true;
  installInlineCollector(md);

  md.renderer.rules.komorisam_chat_moment_callout = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    const { type, mode, prepared } = tokens[idx].meta || {};

    if (type === "chat" && prepared) {
      if (mode === "messages-only") {
        return renderChatMessagesOnly(prepared, options, env, self);
      }

      return renderChatCallout(prepared, options, env, self);
    }

    if (type === "moment" && prepared) {
      return renderMomentCallout(prepared, options, env, self);
    }

    return "";
  };

  md.core.ruler.after(
    "block",
    "komorisam_prepare_chat_moment_callouts",
    (state) => {
      const { tokens } = state;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== "komorisam_chat_moment_callout") continue;
        if (token.meta?.prepared) continue;

        const { type, mode, lines = [] } = token.meta || {};
        const prepared =
          type === "chat"
            ? mode === "messages-only"
              ? prepareChatMessagesOnly(md, lines, state.env)
              : prepareChatCallout(md, lines, state.env)
            : type === "moment"
              ? prepareMomentCallout(md, lines, state.env)
              : null;

        if (!prepared) continue;
        token.meta.prepared = prepared;

        const collectorTokens = prepared.collectorTokens || [];
        if (collectorTokens.length) {
          // collector 只参与 inline 阶段的全局脚注收集，不直接输出 HTML。
          tokens.splice(i, 0, ...collectorTokens);
          i += collectorTokens.length;
        }
      }
    },
  );

  md.block.ruler.before(
    "blockquote",
    "komorisam_chat_moment_callout",
    (state, startLine, endLine, silent) => {
      const startPos = state.bMarks[startLine] + state.tShift[startLine];
      const startMax = state.eMarks[startLine];
      const startRaw = state.src.slice(startPos, startMax);
      const startText = stripOuterQuote(startRaw).trim();
      const fullType = startText.match(/^\[!(chat|moment)\]\s*/)?.[1];
      const messagesOnly = /^>\s*\[!chat\]\s*/i.test(startText);
      const type = fullType || (messagesOnly ? "chat" : "");

      if (!type) return false;
      if (silent) return true;

      const lines = [];
      let nextLine = startLine;

      for (; nextLine < endLine; nextLine += 1) {
        const pos = state.bMarks[nextLine] + state.tShift[nextLine];
        const max = state.eMarks[nextLine];
        const raw = state.src.slice(pos, max);

        if (!/^[ \t]{0,3}>/.test(raw)) break;
        lines.push(stripOuterQuote(raw));
      }

      const token = state.push("komorisam_chat_moment_callout", "", 0);
      token.block = true;
      token.map = [startLine, nextLine];
      token.meta = {
        type,
        mode: messagesOnly ? "messages-only" : "full",
        lines,
      };

      state.line = nextLine;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote"] },
  );
}

export function chatContainerPlugin(md) {
  installCalloutPlugin(md);
}

export function chatHeaderPlugin(md) {
  installCalloutPlugin(md);
}

export function momentsPlugin(md) {
  installCalloutPlugin(md);
}
