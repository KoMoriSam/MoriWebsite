import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileInside, publishedPath } from "./content-files.mjs";

export async function fetchContent(input, options) {
  const directory = process.env.CONTENT_BUILD_DIR;
  if (!directory) return fetch(input, options);
  const buildOrigin = "https://komori.cc";
  const url = new URL(input, buildOrigin);
  for (const [prefix, base] of [["post", process.env.VITE_BLOG_RAW], ["novel", process.env.VITE_NOVEL_RAW]]) {
    if (!base) continue;
    const origin = new URL(`${base.replace(/\/+$/, "")}/`, buildOrigin);
    if (url.origin !== origin.origin || !url.pathname.startsWith(origin.pathname)) continue;
    const relative = url.pathname.slice(origin.pathname.length).split("/").map(decodeURIComponent).join("/");
    // Never fall back to an older deployed document when a build snapshot is incomplete.
    try {
      publishedPath(relative);
      const filename = await fileInside(path.join(directory, prefix), relative);
      const body = await readFile(filename);
      return new Response(body, { headers: { "Content-Type": relative.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8" } });
    } catch (error) {
      if (error.code === "ENOENT") return new Response(null, { status: 404 });
      throw error;
    }
  }
  return fetch(input, options);
}
