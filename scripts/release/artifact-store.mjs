import { createHash, randomUUID } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { run } from "../lib/commands.mjs";
import { buildEnvironment } from "../lib/build-environment.mjs";
import { observeBuild, buildEvent } from "../lib/build-report.mjs";
import { assertNovelRelease } from "../build/novel-release.mjs";
import { snapshotStore } from "../build/snapshot-store.mjs";

export const releaseIdPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const checksum = /^[a-f0-9]{64}$/;
const roots = ["dist", ".output/content", ".output/content-build/novel", ".output/novel-search",
  ".output/novel-vault.json", "workers", "shared", "migrations",
  "wrangler.jsonc", "wrangler.auth.jsonc", "wrangler.api.jsonc", "wrangler.content.jsonc",
  "package.json", "pnpm-lock.yaml"];

export const json = async (file) => JSON.parse(await readFile(file, "utf8"));
export const hash = (input) => createHash("sha256").update(input).digest("hex");

export async function hashFile(file) {
  const hasher = createHash("sha256");
  for await (const chunk of createReadStream(file)) hasher.update(chunk);
  return hasher.digest("hex");
}

export async function scratchDirectory() {
  await mkdir(".tmp", { recursive: true });
  return mkdtemp(resolve(".tmp/release-"));
}

export function artifactStore() {
  const store = snapshotStore({ prefix: "RELEASE_R2", namespace: "release-v1" });
  if (store) return store;
  if (process.env.MORI_ARTIFACT_LOCAL !== "1") throw new Error("Configure private RELEASE_R2 credentials");
  const base = resolve(".tmp/local-release-artifacts");
  return {
    async put(key, file) {
      const target = resolve(base, key);
      await mkdir(resolve(target, ".."), { recursive: true });
      try {
        await copyFile(file, target, constants.COPYFILE_EXCL);
        return true;
      } catch (error) {
        if (error.code === "EEXIST") return false;
        throw error;
      }
    },
    async get(key, file) {
      try {
        await copyFile(resolve(base, key), file);
        return true;
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
    },
  };
}

export async function putJson(store, key, value, scratch, { immutable = true } = {}) {
  const file = resolve(scratch, randomUUID() + ".json");
  await writeFile(file, JSON.stringify(value));
  try {
    return await store.put(key, file, immutable);
  } finally {
    await rm(file, { force: true });
  }
}

export async function getJson(store, key, scratch) {
  const file = resolve(scratch, randomUUID() + ".json");
  try {
    return await store.get(key, file) ? await json(file) : null;
  } finally {
    await rm(file, { force: true });
  }
}

async function inventory(root) {
  const files = [];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!entry.isFile()) throw new Error("Unexpected entry in release artifact");
    files.push(relative(root, resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"));
  }
  const entries = {};
  for (const name of files.sort()) entries[name] = await hashFile(resolve(root, name));
  return entries;
}

export async function sealArtifact(source, report) {
  const store = artifactStore();
  const scratch = await scratchDirectory();
  try {
    const id = randomUUID();
    const root = resolve(scratch, "tree");
    await observeBuild("artifact", "copy publishable files", async () => {
      for (const name of roots) {
        const target = resolve(root, name);
        await mkdir(resolve(target, ".."), { recursive: true });
        await cp(name, target, { recursive: true, filter: (file) => !/^workers[\\/]dev(?:[\\/]|$)/.test(file) });
      }
    });
    const contentKind = process.env.MORI_ARTIFACT_LOCAL === "1" || source.sources.slice(0, 2)
      .some(({ commit }) => !/^[a-f0-9]{40}$/i.test(commit)) ? "fixture" : "candidate";
    const novelVersion = await assertNovelRelease(root);
    await writeFile(resolve(root, "dist/site-data/release.json"), JSON.stringify({ id, websiteCommit: source.websiteCommit, novelVersion }));
    const files = await observeBuild("artifact", "hash publishable files", () => inventory(root));
    const archive = resolve(scratch, "artifact.tar.gz");
    await observeBuild("artifact", "compress release", () =>
      run(["tar", "-czf", archive, "-C", root, ...roots], { env: buildEnvironment() }),
    );
    const manifest = {
      schema: 1, id, createdAt: new Date().toISOString(), contentKind,
      websiteCommit: source.websiteCommit, sources: source.sources, novelVersion,
      toolchain: { node: process.version, platform: process.platform, architecture: process.arch },
      files, archiveHash: await hashFile(archive), bytes: (await stat(archive)).size,
      report: { mode: report.mode, phases: report.phases, regeneratedPages: report.regeneratedPages, reusedPages: report.reusedPages },
    };
    await observeBuild("artifact", "store immutable release", async () => {
      if (!await store.put(`${id}/artifact.tar.gz`, archive, true) ||
          !await putJson(store, `${id}/manifest.json`, manifest, scratch))
        throw new Error("Release ID already exists");
    }, { bytes: manifest.bytes });
    if (process.env.GITHUB_OUTPUT) {
      const { appendFile } = await import("node:fs/promises");
      await appendFile(process.env.GITHUB_OUTPUT, `release_id=${id}\n`);
    }
    buildEvent("artifact", "release", "ready", { id, contentKind, novelVersion });
    return manifest;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function materializeArtifact(id, scratch) {
  if (!releaseIdPattern.test(id || "")) throw new Error("Specify an exact Release ID");
  const store = artifactStore();
  const manifest = await getJson(store, `${id}/manifest.json`, scratch);
  if (manifest?.schema !== 1 || manifest.id !== id || !checksum.test(manifest.archiveHash) ||
      !checksum.test(manifest.novelVersion) || !/^[a-f0-9]{40}$/i.test(manifest.websiteCommit) ||
      !Array.isArray(manifest.sources) || !manifest.files) throw new Error("Release manifest is unavailable or invalid");
  const archive = resolve(scratch, "release.tar.gz");
  await observeBuild("artifact", "retrieve and verify release", async () => {
    if (!await store.get(`${id}/artifact.tar.gz`, archive) ||
        (await stat(archive)).size !== manifest.bytes || await hashFile(archive) !== manifest.archiveHash)
      throw new Error("Release archive integrity check failed");
  }, { bytes: manifest.bytes });
  const archiveEnv = buildEnvironment();
  const entries = await run(["tar", "-tvzf", archive], { env: archiveEnv, capture: true });
  if (!entries || entries.split(/\r?\n/).some((entry) => !/^[-d]/.test(entry)))
    throw new Error("Release archive contains links or unsupported entries");
  const names = await run(["tar", "-tzf", archive], { env: archiveEnv, capture: true });
  for (const name of names.split(/\r?\n/)) {
    const file = name.replace(/\/$/, "");
    if (/[\\:\u0000-\u001f]/u.test(file) || file.split("/").some((part) => !part || part === ".." || part === ".") ||
        !roots.some((root) => file === root || file.startsWith(root + "/")))
      throw new Error("Release archive contains an unexpected path");
  }
  const root = resolve(scratch, "tree");
  await mkdir(root);
  await run(["tar", "-xzf", archive, "-C", root], { env: archiveEnv });
  const files = await inventory(root);
  if (JSON.stringify(files) !== JSON.stringify(manifest.files) || await assertNovelRelease(root) !== manifest.novelVersion)
    throw new Error("Release artifact contents do not match the manifest");
  return { manifest, root };
}
