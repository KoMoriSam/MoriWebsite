import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { run } from "../lib/commands.mjs";
import { assertPublicVite, buildEnvironment, deployEnvironment, sameOriginAssets, unusedBuildVariables } from "../lib/build-environment.mjs";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";
import { publishStores, readWorkerConfig } from "../lib/worker-config.mjs";
import { versionInputs } from "./version-inputs.mjs";

const branch = process.env.SSG_PRODUCTION_BRANCH || "production";
const full = process.argv.includes("--full");
if (process.argv.slice(2).some((arg) => arg !== "--full"))
  throw new Error("Usage: node scripts/build/version.mjs [--full]");
if (process.env.WORKERS_CI !== "1" || process.env.WORKERS_CI_BRANCH !== branch ||
    process.env.CONTENT_BLOG_DIR || process.env.CONTENT_NOVEL_DIR)
  throw new Error(`Version uploads require the trusted Workers Builds branch (${branch})`);
if (process.env.SKIP_DEPENDENCY_INSTALL !== "1")
  throw new Error("Set SKIP_DEPENDENCY_INSTALL=1 in website → Settings → Builds");
const unused = unusedBuildVariables();
for (const name of unused) delete process.env[name];
if (unused.length) buildEvent("version", "build configuration", "skip", {
  reason: "runtime-only or retired variables removed from this process; remove these names from Workers Builds",
  variables: unused,
});
assertPublicVite();
Object.assign(process.env, sameOriginAssets());

const config = await readWorkerConfig();
if (config.name !== "website" || config.assets?.directory !== "./dist" ||
    config.r2_buckets?.find(({ binding }) => binding === "NOVEL_VAULT")?.bucket_name !== "novel-vault" ||
    process.env.WRANGLER_CI_OVERRIDE_NAME && process.env.WRANGLER_CI_OVERRIDE_NAME !== config.name)
  throw new Error("This build must be connected to the website Worker and use its configured private bucket");

const { cache, novel } = publishStores(config);
await mkdir(".tmp", { recursive: true });
const scratch = await mkdtemp(resolve(".tmp/website-version-"));
const pointer = resolve(scratch, "version.json");
const marker = resolve(scratch, "owner");
const lock = "publish.lock";
const resultFile = resolve(scratch, "build.json");
const wranglerEnv = deployEnvironment();
const readPointer = async () => await cache.get("version.json", pointer) ? JSON.parse(await readFile(pointer, "utf8")) : null;
const writePointer = async (result) => {
  await writeFile(pointer, JSON.stringify(result));
  await cache.put("version.json", pointer);
};
const install = () => new Promise((done, reject) => {
  const child = spawn("pnpm", ["install", "--frozen-lockfile"], { env: buildEnvironment(), stdio: "inherit" });
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? done() : reject(new Error(`pnpm install failed (${code})`)));
});
let locked = false;
try {
  const { inputs, fingerprint } = await observeBuild("version", "resolve pinned inputs", versionInputs);
  const current = await readPointer();
  const reuse = (record) => !full && record?.fingerprint === fingerprint && /^[a-f0-9-]{36}$/.test(record.versionId || "");
  if (reuse(current)) {
    buildEvent("version", "input fingerprint", "skip", { reason: "inputs unchanged", ...current });
  } else {
    await writeFile(marker, process.env.WORKERS_CI_BUILD_UUID || inputs.websiteCommit);
    await observeBuild("version", "acquire build lock", async () => {
      const deadline = Date.now() + 120_000;
      while (!(locked = await cache.put(lock, marker, true))) {
        if (Date.now() > deadline) throw new Error("The snapshot bucket publish.lock is held by another build");
        await new Promise((done) => setTimeout(done, 3000));
      }
    });
    const previous = await readPointer();
    if (reuse(previous)) {
      buildEvent("version", "input fingerprint", "skip", { reason: "inputs unchanged after lock", ...previous });
    } else {
      buildEvent("version", "input fingerprint", "miss", { fingerprint, websiteCommit: inputs.websiteCommit, sources: inputs.sources });
      await observeBuild("version", "install locked dependencies", install);
      const tag = `input-${fingerprint.slice(0, 26)}`;
      const message = `MoriWebsite inputs ${fingerprint}`;
      const versions = JSON.parse(await observeBuild("version", "check existing Worker versions", () =>
        run(["wrangler", "versions", "list", "--config", "wrangler.jsonc", "--json"], { env: wranglerEnv, capture: true })));
      const uploaded = !full && versions.find(({ annotations }) =>
        annotations?.["workers/tag"] === tag && annotations?.["workers/message"] === message);
      if (uploaded) {
        const recovered = { fingerprint, versionId: uploaded.id };
        await writePointer(recovered);
        buildEvent("version", "native version", "reuse", recovered);
      } else {
        const [blog, novelSource, font] = inputs.sources;
        const buildEnv = { ...buildEnvironment(), MORI_SMART_RESULT: resultFile, WORKERS_CI: "1",
          WORKERS_CI_BRANCH: branch, SSG_PRODUCTION_BRANCH: branch,
          CONTENT_GITHUB_TOKEN: process.env.CONTENT_GITHUB_TOKEN,
          CONTENT_BLOG_REF: blog.ref, CONTENT_NOVEL_REF: novelSource.ref,
          MORI_PINNED_BLOG: blog.commit, MORI_PINNED_NOVEL: novelSource.commit, MORI_PINNED_KAIMING: JSON.stringify(font) };
        for (const key of ["SSG_R2_ENDPOINT", "SSG_R2_BUCKET", "SSG_R2_ACCESS_KEY", "SSG_R2_SECRET_KEY",
          "SSG_SNAPSHOT_NAMESPACE", "CLOUDFLARE_ACCOUNT_ID"])
          if (process.env[key]) buildEnv[key] = process.env[key];
        await run(["node", "scripts/build/smart.mjs", ...(full ? ["--full"] : [])], { env: buildEnv });
        const { mode, snapshotId } = JSON.parse(await readFile(resultFile, "utf8"));
        if (!snapshotId) throw new Error("Smart build did not record its snapshot");
        if (mode === "SKIPPED" && previous?.snapshotId === snapshotId &&
            versions.some(({ id }) => id === previous.versionId)) {
          const record = { fingerprint, snapshotId, versionId: previous.versionId };
          await writePointer(record);
          buildEvent("version", "native version", "reuse", { reason: "build output unchanged", ...record });
        } else {
          const { includePublicContent, publishNovelRelease } = await import("./novel-release.mjs");
          const novelVersion = await observeBuild("version", "include sealed public content", () => includePublicContent());
          await observeBuild("version", "sync private novel objects", () => publishNovelRelease(novelVersion, { store: novel }));
          const outputFile = resolve(scratch, "wrangler.ndjson");
          await observeBuild("version", "upload Worker version", () =>
            run(["wrangler", "versions", "upload", "--config", "wrangler.jsonc", "--tag", tag, "--message", message],
              { env: { ...wranglerEnv, WRANGLER_OUTPUT_FILE_PATH: outputFile } }));
          const output = (await readFile(outputFile, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
          const version = output.find(({ type }) => type === "version-upload");
          if (version?.worker_name !== config.name || !/^[a-f0-9-]{36}$/.test(version.version_id || ""))
            throw new Error("Wrangler did not report the uploaded website Version ID");
          const record = { fingerprint, snapshotId, versionId: version.version_id, novelVersion };
          await writePointer(record);
          buildEvent("version", "native version", "ready", { ...record, previewUrl: version.preview_url });
        }
      }
    }
  }
} finally {
  try {
    if (locked) await cache.delete(lock);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
