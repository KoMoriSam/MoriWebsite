import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { deployEnvironment } from "../lib/build-environment.mjs";
import { run } from "../lib/commands.mjs";
import { deploymentConfigs } from "./environment.mjs";

const [action, target, ...extra] = process.argv.slice(2);
if (!["--dry-run", "--apply"].includes(action) ||
    (target && !["--auth-only", "--api-only"].includes(target)) || extra.length)
  throw new Error("Use --dry-run or --apply [--auth-only|--api-only]");

const env = deployEnvironment();
await mkdir(".tmp", { recursive: true });
const root = await mkdtemp(resolve(".tmp/test-backends-"));
try {
  for (const name of ["workers", "shared", "migrations", "wrangler.auth.jsonc", "wrangler.api.jsonc"])
    await cp(name, resolve(root, name), { recursive: true });
  const configs = await deploymentConfigs(root);
  const targets = target === "--auth-only" ? ["auth"] : target === "--api-only" ? ["api"] : ["auth", "api"];
  if (action === "--apply" && !target) {
    for (const [name, binding] of [["auth", "AUTH_DB"], ["api", "ANALYTICS_DB"]])
      await run(["wrangler", "d1", "migrations", "apply", binding, "--remote", "--config", configs[name]], { env, cwd: root });
  }
  for (const name of targets)
    await run(["wrangler", "deploy", "--config", configs[name], ...(action === "--dry-run" ? ["--dry-run"] : [])],
      { env, cwd: root });
} finally {
  await rm(root, { recursive: true, force: true });
}
