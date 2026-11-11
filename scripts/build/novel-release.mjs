import { discussionRegistry } from "../../shared/discussions.js";
import { getChapterContextTitle } from "../../src/utils/novel/format-label.js";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { publicCovers, publicCoverManifest, releaseFile, resourcePath } from "../../shared/novel-release.js";
import { copyTree, removeBuildDirectory } from "../lib/content-files.mjs";
import { PROJECT_ROOT } from "../lib/commands.mjs";
import { snapshotStore } from "./snapshot-store.mjs";

function directories(root) {
  const output = path.join(root, ".output");
  const sourceDirectory = path.join(output, "content-build");
  return {
    output, sourceDirectory,
    publicDirectory: path.join(output, "content"),
    searchDirectory: path.join(output, "novel-search"),
    privateManifest: path.join(output, "novel-vault.json"),
    dist: path.join(root, "dist"),
    source: path.join(sourceDirectory, "novel"),
  };
}

const production = directories(PROJECT_ROOT);
export const { sourceDirectory, searchDirectory } = production;
const sha = (data) => createHash("sha256").update(data).digest("hex");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const imageManifest = "images/_optimized/manifest.json";

export function publicCatalog(data) {
  const pick = (record, keys) => Object.fromEntries(keys.flatMap((key) => {
    const value = record?.[key];
    return typeof value === "string" || Number.isFinite(value) ? [[key, value]] : [];
  }));
  return Object.fromEntries(Object.entries(data).map(([key, volume]) => [
    key,
    {
      volumeInfo: pick(volume.volumeInfo, ["uuid", "title"]),
      chapters: volume.chapters.map((chapter) => pick(chapter,
        ["uuid", "title", "path", "routeCode", "uploadDate", "modifiedDate", "length"])),
    },
  ]));
}

async function files(directory, prefix = "") {
  const entries = await readdir(path.join(directory, prefix), { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await files(directory, relative));
    else if (entry.isFile() && resourcePath(relative)) result.push(relative);
    else throw new Error(`Unsafe build output: ${relative}`);
  }
  return result.sort();
}

async function releaseInventory(catalog, { source, searchDirectory }) {
  const resources = Object.create(null);
  const add = async (relative, directory, file) => {
    if (!resourcePath(relative)) throw new Error(`Invalid novel resource path: ${relative}`);
    resources[relative] = sha(await readFile(path.join(directory, file)));
  };
  for (const { chapters } of Object.values(catalog)) {
    for (const { path: file } of chapters) {
      if (!file?.endsWith(".md") || !resourcePath(file)) throw new Error("Invalid chapter path");
      await add(`chapters/${file}`, source, file);
    }
  }
  for (const file of await files(source)) {
    if (file === "index.json" || Object.hasOwn(resources, `chapters/${file}`)) continue;
    await add(`assets/${file}`, source, file);
  }
  for (const file of await files(searchDirectory))
    await add(`search/${file}`, searchDirectory, file);
  for (const file of ["pagefind.js", "pagefind-entry.json", "pagefind-worker.js"])
    if (!resources[`search/${file}`]) throw new Error(`Novel search output missing: ${file}`);
  const body = JSON.stringify(Object.fromEntries(Object.entries(resources).sort()));
  return { body, version: sha(body) };
}

async function covers(source) {
  const full = await json(path.join(source, imageManifest));
  const { images } = publicCoverManifest(full);
  const variants = Object.values(images).flatMap((entry) => entry.variants.map(({ src }) => src));
  const allowed = [...publicCovers, ...variants].map((name) => {
    if (!resourcePath(name) || !/\.(?:webp|avif|png|jpe?g)$/i.test(name))
      throw new Error("Invalid public cover");
    return `images/${name}`;
  });
  return { manifest: { version: 1, images }, allowed };
}

export async function sealNovelRelease(root = PROJECT_ROOT) {
  const paths = directories(root);
  const { source, output, publicDirectory, sourceDirectory, dist, privateManifest } = paths;
  const catalog = publicCatalog(await json(path.join(source, "index.json")));
  const { body, version } = await releaseInventory(catalog, paths);
  const { manifest, allowed } = await covers(source);
  await removeBuildDirectory(publicDirectory, output);
  await mkdir(path.join(publicDirectory, "novel/images/_optimized"), { recursive: true });
  for (const name of ["post", "kaiming"])
    await copyTree(path.join(sourceDirectory, name), path.join(publicDirectory, name), { hidden: true });
  for (const name of ["_headers", "_redirects", "404.html"])
    await copyFile(path.join(sourceDirectory, name), path.join(publicDirectory, name));
  for (const file of allowed) {
    const target = path.join(publicDirectory, "novel", file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(source, file), target);
  }
  const index = JSON.stringify(catalog);
  await writeFile(path.join(publicDirectory, "novel/index.json"), index);
  await writeFile(path.join(publicDirectory, "novel", imageManifest), JSON.stringify(manifest));
  await mkdir(path.dirname(path.join(dist, releaseFile)), { recursive: true });
  await writeFile(path.join(dist, releaseFile), JSON.stringify({ version, catalog }));
  const articles = await json(path.join(dist, "site-data/articles.json"));
  const discussions = {
    articles: Object.fromEntries(articles.map(({ id, path }) => [String(id), { path }])),
    chapters: Object.fromEntries(Object.values(catalog).flatMap(({ volumeInfo, chapters }) =>
      chapters.map((chapter) => [chapter.uuid, {
        path: `/novel/${encodeURIComponent(chapter.uuid)}`,
        term: getChapterContextTitle({ ...chapter, volumeTitle: volumeInfo.title }),
      }]))),
  };
  await writeFile(path.join(dist, discussionRegistry), JSON.stringify(discussions));
  await writeFile(privateManifest, body);
  await assertNovelRelease(root);
  return version;
}

export async function assertNovelRelease(root = PROJECT_ROOT) {
  const paths = directories(root);
  const { source, dist, privateManifest, publicDirectory } = paths;
  const { version, catalog } = await json(path.join(dist, releaseFile));
  const { body, version: expected } = await releaseInventory(publicCatalog(await json(path.join(source, "index.json"))), paths);
  if (version !== expected || await readFile(privateManifest, "utf8") !== body)
    throw new Error("Novel release files changed after sealing");
  const { manifest, allowed } = await covers(source);
  const published = path.join(publicDirectory, "novel");
  const permitted = new Set(["index.json", imageManifest, ...allowed]);
  const actual = await files(published);
  if (actual.length !== permitted.size || actual.some((name) => !permitted.has(name)))
    throw new Error("Unexpected public novel asset");
  const index = JSON.stringify(publicCatalog(await json(path.join(source, "index.json"))));
  if (await readFile(path.join(published, "index.json"), "utf8") !== index ||
      JSON.stringify(catalog) !== index ||
      await readFile(path.join(published, imageManifest), "utf8") !== JSON.stringify(manifest))
    throw new Error("Unexpected public novel metadata");
  for (const name of allowed) {
    if (!(await readFile(path.join(published, name))).equals(await readFile(path.join(source, name))))
      throw new Error("Public cover differs from its source");
  }

  const privateHashes = new Set(Object.entries(JSON.parse(body))
    .filter(([name]) => name.startsWith("chapters/") || name.startsWith("search/") ||
      !permitted.has(name.slice("assets/".length))).map(([, digest]) => digest));
  for (const file of await files(dist)) {
    if (/^(?:pagefind-novel|archive\/article)(?:\/|$)|\.(?:map|md)$/i.test(file) ||
        (!file.startsWith("pagefind/") && /\.pf_(?:fragment|index|meta|filter)$/i.test(file))) {
      throw new Error(`Unexpected public archive, search or source map: ${file}`);
    }
    if (!/^pagefind\/(?:pagefind(?:-worker)?\.js|wasm\.[^/]+\.pagefind)$/u.test(file) &&
        privateHashes.has(sha(await readFile(path.join(dist, file))))) {
      throw new Error(`Private novel file found in website assets: ${file}`);
    }
  }
  const protectedDocuments = new Set(Object.entries(JSON.parse(body))
    .filter(([name]) => name.startsWith("chapters/") || name.startsWith("search/"))
    .map(([, digest]) => digest));
  for (const file of await files(publicDirectory)) {
    if (protectedDocuments.has(sha(await readFile(path.join(publicDirectory, file))))) {
      throw new Error(`Private novel document found in public content assets: ${file}`);
    }
  }
  return version;
}

export async function publishNovelRelease(version) {
  const { privateManifest, source } = production;
  const store = snapshotStore({ prefix: "NOVEL_R2", namespace: "v1" });
  if (!store || process.env.NOVEL_R2_BUCKET !== "novel-vault") throw new Error("Configure private novel-vault upload credentials");
  if (await store.exists(`versions/${version}.json`)) return;
  const entries = Object.entries(await json(privateManifest));
  const uploaded = new Set();
  for (let offset = 0; offset < entries.length; offset += 12) {
    await Promise.all(entries.slice(offset, offset + 12).map(async ([key, digest]) => {
      if (uploaded.has(digest)) return;
      uploaded.add(digest);
      const object = `objects/${digest}`;
      if (await store.exists(object)) return;
      const [kind, ...rest] = key.split("/");
      await store.put(object, path.join(kind === "search" ? searchDirectory : source, ...rest), true);
    }));
  }
  await store.put(`versions/${version}.json`, privateManifest, true);
}
