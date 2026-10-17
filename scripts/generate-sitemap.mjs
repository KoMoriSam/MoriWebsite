import { readdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import snapshot from "../src/router/ssg-data.generated.js";

const root = resolve("dist");
const files = await readdir(root, { recursive: true, withFileTypes: true });
const paths = files.filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => relative(root, resolve(entry.parentPath, entry.name)).split(sep).join("/"))
  .map((file) => `/${file.replace(/(?:^|\/)index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "")}`)
  .filter((path) => !["/404", "/home"].includes(path) && !path.startsWith("/test") && !path.startsWith("/archive/") &&
    (!path.startsWith("/blog/") || /^\/blog\/page\/\d+$/.test(path)));
paths.push(...snapshot.articles.filter((entry) => !entry.legacy).map((entry) => entry.path));
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const urls = [...new Set(paths)].sort().map((path) => `<url><loc>${escape(new URL(path, "https://komori.cc").href)}</loc></url>`);
await writeFile(resolve(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`Sitemap: ${urls.length} canonical pages`);
