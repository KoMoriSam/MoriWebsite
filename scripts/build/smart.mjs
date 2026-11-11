import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import dotenv from "dotenv";
import {
  CONTENT_DIRECTORY,
  MANIFEST_PATH,
  prepareContent,
  sealContentBuild,
  sourcesAreCurrent,
} from "./content.mjs";
import { activeVersions, deploy, restoreVersions } from "./deploy.mjs";
import { localSnapshotStore, snapshotStore } from "./snapshot-store.mjs";
import { removeBuildDirectory } from "../lib/content-files.mjs";
import { run } from "../lib/commands.mjs";

const flags = new Set(process.argv.slice(2));
const publish = flags.has("--deploy");
const dryRun = flags.has("--dry-run");
if (
  [...flags].some(
    (flag) => !["--deploy", "--dry-run", "--full"].includes(flag),
  ) ||
  (publish && dryRun)
) {
  throw new Error("Usage: pnpm build:smart [--deploy | --dry-run] [--full]");
}
dotenv.config({ path: [".env.production", ".env"], quiet: true });
process.env.VITE_BLOG_RAW ||= "https://raw.komori.cc/post";
process.env.VITE_NOVEL_RAW ||= "https://raw.komori.cc/novel";
process.env.CONTENT_BUILD_DIR = CONTENT_DIRECTORY;
process.env.SSG_IMAGE_CACHE = resolve(".tmp/site-image-cache");
const branch = process.env.SSG_PRODUCTION_BRANCH || "production";
if (
  publish &&
  (process.env.WORKERS_CI !== "1" ||
    process.env.WORKERS_CI_BRANCH !== branch ||
    process.env.CONTENT_BLOG_DIR ||
    process.env.CONTENT_NOVEL_DIR)
) {
  throw new Error(
    "Smart deployment requires the trusted Workers Builds production branch",
  );
}
const remote = publish ? snapshotStore() : null;
if (publish && !remote)
  throw new Error(
    "Configure a private R2 snapshot bucket before enabling smart deployment",
  );
if (
  process.env.WORKERS_CI === "1" &&
  process.env.WORKERS_CI_BRANCH !== branch &&
  process.env.CONTENT_GITHUB_TOKEN
) {
  throw new Error(
    "Private source credentials must be scoped to the trusted production build",
  );
}
const store = remote || (await localSnapshotStore());
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hashFile = async (file) => {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
};
async function inventory(directory) {
  const files = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  const result = {};
  for (const entry of files.filter((entry) => !entry.isDirectory())) {
    if (!entry.isFile())
      throw new Error(`Unexpected build file: ${entry.name}`);
    const file = join(entry.parentPath, entry.name);
    result[file.slice(directory.length + 1).replaceAll("\\", "/")] =
      await hashFile(file);
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")),
  );
}
function changes(previous = {}, current) {
  const added = Object.keys(current).filter(
    (file) => !Object.hasOwn(previous, file),
  );
  const modified = Object.keys(current).filter(
    (file) => Object.hasOwn(previous, file) && previous[file] !== current[file],
  );
  const deleted = Object.keys(previous).filter(
    (file) => !Object.hasOwn(current, file),
  );
  return {
    added,
    modified,
    deleted,
    total: added.length + modified.length + deleted.length,
  };
}
const started = performance.now();
const phases = {};
async function phase(name, action) {
  const start = performance.now();
  try {
    return await action();
  } finally {
    phases[name] = Math.round(performance.now() - start);
  }
}
const step = (file, ...args) => run(["node", `scripts/${file}.mjs`, ...args]);
await mkdir(".tmp", { recursive: true });
const lock = resolve(".tmp/site-build.lock");
await mkdir(lock);
let remoteLocked = false;
let scratch;
try {
  scratch = await mkdtemp(resolve(".tmp/site-publish-"));
  const stateFile = join(scratch, "state.json");
  const archive = join(scratch, "snapshot.tar.gz");
  const marker = join(scratch, "owner");
  await writeFile(marker, process.env.WORKERS_CI_BUILD_UUID || randomUUID());
  if (remote) {
    const deadline = Date.now() + 8 * 60_000;
    while (!(remoteLocked = await remote.put("publish.lock", marker, true))) {
      if (Date.now() > deadline)
        throw new Error(
          "Timed out waiting for the production publication lock",
        );
      await new Promise((next) => setTimeout(next, 5000));
    }
  }
  const websiteCommit = await run(["git", "rev-parse", "HEAD"], {
    capture: true,
  });
  async function isCurrentSite() {
    if (!publish) return true;
    const ref = `refs/heads/${branch}`;
    const head = await run(
      [
        "git",
        "ls-remote",
        "--exit-code",
        "https://github.com/KoMoriSam/MoriWebsite.git",
        ref,
      ],
      { capture: true },
    );
    return head.split(/\s+/u)[0] === websiteCommit;
  }
  if (!(await isCurrentSite())) {
    console.log(
      JSON.stringify({
        mode: "SKIPPED",
        websiteCommit,
        reason: "superseded website checkout",
      }),
    );
    process.exitCode = 0;
  } else {
    for (let attempt = 0; ; attempt++) {
      if ((await execute()) !== false) break;
      if (attempt >= 2)
        throw new Error("Content heads kept changing while building");
    }
  }
  async function execute() {
    const renderReport = join(scratch, "render.json");
    process.env.SSG_RENDER_REPORT = renderReport;
    const deployed = publish
      ? await phase("activeVersions", activeVersions)
      : null;
    const tracked = (
      await run(
        [
          "git",
          "ls-files",
          "--cached",
          "--others",
          "--exclude-standard",
          "-z",
          "--",
          "src",
          "shared",
          "scripts",
          "workers",
          "public",
          "changelog",
          "index.html",
          "vite.config.js",
          "wrangler.jsonc",
          "wrangler.content.jsonc",
          "pnpm-lock.yaml",
          "package.json",
          "LICENSE",
          "NOTICE",
          "LICENSES",
        ],
        { capture: true },
      )
    )
      .split("\0")
      .filter(Boolean);
    const config = Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => key.startsWith("VITE_"))
        .sort(),
    );
    const inputs = [];
    for (const file of [...new Set(tracked)].sort()) {
      const digest = await hashFile(file).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      inputs.push([file, digest]);
    }
    const platform = [process.version, process.platform, process.arch];
    const fingerprint = hash([platform, config, inputs]);
    const contentFingerprint = hash([
      platform,
      inputs.filter(
        ([file]) =>
          file === "pnpm-lock.yaml" ||
          file === "scripts/build/content.mjs" ||
          file.startsWith("scripts/lib/"),
      ),
    ]);
    const contentWorkerFingerprint = hash(
      inputs.filter(
        ([file]) =>
          file === "wrangler.content.jsonc" || file === "workers/content.js" || file === "shared/novel-release.js",
      ),
    );
    process.env.SSG_CONTENT_CACHE_VERSION = fingerprint;
    let previous;
    let snapshotHit = false;
    let restoredBytes = 0;
    let reason = "missing snapshot";
    let pending = false;
    await phase("restore", async () => {
      try {
        pending = await store.get("pending", join(scratch, "pending"));
        if (!(await store.get("latest.json", stateFile))) return;
        const state = await readJson(stateFile);
        if (
          state.schema !== 2 ||
          !/^[a-f0-9-]{36}$/u.test(state.id) ||
          !state.site ||
          !state.content ||
          !Array.isArray(state.sources) ||
          !state.renderer
        ) {
          throw new Error("incompatible version record");
        }
        if (
          !(await store.get(`${state.id}.tar.gz`, archive)) ||
          (await hashFile(archive)) !== state.archiveHash
        ) {
          throw new Error("snapshot checksum mismatch");
        }
        for (const directory of [
          "dist",
          ".output/content",
          ".output/content-build",
          ".output/novel-search",
          ".tmp/site-renderer",
          ".tmp/site-image-cache",
          ".tmp/site-search-cache",
        ]) {
          await removeBuildDirectory(resolve(directory), resolve("."));
        }
        await run(["tar", "-xzf", archive]);
        restoredBytes = (await stat(archive)).size;
        previous = state;
        snapshotHit = true;
        reason = pending
          ? "interrupted publication"
          : state.fingerprint !== fingerprint
            ? "application inputs changed"
            : deployed &&
                (deployed.site !== state.versions?.site ||
                  deployed.content !== state.versions?.content)
              ? "active deployment changed"
              : "";
      } catch (error) {
        reason = error.message;
      }
    });
    if (flags.has("--full")) reason = "full build requested";
    let full = Boolean(reason);
    await mkdir(process.env.SSG_IMAGE_CACHE, { recursive: true });
    await mkdir(".tmp/site-search-cache", { recursive: true });
    await phase("content", () =>
      prepareContent(
        previous?.contentFingerprint === contentFingerprint
          ? previous
          : undefined,
      ),
    );
    const source = await readJson(MANIFEST_PATH);
    if (!source.historyVerified) {
      reason = "previous content commit could not be verified";
      full = true;
    }
    const content = await inventory(CONTENT_DIRECTORY);
    const delta = changes(previous?.content, content);
    if (!full && !delta.total) {
      if (publish && !(await sourcesAreCurrent(source))) return false;
      if (!dryRun) await sealContentBuild();
      console.log(
        JSON.stringify({
          mode: "SKIPPED",
          ...source,
          snapshotHit,
          restoredBytes,
          phases,
          regeneratedPages: 0,
          reusedPages: Object.keys(previous.rendererPages || {}).length,
          assets: {
            total:
              Object.keys(previous.site).length + Object.keys(content).length,
            changed: 0,
          },
        }),
      );
      return;
    }
    const changedDocuments = [
      ...delta.added,
      ...delta.modified,
      ...delta.deleted,
    ].filter(
      (file) =>
        file.endsWith(".md") ||
        file === "post/index.json" ||
        file === "novel/index.json",
    );
    const blogChanged = changedDocuments.some((file) =>
      file.startsWith("post/"),
    );
    const novelChanged = changedDocuments.some((file) =>
      file.startsWith("novel/"),
    );
    async function render(compile) {
      if (compile) {
        if (dryRun) return;
        await step("build/static-assets");
        await step("release/changelog", "generate");
        await step("build/licenses", "--source");
      }
      await step(
        "build/images",
        "--production",
        ...(compile ? [] : ["--reuse-local"]),
      );
      await step("build/routes");
      if (!dryRun && (compile || blogChanged)) await step("build/rss");
      await step(
        "build/prerender",
        ...(compile ? ["--full"] : []),
        ...(dryRun ? ["--dry-run"] : []),
      );
    }
    await phase("render", async () => {
      try {
        await render(full);
      } catch (error) {
        if (full || dryRun) throw error;
        full = true;
        reason = `incremental rendering failed: ${error.message}`;
        await render(true);
      }
    });
    const mode = full ? "FULL" : "INCREMENTAL";
    const contentChanges = changes(
      Object.fromEntries(
        Object.entries(previous?.content || {}).filter(([file]) =>
          file.endsWith(".md"),
        ),
      ),
      Object.fromEntries(
        Object.entries(content).filter(([file]) => file.endsWith(".md")),
      ),
    );
    const rendered = dryRun && full ? {} : await readJson(renderReport);
    const summary = {
      mode,
      ...source,
      reason,
      snapshotHit,
      restoredBytes,
      phases,
      ...rendered,
      contentChanges: {
        added: contentChanges.added.length,
        modified: contentChanges.modified.length,
        deleted: contentChanges.deleted.length,
      },
      updatedImages: [...delta.added, ...delta.modified].filter(
        (file) =>
          /\.(avif|gif|jpe?g|png|svg|webp)$/iu.test(file) &&
          !file.includes("/_optimized/"),
      ).length,
    };
    if (dryRun) {
      console.log(JSON.stringify({ ...summary, dryRun }));
      return;
    }
    await phase("indexes", async () => {
      if (full || blogChanged) await copyFile("public/rss.xml", "dist/rss.xml");
      if (full || blogChanged || novelChanged) {
        // Incremental builds skip frontend compilation, which generates this Pagefind input.
        if (!full) await step("build/licenses", "--source");
        for (const directory of [
          ...(full || blogChanged ? ["pagefind"] : []),
        ]) {
          await removeBuildDirectory(
            resolve("dist", directory),
            resolve("dist"),
          );
        }
        await step(
          "build/pagefind",
          ...(full || blogChanged ? ["--public"] : []),
          ...(full || novelChanged ? ["--novel"] : []),
        );
      }
      await step("build/sitemap");
      if (full) await step("build/licenses", "--dist");
      await step("build/prune-assets");
      await sealContentBuild();
    });
    const site = await inventory(resolve("dist"));
    const siteDelta = changes(previous?.site, site);
    const id = randomUUID();
    const articles = await readJson(resolve("dist/site-data/articles.json"));
    const volumes = await readJson(join(CONTENT_DIRECTORY, "novel/index.json"));
    const documents = {
      blog: articles
        .filter(({ legacy }) => !legacy)
        .map(({ id, path, article }) => ({
          id,
          slug: path,
          language: article.lang,
          publishedAt: article.date,
          sourcePath: article.path,
          sha256: content[`post/${article.path}`],
        })),
      novel: Object.values(volumes).flatMap(({ chapters }) =>
        chapters.map((chapter) => ({
          id: chapter.uuid,
          slug: `/novel/${chapter.uuid}`,
          language: "zh-CN",
          publishedAt: chapter.uploadDate,
          sourcePath: chapter.path,
          sha256: content[`novel/${chapter.path}`],
        })),
      ),
    };
    const state = {
      schema: 2,
      id,
      fingerprint,
      contentFingerprint,
      contentWorkerFingerprint,
      ...source,
      site,
      content,
      documents,
      rendererPages: await readJson(resolve(".tmp/site-renderer/pages.json")),
      renderer: await inventory(resolve(".tmp/site-renderer")),
    };
    const deployment = {
      contentChanged:
        flags.has("--full") ||
        pending ||
        previous?.contentWorkerFingerprint !== contentWorkerFingerprint ||
        deployed?.content !== previous?.versions?.content ||
        delta.total > 0,
      siteChanged: full || siteDelta.total > 0,
    };
    await phase("snapshot", async () => {
      await run([
        "tar",
        "-czf",
        archive,
        "dist",
        ".output/content",
        ".output/content-build",
        ".output/novel-search",
        ".tmp/site-renderer",
        ".tmp/site-image-cache",
        ".tmp/site-search-cache",
      ]);
      state.archiveHash = await hashFile(archive);
      state.archiveBytes = (await stat(archive)).size;
      await store.put(`${id}.tar.gz`, archive);
    });
    if (!(await isCurrentSite())) {
      await store.delete(`${id}.tar.gz`);
      console.log(
        JSON.stringify({
          mode: "SKIPPED",
          websiteCommit,
          reason: "superseded website checkout",
        }),
      );
      return;
    }
    if (publish) {
      if (!(await sourcesAreCurrent(source))) {
        await store.delete(`${id}.tar.gz`);
        console.log(
          JSON.stringify({
            phase: "deploy",
            reason: "content heads advanced; rebuilding",
          }),
        );
        return false;
      }
      await store.put("pending", marker);
      await phase("deploy", async () => {
        try {
          await deploy("website", [], deployment);
          state.versions = await activeVersions();
        } catch (error) {
          await restoreVersions(deployed, previous?.versions).catch((rollback) => {
            throw new AggregateError(
              [error, rollback],
              "Deployment and rollback failed",
            );
          });
          throw error;
        }
      });
    }
    await writeFile(stateFile, JSON.stringify(state));
    await store.put("latest.json", stateFile);
    if (publish) await store.delete("pending");
    if (previous)
      await store
        .delete(`${previous.id}.tar.gz`)
        .catch((error) =>
          console.warn(`Previous snapshot cleanup failed: ${error.message}`),
        );
    console.log(
      JSON.stringify({
        ...summary,
        ...(publish && { deployment }),
        archiveBytes: state.archiveBytes,
        durationMs: Math.round(performance.now() - started),
        assets: {
          total: Object.keys(site).length + Object.keys(content).length,
          changed: siteDelta.total + delta.total,
        },
      }),
    );
  }
} finally {
  try {
    if (remoteLocked) await remote.delete("publish.lock");
  } finally {
    if (scratch) await removeBuildDirectory(scratch, resolve(".tmp"));
    await removeBuildDirectory(lock, resolve(".tmp"));
  }
}
