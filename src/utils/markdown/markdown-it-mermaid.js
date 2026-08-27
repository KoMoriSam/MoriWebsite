const encodeProps = (value) => encodeURIComponent(JSON.stringify(value));

const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  fontFamily: "var(--font-mono)",
  themeVariables: {
    fontSize: "14px",
  },
  flowchart: {
    diagramPadding: 8,
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15,
    htmlLabels: false,
    useMaxWidth: true,
  },
  class: {
    diagramPadding: 8,
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 8,
    htmlLabels: false,
  },
  state: {
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 8,
    miniPadding: 4,
    noteMargin: 10,
  },
  er: {
    diagramPadding: 20,
    entityPadding: 15,
    nodeSpacing: 140,
    rankSpacing: 80,
  },
  block: {
    padding: 8,
  },
  kanban: {
    padding: 8,
  },
  gantt: {
    useMaxWidth: true,
    useWidth: 720,
  },
  sequence: {
    diagramMarginX: 8,
    diagramMarginY: 8,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
    useMaxWidth: true,
  },
};

let mermaidPromise = null;
let renderQueue = Promise.resolve();

const loadMermaid = async () => {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => {
      const mermaid = module.default || module;
      mermaid.initialize(MERMAID_CONFIG);
      mermaid.registerIconPacks?.([
        {
          name: "logos",
          loader: () =>
            fetch("https://unpkg.com/@iconify-json/logos@1/icons.json").then(
              (response) => response.json(),
            ),
        },
      ]);
      return mermaid;
    });
  }

  return mermaidPromise;
};

export const renderMermaidSource = (id, source) => {
  const renderTask = async () => {
    const mermaid = await loadMermaid();
    await mermaid.parse(source, { suppressErrors: false });
    return mermaid.render(id, source);
  };
  const result = renderQueue.catch(() => undefined).then(renderTask);
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export function mermaidPlugin(md) {
  const defaultFenceRenderer = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() !== "mermaid") {
      return defaultFenceRenderer(tokens, idx, options, env, self);
    }

    const props = encodeProps({ source: token.content.trim() });
    return `<markdown-mermaid data-markdown-props="${props}"></markdown-mermaid>\n`;
  };
}
