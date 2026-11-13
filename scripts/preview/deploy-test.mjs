import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discussionRegistry, testDiscussionRepository } from "../../shared/discussions.js";
import { testOrigin, testPreviewName } from "../../shared/test-preview.js";
import { novelVersionPattern, releaseFile } from "../../shared/novel-release.js";
import { getArticlePath } from "../../src/utils/blog/article-versions.js";
import { deployEnvironment } from "../lib/build-environment.mjs";
import { run } from "../lib/commands.mjs";
import { readWorkerConfig } from "../lib/worker-config.mjs";
import { testNovelBucket } from "../release/environment.mjs";

const source = resolve(".output/preview");
const fixtures = resolve(".tmp/mori-dev/assets");
const vars = {
  MORI_ENV: "test",
  MORI_SITE_ORIGIN: testOrigin,
  MORI_TEST_DISCUSSION_REPO: process.env.MORI_TEST_DISCUSSION_REPO || "KoMoriSam/mori-test-discussions",
};
testDiscussionRepository(vars);

const config = await readWorkerConfig();
if (config.name !== "website" || config.assets?.directory !== "./dist")
  throw new Error("Unexpected website Worker configuration");
const env = deployEnvironment();
if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_ACCOUNT_ID !== config.account_id)
  throw new Error("Cloudflare account does not match the website Worker");

const novel = JSON.parse(await readFile(resolve(fixtures, releaseFile), "utf8"));
if (!novelVersionPattern.test(novel?.version || "") || !novel.catalog || typeof novel.catalog !== "object")
  throw new Error("Invalid test novel catalog");

await mkdir(".tmp", { recursive: true });
const root = await mkdtemp(resolve(".tmp/test-preview-"));
try {
  await run(["wrangler", "r2", "object", "get", `${testNovelBucket}/v1/versions/${novel.version}.json`,
    "--remote", "--file", resolve(root, "novel-manifest.json")], { env });
  const assets = resolve(root, "assets");
  await cp(source, assets, { recursive: true });
  const registry = JSON.parse(await readFile(resolve(fixtures, discussionRegistry), "utf8"));
  const articles = JSON.parse(await readFile(resolve(assets, "mock/article/index.json"), "utf8"));
  registry.articles = Object.fromEntries(articles.map((article) =>
    [article.id, { path: getArticlePath(article, article.sourceLocale) }]));
  const catalog = JSON.stringify(novel.catalog);
  await mkdir(resolve(assets, "mock/novel"), { recursive: true });
  await Promise.all([
    writeFile(resolve(assets, discussionRegistry), JSON.stringify(registry)),
    writeFile(resolve(assets, releaseFile), JSON.stringify(novel)),
    writeFile(resolve(assets, "mock/novel/index.json"), catalog),
    writeFile(resolve(assets, "site-data/release.json"), JSON.stringify({ id: testPreviewName, novelVersion: novel.version })),
  ]);

  const previewConfig = resolve(root, "wrangler.json");
  await writeFile(previewConfig, JSON.stringify({
    name: config.name,
    account_id: config.account_id,
    main: resolve(config.main),
    compatibility_date: config.compatibility_date,
    workers_dev: false,
    preview_urls: false,
    assets: { ...config.assets, directory: assets, run_worker_first: true, not_found_handling: "single-page-application" },
    previews: {
      vars,
      services: [
        { binding: "MORI_AUTH", service: "mori-auth-test", entrypoint: "SiteAuth" },
        { binding: "TEST_AUTH", service: "mori-auth-test" },
        { binding: "COMMENTS", service: "api-test", entrypoint: "CommentsInternal" },
        { binding: "PUBLIC_API", service: "api-test" },
      ],
      r2_buckets: [{ binding: "NOVEL_VAULT", bucket_name: testNovelBucket }],
      version_metadata: { binding: "WEBSITE_VERSION" },
      observability: { enabled: true, logs: { invocation_logs: false } },
    },
  }));
  await run(["wrangler", "preview", "--config", previewConfig, "--name", testPreviewName, "--ignore-base-config"], { env });
} finally {
  await rm(root, { recursive: true, force: true });
}
