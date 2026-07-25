// GitHub Callout 类型与现有 alert 类型/图标/默认标题映射
const CALLOUT_META = {
  NOTE: {
    type: "info",
    icon: "ri-information-line",
    title: "说明",
  },
  INFO: {
    type: "info",
    icon: "ri-information-line",
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
    icon: "ri-close-circle-line",
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
    icon: "ri-close-circle-line",
    title: "危险",
  },
  QUOTE: {
    type: "accent",
    icon: "ri-chat-quote-line",
    title: "引用",
  },
  SUMMARY: {
    type: "info",
    icon: "ri-list-check-2",
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

function createPreparedInlineToken(state, content) {
  const token = new state.Token("inline", "", 0);
  token.content = content || "";
  token.children = [];
  token.meta = { ...(token.meta || {}), komorisamPreparedInline: true };
  return token;
}

function createInlineCollectorToken(state, targetToken) {
  const token = new state.Token("komorisam_collect_inline", "", 0);
  token.content = targetToken.content || "";
  token.children = [];
  token.meta = { ...(token.meta || {}), targetToken };
  return token;
}

function renderPreparedInlineToken(token, options, env, self) {
  if (!token?.children) return "";
  return self.renderInline(token.children, options, env);
}

export function alertPlugin(md) {
  installInlineCollector(md);

  md.core.ruler.after("block", "github_callout_to_alert", (state) => {
    const { tokens } = state;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== "blockquote_open") continue;

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
      if (!parsed) {
        continue;
      }

      const remainingBody = firstInline.content.slice(parsed.headerLength);
      retokenizeInline(md, firstInline, remainingBody, state.env);

      if (!remainingBody.trim()) {
        tokens[i + 1].hidden = true;
        firstInline.hidden = true;
        if (tokens[firstInlineIndex + 1]?.type === "paragraph_close") {
          tokens[firstInlineIndex + 1].hidden = true;
        }
      }

      const title = parsed.customTitle || parsed.meta.title;
      const hasTitle = !!title;
      const titleToken = createPreparedInlineToken(state, title);
      const titleCollectorToken = createInlineCollectorToken(state, titleToken);

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
  });

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

    if (alert.foldable) {
      const openAttr = alert.collapsed ? "" : " open";
      const summaryRow = `
      <summary class="alert-title collapse-title">
        <i class="${alert.icon}"></i>
        <h6>${summaryTitle}</h6>
      </summary>`;
      return `
      <details role="alert" 
        class="alert alert-${alert.type} alert-soft alert-vertical border border-${alert.type}-content sm:gap-2 collapse collapse-arrow"${openAttr}>
        ${summaryRow}
      `;
    }

    const staticSummaryRow = `
    <summary class="alert-title select-none pointer-events-none cursor-default">
      <i class="${alert.icon}"></i>
      <h6>${summaryTitle}</h6>
    </summary>`;
    return `
    <details role="alert" open 
      class="alert alert-${alert.type} alert-soft alert-vertical sm:gap-2">
      ${staticSummaryRow}
    `;
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

    return "</details>\n";
  };
}
