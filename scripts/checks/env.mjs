import { readWorkerConfig } from "../lib/worker-config.mjs";
import { run } from "../lib/commands.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--remote")) throw new Error("用法：pnpm check env [--remote]");
const [site, auth, api, raw] = await Promise.all(
  ["wrangler.jsonc", "wrangler.auth.jsonc", "wrangler.api.jsonc", "wrangler.content.jsonc"].map(readWorkerConfig),
);
const vault = site.r2_buckets?.find(({ binding }) => binding === "NOVEL_VAULT")?.bucket_name;
const database = auth.d1_databases?.find(({ binding }) => binding === "AUTH_DB");
const service = (config, binding, name, entrypoint) =>
  config.services?.some((item) => item.binding === binding && item.service === name && item.entrypoint === entrypoint);
if (!vault || !database?.database_id || site.assets?.binding !== "ASSETS" || raw.assets?.binding !== "ASSETS" ||
    !service(site, "MORI_AUTH", auth.name, "SiteAuth") || !service(site, "COMMENTS", api.name, "CommentsInternal") ||
    !service(site, "PUBLIC_API", api.name, undefined) || !service(api, "MORI_COMMENT_AUTH", auth.name, "CommentAuth") ||
    !api.d1_databases?.find(({ binding }) => binding === "ANALYTICS_DB")?.database_id)
  throw new Error("Wrangler 的网站、Auth 或 API 绑定不完整，请检查对应的 wrangler*.jsonc。");

const snapshots = process.env.SSG_R2_BUCKET || "website-build-snapshots";
console.log(`OK  Wrangler 绑定：${site.name} → ${auth.name} / ${api.name}；私有小说桶 ${vault}`);
console.log(`OK  现有公开外链由 ${raw.name} 提供；构建快照桶 ${snapshots}`);

const buildKeys = ["CONTENT_GITHUB_TOKEN", "SSG_R2_ACCESS_KEY", "SSG_R2_SECRET_KEY", "NOVEL_R2_ACCESS_KEY", "NOVEL_R2_SECRET_KEY"];
const inBuild = process.env.WORKERS_CI === "1";
let failed = false;
for (const key of buildKeys) {
  const present = Boolean(process.env[key]?.trim());
  console.log(`${present ? "OK" : inBuild ? "缺失" : "待核对"}  ${key}`);
  failed ||= inBuild && !present;
}
if (!inBuild)
  console.log(`本地无法确认 Workers Builds Secrets。请在 Cloudflare → ${site.name} → Settings → Builds → Build variables and secrets 核对上述名称。`);
else if (process.env.SKIP_DEPENDENCY_INSTALL !== "1") {
  console.log("缺失  SKIP_DEPENDENCY_INSTALL=1（Workers Builds 构建变量）");
  failed = true;
}

if (args.includes("--remote")) {
  const [account, ...configs] = [site.account_id, "wrangler.auth.jsonc", "wrangler.api.jsonc"];
  const expected = [
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
    ["GITHUB_APP_PRIVATE_KEY", "GITHUB_TOKEN", "PIXABAY_API_KEY"],
  ];
  for (const [index, config] of configs.entries()) {
    try {
      const secrets = JSON.parse(await run(["wrangler", "secret", "list", "--config", config], { capture: true }));
      const names = new Set(secrets.map(({ name }) => name));
      const missing = expected[index].filter((name) => !names.has(name));
      console.log(missing.length ? `缺失  ${config}：${missing.join("、")}` : `OK  ${config} 运行时 Secret 名称`);
      failed ||= missing.length > 0;
    } catch {
      console.log(`待核对  ${config}。用现有 Wrangler 登录重试，或到对应 Worker → Settings → Variables and Secrets 检查。`);
      failed = true;
    }
  }
  for (const bucket of new Set([vault, snapshots])) {
    try {
      await run(["wrangler", "r2", "bucket", "info", bucket, "--json"], {
        capture: true, env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || account },
      });
      console.log(`OK  R2 桶 ${bucket}`);
    } catch {
      console.log(`待核对  R2 桶 ${bucket}。用现有 Wrangler 登录重试，或到 Cloudflare → R2 → Overview 检查。`);
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
