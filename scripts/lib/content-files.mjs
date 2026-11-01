import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";

const controlFiles = new Set([".nojekyll", ".publish-manifest.json", "_headers", "_redirects", "404.html"]);
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function publishedPath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0") || value.includes(":")) throw new Error(`Invalid content path: ${value}`);
  const parts = value.split("/");
  if (parts.some((part) => !part || part.startsWith("."))) throw new Error(`Invalid content path: ${value}`);
  return value;
}

export async function fileInside(directory, relativePath) {
  publishedPath(relativePath);
  const root = await realpath(directory);
  const filename = await realpath(path.join(root, relativePath));
  const relative = path.relative(root, filename);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !(await lstat(filename)).isFile()) {
    throw new Error(`Content file escapes export directory: ${relativePath}`);
  }
  return filename;
}

export async function copyPublishedFile(source, destination, relativePath) {
  const filename = await fileInside(source, relativePath);
  const target = path.join(destination, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(filename, target);
}

export async function copyTree(source, destination, { hidden = false } = {}) {
  const info = await lstat(source);
  if (info.isSymbolicLink()) throw new Error(`Symlink in content source: ${source}`);
  if (!info.isDirectory()) throw new Error(`Expected content directory: ${source}`);
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name) || (!hidden && (entry.name.startsWith(".") || controlFiles.has(entry.name)))) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in content source: ${from}`);
    if (entry.isDirectory()) await copyTree(from, to, { hidden });
    else if (entry.isFile()) await copyFile(from, to);
    else throw new Error(`Unsupported content entry: ${from}`);
  }
}

export async function copyBlogExport(source, destination) {
  const manifest = JSON.parse(await readFile(path.join(source, ".publish-manifest.json"), "utf8"));
  if (!Array.isArray(manifest.managedFiles) || !manifest.managedFiles.includes("index.json")) throw new Error("Invalid blog publish manifest");
  await mkdir(destination, { recursive: true });
  for (const relativePath of new Set(manifest.managedFiles)) {
    if (!controlFiles.has(relativePath)) await copyPublishedFile(source, destination, relativePath);
  }
}

export async function novelMetadataFingerprint(directory) {
  const hash = createHash("sha256");
  async function visit(folder, prefix = "") {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!prefix && entry.name === "images") continue;
      const relative = `${prefix}${entry.name}`;
      const filename = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink in novel metadata: ${relative}`);
      if (entry.isDirectory()) await visit(filename, `${relative}/`);
      else if (entry.name.endsWith(".md") || entry.name === ".volume_uuid") {
        hash.update(relative).update("\0").update(await readFile(filename)).update("\0");
      }
    }
  }
  await visit(directory);
  return hash.digest("hex");
}

export async function validateNovelExport(directory) {
  const index = JSON.parse(await readFile(path.join(directory, "index.json"), "utf8"));
  if (!index || Array.isArray(index) || typeof index !== "object") throw new Error("Invalid novel index");
  const identities = new Set();
  const routeCodes = new Set();
  const volumeIds = new Set();
  for (const [volume, entry] of Object.entries(index)) {
    publishedPath(volume);
    if (volume.includes("/") || !uuidPattern.test(entry.volumeInfo?.uuid) || volumeIds.has(entry.volumeInfo.uuid) || !Array.isArray(entry.chapters)) throw new Error(`Invalid novel volume: ${volume}`);
    volumeIds.add(entry.volumeInfo.uuid);
    for (const chapter of entry.chapters) {
      if (!chapter.path?.startsWith(`${volume}/`) || !uuidPattern.test(chapter.uuid) || !/^[A-Za-z0-9]{6}$/.test(chapter.routeCode) || identities.has(chapter.uuid) || routeCodes.has(chapter.routeCode)) {
        throw new Error(`Invalid novel chapter identity: ${chapter.path}`);
      }
      await fileInside(directory, chapter.path);
      identities.add(chapter.uuid);
      routeCodes.add(chapter.routeCode);
    }
  }
  return index;
}

export async function validateNovelSourceIdentities(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ["images", ".DS_Store"].includes(entry.name)) continue;
    try {
      const metadata = JSON.parse(await readFile(path.join(directory, entry.name, ".volume_uuid"), "utf8"));
      if (!uuidPattern.test(metadata.uuid)) throw new Error("Invalid volume UUID");
    } catch {
      throw new Error(`小说稳定元数据尚未回写：${entry.name}/.volume_uuid，请先完成 MyWritingVault 元数据自动化。`);
    }
  }
}

export async function removeBuildDirectory(directory, boundary) {
  let target;
  try { target = await realpath(directory); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  const relative = path.relative(await realpath(boundary), target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Unsafe build cleanup: ${directory}`);
  await rm(directory, { recursive: true, force: true });
}
