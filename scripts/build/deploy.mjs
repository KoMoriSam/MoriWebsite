import { assertNovelRelease, publishNovelRelease } from "./novel-release.mjs";
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

const deployments = [
  {
    name: "content",
    config: "wrangler.content.jsonc",
    environment: contentDeploymentEnvironment,
  },
  { name: "site", config: "wrangler.jsonc", environment: () => process.env },
];

export async function activeVersions() {
  return Object.fromEntries(
    await Promise.all(
      deployments.map(async ({ name, config, environment }) => {
        const result = JSON.parse(
          await run(
            ["wrangler", "deployments", "status", "--config", config, "--json"],
            { env: environment(), capture: true },
          ),
        );
        if (
          result.versions?.length !== 1 ||
          result.versions[0].percentage !== 100 ||
          !result.versions[0].version_id
        ) {
          throw new Error(`Expected a single active deployment for ${name}`);
        }
        return [name, result.versions[0].version_id];
      }),
    ),
  );
}

export async function restoreVersions(before, verified, { inspect = activeVersions, execute = run } = {}) {
  if (!verified || deployments.some(({ name }) => !before[name] || before[name] !== verified[name])) return;
  const current = await inspect();
  for (const { name, config, environment } of deployments) {
    if (current[name] === before[name]) continue;
    await execute(
      ["wrangler", "rollback", before[name], "--config", config, "--yes"],
      { env: environment() },
    );
  }
}

export async function deploy(
  target,
  args,
  { contentChanged = true, siteChanged = true } = {},
) {
  if (!["website", "content"].includes(target))
    throw new Error(`无法发布“${target}”。请选择 website 或 content。`);
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
  const novelVersion = await assertNovelRelease();
  if (receipt.novelVersion !== novelVersion) throw new Error("Novel release receipt mismatch");
  if (!args.includes("--dry-run")) await publishNovelRelease(novelVersion);
  // Publish content before the site starts referencing its new index and image manifest.
  if (contentChanged)
    await run(
      [
        "wrangler",
        "deploy",
        "--config",
        "wrangler.content.jsonc",
        "--keep-vars",
        ...args,
      ],
      { env: contentDeploymentEnvironment() },
    );
  if (target === "website" && siteChanged)
    await run(["wrangler", "deploy", "--config", "wrangler.jsonc", ...args]);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await deploy(process.argv[2] || "website", process.argv.slice(3));
}
