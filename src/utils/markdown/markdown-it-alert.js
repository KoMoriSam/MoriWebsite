const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

// GitHub Callout 类型与现有 alert 类型/图标/默认标题映射
const CALLOUT_META = {
  NOTE: {
    type: "info",
    icon: "ri-information-line",
    title: "说明",
  },
  INFO: {
    type: "info",
    icon: "ri-star-line",
    title: "信息",
  },
  TIP: {
    type: "success",
    icon: "ri-lightbulb-flash-line",
    title: "提示",
  },
  IMPORTANT: {
    type: "info",
    icon: "ri-error-warning-line",
    title: "重要",
  },
  WARNING: {
    type: "warning",
    icon: "ri-alert-line",
    title: "警告",
  },
  CAUTION: {
    type: "error",
    icon: "ri-alarm-warning-line",
    title: "注意",
  },
  SUCCESS: {
    type: "success",
    icon: "ri-checkbox-circle-line",
    title: "成功",
  },
  ERROR: {
    type: "error",
    icon: "ri-close-circle-line",
    title: "错误",
  },
  DANGER: {
    type: "error",
    icon: "ri-fire-line",
    title: "危险",
  },
  QUOTE: {
    type: "muted",
    icon: "ri-double-quotes-l",
    title: "引用",
  },
  SUMMARY: {
    type: "info",
    icon: "ri-survey-line",
    title: "摘要",
  },
};

const ICON_BY_ALERT_TYPE = {
  info: "ri-information-line",
  success: "ri-checkbox-circle-line",
  warning: "ri-alert-line",
  error: "ri-close-circle-line",
};

function inferAlertTypeFromMarker(markerLower) {
  if (/(warn|attention)/.test(markerLower)) return "warning";
  if (/(error|danger|fail|caution)/.test(markerLower)) return "error";
  if (/(tip|hint|help|success|ok)/.test(markerLower)) return "success";
  return "info";
}

function resolveCalloutMeta(rawType) {
  const upperType = rawType.toUpperCase();
  const fromPreset = CALLOUT_META[upperType];
  if (fromPreset) return fromPreset;

  const markerLower = rawType.toLowerCase();
  const type = inferAlertTypeFromMarker(markerLower);
  return {
    type,
    icon: ICON_BY_ALERT_TYPE[type],
    title: upperType,
  };
}

function parseCalloutHeader(content) {
  const leadingSpacesLength = content.length - content.trimStart().length;
  const normalized = content.slice(leadingSpacesLength);
  const match = normalized.match(
    /^\\?\[!([a-z][a-z0-9_-]*)\]([+-])?(?:[ \t]+([^\r\n]*))?(?:\r?\n|$)/i,
  );
  if (!match) return null;

  const rawType = match[1];
  const meta = resolveCalloutMeta(rawType);
  const foldMarker = match[2] || "";

  return {
    meta,
    customTitle: (match[3] || "").trim(),
    foldable: !!foldMarker,
    collapsed: foldMarker === "-",
    headerLength: leadingSpacesLength + match[0].length,
  };
}

function findBlockquoteCloseIndex(tokens, startIndex) {
  let level = 0;
  for (let i = startIndex; i < tokens.length; i++) {
    if (tokens[i].type === "blockquote_open") level++;
    if (tokens[i].type === "blockquote_close") {
      level--;
      if (level === 0) return i;
    }
  }
  return -1;
}

function retokenizeInline(md, token, content, env) {
  token.content = content;
  // 内置的 `inline` 核心规则会在此自定义核心规则之后运行。
  // 此处仅保留内容变更，以避免对子元素进行两次解析。
  token.children = [];
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

function createPreparedInlineToken(Token, content) {
  const token = new Token("inline", "", 0);
  token.content = content || "";
  token.children = [];
  token.meta = { ...(token.meta || {}), komorisamPreparedInline: true };
  return token;
}

function createInlineCollectorToken(Token, targetToken) {
  const token = new Token("komorisam_collect_inline", "", 0);
  token.content = targetToken.content || "";
  token.children = [];
  token.meta = { ...(token.meta || {}), targetToken };
  return token;
}

function renderPreparedInlineToken(token, options, env, self) {
  if (!token?.children) return "";
  return self.renderInline(token.children, options, env);
}

function prepareAlertTokens(md, tokens, env) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== "blockquote_open" || token.meta?.alert) continue;

    const closeIndex = findBlockquoteCloseIndex(tokens, i);
    if (closeIndex === -1) continue;
    const closeToken = tokens[closeIndex];

    const firstInlineIndex = i + 2;
    if (
      tokens[i + 1]?.type !== "paragraph_open" ||
      tokens[firstInlineIndex]?.type !== "inline"
    ) {
      continue;
    }

    const firstInline = tokens[firstInlineIndex];
    const parsed = parseCalloutHeader(firstInline.content);
    if (!parsed) continue;

    const remainingBody = firstInline.content.slice(parsed.headerLength);
    retokenizeInline(md, firstInline, remainingBody, env);

    if (!remainingBody.trim()) {
      tokens[i + 1].hidden = true;
      firstInline.hidden = true;
      if (tokens[firstInlineIndex + 1]?.type === "paragraph_close") {
        tokens[firstInlineIndex + 1].hidden = true;
      }
    }

    const title = parsed.customTitle || parsed.meta.title;
    const hasTitle = !!title;
    const titleToken = createPreparedInlineToken(token.constructor, title);
    const titleCollectorToken = createInlineCollectorToken(
      token.constructor,
      titleToken,
    );

    token.meta = {
      alert: {
        type: parsed.meta.type,
        icon: parsed.meta.icon,
        title,
        titleToken,
        hasTitle,
        foldable: parsed.foldable,
        collapsed: parsed.collapsed,
      },
    };
    closeToken.meta = token.meta;

    // 让标题里的 [^x] 按原文位置参与全局脚注收集；
    // collector 只负责解析，不负责输出，避免标题在 summary 外重复渲染。
    tokens.splice(i + 1, 0, titleCollectorToken);
    i += 1;
  }
}

export function alertPlugin(md) {
  installInlineCollector(md);
  md.__komorisamPrepareAlertTokens = (tokens, env) =>
    prepareAlertTokens(md, tokens, env);

  md.core.ruler.after("block", "github_callout_to_alert", (state) =>
    prepareAlertTokens(md, state.tokens, state.env),
  );

  const defaultBlockquoteOpen =
    md.renderer.rules.blockquote_open ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  const defaultBlockquoteClose =
    md.renderer.rules.blockquote_close ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.blockquote_open = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    const alert = tokens[idx].meta?.alert;
    if (!alert) return defaultBlockquoteOpen(tokens, idx, options, env, self);

    const title = renderPreparedInlineToken(
      alert.titleToken,
      options,
      env,
      self,
    );
    const summaryTitle = alert.hasTitle ? title : "";

    const props = encodeProps({
      type: alert.type,
      icon: alert.icon,
      titleHtml: summaryTitle,
      foldable: alert.foldable,
      collapsed: alert.collapsed,
    });

    return `<markdown-alert data-markdown-props="${props}">`;
  };

  md.renderer.rules.blockquote_close = function (
    tokens,
    idx,
    options,
    env,
    self,
  ) {
    const alert = tokens[idx].meta?.alert;
    if (!alert) return defaultBlockquoteClose(tokens, idx, options, env, self);

    return "</markdown-alert>\n";
  };
}
