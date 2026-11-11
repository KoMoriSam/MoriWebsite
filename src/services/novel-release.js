import { shallowRef, watch } from "vue";
import { novelVersionPattern, releaseFile, resourcePath } from "../../shared/novel-release.js";
import { moriSession, useMoriAuth } from "../composables/auth/useMoriAuth.js";

export const novelAssetBase = shallowRef("");
let release;
let engine;
let engineRequest;

watch(() => moriSession.revision, () => {
  novelAssetBase.value = "";
  void engine?.destroy();
  engine = undefined;
  engineRequest = undefined;
}, { flush: "sync" });

export function loadNovelRelease({ force = false } = {}) {
  release ||= fetch(`/${releaseFile}`, { cache: force ? "reload" : "no-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("NOVEL_RELEASE_UNAVAILABLE");
    const { version, catalog } = await response.json();
    if (!novelVersionPattern.test(version) || !catalog || Array.isArray(catalog) || typeof catalog !== "object") {
      throw new Error("NOVEL_RELEASE_UNAVAILABLE");
    }
    return { version, catalog };
  }).catch((error) => { release = undefined; throw error; });
  return release;
}

export async function novelBase() {
  if (import.meta.env?.SSR || !moriSession.authenticated) throw new Error("LOGIN_REQUIRED");
  if (!moriSession.canReadNovel) throw new Error("READING_FORBIDDEN");
  const revision = moriSession.revision;
  const { version } = await loadNovelRelease();
  if (revision !== moriSession.revision) throw new Error("LOGIN_REQUIRED");
  const base = `/api/novel/${version}`;
  novelAssetBase.value = base + "/assets";
  return base;
}

export function encodeNovelPath(path) {
  if (!resourcePath(path)) throw new Error("INVALID_CHAPTER");
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function checkNovelResponse(response) {
  if (response.status === 401) useMoriAuth().invalidate();
  if (!response.ok) throw new Error(`NOVEL_HTTP_${response.status}`);
  return response;
}

export function loadNovelPagefind() {
  if (!moriSession.authenticated || !moriSession.canReadNovel) return Promise.reject(new Error("LOGIN_REQUIRED"));
  if (engineRequest) return engineRequest;
  const revision = moriSession.revision;
  engineRequest = (async () => {
    const basePath = (await novelBase()) + "/search/";
    // Verify the session before importing, including when the module is already in memory.
    await checkNovelResponse(await fetch(basePath + "pagefind-entry.json", { method: "HEAD" }));
    const pagefind = await import(/* @vite-ignore */ basePath + "pagefind.js");
    const instance = pagefind.createInstance({ basePath, language: "zh", excerptLength: 42 });
    try {
      await instance.init();
      if (revision !== moriSession.revision || !moriSession.authenticated) throw new Error("LOGIN_REQUIRED");
      engine = instance;
      return instance;
    } catch (error) {
      await instance.destroy();
      throw error;
    }
  })().catch((error) => {
    if (revision === moriSession.revision) engineRequest = undefined;
    throw error;
  });
  return engineRequest;
}
