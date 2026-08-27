const TASK_STATUSES = {
  " ": {
    label: "未完成",
    icon: "ri-checkbox-blank-circle-line",
    input: "unchecked",
  },
  x: {
    label: "已完成",
    icon: "ri-checkbox-circle-fill",
    tone: "success",
    input: "checked",
  },
  X: {
    label: "已完成",
    icon: "ri-checkbox-circle-fill",
    tone: "success",
    input: "checked",
  },
  "-": { label: "已取消", icon: "ri-close-circle-fill", tone: "muted" },
  "/": { label: "进行中", icon: "ri-loader-4-fill", tone: "info" },
  ">": { label: "已推迟", icon: "ri-send-ins-fill", tone: "muted" },
  "<": { label: "计划中", icon: "ri-calendar-fill", tone: "info" },
  "?": { label: "待确认", icon: "ri-question-fill", tone: "error" },
  "!": { label: "重要", icon: "ri-alert-fill", tone: "warning" },
  "*": { label: "笔记", icon: "ri-star-fill", tone: "info" },
  '"': { label: "引用", icon: "ri-double-quotes-l", tone: "muted" },
  l: { label: "地点", icon: "ri-map-pin-fill", tone: "error" },
  b: { label: "书签", icon: "ri-bookmark-fill", tone: "warning" },
  i: { label: "信息", icon: "ri-information-fill", tone: "info" },
  S: { label: "花费", icon: "ri-money-dollar-circle-fill", tone: "success" },
  p: { label: "奖励", icon: "ri-trophy-fill", tone: "warning" },
  c: { label: "待选", icon: "ri-thumb-down-fill", tone: "muted" },
};

const TASK_MARKER_RE = /^\[([^\]])\](?=\s)/;

const appendClass = (token, className) => {
  const currentClass = token.attrGet("class");
  if (currentClass?.split(/\s+/).includes(className)) return;

  token.attrSet(
    "class",
    currentClass ? `${currentClass} ${className}` : className,
  );
};

const findParentList = (tokens, index) => {
  const targetLevel = tokens[index].level - 1;

  for (let current = index - 1; current >= 0; current -= 1) {
    if (tokens[current].level === targetLevel) return tokens[current];
  }

  return null;
};

const createHtmlToken = (state, content) => {
  const token = new state.Token("html_inline", "", 0);
  token.content = content;
  return token;
};

const createTaskMarker = (state, status) => {
  const checked = status.input === "checked" ? ' checked=""' : "";
  const nativeCheckbox = status.input
    ? `<input class="task-list-item-checkbox task-list-item-native" type="checkbox"${checked} disabled="" aria-label="${status.label}">`
    : "";
  const tone = status.tone ? ` data-task-tone="${status.tone}"` : "";
  const accessibility = status.input
    ? ' aria-hidden="true"'
    : ` role="img" aria-label="${status.label}"`;

  return createHtmlToken(
    state,
    `${nativeCheckbox}<span class="task-list-item-marker task-list-item-status"${tone}${accessibility}><i class="${status.icon}" aria-hidden="true"></i></span>`,
  );
};

export const taskStatusPlugin = (md) => {
  md.core.ruler.after("inline", "alternate-task-statuses", (state) => {
    const { tokens } = state;

    for (let index = 2; index < tokens.length; index += 1) {
      const inlineToken = tokens[index];
      const paragraphToken = tokens[index - 1];
      const listItemToken = tokens[index - 2];

      if (
        inlineToken.type !== "inline" ||
        paragraphToken.type !== "paragraph_open" ||
        listItemToken.type !== "list_item_open"
      ) {
        continue;
      }

      const match = inlineToken.content.match(TASK_MARKER_RE);
      const marker = match?.[1];
      const status = TASK_STATUSES[marker];
      if (!status || !inlineToken.children?.length) continue;

      const textToken = inlineToken.children[0];
      if (
        textToken.type !== "text" ||
        !textToken.content.startsWith(`[${marker}]`)
      ) {
        continue;
      }

      textToken.content = textToken.content.slice(3).replace(/^\s+/, "");
      inlineToken.content = inlineToken.content.slice(3).replace(/^\s+/, "");
      inlineToken.children = [
        createTaskMarker(state, status),
        createHtmlToken(state, '<span class="task-list-item-content">'),
        ...inlineToken.children,
        createHtmlToken(state, "</span>"),
      ];

      appendClass(listItemToken, "task-list-item");
      listItemToken.attrSet("data-task-status", marker);

      const parentList = findParentList(tokens, index - 2);
      if (parentList) appendClass(parentList, "contains-task-list");
    }
  });
};
