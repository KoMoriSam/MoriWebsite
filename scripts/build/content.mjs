import { buildEnvironment } from "../lib/build-environment.mjs";
import { randomUUID } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImageVariants } from "../lib/generate-image-variants.mjs";
import {
  copyBlogExport,
  copyTree,
  novelMetadataFingerprint,
  removeBuildDirectory,
  validateNovelExport,
  validateNovelSourceIdentities,
} from "../lib/content-files.mjs";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";
import { PROJECT_ROOT, run } from "../lib/commands.mjs";
import { readSourceHead, sourceGitEnvironment, sourceRef, sources } from "../lib/content-revisions.mjs";
import { prepareKaiming } from "../lib/kaiming-assets.mjs";

import { includePublicContent, sealNovelRelease, sourceDirectory } from "./novel-release.mjs";

export const CONTENT_DIRECTORY = sourceDirectory;
export const BUILD_DIRECTORY = path.join(PROJECT_ROOT, ".tmp/content-build");
export const MANIFEST_PATH = path.join(BUILD_DIRECTORY, "manifest.json");
export const SITE_RECEIPT_PATH = path.join(BUILD_DIRECTORY, "site.json");

async function assertWorkspace(directory) {
  const relative = path.relative(
    await realpath(PROJECT_ROOT),
    await realpath(directory),
  );
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`构建目录不在项目内，已停止处理：${directory}`);
}

async function checkoutSource(source, scratch, previous) {
  const directory = path.join(scratch, source.name);
  const key = source.name.toUpperCase();
  const local = process.env[`CONTENT_${key}_DIR`];
  const ref = sourceRef(key);
  let commit = "local";
  let historyVerified = true;
  if (local) {
    for (const folder of source.folders)
      await copyTree(
        path.resolve(local, folder),
        path.join(directory, folder),
        { hidden: true },
      );
  } else {
    const pinned = process.env[`MORI_PINNED_${key}`];
    if (pinned && !/^[a-f0-9]{40}$/.test(pinned)) throw new Error(`Invalid pinned ${source.name} commit`);
    const head = pinned || (previous?.ref === ref
      ? await observeBuild("content", `${source.name} check source commit`, () =>
          readSourceHead(source.repository, ref),
        )
      : null);
    if (head && previous?.ref === ref && previous.commit === head) {
      return {
        ...source,
        ref,
        commit: previous.commit,
        historyVerified,
        reused: true,
      };
    }
    // Keep credentials out of clone URLs, command arguments, and saved Git config.
    const remoteEnv = sourceGitEnvironment();
    await observeBuild("content", `${source.name} clone`, () => run(
      [
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--no-tags",
        "--filter=blob:none",
        "--no-checkout",
        "--branch",
        ref,
        `https://github.com/${source.repository}.git`,
        directory,
      ],
      { env: remoteEnv },
    ));
    await observeBuild("content", `${source.name} checkout`, async () => {
      await run(["git", "sparse-checkout", "set", "--cone", ...source.folders], {
        cwd: directory,
      });
      if (pinned && (await run(["git", "rev-parse", ref], { cwd: directory, capture: true })) !== pinned)
        await run(["git", "fetch", "--depth", "1", "origin", pinned], { cwd: directory, env: remoteEnv });
      // Checking out a blobless clone can fetch missing files from the private remote.
      await run(["git", "checkout", "--force", "--detach", pinned || ref], { cwd: directory, env: remoteEnv });
    });
    commit = await run(["git", "rev-parse", "HEAD"], {
      cwd: directory,
      capture: true,
    });
    if (pinned && commit !== pinned) throw new Error(`Pinned ${source.name} commit changed`);
    if (previous && previous.commit !== commit) {
      historyVerified =
        /^[a-f0-9]{40}$/u.test(previous.commit) &&
        (await run(
          [
            "git",
            "fetch",
            "--depth",
            "1",
            "--filter=blob:none",
            "origin",
            previous.commit,
          ],
          { cwd: directory, env: remoteEnv },
        ).then(
          () => true,
          () => false,
        ));
    }
  }
  // Both existing exporters use the same front-matter, js-yaml and Sharp dependencies.
  await symlink(
    path.join(PROJECT_ROOT, "node_modules"),
    path.join(directory, "scripts/node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  return { ...source, directory, ref, commit, historyVerified };
}

export async function prepareContent(previous) {
  if (
    process.env.WORKERS_CI === "1" &&
    process.env.CONTENT_GITHUB_TOKEN &&
    process.env.WORKERS_CI_BRANCH !==
      (process.env.SSG_PRODUCTION_BRANCH || "production")
  ) {
    throw new Error(
      "Private source credentials must be scoped to the trusted production build",
    );
  }
  await mkdir(BUILD_DIRECTORY, { recursive: true });
  await mkdir(path.dirname(CONTENT_DIRECTORY), { recursive: true });
  await assertWorkspace(BUILD_DIRECTORY);
  await assertWorkspace(path.dirname(CONTENT_DIRECTORY));
  await unlink(SITE_RECEIPT_PATH).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  const scratch = await mkdtemp(path.join(BUILD_DIRECTORY, "sources-"));
  const staged = path.join(scratch, "published");
  const env = buildEnvironment();
  env.SSG_IMAGE_CACHE ||= path.join(PROJECT_ROOT, ".tmp/site-image-cache");
  try {
    const checkedOut = [];
    for (const source of sources) {
      const prior = previous?.sources.find(
        ({ repository }) => repository === source.repository,
      );
      const checkout = await observeBuild("content", `${source.name} prepare source`, () =>
        checkoutSource(source, scratch, prior),
      );
      checkedOut.push(checkout);
      buildEvent("content", source.name, "decision", {
        cache: checkout.reused ? "hit" : "miss",
        reason: checkout.reused ? "source commit unchanged" : prior ? "source requires export" : "no reusable export",
        commit: checkout.commit,
      });
    }
    const [blog, novel] = checkedOut;
    // Both vault and website use the same Sharp rules. Use the build's cache-aware
    // implementation in this disposable export checkout.
    if (blog.reused) {
      await observeBuild("content", "copy reused blog export", () => copyTree(
        path.join(CONTENT_DIRECTORY, "post"),
        path.join(staged, "post"),
      ));
    } else {
      for (const script of ["generate-image-variants.mjs", "build-cache.mjs", "build-report.mjs"]) {
        await copyFile(
          path.join(PROJECT_ROOT, "scripts/lib", script),
          path.join(blog.directory, "scripts/lib", script),
        );
      }
      await observeBuild("content", "export blog", () =>
        run(["node", "scripts/export-public-notes.mjs"], { cwd: blog.directory, env }),
      );
      await observeBuild("content", "copy blog export", () => copyBlogExport(
        path.join(blog.directory, "public"),
        path.join(staged, "post"),
      ));
    }

    const novelDestination = path.join(staged, "novel");
    if (novel.reused) {
      await observeBuild("content", "copy reused novel export", () =>
        copyTree(path.join(CONTENT_DIRECTORY, "novel"), novelDestination),
      );
    } else {
      const novelPublic = path.join(novel.directory, "public");
      const before = await novelMetadataFingerprint(novelPublic);
      await validateNovelSourceIdentities(novelPublic);
      await observeBuild("content", "generate novel catalog", () =>
        run(["node", "scripts/generate-index.mjs"], { cwd: novel.directory, env }),
      );
      if (before !== (await novelMetadataFingerprint(novelPublic))) {
        throw new Error(
          "小说目录尚未同步完成。请等待 MyWritingVault 自动更新目录后重新构建。",
        );
      }
      await validateNovelExport(novelPublic);
      await observeBuild("content", "copy novel export", () =>
        copyTree(novelPublic, novelDestination),
      );
      await generateImageVariants({
        root: path.join(novelDestination, "images"),
      });
    }
    const kaiming = await observeBuild("content", "prepare Kaiming release", () =>
      prepareKaiming(path.join(staged, "kaiming")),
    );
    await writeFile(path.join(staged, "404.html"), "Not found\n");
    await writeFile(
      path.join(staged, "_redirects"),
      "/kaiming https://komori.cc/kaiming 301\n/kaiming/ https://komori.cc/kaiming 301\n",
    );
    await writeFile(
      path.join(staged, "_headers"),
      "/*\n  Access-Control-Allow-Origin: *\n  Access-Control-Expose-Headers: ETag, Content-Length, Content-Range, Accept-Ranges\n  Cross-Origin-Resource-Policy: cross-origin\n  X-Content-Type-Options: nosniff\n",
    );

    const manifest = {
      buildId: randomUUID(),
      websiteCommit: await run(["git", "rev-parse", "HEAD"], { capture: true }),
      historyVerified: checkedOut.every(
        ({ historyVerified }) => historyVerified,
      ),
      sources: [
        ...checkedOut.map(({ repository, ref, commit }) => ({
          repository,
          ref,
          commit,
        })),
        kaiming,
      ],
    };
    await observeBuild("content", "remove previous content tree", () =>
      removeBuildDirectory(CONTENT_DIRECTORY, path.dirname(CONTENT_DIRECTORY)),
    );
    await observeBuild("content", "copy prepared content tree", () =>
      copyTree(staged, CONTENT_DIRECTORY, { hidden: true }),
    );
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(
      "博客、小说和开明字体的构建输入已准备完成。",
    );
  } finally {
    await observeBuild("content", "remove disposable source checkouts", () =>
      removeBuildDirectory(scratch, BUILD_DIRECTORY),
    );
  }
}

export async function sealContentBuild() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  for (const file of [
    "index.html",
    "pagefind/pagefind-entry.json",
    "sitemap.xml",
  ])
    await access(path.join(PROJECT_ROOT, "dist", file));
  const dist = path.join(PROJECT_ROOT, "dist");
  await removeBuildDirectory(path.join(dist, "content"), dist);
  const novelVersion = await sealNovelRelease();
  await writeFile(
    SITE_RECEIPT_PATH,
    `${JSON.stringify({ buildId: manifest.buildId, websiteCommit: manifest.websiteCommit, novelVersion })}\n`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes("--seal")) {
    await sealContentBuild();
    if (process.argv.includes("--include-public")) await includePublicContent();
  }
  else await prepareContent();
}
