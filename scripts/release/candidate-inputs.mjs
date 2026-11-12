import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { assertPublicVite, buildEnvironment } from "../lib/build-environment.mjs";
import { run } from "../lib/commands.mjs";
import { readSourceHead, sourceRef, sources } from "../lib/content-revisions.mjs";
import { resolveKaiming } from "../lib/kaiming-assets.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

export async function candidateInputs(pinnedSources) {
  assertPublicVite();
  const [websiteCommit, lockfile, pkg, content, font] = await Promise.all([
    run(["git", "rev-parse", "HEAD"], { env: buildEnvironment(), capture: true }),
    readFile("pnpm-lock.yaml"),
    readFile("package.json", "utf8").then(JSON.parse),
    pinnedSources?.slice(0, 2) || Promise.all(sources.map(async ({ name, repository }) => {
      const ref = sourceRef(name.toUpperCase());
      const commit = await readSourceHead(repository, ref);
      if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error(`Invalid ${name} source revision`);
      return { repository, ref, commit };
    })),
    pinnedSources?.[2] || resolveKaiming(),
  ]);
  const configuration = Object.entries(process.env).filter(([key]) => key.startsWith("VITE_"))
    .sort(([a], [b]) => a.localeCompare(b, "en"));
  const inputs = {
    schema: 1, websiteCommit, sources: [...content, font], configuration,
    toolchain: { node: process.version, platform: process.platform, arch: process.arch,
      packageManager: pkg.packageManager || pkg.devEngines?.packageManager?.version,
      lockfile: hash(lockfile) },
  };
  return { inputs, fingerprint: hash(JSON.stringify(inputs)) };
}
