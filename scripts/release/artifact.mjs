import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { run } from "../lib/commands.mjs";
import { deployEnvironment } from "../lib/build-environment.mjs";
import { observeBuild, buildEvent } from "../lib/build-report.mjs";
import { publishNovelRelease } from "../build/novel-release.mjs";
import { controlStore, rehearsalMode, releaseIdPattern, releaseStore } from "./records.mjs";
import { getJson, putJson, materializeArtifact, readReleaseManifest, scratchDirectory, hash } from "./artifact-store.mjs";
import { deploymentConfigs, stagingOrigin } from "./environment.mjs";

const [action, id, ...args] = process.argv.slice(2);
const deployOrder = ["auth", "api", "content", "site"];
const env = deployEnvironment();
delete env.WRANGLER_CI_OVERRIDE_NAME;
delete env.WRANGLER_CI_MATCH_TAG;
const cf = (args, root, capture = false) => {
  const wrangler = process.env.MORI_RELEASE_WRANGLER;
  return run(wrangler ? ["node", wrangler, ...args] : ["wrangler", ...args], { cwd: root, env, capture });
};
const rehearsal = rehearsalMode();

async function singleVersion(root, config, { optional = false } = {}) {
  const data = await cf(["deployments", "status", "--config", config, "--json"], root, true)
    .then(JSON.parse, (error) => { if (!optional) throw error; return null; });
  if (optional && !data) return null;
  if (data.versions?.length !== 1 || data.versions[0].percentage !== 100 || !data.versions[0].version_id)
    throw new Error("Expected a single active Worker version");
  return data.versions[0].version_id;
}

async function schema(root, configs, stage) {
  for (const [name, binding, folder] of [["auth", "AUTH_DB", "auth"], ["api", "ANALYTICS_DB", "analytics"]]) {
    if (stage) await cf(["d1", "migrations", "apply", binding, "--remote", "--config", configs[name]], root);
    const result = JSON.parse(await cf([
      "d1", "execute", binding, "--remote", "--config", configs[name], "--json",
      "--command", "SELECT name FROM d1_migrations ORDER BY name",
    ], root, true));
    const applied = new Set(result.flatMap(({ results }) => results.map(({ name }) => name)));
    const expected = (await readdir(resolve(root, "migrations", folder))).filter((file) => file.endsWith(".sql"));
    if (expected.some((file) => !applied.has(file))) throw new Error(`Missing ${name} database migrations`);
  }
}

async function deploy(root, manifest, stage, verifiedVersions) {
  if (stage) await observeBuild("release", "verify staging Access policy", async () => {
    const anonymous = await fetchSite(stagingOrigin, "/", { stage: false });
    const login = new URL(anonymous.headers.get("Location") || "/", stagingOrigin);
    if (anonymous.status !== 302 || !login.hostname.endsWith(".cloudflareaccess.com") ||
        !login.pathname.startsWith("/cdn-cgi/access/login/"))
      throw new Error("Staging must require Cloudflare Access before deploying private content");
    if ((await fetchSite(stagingOrigin, "/")).status !== 200)
      throw new Error("Staging CI service token cannot access the site");
  });
  const configs = await deploymentConfigs(root, stage, manifest.id);
  await schema(root, configs, stage);
  const before = {};
  for (const name of deployOrder) before[name] = await singleVersion(root, configs[name], { optional: stage });
  await observeBuild("release", "synchronize private novel objects", () => publishNovelRelease(manifest.novelVersion, {
    root, prefix: stage ? "STAGE_NOVEL_R2" : "NOVEL_R2", bucket: stage ? "novel-vault-staging" : "novel-vault",
  }));
  if (!stage && verifiedVersions && deployOrder.some((name) => before[name] !== verifiedVersions[name]))
    throw new Error("Production Worker versions drifted from the active release record");
  const attempted = [];
  const versions = {};
  try {
    for (const name of deployOrder) {
      attempted.push(name);
      await observeBuild("release", `deploy ${name}`, () => cf([
        "deploy", "--config", configs[name], "--keep-vars",
      ], root));
      versions[name] = await singleVersion(root, configs[name]);
    }
    const origin = stage ? stagingOrigin : "https://komori.cc";
    await observeBuild("release", "verify active release marker", async () => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const response = await fetchSite(origin, `/site-data/release.json?release=${manifest.id}`, { stage })
          .catch(() => null);
        if (response?.ok && (await response.json().catch(() => null))?.id === manifest.id) return;
        await new Promise((done) => setTimeout(done, 2_000));
      }
      throw new Error("Release marker did not become active");
    });
    return versions;
  } catch (error) {
    const failures = [];
    if (!stage && deployOrder.some((name) => before[name] !== verifiedVersions?.[name])) {
      throw new AggregateError([error], "Production failed and the previous Worker versions do not match a recorded release");
    }
    for (const name of attempted.reverse()) {
      if (!before[name]) continue;
      try {
        await observeBuild("release", `restore ${name}`, () =>
          cf(["rollback", before[name], "--config", configs[name], "--yes"], root));
      } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], "Deployment and rollback failed");
    throw error;
  }
}

async function fetchSite(origin, path, { stage = true, cookie, method = "GET", data } = {}) {
  const target = new URL(path, origin);
  if (target.origin !== origin) throw new Error("Unexpected verification URL");
  const headers = new Headers({ "Cache-Control": "no-cache" });
  if (cookie) headers.set("Cookie", "__Host-mori-session=" + cookie);
  if (stage && process.env.MORI_STAGE_ACCESS_CLIENT_ID && process.env.MORI_STAGE_ACCESS_CLIENT_SECRET) {
    headers.set("CF-Access-Client-Id", process.env.MORI_STAGE_ACCESS_CLIENT_ID);
    headers.set("CF-Access-Client-Secret", process.env.MORI_STAGE_ACCESS_CLIENT_SECRET);
  }
  if (data) {
    headers.set("Content-Type", "application/json");
    headers.set("Origin", origin);
  }
  return fetch(target, { headers, method, body: data && JSON.stringify(data),
    redirect: "manual", signal: AbortSignal.timeout(15_000) });
}

async function expect(path, expected, options) {
  const response = await fetchSite(stagingOrigin, path, options);
  if (response.status !== expected) throw new Error(`Staging check failed at ${path.split("?")[0]}: HTTP ${response.status}`);
  return response;
}

async function verify(manifest) {
  const cookie = process.env.MORI_STAGE_SESSION;
  if (!/^[\w-]{43}$/.test(cookie || "")) throw new Error("Sign in through Staging GitHub OAuth and configure MORI_STAGE_SESSION for verification");
  const marker = await (await expect("/site-data/release.json?release=" + manifest.id, 200)).json();
  if (marker.id !== manifest.id || marker.websiteCommit !== manifest.websiteCommit ||
      marker.novelVersion !== manifest.novelVersion) throw new Error("Staging is serving another Release ID");
  const html = await (await expect("/", 200)).text();
  if (!html.includes("data-server-rendered") || !/<script[^>]+type="module"/.test(html))
    throw new Error("Staging HTML is missing SSG or client hydration entry");
  const login = await expect("/auth/login", 303);
  if (new URL(login.headers.get("Location")).origin !== "https://auth-staging.komori.cc")
    throw new Error("Staging login points at the wrong OAuth service");
  const profile = await (await expect("/api/auth/session", 200, { cookie })).json();
  if (!profile.profile || !profile.canReadNovel) throw new Error("The staging verifier needs an authorized test account");
  const base = `/api/novel/${manifest.novelVersion}`;
  await expect(`${base}/search/pagefind-entry.json`, 401);
  await expect(`${base}/search/pagefind-entry.json`, 200, { cookie, method: "HEAD" });
  await expect("/pagefind-novel/pagefind.js", 404);
  const catalog = await (await expect("/site-data/novel-release.json", 200)).json();
  const chapter = Object.values(catalog.catalog).flatMap(({ chapters }) => chapters)[0];
  if (!chapter) throw new Error("The release has no chapter for verification");
  const chapterPath = base + "/chapters/" + chapter.path.split("/").map(encodeURIComponent).join("/");
  await expect(chapterPath, 401);
  const privateChapter = await expect(chapterPath, 200, { cookie });
  if (!privateChapter.headers.get("Cache-Control")?.includes("no-store"))
    throw new Error("Private chapter cache policy is missing");
  const registry = await (await expect("/site-data/discussion-targets.json", 200)).json();
  const article = Object.keys(registry.articles)[0];
  if (!article) throw new Error("The release has no article for verification");
  for (const [sourceType, scope, term] of [["article", "content", article], ["novel", "chapter", registry.chapters[chapter.uuid].term]]) {
    const response = await expect("/api/github/discussions/counts", 200, {
      method: "POST", data: { sourceType, scope, discussionTerms: [term] },
    });
    if (!(await response.json()).counts) throw new Error("Invalid staging count response");
  }
  const thread = "/api/comments?scope=article&target=" + encodeURIComponent(article);
  await expect(thread, 200);
  const body = `Staging verification ${manifest.id}`;
  const requestId = (action) => hash(manifest.id + ":" + action)
    .replace(/^(........)(....).(...).(...)(............).*$/, "$1-$2-4$3-a$4-$5");
  const post = async (action, id) => (await expect(thread, 200, {
    cookie, method: "POST", data: { action, id, body, requestId: requestId(action) },
  })).json();
  const findComment = async () => {
    const discussion = await (await expect(thread + "&sort=newest", 200, { cookie })).json();
    return discussion.discussion?.comments.nodes.find((node) => node.body === body);
  };
  let comment = await findComment();
  if (!comment) {
    await post("post");
    comment = await findComment();
  }
  if (!comment) throw new Error("Staging comment was not readable after write");
  const findReply = async () => {
    const replies = await (await expect(thread + "&parent=" + encodeURIComponent(comment.id), 200, { cookie })).json();
    return replies.replies?.nodes?.some((node) => node.body === body);
  };
  if (!await findReply()) {
    await post("reply", comment.id);
    if (!await findReply()) throw new Error("Staging reply was not readable after write");
  }
  return { verifiedAt: new Date().toISOString(), checks: ["ssg", "client-entry", "staging-auth", "session", "private-novel", "pagefind", "comment-counts", "comment-write", "comment-reply"] };
}

function signature(receipt) {
  const key = process.env.RELEASE_APPROVAL_KEY;
  if (!key || key.length < 32) throw new Error("Configure RELEASE_APPROVAL_KEY in the protected production environment");
  return createHmac("sha256", key).update(JSON.stringify(receipt)).digest("hex");
}

if (action === "build") {
  if (id && !["--profile", "--full"].includes(id)) throw new Error("Usage: pnpm release build [--profile] [--full]");
  await run(["node", "scripts/build/smart.mjs", "--artifact", ...[id, ...args].filter(Boolean)]);
} else {
  if (!["stage", "verify", "verify-artifact", "approve", "promote", "rollback", "report"].includes(action) || args.length)
    throw new Error("Usage: pnpm release <stage|verify|verify-artifact|approve|promote|rollback|report> <Release ID>");
  const scratch = await scratchDirectory();
  let lock;
  try {
    if (!releaseIdPattern.test(id || "")) throw new Error("Specify an exact Release ID");
    if (action === "report") {
      const store = releaseStore();
      if (!store) throw new Error("Configure private RELEASE_R2 credentials");
      const reports = await store.list(`${id}/reports/`);
      if (!reports.length) throw new Error("No private reports for this Release ID");
      for (const { key } of reports) {
        const target = resolve(scratch, "report.ndjson");
        if (!await store.get(key, target)) throw new Error("Report disappeared during retrieval");
        process.stdout.write(await readFile(target, "utf8"));
      }
    } else if (action === "verify-artifact") {
      const { manifest } = await materializeArtifact(id, scratch);
      console.log(JSON.stringify({ id, contentKind: manifest.contentKind, archiveHash: manifest.archiveHash }));
    } else {
      const control = controlStore();
      if (await getJson(control, `${id}/expired.json`, scratch)) throw new Error("Release is EXPIRED");
      const manifest = await readReleaseManifest(id, scratch);
      if (manifest.contentKind !== "candidate" || manifest.sources.slice(0, 2).length !== 2 ||
          manifest.sources.slice(0, 2).some(({ commit }) => !/^[a-f0-9]{40}$/i.test(commit)))
        throw new Error("A fixture release cannot be staged or promoted as a production candidate");
      if (["stage", "promote", "rollback"].includes(action) &&
          (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID))
        throw new Error("Configure scoped Cloudflare deployment credentials");
      lock = "deployment.lock";
      if (!await putJson(control, lock, { action, id }, scratch)) {
        lock = undefined;
        throw new Error("Another release operation holds the deployment lock");
      }
      try {
        if (await getJson(control, `${id}/expired.json`, scratch)) throw new Error("Release is EXPIRED");
        if (["verify", "approve"].includes(action) && !await releaseStore().exists(`${id}/artifact.tar.gz`))
          throw new Error("Release archive is missing");
        const receipt = (kind) => getJson(control, `${id}/${kind}.json`, scratch);
        const valid = (value) => value?.id === id && value.archiveHash === manifest.archiveHash &&
          value.websiteCommit === manifest.websiteCommit && value.sourcesHash === hash(JSON.stringify(manifest.sources));
        const base = { id, archiveHash: manifest.archiveHash, websiteCommit: manifest.websiteCommit,
          sourcesHash: hash(JSON.stringify(manifest.sources)) };
        if (action === "stage") {
          const { root } = await materializeArtifact(id, scratch, manifest);
          const versions = await deploy(root, manifest, true);
          await putJson(control, `${id}/staged.json`, { ...base, versions }, scratch, { immutable: false });
          await putJson(control, "active-staging.json", { ...base, versions }, scratch, { immutable: false });
        } else if (action === "verify") {
          const staged = await receipt("staged");
          if (!valid(staged)) throw new Error("Stage the specified Release ID first");
          if (await receipt("approved")) throw new Error("The verified evidence for this approved release is fixed");
          const result = await verify(manifest);
          await putJson(control, `${id}/verified.json`, { ...base, ...result, versions: staged.versions }, scratch, { immutable: false });
        } else {
          const verified = await receipt("verified");
          if (!valid(verified) || !verified.checks?.includes("comment-reply"))
            throw new Error("The specified release has no matching Staging verification");
          if (action === "approve") {
            const approval = { ...base, verifiedHash: hash(JSON.stringify(verified)), approvedAt: new Date().toISOString() };
            const existing = await receipt("approved");
            if (existing) {
              if (!valid(existing.approval) || existing.approval.verifiedHash !== approval.verifiedHash ||
                  existing.signature !== signature(existing.approval))
                throw new Error("The Release ID already has a different approval");
            } else if (!await putJson(control, `${id}/approved.json`, { approval, signature: signature(approval) }, scratch)) {
              throw new Error("Approval changed concurrently");
            }
          } else {
            const entry = await receipt("approved");
            if (!valid(entry?.approval) || entry.approval.verifiedHash !== hash(JSON.stringify(verified)) ||
                !/^[a-f0-9]{64}$/.test(entry.signature || "") ||
                !timingSafeEqual(Buffer.from(entry.signature, "hex"), Buffer.from(signature(entry.approval), "hex")))
              throw new Error("The specified release has no matching signed approval");
            if (action === "rollback" && !valid(await receipt("production")))
              throw new Error("Rollback requires a previously deployed production Release ID");
            const active = await getJson(control, "active-production.json", scratch);
            const { root } = await materializeArtifact(id, scratch, manifest);
            const versions = await deploy(root, manifest, rehearsal, active?.versions);
            if (rehearsal)
              await putJson(control, "active-staging.json", { ...base, versions }, scratch, { immutable: false });
            const result = { ...base, versions, action, deployedAt: new Date().toISOString() };
            await putJson(control, `${id}/deployments/${randomUUID()}.json`, result, scratch);
            await putJson(control, `${id}/production.json`, result, scratch, { immutable: false });
            await putJson(control, "active-production.json", result, scratch, { immutable: false });
            console.log(JSON.stringify(result));
          }
        }
        buildEvent("release", action, "complete", { id });
      } finally {
        await control.delete(lock);
      }
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
