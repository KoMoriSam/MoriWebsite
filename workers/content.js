import { publicCovers, resourcePath } from "../shared/novel-release.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, If-Range, If-None-Match, If-Modified-Since",
  "Access-Control-Expose-Headers": "ETag, Content-Length, Content-Range, Accept-Ranges",
};
const notFound = () => new Response("Not found", {
  status: 404, headers: { ...corsHeaders, "Cache-Control": "no-store" },
});
const manifestPath = "/novel/images/_optimized/manifest.json";

async function publicNovel(env, url) {
  const path = url.pathname;
  if (path === "/novel/index.json" || publicCovers.some((cover) => path === `/novel/images/${cover}`)) return true;
  if (!path.startsWith("/novel/images/_optimized/")) return false;
  const manifest = await env.ASSETS.fetch(new Request(new URL(manifestPath, url)));
  if (!manifest.ok) return false;
  const { version, images } = await manifest.json();
  if (version !== 1 || !images || Object.keys(images).some((name) => !publicCovers.includes(name))) return false;
  if (path === manifestPath) return true;
  return Object.values(images).some((entry) => entry.variants.some(({ src }) =>
    resourcePath(src) && /^_optimized\/[a-f0-9-]+\.(?:avif|webp)$/u.test(src) &&
    path === `/novel/images/${src}`));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/novel/")) {
        if (!await publicNovel(env, url)) return notFound();
      } else if (!/^\/(?:post|kaiming)(?:\/|$)/.test(url.pathname)) {
        return notFound();
      }
    } catch {
      return notFound();
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    return env.ASSETS.fetch(request);
  },
};
