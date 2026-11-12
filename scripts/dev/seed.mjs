import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createIndex } from "pagefind";
import { getArticlePath } from "../../src/utils/blog/article-versions.js";
import { discussionRegistry } from "../../shared/discussions.js";
import { releaseFile } from "../../shared/novel-release.js";
import { run } from "../lib/commands.mjs";
import { authConfig, apiConfig, directory, persist } from "./config.mjs";

const digest = (body) => createHash("sha256").update(body).digest("hex");
const json = async (path, value) => {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value));
};
const chapter = "00000000-0000-4000-8000-000000000010";
const image = "images/local.svg";
const title = "本地测试章节";
const markdown = `# ${title}\n\n这段小说仅供本地开发与搜索测试。\n\n![测试插图](./${image})\n`;
const catalog = { 0: { volumeInfo: { uuid: chapter, title: "本地测试卷" }, chapters: [
  { uuid: chapter, title, path: "chapter.md", routeCode: "1", length: 17, uploadDate: "2026-01-01" },
] } };

export async function seed(env, { force = false } = {}) {
  await run(["node", "scripts/build/mock-articles.mjs"], { env });
  for (const [config, name] of [[authConfig, "mori-auth-local"], [apiConfig, "mori-analytics-local"]])
    await run(["wrangler", "d1", "migrations", "apply", name, "--local", "--persist-to", persist, "--config", config], { env });
  const articles = JSON.parse(await readFile("mock/article/index.json", "utf8"));
  const assets = resolve(directory, "assets");
  const fonts = resolve(assets, "content/kaiming");
  await mkdir(fonts, { recursive: true });
  await writeFile(resolve(fonts, "index.css"), "/* Local preview uses installed fallback fonts. */\n");
  await json(resolve(assets, discussionRegistry), {
    articles: Object.fromEntries(articles.map((article) => [article.id, { path: getArticlePath(article, article.sourceLocale) }])),
    chapters: { [chapter]: { path: `/novel/${chapter}`, term: title } },
  });
  const fixtureFile = resolve(directory, "novel.json");
  const stamp = digest(await readFile(new URL(import.meta.url)));
  const cached = await readFile(fixtureFile, "utf8").then(JSON.parse).catch(() => null);
  if (!force && cached?.stamp === stamp && await stat(resolve(assets, releaseFile)).catch(() => null)) return;

  const search = resolve(directory, "search");
  await rm(search, { recursive: true, force: true });
  const { index, errors } = await createIndex();
  if (!index || errors.length) throw new Error("Cannot initialize local Pagefind");
  try {
    const added = await index.addCustomRecord({ url: `/novel/${chapter}`, content: markdown, language: "zh", meta: { title } });
    if (added.errors.length) throw new Error("Cannot index local chapter");
    const output = await index.writeFiles({ outputPath: search });
    if (output.errors.length) throw new Error("Cannot write local Pagefind");
  } finally {
    await index.deleteIndex();
  }
  const objects = {};
  const manifest = {};
  function add(path, bytes) {
    const hash = digest(bytes);
    manifest[path] = hash;
    objects[hash] = Buffer.from(bytes).toString("base64");
  }
  add("chapters/chapter.md", markdown);
  add(`assets/${image}`, '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="teal"/></svg>');
  add("assets/images/_optimized/manifest.json", '{"version":1,"images":{}}');
  for (const entry of await readdir(search, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = resolve(entry.parentPath, entry.name);
    add("search/" + file.slice(search.length + 1).replaceAll("\\", "/"), await readFile(file));
  }
  const version = digest(JSON.stringify(manifest));
  await json(resolve(assets, releaseFile), { version, catalog });
  await json(resolve(assets, "mock/novel/index.json"), catalog);
  await json(fixtureFile, { stamp, version, manifest, objects });
}
