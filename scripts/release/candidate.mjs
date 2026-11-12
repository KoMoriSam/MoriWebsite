import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { run } from "../lib/commands.mjs";
import { buildEnvironment, deployEnvironment } from "../lib/build-environment.mjs";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";
import { archiveWarningBytes } from "./retention.mjs";
import { candidateInputs } from "./candidate-inputs.mjs";
import { controlStore, getJson, putJson, rehearsalMode, releaseIdPattern, releaseStore, scratchDirectory } from "./records.mjs";

if (process.env.WORKERS_CI !== "1" ||
    process.env.WORKERS_CI_BRANCH !== (process.env.SSG_PRODUCTION_BRANCH || "production") ||
    process.env.CONTENT_BLOG_DIR || process.env.CONTENT_NOVEL_DIR || process.env.MORI_ARTIFACT_LOCAL)
  throw new Error("The candidate command requires a trusted Workers Builds branch");
if (process.env.SKIP_DEPENDENCY_INSTALL !== "1")
  throw new Error("Set SKIP_DEPENDENCY_INSTALL=1 in Workers Builds before enabling the candidate pipeline");
const snapshotNamespace = rehearsalMode() ? "release-candidates-rehearsal" : "release-candidates";
if (process.env.SSG_SNAPSHOT_NAMESPACE !== snapshotNamespace)
  throw new Error(`Configure SSG_SNAPSHOT_NAMESPACE=${snapshotNamespace}`);
const args = process.argv.slice(2);
const restoreFlag = args.indexOf("--restore-expired");
const restoreId = restoreFlag === -1 ? null : args[restoreFlag + 1];
const validArgs = args.filter((_, index) => restoreFlag === -1 || ![restoreFlag, restoreFlag + 1].includes(index));
if (validArgs.some((arg) => arg !== "--full") || restoreFlag !== -1 && !releaseIdPattern.test(restoreId || ""))
  throw new Error("Usage: node scripts/release/candidate.mjs [--full] [--restore-expired <Release ID>]");

const control = controlStore();
const release = releaseStore();
if (!release) throw new Error("Configure private RELEASE_R2 credentials");
const scratch = await scratchDirectory();
const lockKey = "candidate.lock";
const profile = resolve(scratch, "build.ndjson");
const attemptId = randomUUID();
process.env.SSG_BUILD_PROFILE = profile;
let acquired = false;
let reportId;
const save = (key, value) => putJson(control, key, value, scratch, { immutable: false });
const load = (key) => getJson(control, key, scratch);
const selectedEnv = (pattern) => Object.fromEntries(Object.entries(process.env).filter(([key]) => pattern.test(key)));
const command = (name, argv) => new Promise((resolveCommand, reject) => {
  const child = spawn(name, argv, { env: buildEnvironment(), stdio: "inherit" });
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolveCommand() : reject(new Error(`${name} install failed (${code})`)));
});

try {
  const previous = restoreId && await load(`${restoreId}/expired.json`);
  const manifestToRestore = previous && await getJson(release, `${restoreId}/manifest.json`, scratch);
  if (restoreId && (previous?.id !== restoreId || manifestToRestore?.id !== restoreId ||
      manifestToRestore.inputFingerprint !== previous.fingerprint || manifestToRestore.sources?.length !== 3))
    throw new Error("Explicit restore requires an expired Release ID with recorded inputs");
  const { inputs, fingerprint } = await observeBuild("candidate", "resolve pinned inputs", () =>
    candidateInputs(manifestToRestore?.sources));
  if (restoreId && fingerprint !== previous.fingerprint)
    throw new Error("The trusted checkout or build toolchain does not match the expired release");
  const index = `inputs/${fingerprint}.json`;
  const initial = await observeBuild("candidate", "check input fingerprint", () => load(index), { fingerprint });
  await observeBuild("candidate", "acquire build lock and recheck", async () => {
    const end = Date.now() + 120_000;
    while (!(acquired = await putJson(control, lockKey, { attemptId, fingerprint, startedAt: new Date().toISOString() }, scratch))) {
      if (Date.now() >= end) throw new Error("Another candidate build holds the R2 lock; retry when it finishes");
      await new Promise((done) => setTimeout(done, 3000));
    }
  }, { previousReleaseId: initial?.id });
  const indexed = await load(index);
  if (indexed && !releaseIdPattern.test(indexed.id || "")) throw new Error("Invalid input index");
  const id = indexed?.id;
  const expired = id && await load(`${id}/expired.json`);
  if (expired && !restoreId) {
    buildEvent("candidate", "input deduplication", "expired", { fingerprint, id });
  } else {
    if (restoreId && (!expired || id !== restoreId)) throw new Error("This input was already restored or replaced");
    const manifest = id && !expired ? await getJson(release, `${id}/manifest.json`, scratch) : null;
    const hasArchive = id && !expired && await release.exists(`${id}/artifact.tar.gz`);
    if (hasArchive && (manifest?.id !== id || manifest.inputFingerprint !== fingerprint))
      throw new Error("Existing archive does not match the indexed inputs");
    if (indexed?.state === "BUILT" && !expired && !hasArchive)
      throw new Error("Indexed archive is missing without an expiry record");
    const completed = (receipt) => receipt?.id === id && receipt.archiveHash === manifest?.archiveHash &&
      receipt.websiteCommit === manifest?.websiteCommit;
    const verified = hasArchive && await load(`${id}/verified.json`);
    if (hasArchive && completed(verified) && verified.checks?.includes("comment-reply")) {
      buildEvent("candidate", "input deduplication", "verified reuse", { fingerprint, id });
    } else {
      reportId = hasArchive ? id : randomUUID();
      const build = !hasArchive;
      const staged = !build && completed(await load(`${id}/staged.json`)) &&
        (await load("active-staging.json"))?.id === id &&
        await observeBuild("candidate", "check live staging checkpoint", async () => {
          const headers = {};
          if (process.env.MORI_STAGE_ACCESS_CLIENT_ID && process.env.MORI_STAGE_ACCESS_CLIENT_SECRET) {
            headers["CF-Access-Client-Id"] = process.env.MORI_STAGE_ACCESS_CLIENT_ID;
            headers["CF-Access-Client-Secret"] = process.env.MORI_STAGE_ACCESS_CLIENT_SECRET;
          }
          const response = await fetch(`https://staging.komori.cc/site-data/release.json?release=${id}`, {
            headers, redirect: "manual", signal: AbortSignal.timeout(15_000),
          });
          if (response.status === 404) return false;
          if (!response.ok) throw new Error(`Staging checkpoint unavailable (HTTP ${response.status})`);
          const marker = await response.json();
          return marker.id === id && marker.websiteCommit === manifest.websiteCommit && marker.novelVersion === manifest.novelVersion;
        });
      if (build) {
        const existingArchiveBytes = await observeBuild("candidate", "check release archive capacity", async (update) => {
          const storeLists = await Promise.all([release.list(), releaseStore({ rehearsal: !rehearsalMode() }).list()]);
          const archives = storeLists.flat().filter(({ key }) => key.endsWith("/artifact.tar.gz"));
          const bytes = archives.reduce((sum, item) => sum + item.bytes, 0);
          update({ bytes, warningBytes: archiveWarningBytes, archives: archives.length });
          if (bytes >= archiveWarningBytes) buildEvent("candidate", "release archive capacity", "warning", { bytes, warningBytes: archiveWarningBytes });
          return bytes;
        });
        await save(index, { id: reportId, fingerprint, state: "BUILDING", startedAt: new Date().toISOString() });
        await observeBuild("candidate", "install locked build dependencies", () => command("pnpm", ["install", "--frozen-lockfile"]));
        const buildEnv = {
          ...buildEnvironment(),
          ...selectedEnv(/^(?:WORKERS_CI(?:_BRANCH|_BUILD_UUID)?|SSG_PRODUCTION_BRANCH|SSG_SNAPSHOT_NAMESPACE|CONTENT_GITHUB_TOKEN|RELEASE_R2_(?:ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)|SSG_R2_(?:ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)|MORI_RELEASE_MODE|NODE_OPTIONS)$/),
        };
        const [blog, novel, font] = inputs.sources;
        await run(["node", "scripts/build/smart.mjs", "--artifact", "--profile", ...args.filter((arg) => arg === "--full")], {
          env: { ...buildEnv, MORI_CANDIDATE_ID: reportId, MORI_CANDIDATE_FINGERPRINT: fingerprint,
            MORI_RELEASE_ARCHIVE_BYTES: String(existingArchiveBytes), CONTENT_BLOG_REF: blog.ref,
            CONTENT_NOVEL_REF: novel.ref, MORI_PINNED_BLOG: blog.commit, MORI_PINNED_NOVEL: novel.commit,
            MORI_PINNED_KAIMING: JSON.stringify(font) },
        });
      }
      if (build && !await release.exists(`${reportId}/artifact.tar.gz`))
        throw new Error("Candidate build did not store its archive");
      await save(index, { id: reportId, fingerprint, state: "BUILT" });
      const deployEnv = {
        ...deployEnvironment(),
        ...selectedEnv(/^(?:(?:RELEASE_R2|RELEASE_CONTROL_R2|STAGE_NOVEL_R2)_(?:ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)|MORI_STAGE_(?:SESSION|ACCESS_CLIENT_ID|ACCESS_CLIENT_SECRET)|MORI_STAGING_(?:AUTH_D1_ID|ANALYTICS_D1_ID|RATE_LIMIT_KV_ID|ANNOUNCEMENTS_KV_ID|CHANGELOG_KV_ID|DISCUSSION_REPO|READER_IDS)|SSG_BUILD_PROFILE|MORI_RELEASE_MODE|NODE_OPTIONS)$/),
      };
      if (!staged && !build) {
        const packageLock = await readFile("pnpm-lock.yaml", "utf8");
        const version = packageLock.match(/^  wrangler@(\d+\.\d+\.\d+):\s*$/m)?.[1];
        if (!version) throw new Error("Could not resolve locked Wrangler version");
        await observeBuild("candidate", "install Wrangler for staging resume", () => command("npm", [
          "install", "--prefix", scratch, "--no-save", "--no-package-lock", "--no-audit", "--no-fund", `wrangler@${version}`,
        ]));
        deployEnv.MORI_RELEASE_WRANGLER = resolve(scratch, "node_modules/wrangler/bin/wrangler.js");
      }
      if (!staged) await observeBuild("candidate", "deploy exact candidate to staging", () =>
        run(["node", "scripts/release/artifact.mjs", "stage", reportId], { env: deployEnv }));
      await observeBuild("candidate", "verify staged candidate", () =>
        run(["node", "scripts/release/artifact.mjs", "verify", reportId], { env: deployEnv }));
      buildEvent("candidate", "candidate result", "verified", { id: reportId, fingerprint });
    }
  }
} finally {
  try {
    if (reportId) await observeBuild("candidate", "save private report", async () => {
      if (!await release.put(`${reportId}/reports/${attemptId}.ndjson`, profile, true))
        throw new Error("Candidate report already exists");
    });
  } finally {
    try {
      if (acquired) await control.delete(lockKey);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
}
