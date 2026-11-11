import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { copyBlogExport, copyTree, fileInside, novelMetadataFingerprint, publishedPath, removeBuildDirectory, validateNovelExport, validateNovelSourceIdentities } from "../lib/content-files.mjs";
import { fetchContent } from "../lib/content-source.mjs";
import { contentDeploymentEnvironment } from "../build/deploy.mjs";
import { extractKaiming } from "../lib/kaiming-assets.mjs";
import { createHash } from "node:crypto";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import worker from "../../workers/content.js";

const root = path.resolve(".");
const temp = path.resolve(".tmp");
await mkdir(temp, { recursive: true });
const fixture = await mkdtemp(path.join(temp, "content-build-check-"));
const savedEnv = Object.fromEntries(["CONTENT_BUILD_DIR", "VITE_BLOG_RAW", "VITE_NOVEL_RAW"].map((key) => [key, process.env[key]]));
async function put(relative, content) {
  const file = path.join(fixture, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, typeof content === "string" ? content : JSON.stringify(content));
}

try {
  const zip = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false });
  for (const [filename, content] of [
    ["fonts/kaiming-sans-variable.woff2", "wOF2sans"],
    ["fonts/kaiming-serif-variable.woff2", "wOF2serif"],
    ["index.css", "@font-face {}"], ["LICENSE", "OFL"], ["README.md", "not a public asset"],
  ]) await zip.add(`KaimingPunctuation-VF/${filename}`, new Uint8ArrayReader(Buffer.from(content)));
  const archive = await zip.close();
  const checksum = createHash("sha256").update(archive).digest("hex");
  const fonts = path.join(fixture, "kaiming");
  await extractKaiming(archive, checksum, fonts);
  assert.equal(await readFile(path.join(fonts, "Sans-VF.woff2"), "utf8"), "wOF2sans");
  await assert.rejects(readFile(path.join(fonts, "README.md")), { code: "ENOENT" });
  await assert.rejects(extractKaiming(archive, "0".repeat(64), fonts), /checksum mismatch/);
  const ciEnv = { WRANGLER_CI_OVERRIDE_NAME: "website", WRANGLER_CI_MATCH_TAG: "website-tag", CLOUDFLARE_API_TOKEN: "test-token" };
  assert.deepEqual(contentDeploymentEnvironment(ciEnv), { CLOUDFLARE_API_TOKEN: "test-token" });
  assert.equal(ciEnv.WRANGLER_CI_OVERRIDE_NAME, "website", "primary Worker must retain Workers Builds identity checks");
  for (const value of ["../private.md", "/private.md", "a/../private.md", "a/.env", "C:/private.md", "a\\private.md", "a//b", "a\0b"]) {
    assert.throws(() => publishedPath(value));
  }
  const manifest = { managedFiles: ["index.json", "post.md", "en/post.md", "images/avatars.json", ".nojekyll"] };
  await put("blog/.publish-manifest.json", manifest);
  await put("blog/index.json", [{ id: "post", path: "post.md", translations: { en: { path: "en/post.md" } } }]);
  await put("blog/post.md", "public source");
  await put("blog/en/post.md", "public translation");
  await put("blog/images/avatars.json", { version: 1, avatars: {} });
  await put("blog/private.md", "must not be published");
  const output = path.join(fixture, "published");
  await copyBlogExport(path.join(fixture, "blog"), path.join(output, "post"));
  assert.equal(await readFile(path.join(output, "post/en/post.md"), "utf8"), "public translation");
  for (const filename of ["private.md", ".publish-manifest.json", ".nojekyll"]) {
    await assert.rejects(readFile(path.join(output, "post", filename)), { code: "ENOENT" });
  }
  await put("private/secret.md", "private source");
  await symlink(path.join(fixture, "private"), path.join(fixture, "blog/escape"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(fileInside(path.join(fixture, "blog"), "escape/secret.md"), /escapes export/);
  await put("blog/.publish-manifest.json", { managedFiles: ["index.json", "../private/secret.md"] });
  await assert.rejects(copyBlogExport(path.join(fixture, "blog"), path.join(fixture, "invalid")), /Invalid content path/);

  const chapter = { path: "0/1 自序.md", uuid: "7d5e9b50-a9cb-428a-9264-903046354e22", routeCode: "TmSZ6v" };
  const novelIndex = { 0: { volumeInfo: { uuid: "6f71a138-0301-4ba3-a6a6-2a50d8c3badf", title: "正文之前" }, chapters: [chapter] } };
  await put("novel/index.json", novelIndex);
  await put("novel/0/1 自序.md", "stable chapter");
  await put("novel/0/.volume_uuid", { uuid: novelIndex[0].volumeInfo.uuid });
  await put("novel/images/avatars.json", { version: 1, avatars: {} });
  const novel = path.join(fixture, "novel");
  const before = await novelMetadataFingerprint(novel);
  await validateNovelSourceIdentities(novel);
  await put("novel/0/.volume_uuid", "invalid JSON");
  await assert.rejects(validateNovelSourceIdentities(novel), /稳定元数据尚未回写/);
  await put("novel/0/.volume_uuid", { uuid: novelIndex[0].volumeInfo.uuid });
  await put("novel/index.json", { ...novelIndex });
  assert.equal(await novelMetadataFingerprint(novel), before, "index regeneration must not alter identity fingerprint");
  await validateNovelExport(novel);
  await copyTree(novel, path.join(output, "novel"));
  await assert.rejects(readFile(path.join(output, "novel/0/.volume_uuid")), { code: "ENOENT" });
  await put("novel/0/1 自序.md", "changed metadata");
  assert.notEqual(await novelMetadataFingerprint(novel), before);
  await put("novel/index.json", { 0: { ...novelIndex[0], chapters: [chapter, chapter] } });
  await assert.rejects(validateNovelExport(novel), /Invalid novel chapter identity/);

  process.env.CONTENT_BUILD_DIR = output;
  process.env.VITE_BLOG_RAW = "https://raw.komori.cc/post";
  process.env.VITE_NOVEL_RAW = "https://raw.komori.cc/novel";
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error("unexpected network request"); };
  assert.equal(await (await fetchContent("https://raw.komori.cc/post/en/post.md?v=revision")).text(), "public translation");
  assert.equal(await (await fetchContent("https://raw.komori.cc/novel/0/1%20%E8%87%AA%E5%BA%8F.md")).text(), "stable chapter");
  assert.equal((await fetchContent("https://raw.komori.cc/post/missing.md")).status, 404);
  await assert.rejects(fetchContent("https://raw.komori.cc/post/images/%2E%2E%2Fprivate.md"), /Invalid content path/);
  assert.equal(networkCalls, 0, "builds must never silently fetch a previous published snapshot");

  const env = {
    ASSETS: { fetch: async (request) => new Response(new URL(request.url).pathname, { headers: { "X-Source": "assets" } }) },
  };
  let response = await worker.fetch(new Request("https://raw.komori.cc/post/index.json"), env);
  assert.equal(response.headers.get("X-Source"), "assets");
  assert.equal(await response.text(), "/post/index.json");
  for (const filename of ["/kaiming/Sans-VF.woff2", "/kaiming/Serif-VF.woff2", "/kaiming/index.css"]) {
    response = await worker.fetch(new Request(`https://raw.komori.cc${filename}`), env);
    assert.equal(response.headers.get("X-Source"), "assets");
    assert.equal(await response.text(), filename);
    assert.equal((await worker.fetch(new Request(`https://raw.komori.cc${filename}`, { method: "OPTIONS" }), env)).status, 204);
  }
  assert.equal((await worker.fetch(new Request("https://raw.komori.cc/images/other.gif"), env)).status, 404);
  assert.equal((await worker.fetch(new Request("https://raw.komori.cc/images/spin.gif"), env)).status, 404);
  assert.equal((await worker.fetch(new Request("https://raw.komori.cc/poster/index.json"), env)).status, 404);
  response = await worker.fetch(new Request("https://raw.komori.cc/novel/index.json", { method: "OPTIONS" }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  for (const filename of [
    "/novel/1/chapter.md", "/novel/1/chapter%2emd", "/novel/images/avatar/name.webp",
    "/novel/images/_optimized/private.webp", "/giscus/themes.css",
  ]) {
    response = await worker.fetch(new Request(`https://raw.komori.cc${filename}`), env);
    assert.equal(response.status, 404, filename);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  }
  assert.equal((await worker.fetch(new Request("https://raw.komori.cc/post/index.json", { method: "POST" }), env)).status, 405);
  console.log("检查通过：博客、小说公开目录、字体和旧小说路径拒绝规则。");
} finally {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await removeBuildDirectory(fixture, temp);
}
