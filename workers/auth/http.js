export const SITE = "https://komori.cc";
export const AUTH = "https://auth.komori.cc";
export const COOKIE = {
  site: "__Host-mori-session",
  center: "__Host-mori-center",
  flow: "__Host-mori-flow",
  oauth: "__Host-mori-oauth",
};

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { ...privateHeaders, ...headers } });

export function redirect(url, cookies = []) {
  const headers = new Headers({ ...privateHeaders, Location: url });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 303, headers });
}

export const sessionCookie = (name, value = "", maxAge = 0) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;

export const opaque = (value) => typeof value === "string" && /^[\w-]{43}$/.test(value);

export function readCookie(request, name) {
  const value = request.headers.get("Cookie")?.split(/;\s*/).find(
    (cookie) => cookie.startsWith(`${name}=`),
  )?.slice(name.length + 1);
  return opaque(value) ? value : null;
}

export function returnPath(value) {
  if (typeof value !== "string" || value.length > 1800 || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\s\u0000-\u001f]/u.test(value)) return "/";
  const url = new URL(value, SITE);
  if (url.origin !== SITE ||
      !/^\/(?:$|(?:home|blog|novel|changelog|announcements|licenses|tools|games|kaiming|test)(?:\/|$))/u.test(url.pathname)) return "/";
  if (url.searchParams.has("giscus")) url.searchParams.delete("giscus");
  return url.pathname + url.search + url.hash;
}
