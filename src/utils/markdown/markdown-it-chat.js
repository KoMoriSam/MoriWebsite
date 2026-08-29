const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

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
  md.__komorisamPrepareAlertTokens?.(tokens, env);
  prepareChatMomentTokens(md, tokens, env);
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
      contentHtml: message.contentTokens?.length
        ? renderPreparedMarkdownTokens(
            message.contentTokens,
            options,
            env,
            self,
          )
        : "",
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
    message.contentTokens = parsePreparedMarkdownTokens(
      md,
      message.type === "system"
        ? message.content.replace(/\n/g, "  \n")
        : message.content,
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
  return prepareChatMessages(md, lines.slice(1), env);
}

function renderChatMessages(messages, options, env, self) {
  return messages.map((message) =>
    toChatMessageProps(message, options, env, self),
  );
}

function renderChatCallout(prepared, options, env, self) {
  const renderedMessages = renderChatMessages(
    prepared.messages,
    options,
    env,
    self,
  );
  const ui = parseChatHeader(prepared.headLine);

  return `<markdown-chat data-markdown-props="${encodeProps({
    ui,
    messages: renderedMessages,
  })}"></markdown-chat>\n`;
}

function renderChatMessagesOnly(prepared, options, env, self) {
  const messages = renderChatMessages(prepared.messages, options, env, self);

  return `<markdown-chat data-markdown-props="${encodeProps({
    header: null,
    messages,
  })}"></markdown-chat>\n`;
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

  return `<markdown-moment data-markdown-props="${encodeProps(
    props,
  )}"></markdown-moment>\n`;
}

function prepareChatMomentTokens(md, tokens, env) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "komorisam_chat_moment_callout") continue;
    if (token.meta?.prepared) continue;

    const { type, mode, lines = [] } = token.meta || {};
    const prepared =
      type === "chat"
        ? mode === "messages-only"
          ? prepareChatMessagesOnly(md, lines, env)
          : prepareChatCallout(md, lines, env)
        : type === "moment"
          ? prepareMomentCallout(md, lines, env)
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
}

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
    (state) => prepareChatMomentTokens(md, state.tokens, state.env),
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
      const messagesOnly = /^\[!chat\]\s*$/i.test(startText);
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
