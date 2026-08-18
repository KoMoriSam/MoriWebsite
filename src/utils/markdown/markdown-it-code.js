import { createApp } from "vue";

import CodeBlock from "@/components/markdown/CodeBlock.vue";
import { getLanguageDisplayName } from "@/utils/markdown/load-markdown-features";

const CODE_BLOCK_SELECTOR = "[data-markdown-code-block]";
const mountedCodeBlocks = new WeakMap();

const decodeProp = (value = "") => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// 与 CodeBlock.vue 的 splitHighlightedCode 一致：把高亮 HTML 按行拆分，
// 保证 SSR 预渲染与客户端组件渲染的行号结构相同。
const splitHighlightedCode = (html) => {
  const lines = [];
  const openTags = [];
  let currentLine = "";

  html.split(/(<span\b[^>]*>|<\/span>|\n)/g).forEach((part) => {
    if (!part) return;

    if (part === "\n") {
      lines.push(
        `${currentLine}${"</span>".repeat(openTags.length)}` || "&#8203;",
      );
      currentLine = openTags.join("");
      return;
    }

    if (part.startsWith("<span")) {
      openTags.push(part);
    } else if (part === "</span>") {
      openTags.pop();
    }

    currentLine += part;
  });

  lines.push(currentLine || "&#8203;");
  return lines;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// 渲染与 CodeBlock.vue 一致的静态结构（语言标签 + 行号 + 复制按钮），
// 供 SSR 预渲染输出，避免 hydration 后结构跳变。
const renderCodeBlockStaticHtml = (code, language, highlightedHtml) => {
  const languageName = getLanguageDisplayName(language);
  const codeMatch = highlightedHtml.match(
    /<pre[^>]*>(?:<code[^>]*>([\s\S]*?)<\/code>)?<\/pre>/i,
  );
  // 与 CodeBlock.vue 的 normalizeCode 一致：去掉 markdown-it 在代码末尾
  // 附加的换行，避免 splitHighlightedCode 多切出一行空白行。
  const innerHtml = (codeMatch ? codeMatch[1] : escapeHtml(code)).replace(
    /\n$/,
    "",
  );
  const lines = splitHighlightedCode(innerHtml);

  const preClass =
    "bg-(--hljs-background) m-0! p-0 max-w-full overflow-visible! " +
    "before:sticky before:left-0 before:bg-(--hljs-background) " +
    "before:text-[color-mix(in_oklab,var(--hljs-foreground)_50%,transparent)] " +
    "before:opacity-100! before:shadow-[2ch_0_0_var(--hljs-background)]";
  const languageClass = language ? ` language-${language}` : "";

  const linesHtml = lines
    .map(
      (line, index) =>
        `<pre class="${preClass}" data-prefix="${index + 1}">` +
        `<code class="hljs p-0! text-sm md:text-base inline-block! overflow-visible!${languageClass}">${line}</code></pre>`,
    )
    .join("");

  return `<section class="code-block" data-markdown-code-block data-code="${encodeURIComponent(
    code,
  )}" data-language="${encodeURIComponent(
    language,
  )}"><span class="font-mono badge badge-ghost badge-sm bg-base-300 text-base-content absolute left-20 top-4">${languageName}</span><div class="max-w-full overflow-x-auto scrollbar-thin pb-2">${linesHtml}</div><aside class="absolute right-2 top-2 tooltip tooltip-left font-mono" data-tip="复制到剪贴板"><button type="button" class="btn btn-sm btn-square btn-ghost"><i class="font-normal ri-file-copy-line"></i></button></aside></section>`;
};

export function mountCodeBlocks(root) {
  if (!root || import.meta.env.SSR) {
    return;
  }

  let mounts = mountedCodeBlocks.get(root);

  if (!mounts) {
    mounts = new Map();
    mountedCodeBlocks.set(root, mounts);
  }

  for (const [element, app] of mounts) {
    if (!root.contains(element)) {
      app.unmount();
      mounts.delete(element);
    }
  }

  root.querySelectorAll(CODE_BLOCK_SELECTOR).forEach((element) => {
    if (mounts.has(element)) {
      return;
    }

    // 客户端始终挂载 CodeBlock 组件以启用高亮懒加载与复制交互，
    // 组件渲染结果会替换 SSR 预渲染的静态结构（外层 section 保留）。
    const app = createApp(CodeBlock, {
      code: decodeProp(element.dataset.code),
      language: decodeProp(element.dataset.language) || "plaintext",
    });

    app.mount(element);
    mounts.set(element, app);
  });
}

export function unmountCodeBlocks(root) {
  const mounts = root ? mountedCodeBlocks.get(root) : null;

  if (!mounts) {
    return;
  }

  mounts.forEach((app) => app.unmount());
  mounts.clear();
  mountedCodeBlocks.delete(root);
}

export function codePlugin(md) {
  const defaultFenceRenderer = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const highlightedHtml = defaultFenceRenderer(
      tokens,
      idx,
      options,
      env,
      self,
    );

    // SSR 预渲染输出完整结构（语言标签 + 行号 + 复制按钮），
    // 客户端挂载 CodeBlock 组件时替换该静态结构。
    return renderCodeBlockStaticHtml(
      token.content,
      token.info.trim(),
      highlightedHtml,
    );
  };
}
