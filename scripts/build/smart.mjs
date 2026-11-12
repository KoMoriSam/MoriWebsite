import { assertPublicVite, buildEnvironment } from "../lib/build-environment.mjs";
import { artifactStore, sealArtifact } from "../release/artifact-store.mjs";
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
} from "./content.mjs";
import { localSnapshotStore, snapshotStore } from "./snapshot-store.mjs";
import { removeBuildDirectory } from "../lib/content-files.mjs";
import { run } from "../lib/commands.mjs";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";

const flags = new Set(process.argv.slice(2));
const buildCandidate = flags.has("--deploy");
const artifact = flags.has("--artifact");
const dryRun = flags.has("--dry-run") || flags.has("--explain");
const profile = flags.has("--profile");
if (
  [...flags].some(
    (flag) => !["--deploy", "--dry-run", "--explain", "--full", "--profile", "--artifact"].includes(flag),
  ) ||
  (buildCandidate && (dryRun || artifact)) || (artifact && dryRun)
) {
  throw new Error("Usage: pnpm build:smart [--deploy | --dry-run | --explain] [--full] [--profile] [--artifact]");
}
if (buildCandidate) {
  await run(["node", "scripts/release/candidate.mjs", ...(flags.has("--full") ? ["--full"] : [])]);
  process.exit(0);
}
dotenv.config({ path: [".env.production", ".env"], quiet: true });
assertPublicVite();
if (artifact) Object.assign(process.env, {
  VITE_BLOG_RAW: "/content/post", VITE_NOVEL_RAW: "/content/novel",
  VITE_COMMENT_COUNTS_API: "/api/github/discussions/counts", VITE_RANDOM_HERO_API: "/api/random-hero",
  VITE_ANALYTICS_API: "/api/analytics", VITE_ANNOUNCEMENTS_API: "/api/announcements",
  VITE_CHANGELOG_API: "/api/changelog", VITE_GAMES_API: "/api/games/rooms",
  VITE_GITHUB_PROFILE_API: "/api/github/users", VITE_GITHUB_REPOSITORY_API: "/api/github/repos",
});
process.env.VITE_BLOG_RAW ||= "https://raw.komori.cc/post";
process.env.VITE_NOVEL_RAW ||= "https://raw.komori.cc/novel";
process.env.CONTENT_BUILD_DIR = CONTENT_DIRECTORY;
process.env.SSG_IMAGE_CACHE = resolve(".tmp/site-image-cache");
const branch = process.env.SSG_PRODUCTION_BRANCH || "production";
const remote = artifact ? snapshotStore() : null;
if (
  process.env.WORKERS_CI === "1" &&
  process.env.WORKERS_CI_BRANCH !== branch &&
  process.env.CONTENT_GITHUB_TOKEN
) {
  throw new Error(
    "Private source credentials must be scoped to the trusted production build",
  );
}
if (artifact) {
  artifactStore();
  if (process.env.MORI_ARTIFACT_LOCAL !== "1" && !process.env.CONTENT_BLOG_DIR && !process.env.CONTENT_NOVEL_DIR) {
    const pendingFiles = await run(["git", "status", "--porcelain", "--untracked-files=normal"], { capture: true, env: buildEnvironment() });
    if (pendingFiles) throw new Error("A publishable release requires a clean website checkout");
  }
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
  const name = directory.slice(resolve(".").length + 1);
  const files = await observeBuild("inventory", "scan files", async (update) => {
    const entries = await readdir(directory, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => !entry.isDirectory());
    update({ completed: files.length });
    return files;
  }, { directory: name });
  const result = await observeBuild("inventory", "hash files", async (update) => {
    const hashes = {};
    let completed = 0;
    for (const entry of files) {
      if (!entry.isFile())
        throw new Error(`Unexpected build file: ${entry.name}`);
      const file = join(entry.parentPath, entry.name);
      hashes[file.slice(directory.length + 1).replaceAll("\\", "/")] =
        await hashFile(file);
      update({ completed: ++completed });
    }
    return hashes;
  }, { directory: name, completed: 0, total: files.length });
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
    return await observeBuild("smart", name, action);
  } finally {
    phases[name] = Math.round(performance.now() - start);
  }
}
const step = (file, ...args) =>
  observeBuild("command", file, () => run(["node", `scripts/${file}.mjs`, ...args], { env: buildEnvironment() }));
const snapshotDirectories = [
  "dist",
  ".output/content",
  ".output/content-build",
  ".output/novel-search",
  ".tmp/site-renderer",
  ".tmp/site-image-cache",
  ".tmp/site-search-cache",
];
await mkdir(".tmp", { recursive: true });
delete process.env.SSG_BUILD_PROFILE;
if (profile) {
  const directory = resolve(".tmp/build-profiles");
  await mkdir(directory, { recursive: true });
  process.env.SSG_BUILD_PROFILE = join(directory, `${randomUUID()}.ndjson`);
  console.log(`Build profile: ${process.env.SSG_BUILD_PROFILE}`);
}
const lock = resolve(".tmp/site-build.lock");
class InvalidSnapshot extends Error {}
let localLocked = false;
let remoteLocked = false;
let scratch;
let result = "error";
try {
  await observeBuild("lock", "acquire local lock", async () => {
    await mkdir(lock);
    localLocked = true;
  });
  scratch = await mkdtemp(resolve(".tmp/site-publish-"));
  const stateFile = join(scratch, "state.json");
  const archive = join(scratch, "snapshot.tar.gz");
  const marker = join(scratch, "owner");
  await writeFile(marker, process.env.WORKERS_CI_BUILD_UUID || randomUUID());
  if (remote) await observeBuild("lock", "wait for R2 build lock", async () => {
    const deadline = Date.now() + 8 * 60_000;
    while (!(remoteLocked = await remote.put("publish.lock", marker, true))) {
      if (Date.now() > deadline)
        throw new Error(
          "Timed out waiting for the candidate build lock",
        );
      await new Promise((next) => setTimeout(next, 5000));
    }
  });
  const websiteCommit = await observeBuild("inputs", "website commit", () =>
    run(["git", "rev-parse", "HEAD"], { capture: true }),
  );
  await execute();
  result = "success";
  async function execute() {
    const renderReport = join(scratch, "render.json");
    process.env.SSG_RENDER_REPORT = renderReport;
    const tracked = (
      await observeBuild("inputs", "scan website files", () => run(
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
      ))
    )
      .split("\0")
      .filter(Boolean);
    const config = Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => key.startsWith("VITE_"))
        .sort(),
    );
    const files = [...new Set(tracked)].sort();
    const inputs = await observeBuild("inputs", "hash website files", async (update) => {
      const inputs = [];
      for (const file of files) {
        const digest = await hashFile(file).catch((error) => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        inputs.push([file, digest]);
        update({ completed: inputs.length });
      }
      return inputs;
    }, { completed: 0, total: files.length });
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
    process.env.SSG_CONTENT_CACHE_VERSION = hash([platform, inputs.filter(([file]) =>
      file === "pnpm-lock.yaml" ||
      file === "scripts/build/pagefind.mjs" ||
      file === "scripts/lib/content-source.mjs" ||
      file === "scripts/lib/build-cache.mjs" ||
      file === "src/utils/create-license-anchor.js" ||
      file.startsWith("src/utils/markdown/") ||
      file.startsWith("src/utils/novel/"),
    )]);
    process.env.SSG_RSS_CACHE_VERSION = hash([platform, inputs.filter(([file]) =>
      file === "pnpm-lock.yaml" || file === "scripts/build/rss.mjs" ||
      file === "scripts/lib/rss-content.mjs" || file.startsWith("src/utils/markdown/") ||
      file.startsWith("src/utils/blog/") || file === "src/utils/resolve-article-assets.js",
    )]);
    let previous;
    let snapshotHit = false;
    let restoredBytes = 0;
    let reason = "missing snapshot";
    let pending = false;
    const storage = remote ? "r2" : "local";
    await phase("restore", async () => {
      try {
        pending = await observeBuild("restore", "read publication marker", () =>
          store.get("pending", join(scratch, "pending")), { storage });
        if (!(await observeBuild("restore", "read snapshot metadata", async (update) => {
          const found = await store.get("latest.json", stateFile);
          update({ cache: found ? "hit" : "miss" });
          return found;
        }, { storage }))) return;
        const state = await readJson(stateFile).catch((error) => {
          if (!(error instanceof SyntaxError)) throw error;
          throw new InvalidSnapshot("invalid snapshot metadata");
        });
        if (
          state.schema !== 2 ||
          !/^[a-f0-9-]{36}$/u.test(state.id) ||
          !state.site ||
          !state.content ||
          !Array.isArray(state.sources) ||
          !state.renderer
        ) {
          throw new InvalidSnapshot("incompatible version record");
        }
        await observeBuild("restore", "retrieve archive", async (update) => {
          if (!(await store.get(`${state.id}.tar.gz`, archive)))
            throw new InvalidSnapshot("snapshot archive missing");
          restoredBytes = (await stat(archive)).size;
          update({ bytes: restoredBytes });
        }, { storage });
        await observeBuild("restore", "verify archive SHA-256", async () => {
          if ((await hashFile(archive)) !== state.archiveHash)
            throw new InvalidSnapshot("snapshot checksum mismatch");
        }, { bytes: restoredBytes });
        await observeBuild("restore", "remove old directories", async (update) => {
          let completed = 0;
          for (const directory of snapshotDirectories) {
            await removeBuildDirectory(resolve(directory), resolve("."));
            update({ completed: ++completed });
          }
        }, { completed: 0, total: snapshotDirectories.length });
        await observeBuild("restore", "extract archive", () =>
          run(["tar", "-xzf", archive]), { bytes: restoredBytes });
        await observeBuild("restore", "validate restored structure", async () => {
          const files = [
            "dist/index.html",
            ".tmp/site-renderer/template.html",
            ".tmp/site-renderer/server/main.mjs",
          ];
          const manifests = [
            ".tmp/site-renderer/pages.json",
            ".tmp/site-renderer/assets.json",
            "dist/assets/images/_optimized/manifest.json",
            join(CONTENT_DIRECTORY, "post/index.json"),
            join(CONTENT_DIRECTORY, "novel/index.json"),
          ];
          try {
            for (const directory of snapshotDirectories) {
              if (!(await stat(directory)).isDirectory())
                throw new InvalidSnapshot("invalid snapshot directory");
            }
            for (const file of files) {
              if (!(await stat(file)).isFile())
                throw new InvalidSnapshot("invalid snapshot file type");
            }
            for (const manifest of manifests) {
              const data = await readJson(manifest);
              if (!data || typeof data !== "object")
                throw new InvalidSnapshot("invalid snapshot manifest");
            }
          } catch (error) {
            if (error instanceof SyntaxError || ["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code))
              throw new InvalidSnapshot("snapshot has missing or invalid site, renderer or content files");
            throw error;
          }
        });
        previous = state;
        snapshotHit = true;
        reason = pending
          ? "interrupted publication"
          : state.fingerprint !== fingerprint
            ? "application inputs changed"
            : "";
      } catch (error) {
        if (!(error instanceof InvalidSnapshot)) throw error;
        reason = error.message;
        buildEvent("restore", "snapshot", "rejected", { reason });
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
    if (source.websiteCommit !== websiteCommit) throw new Error("Website checkout changed during the build");
    if (!source.historyVerified) {
      reason = "previous content commit could not be verified";
      full = true;
    }
    const content = await inventory(CONTENT_DIRECTORY);
    const delta = changes(previous?.content, content);
    buildEvent("smart", "build mode", "decision", {
      mode: full ? "FULL" : delta.total ? "INCREMENTAL" : "SKIPPED",
      reason: reason || (delta.total ? "exported content changed" : "exported content unchanged"),
      snapshotHit,
      restoredBytes,
      changedFiles: delta.total,
    });
    if (!full && !delta.total) {
      if (!dryRun) await phase("seal unchanged build", sealContentBuild);
      if (artifact) await sealArtifact(source, { mode: "SKIPPED", phases });
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
        if (dryRun) {
          buildEvent("vite", "client and SSR bundles", "skip", {
            reason: "explain or dry-run mode",
          });
          return;
        }
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
    await phase("render", () => render(full));
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
      await phase("seal content and verify public assets", sealContentBuild);
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
      ...source,
      site,
      content,
      documents,
      rendererPages: await readJson(resolve(".tmp/site-renderer/pages.json")),
      renderer: await inventory(resolve(".tmp/site-renderer")),
    };
    await phase("snapshot", async () => {
      await observeBuild("snapshot", "compress archive", async (update) => {
        await run(["tar", "-czf", archive, ...snapshotDirectories]);
        state.archiveBytes = (await stat(archive)).size;
        update({ bytes: state.archiveBytes });
      });
      state.archiveHash = await observeBuild("snapshot", "hash archive", () =>
        hashFile(archive), { bytes: state.archiveBytes });
      await observeBuild("snapshot", "store archive", () =>
        store.put(`${id}.tar.gz`, archive), { storage, bytes: state.archiveBytes });
    });
    if (artifact) await sealArtifact(source, summary);
    await writeFile(stateFile, JSON.stringify(state));
    await observeBuild("snapshot", "store latest metadata", () =>
      store.put("latest.json", stateFile), { storage });
    if (previous)
      await store
        .delete(`${previous.id}.tar.gz`)
        .catch((error) =>
          console.warn(`Previous snapshot cleanup failed: ${error.message}`),
        );
    console.log(
      JSON.stringify({
        ...summary,
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
    if (remoteLocked)
      await observeBuild("lock", "release R2 build lock", () => remote.delete("publish.lock"));
  } catch (error) {
    result = "error";
    throw error;
  } finally {
    try {
      if (scratch) await removeBuildDirectory(scratch, resolve(".tmp"));
    } finally {
      if (localLocked) await removeBuildDirectory(lock, resolve(".tmp"));
      buildEvent("smart", "build", result, {
        elapsedMs: Math.round(performance.now() - started),
      });
    }
  }
}
