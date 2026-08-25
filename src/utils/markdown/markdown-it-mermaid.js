import { createApp, reactive } from "vue";

import Mermaid from "@/components/markdown/Mermaid.vue";

const MERMAID_SELECTOR = "[data-mermaid-viewer] pre.mermaid";
const mountedMermaid = new WeakMap();

const decodeMermaidSource = (value = "") => {
  try {
    const bytes = Uint8Array.from(atob(value), (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
};

const getMermaidSource = (element) => {
  const encodedSource = element.dataset.mermaidSource;

  if (encodedSource) {
    try {
      return decodeURIComponent(encodedSource);
    } catch {
      // 继续尝试插件原始的 Base64 数据。
    }
  }

  return decodeMermaidSource(element.dataset.mermaidCode);
};

const getRenderStatus = (element, renderComplete) => {
  if (element.querySelector("svg")) return "ready";
  if (element.querySelector(".mermaid-error") || renderComplete) return "error";
  return "loading";
};

const syncRenderStatus = (mount, renderComplete) => {
  const status = getRenderStatus(mount.element, renderComplete);

  mount.renderState.status = status;
  mount.viewer.setAttribute("aria-busy", String(status === "loading"));

  if (status === "ready") {
    mount.element.removeAttribute("aria-hidden");
  }
};

export function mountMermaidDiagrams(root, { renderComplete = false } = {}) {
  if (!root || import.meta.env.SSR) return;

  let mounts = mountedMermaid.get(root);

  if (!mounts) {
    mounts = new Map();
    mountedMermaid.set(root, mounts);
  }

  for (const [element, mount] of mounts) {
    if (!root.contains(element)) {
      mount.app.unmount();
      mount.mountPoint.remove();
      mounts.delete(element);
    }
  }

  root.querySelectorAll(MERMAID_SELECTOR).forEach((element) => {
    const currentMount = mounts.get(element);

    if (
      currentMount &&
      currentMount.viewer.contains(element) &&
      currentMount.viewer.contains(currentMount.mountPoint)
    ) {
      syncRenderStatus(currentMount, renderComplete);
      return;
    }

    if (currentMount) {
      currentMount.app.unmount();
      currentMount.mountPoint.remove();
      mounts.delete(element);
    }

    const viewer = element.closest("[data-mermaid-viewer]");
    const mountPoint = viewer?.querySelector(
      ":scope > [data-mermaid-controls]",
    );
    if (!viewer || !mountPoint) return;

    const renderState = reactive({
      status: getRenderStatus(element, renderComplete),
    });
    const app = createApp(Mermaid, {
      target: viewer,
      diagram: element,
      source: getMermaidSource(element),
      renderState,
    });
    app.mount(mountPoint);
    const mount = { app, element, mountPoint, renderState, viewer };
    mounts.set(element, mount);
    syncRenderStatus(mount, renderComplete);
  });
}

export function unmountMermaidDiagrams(root) {
  const mounts = root ? mountedMermaid.get(root) : null;

  if (!mounts) return;

  mounts.forEach(({ app, mountPoint }) => {
    app.unmount();
    mountPoint.remove();
  });
  mounts.clear();
  mountedMermaid.delete(root);
}
