const requestedClasses = new Set();
const checkedClasses = new Set();
let registryModule;
let worker;
let nextRequestId = 0;
let pending;
let previousRegistry = "";
let hasRuntimeClasses = false;

export function collectMarkdownClasses(fragment) {
  const classes = new Set();
  const visit = (node) => {
    for (const attribute of node.attrs || []) {
      if (attribute.name !== "class") continue;
      for (const name of attribute.value.split(/\s+/u)) {
        if (name) classes.add(name);
      }
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(fragment);
  return [...classes];
}

const compileStyles = (classes, existing) => new Promise((resolve, reject) => {
  worker ||= new Worker(new URL("../../workers/markdown-styles.worker.js", import.meta.url), {
    type: "module",
  });
  const activeWorker = worker;
  const id = ++nextRequestId;
  const cleanup = () => {
    activeWorker.removeEventListener("message", onMessage);
    activeWorker.removeEventListener("error", onError);
  };
  const onMessage = ({ data }) => {
    if (data.id !== id) return;
    cleanup();
    if (data.error) reject(new Error(data.error));
    else resolve(data.css);
  };
  const onError = (error) => {
    cleanup();
    activeWorker.terminate();
    worker = null;
    reject(new Error(error.message || "Markdown style worker failed"));
  };
  activeWorker.addEventListener("message", onMessage);
  activeWorker.addEventListener("error", onError);
  activeWorker.postMessage({ id, classes, existing });
});

const flushStyles = async () => {
  registryModule ||= import("./markdown-style-registry.js").catch((error) => {
    registryModule = null;
    throw error;
  });
  const { readMarkdownStyleRegistry, MARKDOWN_STYLE_ID } = await registryModule;
  do {
    const batch = [...requestedClasses];
    const existing = readMarkdownStyleRegistry(document);
    const known = new Set(existing.classes);
    const registryKey = JSON.stringify(existing);
    const missing = batch.filter((name) => !known.has(name));
    if (missing.some((name) => !checkedClasses.has(name)) ||
        (hasRuntimeClasses && (registryKey !== previousRegistry ||
          !document.getElementById(MARKDOWN_STYLE_ID)))) {
      const css = await compileStyles(batch, existing);
      let style = document.getElementById(MARKDOWN_STYLE_ID);
      if (css) {
        if (!style) {
          style = document.createElement("style");
          style.id = MARKDOWN_STYLE_ID;
          document.head.append(style);
        }
        if (style.textContent !== css) style.textContent = css;
      } else {
        style?.remove();
      }
      hasRuntimeClasses = Boolean(css);
    }
    previousRegistry = registryKey;
    for (const name of batch) checkedClasses.add(name);
  } while ([...requestedClasses].some((name) => !checkedClasses.has(name)));
};

const scheduleStyles = () => {
  if (!pending) {
    let succeeded = false;
    pending = Promise.resolve().then(flushStyles).then(() => {
      succeeded = true;
    }).catch((error) => {
      checkedClasses.clear();
      console.warn("Markdown 样式加载失败，下次渲染时重试", error);
    }).finally(() => {
      pending = null;
      if (succeeded && [...requestedClasses].some((name) => !checkedClasses.has(name))) {
        return scheduleStyles();
      }
    });
  }
  return pending;
};

export function ensureMarkdownStyles(fragment) {
  if (typeof document === "undefined") return Promise.resolve();
  for (const name of collectMarkdownClasses(fragment)) requestedClasses.add(name);
  return requestedClasses.size ? scheduleStyles() : Promise.resolve();
}

if (import.meta.hot) import.meta.hot.dispose(() => worker?.terminate());
