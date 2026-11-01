import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_PATH, SITE_RECEIPT_PATH } from "./content.mjs";
import { run } from "../lib/commands.mjs";

export function contentDeploymentEnvironment(source = process.env) {
  const env = { ...source };
  // Workers Builds identifies its connected website Worker using these variables.
  // Keep that check for the primary deployment; the explicit content config is a second Worker.
  delete env.WRANGLER_CI_OVERRIDE_NAME;
  delete env.WRANGLER_CI_MATCH_TAG;
  return env;
}

async function deploy(target, args) {
  if (!["website", "content"].includes(target)) throw new Error(`无法发布“${target}”。请选择 website 或 content。`);
  const [manifest, receipt] = await Promise.all([MANIFEST_PATH, SITE_RECEIPT_PATH].map(async (file) => {
    try { return JSON.parse(await readFile(file, "utf8")); }
    catch { throw new Error("发布文件尚未准备完整，请先运行 pnpm build。"); }
  }));
  if (!manifest.buildId || manifest.buildId !== receipt.buildId || manifest.websiteCommit !== receipt.websiteCommit) {
    throw new Error("网站与内容版本不一致。请运行 pnpm build 重新生成发布文件。");
  }
  // Publish content before the site starts referencing its new index and image manifest.
  await run(["wrangler", "deploy", "--config", "wrangler.content.jsonc", "--keep-vars", ...args], { env: contentDeploymentEnvironment() });
  if (target === "website") await run(["wrangler", "deploy", "--config", "wrangler.jsonc", ...args]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await deploy(process.argv[2] || "website", process.argv.slice(3));
}
