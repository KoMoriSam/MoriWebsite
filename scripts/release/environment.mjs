import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readWorkerConfig } from "../lib/worker-config.mjs";
import { testOrigin } from "../../shared/test-preview.js";
import { testDiscussionRepository } from "../../shared/discussions.js";

export const authTestOrigin = "https://auth-test.komori.cc";
const apiTestOrigin = "https://api-test.komori.cc";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const testNovelBucket = "novel-vault-test";
const testResources = {
  AUTH_D1_ID: "d42a6198-4726-4b65-aeac-5e8de457f1b4",
  ANALYTICS_D1_ID: "16fce172-6856-4ba9-84e6-119e8c44364c",
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
    MORI_ENV: "test",
    MORI_SITE_ORIGIN: testOrigin,
    MORI_AUTH_ORIGIN: authTestOrigin,
    MORI_TEST_DISCUSSION_REPO: process.env.MORI_TEST_DISCUSSION_REPO || "KoMoriSam/mori-test-discussions",
  };
  testDiscussionRepository(vars);
  const readers = process.env.MORI_TEST_READER_IDS || "58881688";
  if (!/^\d+(?:,\d+)*$/.test(readers)) throw new Error("Configure MORI_TEST_READER_IDS");
  const unique = new Set([...auth.d1_databases, ...api.d1_databases, ...api.kv_namespaces]
    .map((entry) => entry.database_id || entry.id));
  const bind = (key, pattern) => {
    const id = testResources[key] || "";
    if (!pattern.test(id) || unique.has(id)) throw new Error(`Missing or shared test binding: MORI_TEST_${key}`);
    unique.add(id);
    return id;
  };
  const authId = bind("AUTH_D1_ID", uuid);
  const analyticsId = bind("ANALYTICS_D1_ID", uuid);
  auth.d1_databases = auth.d1_databases.map((entry) => ({ ...entry, database_name: "mori-auth-test", database_id: authId }));
  api.d1_databases = api.d1_databases.map(({ remote, ...entry }) =>
    ({ ...entry, database_name: "mori-analytics-test", database_id: analyticsId }));
  api.kv_namespaces = api.kv_namespaces.map(({ remote, ...entry }) =>
    ({ ...entry, id: bind(entry.binding + "_ID", /^[0-9a-f]{32}$/i) }));
  for (const config of Object.values(configs)) {
    config.name += "-test";
    config.services?.forEach((service) => { service.service += "-test"; });
    config.observability = { enabled: true, head_sampling_rate: 1 };
  }
  for (const [name, config] of Object.entries({ auth, api })) {
    config.ratelimits = config.ratelimits.map((rate) => ({ ...rate, namespace_id: String(Number(rate.namespace_id) + 1000) }));
    if (name === "auth") config.observability.logs = { invocation_logs: false };
  }
  auth.routes = [{ pattern: new URL(authTestOrigin).hostname, custom_domain: true }];
  api.routes = [{ pattern: new URL(apiTestOrigin).hostname, custom_domain: true }];
  api.vars = { ...vars, GAMES_ALLOWED_ORIGINS: testOrigin, GITHUB_APP_ID: "5721939", GITHUB_INSTALLATION_ID: "181096518" };
  auth.vars = { ...vars, MORI_TEST_READER_IDS: readers };
  auth.secrets = { required: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"] };
  api.secrets = { required: ["GITHUB_APP_PRIVATE_KEY"] };
  const results = {};
  for (const [name, config] of Object.entries(configs)) {
    const file = resolve(root, `wrangler.test-${name}.json`);
    await writeFile(file, JSON.stringify(config));
    results[name] = file;
  }
  return results;
}
