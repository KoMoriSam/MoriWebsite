import { shallowRef } from "vue";

const entries = shallowRef(new Map());
const requests = new Map();
const DEFAULT_SIZES = "(max-width: 768px) calc(100vw - 2rem), 960px";
const SITE_ORIGIN = "https://local.invalid";
const canonical = (src) => {
  try {
    const url = new URL(src, SITE_ORIGIN);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.origin === SITE_ORIGIN ? `${url.pathname}${url.search}` : `${url.origin}${url.pathname}${url.search}`;
  } catch { return ""; }
};

export function registerImageManifest(manifest, base) {
  if (manifest?.version !== 1 || !manifest.images || typeof manifest.images !== "object") return;
  const root = new URL(base.endsWith("/") ? base : `${base}/`, SITE_ORIGIN);
  const resolve = (src) => {
    if (typeof src !== "string" || !src || /[\s,\\\u0000-\u001f]/u.test(src)) return "";
    try {
      const url = new URL(src, root);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || url.search || url.hash) return "";
      return canonical(url.href);
    } catch { return ""; }
  };
  const prefix = canonical(root.href);
  const next = new Map([...entries.value].filter(([key]) => !key.startsWith(prefix)));
  for (const [source, entry] of Object.entries(manifest.images)) {
    const original = resolve(source);
    if (!original || !Number.isInteger(entry?.width) || entry.width <= 0 || !Number.isInteger(entry.height) || entry.height <= 0 || !Array.isArray(entry.variants)) continue;
    const variants = entry.variants.flatMap((variant) => {
      const src = resolve(variant?.src);
      return src && Number.isInteger(variant.width) && variant.width > 0 && variant.width <= entry.width ? [{ src, width: variant.width }] : [];
    }).sort((a, b) => a.width - b.width);
    if (variants.length) {
      const value = { original, width: entry.width, height: entry.height, variants };
      next.set(original, value);
      variants.forEach(({ src }) => next.set(src, value));
    }
  }
  entries.value = next;
}

export function loadImageManifest(contentBase) {
  if (!contentBase) return Promise.resolve();
  const base = `${String(contentBase).replace(/\/+$/, "").replace(/\/images$/iu, "")}/images/`;
  if (requests.has(base)) return requests.get(base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const request = Promise.resolve()
    .then(() => fetch(`${base}_optimized/manifest.json`, { signal: controller.signal }))
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      registerImageManifest(await response.json(), base);
    })
    .catch(() => { requests.delete(base); })
    .finally(() => clearTimeout(timeout));
  requests.set(base, request);
  return request;
}

export function getImageAttrs(src, sizes = DEFAULT_SIZES) {
  const entry = entries.value.get(canonical(src));
  if (!entry) return { src };
  const fallback = entry.variants.find((variant) => variant.width >= 640) || entry.variants.at(-1);
  return {
    src: fallback.src,
    srcset: entry.variants.map((variant) => `${variant.src} ${variant.width}w`).join(", "),
    sizes,
    decoding: "async",
    "data-original-src": entry.original,
    "data-original-width": entry.width,
    "data-original-height": entry.height,
    onError: restoreOriginalImage,
  };
}

export function restoreOriginalImage(event) {
  const image = event.currentTarget;
  const original = image?.getAttribute("data-original-src");
  if (!original || image.getAttribute("src") === original) return;
  event.stopImmediatePropagation?.();
  image.removeAttribute("srcset");
  image.removeAttribute("sizes");
  image.src = original;
}

export function getImageUrl(src, width = 1440) {
  const entry = entries.value.get(canonical(src));
  return entry ? (entry.variants.find((variant) => variant.width >= width) || entry.variants.at(-1)).src : src;
}
