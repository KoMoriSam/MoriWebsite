import { novelVersionPattern, resourcePath } from "../shared/novel-release.js";
import { json, privateHeaders } from "./auth/http.js";

const manifests = new Map();

const media = {
  avif: "image/avif", gif: "image/gif", jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", svg: "image/svg+xml", webp: "image/webp",
  mp3: "audio/mpeg", mp4: "video/mp4", pdf: "application/pdf",
  json: "application/json",
};

export async function serveNovel(request, env, input) {
  const slash = input.indexOf("/");
  const version = input.slice(0, slash);
  let path;
  try {
    path = input.slice(slash + 1).split("/").map((part) => {
      const value = decodeURIComponent(part);
      if (value.includes("/")) throw new Error("Invalid path segment");
      return value;
    }).join("/");
  } catch {
    return json({ error: "NOT_FOUND" }, 404);
  }
  if (!novelVersionPattern.test(version) || !resourcePath(path) ||
      !/^(?:chapters|assets|search)\//.test(path)) return json({ error: "NOT_FOUND" }, 404);
  const vault = env.NOVEL_VAULT;
  let cached = manifests.get(version);
  if (!cached || cached.until <= Date.now()) {
    const manifest = await vault.get(`v1/versions/${version}.json`);
    if (!manifest) return json({ error: "NOT_FOUND" }, 404);
    cached = { resources: await manifest.json(), until: Date.now() + 30_000 };
    manifests.delete(version);
    manifests.set(version, cached);
    if (manifests.size > 3) manifests.delete(manifests.keys().next().value);
  }
  const { resources } = cached;
  const digest = Object.hasOwn(resources, path) ? resources[path] : "";
  if (!novelVersionPattern.test(digest)) return json({ error: "NOT_FOUND" }, 404);
  const object = await vault[request.method === "HEAD" ? "head" : "get"](`v1/objects/${digest}`);
  if (!object) return json({ error: "NOT_FOUND" }, 404);
  const extension = path.split(".").at(-1).toLowerCase();
  const search = path.startsWith("search/");
  const executable = search && ["search/pagefind.js", "search/pagefind-worker.js"].includes(path);
  const type = executable ? "text/javascript; charset=utf-8"
    : path.startsWith("chapters/") ? "text/plain; charset=utf-8"
    : search && extension === "pagefind" ? "application/octet-stream"
    : media[extension] || "application/octet-stream";
  return new Response(object.body || null, { headers: {
    ...privateHeaders,
    "Content-Type": type,
    "Content-Length": String(object.size),
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Robots-Tag": "noindex, nofollow",
    ...(!search && { "Content-Security-Policy": "sandbox; default-src 'none'" }),
    ...(!search && type === "application/octet-stream" && { "Content-Disposition": "attachment" }),
  } });
}
