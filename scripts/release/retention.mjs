import { createHash, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { snapshotStore } from "../build/snapshot-store.mjs";
import { controlStore, getJson, putJson, rehearsalMode, releaseIdPattern, releaseStore, scratchDirectory } from "./records.mjs";

const DAY = 86_400_000;
export const archiveWarningBytes = 2_000_000_000;
const total = (objects) => objects.reduce((sum, item) => sum + item.bytes, 0);
const digest = (data) => createHash("sha256").update(JSON.stringify(data)).digest("hex");

export async function releaseRetention({ apply } = {}) {
  const store = releaseStore();
  const control = controlStore();
  if (!store) throw new Error("Configure private RELEASE_R2 credentials");
  const scratch = await scratchDirectory();
  const owner = { operation: "retention", attemptId: randomUUID() };
  const locks = [];
  const get = (key) => getJson(control, key, scratch);
  const read = (id, name) => get(`${id}/${name}.json`);
  try {
    if (apply) for (const key of ["candidate.lock", "deployment.lock"]) {
      if (!await putJson(control, key, owner, scratch))
        throw new Error(`Release operation in progress (${key}); no objects were changed`);
      locks.push(key);
    }
    const [objects, controlObjects, production, staging, building, deploying] = await Promise.all([
      store.list(), control.list(), get("active-production.json"), get("active-staging.json"),
      get("candidate.lock"), get("deployment.lock"),
    ]);
    const entries = [];
    const archives = objects.filter(({ key }) => key.endsWith("/artifact.tar.gz"));
    for (const archive of archives) {
      const id = archive.key.split("/")[0];
      if (!releaseIdPattern.test(id)) throw new Error("Unknown archive key; cleanup refused");
      const [manifest, verified, published, approved, expired] = await Promise.all([
        getJson(store, `${id}/manifest.json`, scratch), read(id, "verified"), read(id, "production"),
        read(id, "approved"), read(id, "expired"),
      ]);
      if (!manifest || manifest.id !== id || !/^[a-f0-9]{64}$/.test(manifest.archiveHash || "") ||
          !Number.isFinite(Date.parse(manifest.createdAt)) || manifest.bytes !== archive.bytes)
        throw new Error(`Invalid archive inventory record for ${id}; cleanup refused`);
      const verifiedRecord = verified?.id === id && verified.archiveHash === manifest.archiveHash;
      const productionRecord = verifiedRecord && published?.id === id && published.archiveHash === manifest.archiveHash;
      entries.push({ id, bytes: archive.bytes, fingerprint: manifest.inputFingerprint, novelVersion: manifest.novelVersion,
        createdAt: manifest.createdAt, publishedAt: productionRecord ? published.deployedAt : null,
        approved: Boolean(approved), expired: Boolean(expired), protects: [] });
    }
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    const historical = entries.filter(({ id, publishedAt, expired }) => publishedAt && !expired && id !== production?.id)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 2);
    const candidates = entries.filter(({ publishedAt, createdAt, expired }) =>
      !publishedAt && !expired && Date.now() - Date.parse(createdAt) <= 14 * DAY).slice(0, 2);
    for (const entry of entries) {
      if (entry.id === production?.id) entry.protects.push("active-production");
      if (historical.includes(entry)) entry.protects.push("production-rollback");
      if (entry.id === staging?.id) entry.protects.push("active-staging");
      if (entry.id === building?.id || entry.fingerprint && entry.fingerprint === building?.fingerprint)
        entry.protects.push("building");
      if (entry.id === deploying?.id) entry.protects.push(deploying.action || "deploying");
      if (entry.approved && !entry.publishedAt) entry.protects.push("approved-pending-promotion");
      if (candidates.includes(entry)) entry.protects.push("recent-candidate");
      if (!/^[a-f0-9]{64}$/.test(entry.fingerprint || "")) entry.protects.push("legacy-archive");
    }
    const remove = entries.filter(({ protects }) => !protects.length);
    const references = [...new Set(entries.filter(({ protects }) => protects.length)
      .map(({ novelVersion }) => novelVersion))].sort();
    const snapshotBytes = {};
    for (const namespace of new Set(["production", "release-candidates", process.env.SSG_SNAPSHOT_NAMESPACE].filter(Boolean))) {
      const snapshots = snapshotStore({ namespace });
      if (snapshots) snapshotBytes[namespace] = total(await snapshots.list());
    }
    const novel = {};
    for (const prefix of ["STAGE_NOVEL_R2", "NOVEL_R2"]) {
      const vault = snapshotStore({ prefix, namespace: "v1" });
      if (!vault) continue;
      const [manifests, payloads] = await Promise.all([vault.list("versions/"), vault.list("objects/")]);
      const referenced = new Set();
      const versions = [];
      for (const { key, bytes } of manifests) {
        const manifest = await getJson(vault, key, scratch);
        if (!manifest || Object.values(manifest).some((value) => !/^[a-f0-9]{64}$/.test(value)))
          throw new Error(`Invalid private novel reference manifest in ${prefix}`);
        const version = key.slice("versions/".length, -".json".length);
        const reasons = entries.filter(({ novelVersion, protects }) => novelVersion === version && protects.length)
          .map(({ id, protects }) => ({ id, protects }));
        for (const value of Object.values(manifest)) referenced.add(value);
        versions.push({ version, bytes, referencedObjects: new Set(Object.values(manifest)).size, releases: reasons });
      }
      const unreferenced = payloads.filter(({ key }) => !referenced.has(key.slice("objects/".length)));
      novel[prefix] = { bytes: total(manifests) + total(payloads), versions,
        unreferenced: { bytes: total(unreferenced), objects: unreferenced.map(({ key }) => key) },
        deletion: "disabled; preserve all existing private novel version manifests" };
    }
    const otherArchives = (await releaseStore({ rehearsal: !rehearsalMode() }).list())
      .filter(({ key }) => key.endsWith("/artifact.tar.gz"));
    const archiveBytes = total(archives);
    const otherArchiveBytes = total(otherArchives);
    const plan = {
      archiveBytes, otherArchiveBytes, warningBytes: archiveWarningBytes,
      aboveWarning: archiveBytes + otherArchiveBytes >= archiveWarningBytes,
      reportsBytes: total(objects.filter(({ key }) => key.includes("/reports/"))),
      releaseNamespaceBytes: total(objects), controlBytes: total(controlObjects),
      snapshotBytes, novel, references, archives: entries,
      proposedArchiveRemovals: remove.map(({ id, bytes, expired }) => ({ id, bytes, expired })),
      reclaimableArchiveBytes: remove.reduce((sum, { bytes }) => sum + bytes, 0),
      operationsInProgress: Boolean((building && building.attemptId !== owner.attemptId) ||
        (deploying && deploying.attemptId !== owner.attemptId)),
    };
    const planId = digest({ protected: entries.filter(({ protects }) => protects.length),
      remove: plan.proposedArchiveRemovals, production: production?.id, staging: staging?.id });
    console.log(JSON.stringify({ ...plan, planId, dryRun: !apply }, null, 2));
    if (apply) {
      if (apply !== planId) throw new Error("Retention plan changed; review the new dry run");
      if (production?.id && !entries.some(({ id }) => id === production.id) ||
          staging?.id && !entries.some(({ id }) => id === staging.id))
        throw new Error("Active deployment records are incomplete; cleanup refused");
      for (const { id, fingerprint, expired } of remove) {
        if (!expired && !await putJson(control, `${id}/expired.json`, {
          id, fingerprint, state: "EXPIRED", expiredAt: new Date().toISOString(), planId,
        }, scratch)) throw new Error("Expiry record already exists; rerun retention planning");
        const index = `inputs/${fingerprint}.json`;
        if ((await get(index))?.id === id)
          await putJson(control, index, { id, fingerprint, state: "EXPIRED" }, scratch, { immutable: false });
        await store.delete(`${id}/artifact.tar.gz`);
      }
    }
  } finally {
    try {
      for (const key of locks.reverse()) await control.delete(key);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
}

if (process.argv[1]?.endsWith("retention.mjs")) {
  const [flag, apply, ...extra] = process.argv.slice(2);
  if (extra.length || flag && (flag !== "--apply" || !/^[a-f0-9]{64}$/.test(apply || "")))
    throw new Error("Usage: node scripts/release/retention.mjs [--apply <reviewed-plan-id>]");
  await releaseRetention({ apply });
}
