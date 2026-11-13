import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readWorkerConfig } from "../lib/worker-config.mjs";
import { integrationOrigin } from "../../shared/integration-preview.js";
import { stagingDiscussionRepository } from "../../shared/discussions.js";

export const stagingOrigin = "https://staging.komori.cc";
export const authStagingOrigin = "https://auth-staging.komori.cc";
const apiStagingOrigin = "https://api-staging.komori.cc";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const stagingNovelBucket = "novel-vault-staging";
const stagingResources = {
  AUTH_D1_ID: "2ed3a196-2af6-4042-9dc4-453e44ad23a1",
  ANALYTICS_D1_ID: "dc2fe9e4-e8ca-417c-b242-a30e7f6cdc89",
  RATE_LIMIT_KV_ID: "c303c627b1da4e21858670de347b4687",
  ANNOUNCEMENTS_KV_ID: "598f6fa43f7e40c49768c24bf68fa51c",
  CHANGELOG_KV_ID: "e348a795eff247cfa24f84a70ea756fa",
};
const files = { auth: "wrangler.auth.jsonc", api: "wrangler.api.jsonc" };

async function configuration(root, target) {
  const config = await readWorkerConfig(resolve(root, files[target]));
  const expected = { auth: "mori-auth", api: "api" };
  if (config.name !== expected[target] || config.build || config.env || config.previews)
    throw new Error(`Unexpected release Worker configuration: ${target}`);
  return config;
}

export async function deploymentConfigs(root) {
  const configs = {};
  for (const name of Object.keys(files)) configs[name] = await configuration(root, name);
  const { auth, api } = configs;
  const vars = {
    MORI_ENV: "staging",
    MORI_SITE_ORIGIN: stagingOrigin,
    MORI_AUTH_ORIGIN: authStagingOrigin,
    MORI_STAGING_DISCUSSION_REPO: process.env.MORI_STAGING_DISCUSSION_REPO || "KoMoriSam/mori-staging-discussions",
  };
  stagingDiscussionRepository(vars);
  const readers = process.env.MORI_STAGING_READER_IDS || "58881688";
  if (!/^\d+(?:,\d+)*$/.test(readers)) throw new Error("Configure MORI_STAGING_READER_IDS");
  const unique = new Set([...auth.d1_databases, ...api.d1_databases, ...api.kv_namespaces]
    .map((entry) => entry.database_id || entry.id));
  const bind = (key, pattern) => {
    const id = stagingResources[key] || "";
    if (!pattern.test(id) || unique.has(id)) throw new Error(`Missing or shared staging binding: MORI_STAGING_${key}`);
    unique.add(id);
    return id;
  };
  const authId = bind("AUTH_D1_ID", uuid);
  const analyticsId = bind("ANALYTICS_D1_ID", uuid);
  auth.d1_databases = auth.d1_databases.map((entry) => ({ ...entry, database_name: "mori-auth-staging", database_id: authId }));
  api.d1_databases = api.d1_databases.map(({ remote, ...entry }) =>
    ({ ...entry, database_name: "mori-analytics-staging", database_id: analyticsId }));
  api.kv_namespaces = api.kv_namespaces.map(({ remote, ...entry }) =>
    ({ ...entry, id: bind(entry.binding + "_ID", /^[0-9a-f]{32}$/i) }));
  for (const config of Object.values(configs)) {
    config.name += "-staging";
    config.services?.forEach((service) => { service.service += "-staging"; });
    config.observability = { enabled: true, head_sampling_rate: 1 };
  }
  for (const [name, config] of Object.entries({ auth, api })) {
    config.ratelimits = config.ratelimits.map((rate) => ({ ...rate, namespace_id: String(Number(rate.namespace_id) + 1000) }));
    if (name === "auth") config.observability.logs = { invocation_logs: false };
  }
  auth.routes = [{ pattern: new URL(authStagingOrigin).hostname, custom_domain: true }];
  api.routes = [{ pattern: new URL(apiStagingOrigin).hostname, custom_domain: true }];
  api.vars = { ...vars, GAMES_ALLOWED_ORIGINS: [stagingOrigin, integrationOrigin].join(",") };
  auth.vars = { ...vars, MORI_STAGING_READER_IDS: readers };
  const results = {};
  for (const [name, config] of Object.entries(configs)) {
    const file = resolve(root, `wrangler.staging-${name}.json`);
    await writeFile(file, JSON.stringify(config));
    results[name] = file;
  }
  return results;
}
