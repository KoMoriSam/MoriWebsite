import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { resolve } from "node:path";
import { deployEnvironment } from "../lib/build-environment.mjs";
import { run } from "../lib/commands.mjs";
import { hash, scratchDirectory } from "./artifact-store.mjs";
import { preparePreviewData } from "../preview/data.mjs";
import { getArticlePath } from "../../src/utils/blog/article-versions.js";
import { deploymentConfigs, stagingOrigin } from "./environment.mjs";

const [action, target] = process.argv.slice(2);
const apiOnly = target === "--api-only";
const siteOnly = target === "--site-only";
if (!["--dry-run", "--apply", "--fixture"].includes(action)) throw new Error("Use --dry-run, --apply or --fixture");
if (target && !(apiOnly && action === "--apply") && !(siteOnly && action === "--fixture"))
  throw new Error("Unexpected staging initialization option");
const fixture = action === "--fixture";
const active = action === "--dry-run" ? null : await fetch(stagingOrigin + "/site-data/release.json", {
  redirect: "manual", signal: AbortSignal.timeout(12_000),
}).then(async (response) => response.ok ? response.json() : null).catch(() => null);
if (fixture && !active?.id)
  throw new Error("Cannot read the active Staging release. Check https://staging.komori.cc/site-data/release.json before deploying fixtures.");
if (active && !["bootstrap", "staging-fixture"].includes(active.id))
  throw new Error("Staging is running a candidate release");
const env = deployEnvironment();
async function initialize(args, root) {
  for (let attempt = 1; ; attempt++) {
    try {
      await run(["wrangler", ...args], { env, cwd: root });
      return;
    } catch (error) {
      if (action === "--dry-run" || attempt === 3) throw error;
      await setTimeout(attempt * 1500);
    }
  }
}
const root = await scratchDirectory();
try {
  for (const name of ["workers", "shared", "migrations", "wrangler.auth.jsonc", "wrangler.api.jsonc", "wrangler.content.jsonc", "wrangler.jsonc"])
    await cp(name, resolve(root, name), { recursive: true });
  await mkdir(resolve(root, "dist/site-data"), { recursive: true });
  await mkdir(resolve(root, ".output/content"), { recursive: true });
  if (fixture) {
    const assets = resolve(process.env.MORI_STAGING_FIXTURE_ASSETS || ".output/preview");
    const source = resolve(".tmp/mori-dev");
    const { version, manifest, objects } = JSON.parse(await readFile(resolve(source, "novel.json"), "utf8"));
    if (version !== hash(JSON.stringify(manifest)) ||
        !Object.keys(manifest).every((path) => path === "chapters/chapter.md" || path.startsWith("search/") ||
          ["assets/images/local.svg", "assets/images/_optimized/manifest.json"].includes(path)))
      throw new Error("Expected only synthetic development fixtures");
    await cp(assets, resolve(root, "dist"), { recursive: true });
    await preparePreviewData(resolve(root, "dist"));
    for (const file of ["site-data/novel-release.json", "mock/novel/index.json", "content/kaiming/index.css"]) {
      const target = resolve(root, "dist", file);
      await mkdir(resolve(target, ".."), { recursive: true });
      await cp(resolve(source, "assets", file), target);
    }
    const articles = JSON.parse(await readFile(resolve(assets, "mock/article/index.json"), "utf8"));
    const registry = JSON.parse(await readFile(resolve(source, "assets/site-data/discussion-targets.json"), "utf8"));
    registry.articles = Object.fromEntries(articles.map((article) => [article.id, { path: getArticlePath(article, article.sourceLocale) }]));
    await writeFile(resolve(root, "dist/site-data/discussion-targets.json"), JSON.stringify(registry));
    await writeFile(resolve(root, "dist/site-data/release.json"), JSON.stringify({ id: "staging-fixture", novelVersion: version }));
    if (siteOnly && active?.novelVersion !== version)
      throw new Error("Site-only update requires the already deployed fixture version");
    if (!siteOnly) {
      const vault = resolve(root, "fixture-r2");
      await mkdir(vault);
      const entries = Object.entries(objects);
      for (let offset = 0; offset < entries.length; offset += 4) {
        await Promise.all(entries.slice(offset, offset + 4).map(async ([digest, base64]) => {
          const bytes = Buffer.from(base64, "base64");
          if (hash(bytes) !== digest) throw new Error("Invalid fixture object");
          const file = resolve(vault, digest);
          await writeFile(file, bytes);
          await initialize(["r2", "object", "put", `novel-vault-staging/v1/objects/${digest}`, "--remote", "--file", file], root);
        }));
      }
      const file = resolve(vault, "manifest.json");
      await writeFile(file, JSON.stringify(manifest));
      await initialize(["r2", "object", "put", `novel-vault-staging/v1/versions/${version}.json`, "--remote", "--file", file], root);
    }
  } else {
    await writeFile(resolve(root, "dist/site-data/release.json"), '{"id":"bootstrap"}');
  }
  await writeFile(resolve(root, ".output/content/404.html"), "Not found");
  const configs = await deploymentConfigs(root, true, fixture || active?.id === "staging-fixture" ? "staging-fixture" : "bootstrap", { bootstrap: true });
  if (action !== "--dry-run" && !apiOnly && !siteOnly) {
    for (const [name, binding] of [["auth", "AUTH_DB"], ["api", "ANALYTICS_DB"]])
      await initialize(["d1", "migrations", "apply", binding, "--remote", "--config", configs[name]], root);
  }
  for (const name of apiOnly ? ["api"] : siteOnly ? ["site"] : ["auth", "api", "content", "site"])
    await initialize(["deploy", "--keep-vars", "--config", configs[name], ...(action === "--dry-run" ? ["--dry-run"] : [])], root);
} finally {
  await rm(root, { recursive: true, force: true });
}
