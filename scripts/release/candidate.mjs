import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { scratchDirectory, releaseIdPattern } from "./artifact-store.mjs";
import { run } from "../lib/commands.mjs";

if (process.env.WORKERS_CI !== "1" ||
    process.env.WORKERS_CI_BRANCH !== (process.env.SSG_PRODUCTION_BRANCH || "production") ||
    process.env.CONTENT_BLOG_DIR || process.env.CONTENT_NOVEL_DIR)
  throw new Error("The candidate command requires a trusted Workers Builds branch");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--full")) throw new Error("Unexpected candidate build option");
const directory = await scratchDirectory();
try {
  const output = resolve(directory, "release-id");
  const build = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(?:MORI_STAGE_|STAGE_NOVEL_R2_|RELEASE_CONTROL_R2_|RELEASE_APPROVAL_KEY$|NOVEL_R2_|CLOUDFLARE_API_TOKEN$)/.test(key),
  ));
  await run(["node", "scripts/build/smart.mjs", "--artifact", "--profile", ...args], {
    env: { ...build, GITHUB_OUTPUT: output },
  });
  const id = (await readFile(output, "utf8")).trim().replace(/^release_id=/, "");
  if (!releaseIdPattern.test(id)) throw new Error("Build did not emit a Release ID");
  const deploy = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(?:CONTENT_GITHUB_TOKEN$|SSG_R2_|NOVEL_R2_|RELEASE_APPROVAL_KEY$)/.test(key),
  ));
  await run(["node", "scripts/release/artifact.mjs", "stage", id], { env: deploy });
  await run(["node", "scripts/release/artifact.mjs", "verify", id], { env: deploy });
} finally {
  await rm(directory, { recursive: true, force: true });
}
