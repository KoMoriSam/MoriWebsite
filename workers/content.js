const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, If-Range, If-None-Match, If-Modified-Since",
  "Access-Control-Expose-Headers": "ETag, Content-Length, Content-Range, Accept-Ranges",
};

const forwardedHeaders = [
  "Accept", "Accept-Encoding", "Range", "If-Range", "If-None-Match", "If-Modified-Since",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = ["/post", "/novel", "/giscus", "/kaiming"].find(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
    ) || (url.pathname === "/images/spin.gif" ? "/images/spin.gif" : undefined);
    if (!prefix) return new Response("Not found", { status: 404, headers: corsHeaders });
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...corsHeaders, Allow: "GET, HEAD, OPTIONS" },
      });
    }

    if (prefix !== "/giscus") return env.ASSETS.fetch(request);

    try {
      const origin = new URL(env.GISCUS_PAGES_ORIGIN);
      if (origin.protocol !== "https:" || !origin.hostname.endsWith(".pages.dev") || origin.port || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
        throw new Error("Content origin must be a Cloudflare Pages HTTPS origin");
      }
      const upstream = new URL(origin);
      upstream.pathname = url.pathname.slice(prefix.length) || "/";
      upstream.search = url.search;
      const headers = new Headers();
      for (const name of forwardedHeaders) {
        if (request.headers.has(name)) headers.set(name, request.headers.get(name));
      }
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      const responseHeaders = new Headers(response.headers);
      for (const [name, value] of Object.entries(corsHeaders)) responseHeaders.set(name, value);

      const location = responseHeaders.get("Location");
      if (location) {
        const target = new URL(location, upstream);
        if (target.origin === origin.origin) {
          target.protocol = url.protocol;
          target.host = url.host;
          target.pathname = `${prefix}${target.pathname}`;
          responseHeaders.set("Location", target.href);
        }
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("Content proxy failed", { path: url.pathname, message: error.message });
      return new Response("Content temporarily unavailable", {
        status: 502,
        headers: { ...corsHeaders, "Cache-Control": "no-store" },
      });
    }
  },
};
