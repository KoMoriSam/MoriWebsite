import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const directory = ".tmp/mori-dev";
export const persist = resolve(directory, "isolated-state");
export const authConfig = resolve(directory, "auth.json");
export const apiConfig = resolve(directory, "api.json");
export const siteConfig = resolve(directory, "website.json");
export const workerPort = 8789;

export async function configure(port) {
  await mkdir(resolve(directory, "assets"), { recursive: true });
  const origin = `http://localhost:${port}`;
  const common = { compatibility_date: "2026-08-23", workers_dev: false, preview_urls: false };
  const service = (binding, name, entrypoint) => ({
    binding, service: name, ...(entrypoint && { entrypoint }),
  });
  const d1 = (binding, name, suffix, migrations) => ({
    binding, database_name: name, database_id: `00000000-0000-4000-8000-00000000000${suffix}`,
    ...(migrations && { migrations_dir: resolve("migrations", migrations) }),
  });
  const entries = [
    [authConfig, {
      name: "mori-auth-local", main: resolve("workers/dev/auth.js"),
      d1_databases: [d1("AUTH_DB", "mori-auth-local", 1, "auth")],
      vars: { MORI_SITE_ORIGIN: origin, MORI_AUTH_ORIGIN: origin },
    }],
    [apiConfig, {
      name: "api-local", main: resolve("workers/dev/api.js"),
      compatibility_flags: ["nodejs_compat"],
      vars: { GAMES_ALLOWED_ORIGINS: origin },
      services: [service("MORI_COMMENT_AUTH", "mori-auth-local", "CommentAuth")],
      ratelimits: [
        { name: "COMMENT_READ_LIMIT", namespace_id: "1101", simple: { limit: 90, period: 60 } },
        { name: "COMMENT_WRITE_LIMIT", namespace_id: "1102", simple: { limit: 12, period: 60 } },
      ],
      d1_databases: [d1("ANALYTICS_DB", "mori-analytics-local", 2, "analytics")],
      kv_namespaces: ["LOCAL_COMMENTS", "ANNOUNCEMENTS_KV", "CHANGELOG_KV", "RATE_LIMIT_KV"]
        .map((binding, index) => ({ binding, id: String(index + 1).padStart(32, "0") })),
      durable_objects: { bindings: [{ name: "GAME_ROOMS", class_name: "GameRoom" }] },
      migrations: [{ tag: "games-v1", new_sqlite_classes: ["GameRoom"] }],
    }],
    [siteConfig, {
      name: "website-local", main: resolve("workers/dev/website.js"),
      vars: { MORI_SITE_ORIGIN: origin, MORI_AUTH_ORIGIN: origin },
      services: [
        service("MORI_AUTH", "mori-auth-local", "SiteAuth"),
        service("LOCAL_AUTH", "mori-auth-local"),
        service("LOCAL_API", "api-local"),
        service("COMMENTS", "api-local", "CommentsInternal"),
      ],
      r2_buckets: [{ binding: "NOVEL_VAULT", bucket_name: "novel-vault-local" }],
      assets: { directory: resolve(directory, "assets"), binding: "ASSETS", run_worker_first: true },
    }],
  ];
  await Promise.all(entries.map(([file, config]) =>
    writeFile(file, JSON.stringify({ ...common, ...config })),
  ));
}
