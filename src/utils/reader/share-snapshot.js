import { READER_STYLE_DEFAULTS } from "../../constants/reader.js";

export const READER_SHARE_SNAPSHOT_SELECTOR =
  ".markdown-link-card, table, [data-markdown-chat], [data-markdown-moment]";

const rasterCache = new Map();
const imageDataCache = new Map();
export const yieldReaderShareTask = () =>
  typeof globalThis.scheduler?.yield === "function"
    ? globalThis.scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));
const intersects = (range, node) => {
  try {
    return !range || range.intersectsNode(node);
  } catch {
    return false;
  }
};

export function captureReaderShareSnapshot(element, range = null) {
  const copy = element.cloneNode(true);
  const preserve =
    ".chat-header, .chat-image, .chat-bar, .moments-author, .comments-info, .avatar";
  const isContext = (node) =>
    (node instanceof Element ? node : node.parentElement)?.closest(preserve);
  const copySelection = (source, target) => {
    if (range && !intersects(range, source) && !isContext(source)) {
      target.remove();
      return;
    }
    if (source.nodeType === Node.TEXT_NODE) {
      const start = range?.startContainer === source ? range.startOffset : 0;
      const end =
        range?.endContainer === source
          ? range.endOffset
          : source.textContent.length;
      target.textContent = source.textContent.slice(start, end);
      return;
    }
    if (source instanceof HTMLImageElement) {
      target.setAttribute(
        "src",
        source.currentSrc || source.getAttribute("src") || "",
      );
      target.removeAttribute("srcset");
      target.removeAttribute("sizes");
      if (
        source.naturalWidth &&
        source.naturalHeight &&
        !target.hasAttribute("width") &&
        !target.hasAttribute("height")
      ) {
        target.setAttribute("width", source.naturalWidth);
        target.setAttribute("height", source.naturalHeight);
      }
    }
    [...source.childNodes].forEach((child, index) =>
      copySelection(child, target.childNodes[index]),
    );
  };
  // Work from a stable list: removing a copied sibling must not change indexes.
  const visit = (source, target) => {
    const originals = [...source.childNodes];
    const copies = [...target.childNodes];
    if (
      source.nodeType === Node.TEXT_NODE ||
      source instanceof HTMLImageElement
    ) {
      copySelection(source, target);
      return;
    }
    if (range && !intersects(range, source) && !isContext(source)) {
      target.remove();
      return;
    }
    originals.forEach((child, index) => visit(child, copies[index]));
  };
  visit(element, copy);
  copy
    .querySelectorAll(
      "script, style, iframe, object, embed, .comment-trigger, .paragraph-comment-count, .sr-only",
    )
    .forEach((node) => node.remove());
  for (const node of [copy, ...copy.querySelectorAll("*")]) {
    for (const attribute of [...node.attributes]) {
      if (/^on/iu.test(attribute.name)) node.removeAttribute(attribute.name);
    }
    node.style?.setProperty("animation", "none", "important");
    node.style?.setProperty("transition", "none", "important");
  }
  copy.style.setProperty("margin-block", "0", "important");
  let exported = copy;
  if (element.tagName === "LI" && element.parentElement?.matches("ul, ol")) {
    exported = element.parentElement.cloneNode(false);
    exported.style.setProperty("margin", "0", "important");
    if (exported.tagName === "OL") {
      const index = [...element.parentElement.children]
        .filter((node) => node.tagName === "LI")
        .indexOf(element);
      exported.start =
        (element.parentElement.start || 1) +
        index * (element.parentElement.reversed ? -1 : 1);
    }
    exported.appendChild(copy);
  } else copy.style.setProperty("margin-inline", "0", "important");
  const reader = element.closest(".markdown-reading") || element.parentElement;
  const style = getComputedStyle(reader || element);
  const attributes = Object.fromEntries(
    [...(reader?.attributes || [])]
      .filter(
        ({ name }) =>
          ["class", "style", "lang"].includes(name) ||
          name.startsWith("data-v-"),
      )
      .map(({ name, value }) => [name, value]),
  );
  return {
    html: exported.outerHTML,
    attributes,
    fontFamily: style.fontFamily,
    fontSize:
      Number.parseFloat(style.getPropertyValue("--para-font-size")) ||
      Number.parseFloat(style.fontSize) ||
      READER_STYLE_DEFAULTS.fontSize,
  };
}

const fallbackImage = (image, width, height) => {
  const label = String(image.alt || "").replace(/[<>&"']/gu, "");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    width +
    '" height="' +
    height +
    '"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#6b7280">' +
    label +
    "</text></svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
};

const prepareSocialShareLayout = (stage) => {
  stage.setAttribute("data-reader-share-snapshot", "");
  // Keep intrinsic sizing in the exported SVG too: html-to-image replaces
  // computed widths with pixels, which can force an extra line after cloning.
  const intrinsicStyles = document.createElement("style");
  intrinsicStyles.textContent = `
    [data-reader-share-snapshot] [data-markdown-chat] .chat-bubble {
      width: max-content !important;
      inline-size: max-content !important;
    }
    [data-reader-share-snapshot] [data-markdown-chat] .chat-bubble p {
      width: auto !important;
      inline-size: auto !important;
    }
  `;
  stage.appendChild(intrinsicStyles);
  for (const social of stage.querySelectorAll(
    "[data-markdown-chat], [data-markdown-moment]",
  )) {
    social.style.minWidth = "0";
    const messageOnly = social.classList.contains("message-only");
    for (const chat of social.querySelectorAll(".chat")) {
      Object.assign(chat.style, {
        paddingInline: messageOnly ? "0" : "0.5rem",
        minWidth: "0",
        gridTemplateColumns: chat.classList.contains("chat-end")
          ? "minmax(0, 1fr) auto"
          : "auto minmax(0, 1fr)",
      });
    }
    for (const bubble of social.querySelectorAll(".chat-bubble")) {
      Object.assign(bubble.style, {
        minWidth: "0",
        maxWidth: "100%",
        width: "max-content",
      });
    }
    for (const heading of social.querySelectorAll(
      ".chat-bar > .avatar, .chat-bar figcaption",
    )) {
      Object.assign(heading.style, {
        minWidth: "0",
        flex: "1 1 auto",
        flexWrap: "nowrap",
      });
    }
    for (const button of social.querySelectorAll(".chat-bar button")) {
      button.style.flexShrink = "0";
    }
    for (const text of social.querySelectorAll(
      ".chat-bubble p, .moments-content p, .comment-body",
    )) {
      Object.assign(text.style, {
        minWidth: "0",
        maxWidth: "100%",
        overflowWrap: "anywhere",
        wordBreak: "normal",
      });
    }
    for (const metadata of social.querySelectorAll(
      ".chat-header, .chat-footer, .comments-info, .moments-actions",
    )) {
      Object.assign(metadata.style, {
        minWidth: "0",
        maxWidth: "100%",
        flexWrap: "wrap",
      });
    }
    for (const label of social.querySelectorAll(
      ".chat-bar .badge, .chat-header time, .chat-footer > span, .user-name, .comment-time, .reply-label, .action-value",
    )) {
      Object.assign(label.style, { flexShrink: "0", whiteSpace: "nowrap" });
    }
  }
};

const embedSnapshotImage = (src, loadImage) => {
  if (imageDataCache.has(src)) return imageDataCache.get(src);
  const loading = (async () => {
    const asset = await loadImage(src);
    if (!asset) return null;
    const canvas = document.createElement("canvas");
    try {
      const scale = Math.min(
        1,
        1600 /
          Math.max(
            asset.naturalWidth || asset.width,
            asset.naturalHeight || asset.height,
          ),
      );
      canvas.width = Math.max(
        1,
        Math.round((asset.naturalWidth || asset.width) * scale),
      );
      canvas.height = Math.max(
        1,
        Math.round((asset.naturalHeight || asset.height) * scale),
      );
      canvas
        .getContext("2d")
        .drawImage(asset, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      canvas.width = canvas.height = 0;
    }
  })();
  imageDataCache.set(src, loading);
  while (imageDataCache.size > 64)
    imageDataCache.delete(imageDataCache.keys().next().value);
  loading.catch(() => {
    if (imageDataCache.get(src) === loading) imageDataCache.delete(src);
  });
  return loading;
};

export function prepareReaderShareSnapshot(
  snapshot,
  { width, maxHeight, loadImage, fontCSS },
) {
  const theme = getComputedStyle(document.documentElement).getPropertyValue(
    "--color-base-100",
  );
  const cacheKey = JSON.stringify([snapshot, width, maxHeight, theme]);
  const stage = document.createElement("div");
  Object.entries(snapshot.attributes || {}).forEach(([name, value]) =>
    stage.setAttribute(name, value),
  );
  stage.removeAttribute("id");
  Object.assign(stage.style, {
    position: "absolute",
    left: "-100000px",
    top: "0",
    width: (width * snapshot.fontSize) / 48 + "px",
    maxWidth: "none",
    margin: "0",
    padding: "0",
    display: "flow-root",
    fontFamily: snapshot.fontFamily,
    pointerEvents: "none",
    contentVisibility: "visible",
  });
  stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = snapshot.html;
  prepareSocialShareLayout(stage);
  // Measurements need intrinsic dimensions, not image downloads. Only visible
  // snapshots will decode and embed their images when render() is called.
  stage.querySelectorAll("img").forEach((image) => {
    image.loading = "lazy";
  });
  document.body.appendChild(stage);
  const warnings = [];
  let resources;
  const ready = (include = () => true) =>
    (resources ||= (async () => {
      await Promise.all(
        [...stage.querySelectorAll("img")].map(async (image) => {
          if (!include(image)) return;
          const src = image.getAttribute("src");
          if (!src) return;
          const bounds = image.getBoundingClientRect();
          const dataUrl = await embedSnapshotImage(src, loadImage);
          if (dataUrl) {
            image.src = dataUrl;
          } else {
            warnings.push(src);
            image.src = fallbackImage(
              image,
              Math.max(20, bounds.width),
              Math.max(20, bounds.height),
            );
          }
          image.loading = "eager";
          image.style.opacity = "1";
          await image.decode().catch(() => {});
        }),
      );
      await document.fonts.ready;
    })());
  const wrappers = [...stage.querySelectorAll(".markdown-table-wrapper")];
  const measure = (fontSize) => {
    const cssWidth = (width * snapshot.fontSize) / fontSize;
    stage.style.width = cssWidth + "px";
    for (const wrapper of wrappers) {
      Object.assign(wrapper.style, {
        width: cssWidth + "px",
        overflow: "visible",
        maxWidth: "none",
        maxHeight: "none",
        height: "auto",
      });
    }
    // Reset widths before reading, so a previous trial cannot keep a table wide.
    const tableWidths = wrappers.map((wrapper) =>
      Math.max(cssWidth, wrapper.querySelector("table")?.scrollWidth || 0),
    );
    wrappers.forEach((wrapper, index) => {
      wrapper.style.width = tableWidths[index] + "px";
    });
    const captureWidth = Math.max(cssWidth, stage.scrollWidth);
    stage.style.width = captureWidth + "px";
    const sourceHeight = Math.ceil(stage.getBoundingClientRect().height);
    return {
      captureWidth,
      height: Math.max(
        1,
        Math.min(
          sourceHeight,
          Math.ceil((maxHeight * captureWidth) / width) + 2,
        ),
      ),
      fullHeight: (sourceHeight * width) / captureWidth,
    };
  };
  const render = (fontSize) => {
    const key = fontSize + ":" + cacheKey;
    if (rasterCache.has(key)) return rasterCache.get(key);
    const rendering = (async () => {
      await yieldReaderShareTask();
      const initial = measure(fontSize);
      const cutoff = stage.getBoundingClientRect().top + initial.height;
      // The SVG clone keeps measured grid tracks and container heights. Omit
      // whole social rows below the crop, without changing their live layout.
      const hidden = new WeakSet(
        [
          ...stage.querySelectorAll(
            "[data-markdown-chat] > *, .comment-thread, .moments-comments, .moments-actions, .moments-images > img",
          ),
        ].filter((element) => element.getBoundingClientRect().top >= cutoff),
      );
      const include = (node) => {
        for (
          let element = node instanceof Element ? node : node.parentElement;
          element && element !== stage;
          element = element.parentElement
        ) {
          if (hidden.has(element)) return false;
        }
        return true;
      };
      await ready(include);
      const { captureWidth, height, fullHeight } = measure(fontSize);
      const { toSvg } = await import("html-to-image");
      const svg = await toSvg(stage, {
        width: captureWidth,
        height,
        filter: include,
        style: {
          position: "static",
          inset: "auto",
          margin: "0",
          transform: "none",
          translate: "none",
        },
        fontEmbedCSS: await fontCSS(stage, include),
        includeQueryParams: true,
      });
      const decoded = new Image();
      decoded.decoding = "async";
      decoded.src = svg;
      await decoded.decode();
      const image = document.createElement("canvas");
      image.width = width;
      image.height = Math.max(1, Math.ceil((height * width) / captureWidth));
      image
        .getContext("2d")
        .drawImage(decoded, 0, 0, image.width, image.height);
      const probe = document.createElement("canvas");
      probe.width = probe.height = 64;
      const probeContext = probe.getContext("2d", { willReadFrequently: true });
      probeContext.drawImage(image, 0, 0, 64, 64);
      const pixels = probeContext.getImageData(0, 0, 64, 64).data;
      probe.width = probe.height = 0;
      let painted = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index]) {
          painted = true;
          break;
        }
      }
      if (!painted) throw new Error("阅读器内容快照未绘制");
      return { image, fullHeight, warnings };
    })();
    rasterCache.set(key, rendering);
    while (rasterCache.size > 24)
      rasterCache.delete(rasterCache.keys().next().value);
    rendering.catch(() => {
      if (rasterCache.get(key) === rendering) rasterCache.delete(key);
    });
    return rendering;
  };
  return { ready, measure, render, dispose: () => stage.remove() };
}
