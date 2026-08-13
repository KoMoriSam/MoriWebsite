import { createApp } from "vue";

import CodeBlock from "@/components/markdown/CodeBlock.vue";

const CODE_BLOCK_SELECTOR = "[data-markdown-code-block]";
const mountedCodeBlocks = new WeakMap();

const decodeProp = (value = "") => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

    return `<section class="code-wrapper" data-markdown-code-block data-code="${encodeURIComponent(
      token.content,
    )}" data-language="${encodeURIComponent(token.info.trim())}">
    ${highlightedHtml}
    </section>`;
  };
}
