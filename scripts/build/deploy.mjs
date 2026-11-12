import { assertNovelRelease } from "./novel-release.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_PATH, SITE_RECEIPT_PATH } from "./content.mjs";
import { run } from "../lib/commands.mjs";
import { deployEnvironment } from "../lib/build-environment.mjs";
import { observeBuild } from "../lib/build-report.mjs";

export function contentDeploymentEnvironment(source = process.env) {
  const env = { ...source };
  // Workers Builds identifies its connected website Worker using these variables.
  // Keep that check for the primary deployment; the explicit content config is a second Worker.
  delete env.WRANGLER_CI_OVERRIDE_NAME;
  delete env.WRANGLER_CI_MATCH_TAG;
  return env;
}

async function deploy(target, args) {
  const uploadContent = target === "content" && args.length === 1 && args[0] === "--upload";
  const dryRun = args.length === 1 && args[0] === "--dry-run";
  if (!["website", "content"].includes(target) || !uploadContent && !dryRun)
    throw new Error("Use --dry-run to check a package, or content --upload to upload a legacy content Worker version");
  const [manifest, receipt] = await Promise.all(
    [MANIFEST_PATH, SITE_RECEIPT_PATH].map(async (file) => {
      try {
        return JSON.parse(await readFile(file, "utf8"));
      } catch {
        throw new Error("发布文件尚未准备完整，请先运行 pnpm build。");
      }
    }),
  );
  if (
    !manifest.buildId ||
    manifest.buildId !== receipt.buildId ||
    manifest.websiteCommit !== receipt.websiteCommit
  ) {
    throw new Error(
      "网站与内容版本不一致。请运行 pnpm build 重新生成发布文件。",
    );
  }
  const novelVersion = await observeBuild("deploy", "verify novel release", () => assertNovelRelease());
  if (receipt.novelVersion !== novelVersion) throw new Error("Novel release receipt mismatch");

  const config = target === "website" ? "wrangler.jsonc" : "wrangler.content.jsonc";
  const env = target === "website" ? deployEnvironment() : contentDeploymentEnvironment(deployEnvironment());
  await observeBuild("deploy", uploadContent ? "upload legacy public content version" : "check Worker package", () =>
    run(["wrangler", "versions", "upload", "--config", config, ...(dryRun ? ["--dry-run"] : [])], { env }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target = "website", ...args] = process.argv.slice(2);
  await deploy(target, args);
}
