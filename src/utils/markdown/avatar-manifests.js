import { shallowRef } from "vue";
import { DEFAULT_AVATAR } from "../../constants/markdown.js";

const manifests = shallowRef(new Map());
const requests = new Map();
const SITE_ORIGIN = "https://local.invalid";

const imageBase = (contentBase) => {
  if (!contentBase) return "";
  try {
    const root = new URL(`${String(contentBase).replace(/\/+$/u, "").replace(/\/images$/iu, "")}/images/`, SITE_ORIGIN);
    if (!["http:", "https:"].includes(root.protocol) || root.search || root.hash) return "";
    return root.origin === SITE_ORIGIN ? root.pathname : root.href;
  } catch { return ""; }
};

export function registerAvatarManifest(contentBase, manifest) {
  const base = imageBase(contentBase);
  if (!base || manifest?.version !== 1 || !manifest.avatars || typeof manifest.avatars !== "object" || Array.isArray(manifest.avatars)) return;
  const root = new URL(base, SITE_ORIGIN);
  const avatars = new Map();
  for (const [name, target] of Object.entries(manifest.avatars)) {
    if (typeof target !== "string" || !target || /[\s,\\\u0000-\u001f]/u.test(target)) continue;
    try {
      const url = new URL(target, root);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || url.search || url.hash) continue;
      avatars.set(name.trim(), root.origin === SITE_ORIGIN ? url.pathname : url.href);
    } catch { /* Ignore invalid avatar paths. */ }
  }
  manifests.value = new Map(manifests.value).set(base, avatars);
}

export function getMarkdownAvatar(contentBase, username) {
  return manifests.value.get(imageBase(contentBase))?.get(String(username || "").trim()) || DEFAULT_AVATAR;
}

export function loadAvatarManifest(contentBase) {
  const base = imageBase(contentBase);
  if (!base) return Promise.resolve();
  if (requests.has(base)) return requests.get(base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const request = Promise.resolve()
    .then(() => fetch(`${base}avatars.json`, { signal: controller.signal }))
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest?.version !== 1 || !manifest.avatars || typeof manifest.avatars !== "object" || Array.isArray(manifest.avatars)) throw new Error("Invalid avatar manifest");
      registerAvatarManifest(contentBase, manifest);
    })
    .catch(() => { requests.delete(base); })
    .finally(() => clearTimeout(timeout));
  requests.set(base, request);
  return request;
}
