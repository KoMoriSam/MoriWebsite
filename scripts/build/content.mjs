import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, realpath, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImageVariants } from "../lib/generate-image-variants.mjs";
import { copyBlogExport, copyTree, novelMetadataFingerprint, removeBuildDirectory, validateNovelExport, validateNovelSourceIdentities } from "../lib/content-files.mjs";
import { PROJECT_ROOT, run } from "../lib/commands.mjs";
import { prepareKaiming } from "../lib/kaiming-assets.mjs";

export const CONTENT_DIRECTORY = path.join(PROJECT_ROOT, ".output/content");
export const BUILD_DIRECTORY = path.join(PROJECT_ROOT, ".tmp/content-build");
export const MANIFEST_PATH = path.join(BUILD_DIRECTORY, "manifest.json");
export const SITE_RECEIPT_PATH = path.join(BUILD_DIRECTORY, "site.json");

const sources = [
  { name: "blog", repository: "KoMoriSam/ObsidianVault", folders: ["notes", "attachments", "scripts"] },
  { name: "novel", repository: "KoMoriSam/MyWritingVault", folders: ["public", "scripts"] },
];

async function assertWorkspace(directory) {
  const relative = path.relative(await realpath(PROJECT_ROOT), await realpath(directory));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Build directory is outside workspace: ${directory}`);
}

async function checkoutSource(source, scratch) {
  const directory = path.join(scratch, source.name);
  const key = source.name.toUpperCase();
  const local = process.env[`CONTENT_${key}_DIR`];
  const ref = process.env[`CONTENT_${key}_REF`] || "main";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) || ref.includes("..")) throw new Error(`Invalid content branch: ${ref}`);
  let commit = "local";
  if (local) {
    for (const folder of source.folders) await copyTree(path.resolve(local, folder), path.join(directory, folder), { hidden: true });
  } else {
    const token = process.env.CONTENT_GITHUB_TOKEN;
    if (!token) throw new Error("缺少 CONTENT_GITHUB_TOKEN：请配置两个私有仓库的只读构建凭据，或设置 CONTENT_BLOG_DIR / CONTENT_NOVEL_DIR 使用本地内容源。");
    // Keep credentials out of clone URLs, command arguments, and saved Git config.
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
    };
    await run(["git", "clone", "--depth", "1", "--single-branch", "--no-tags", "--filter=blob:none", "--no-checkout", "--branch", ref, `https://github.com/${source.repository}.git`, directory], { env });
    await run(["git", "sparse-checkout", "set", "--cone", ...source.folders], { cwd: directory, env });
    await run(["git", "checkout", "--force", ref], { cwd: directory, env });
    commit = await run(["git", "rev-parse", "HEAD"], { cwd: directory, capture: true });
  }
  // Both existing exporters use the same front-matter, js-yaml and Sharp dependencies.
  await symlink(path.join(PROJECT_ROOT, "node_modules"), path.join(directory, "scripts/node_modules"), process.platform === "win32" ? "junction" : "dir");
  return { ...source, directory, ref, commit };
}

export async function prepareContent() {
  await mkdir(BUILD_DIRECTORY, { recursive: true });
  await mkdir(path.dirname(CONTENT_DIRECTORY), { recursive: true });
  await assertWorkspace(BUILD_DIRECTORY);
  await assertWorkspace(path.dirname(CONTENT_DIRECTORY));
  await unlink(SITE_RECEIPT_PATH).catch((error) => { if (error.code !== "ENOENT") throw error; });
  const scratch = await mkdtemp(path.join(BUILD_DIRECTORY, "sources-"));
  const staged = path.join(scratch, "published");
  const env = { ...process.env };
  delete env.CONTENT_GITHUB_TOKEN;
  try {
    const checkedOut = [];
    for (const source of sources) checkedOut.push(await checkoutSource(source, scratch));
    const [blog, novel] = checkedOut;
    await run(["node", "scripts/export-public-notes.mjs"], { cwd: blog.directory, env });
    await copyBlogExport(path.join(blog.directory, "public"), path.join(staged, "post"));

    const novelPublic = path.join(novel.directory, "public");
    const before = await novelMetadataFingerprint(novelPublic);
    await validateNovelSourceIdentities(novelPublic);
    await run(["node", "scripts/generate-index.mjs"], { cwd: novel.directory, env });
    if (before !== await novelMetadataFingerprint(novelPublic)) {
      throw new Error("小说章节或卷的稳定元数据尚未回写；请等待 MyWritingVault 元数据自动化完成后重新构建，避免重新生成 UUID 和发布日期。");
    }
    await validateNovelExport(novelPublic);
    await copyTree(novelPublic, path.join(staged, "novel"));
    await generateImageVariants({ root: path.join(staged, "novel/images") });
    const kaiming = await prepareKaiming(path.join(staged, "kaiming"));
    await copyTree(path.join(PROJECT_ROOT, "raw"), staged);
    await writeFile(path.join(staged, "404.html"), "Not found\n");
    await writeFile(path.join(staged, "_redirects"), "/kaiming https://komori.cc/kaiming 301\n/kaiming/ https://komori.cc/kaiming 301\n");
    await writeFile(path.join(staged, "_headers"), "/*\n  Access-Control-Allow-Origin: *\n  Access-Control-Expose-Headers: ETag, Content-Length, Content-Range, Accept-Ranges\n  Cross-Origin-Resource-Policy: cross-origin\n  X-Content-Type-Options: nosniff\n");

    const manifest = {
      buildId: randomUUID(),
      websiteCommit: await run(["git", "rev-parse", "HEAD"], { capture: true }),
      sources: [...checkedOut.map(({ repository, ref, commit }) => ({ repository, ref, commit })), kaiming],
    };
    await removeBuildDirectory(CONTENT_DIRECTORY, path.dirname(CONTENT_DIRECTORY));
    await copyTree(staged, CONTENT_DIRECTORY, { hidden: true });
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log("Prepared /post, /novel, /kaiming and /images/spin.gif.", manifest.sources);
  } finally {
    await removeBuildDirectory(scratch, BUILD_DIRECTORY);
  }
}

export async function sealContentBuild() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  for (const file of ["index.html", "pagefind/pagefind-entry.json", "sitemap.xml"]) await access(path.join(PROJECT_ROOT, "dist", file));
  await writeFile(SITE_RECEIPT_PATH, `${JSON.stringify({ buildId: manifest.buildId, websiteCommit: manifest.websiteCommit })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--seal")) await sealContentBuild();
  else await prepareContent();
}
