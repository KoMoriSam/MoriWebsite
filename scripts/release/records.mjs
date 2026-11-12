import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { snapshotStore } from "../build/snapshot-store.mjs";

export const releaseIdPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

export function rehearsalMode() {
  const mode = process.env.MORI_RELEASE_MODE;
  if (mode && !["production", "rehearsal"].includes(mode)) throw new Error("Invalid release mode");
  return mode === "rehearsal";
}

export function releaseStore({ rehearsal = rehearsalMode() } = {}) {
  return snapshotStore({ prefix: "RELEASE_R2", namespace: rehearsal ? "release-rehearsal-v1" : "release-v1" });
}

export function controlStore() {
  const store = snapshotStore({ prefix: "RELEASE_CONTROL_R2", namespace: rehearsalMode() ? "release-control-rehearsal-v1" : "release-control-v1" });
  if (!store) throw new Error("Configure private RELEASE_CONTROL_R2 credentials");
  return store;
}

export async function scratchDirectory() {
  await mkdir(".tmp", { recursive: true });
  return mkdtemp(resolve(".tmp/release-"));
}

export async function putJson(store, key, value, scratch, { immutable = true } = {}) {
  const file = resolve(scratch, randomUUID() + ".json");
  await writeFile(file, JSON.stringify(value));
  try {
    return await store.put(key, file, immutable);
  } finally {
    await rm(file, { force: true });
  }
}

export async function getJson(store, key, scratch) {
  const file = resolve(scratch, randomUUID() + ".json");
  try {
    return await store.get(key, file) ? JSON.parse(await readFile(file, "utf8")) : null;
  } finally {
    await rm(file, { force: true });
  }
}
