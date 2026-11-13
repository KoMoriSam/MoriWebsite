import { setTimeout } from "node:timers/promises";
import { run } from "../lib/commands.mjs";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";

const config = ["--config", "wrangler.jsonc"];
const origin = "https://komori.cc";

export async function deployWebsiteVersion(versionId, { env, assertCurrent }) {
  const status = async () => JSON.parse(await run(
    ["wrangler", "deployments", "status", ...config, "--json"], { env, capture: true },
  ));
  const isActive = ({ versions }) => versions.length === 1 &&
    versions[0].version_id === versionId && versions[0].percentage === 100;

  const active = await observeBuild("deploy", "read active website deployment", status);
  if (!isActive(active)) {
    await observeBuild("deploy", "deploy exact website version", async () => {
      await assertCurrent();
      await run(["wrangler", "versions", "deploy", `${versionId}@100%`, ...config,
        "--yes", "--message", `MoriWebsite production version ${versionId}`], { env });
    }, { versionId });
  }

  const deployment = await observeBuild("deploy", "verify production website", async () => {
    const request = (path, method) => fetch(origin + path, {
      method,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    const check = async () => {
      const [version, homepage] = await Promise.all([
        request("/api/version", "GET").then(async (response) => {
          if (!response.ok) throw new Error(`Version endpoint returned HTTP ${response.status}`);
          return (await response.json()).version;
        }),
        request("/", "HEAD"),
      ]);
      if (!homepage.ok || !homepage.headers.get("content-type")?.includes("text/html"))
        throw new Error(`Homepage did not return HTML (HTTP ${homepage.status})`);
      if (version !== versionId) throw new Error("Production domain is serving a different version");
    };
    // Allow edge propagation before treating a domain check as failed.
    for (let attempt = 1; ; attempt++) {
      try {
        await check();
        break;
      } catch (error) {
        if (attempt === 8) throw error;
        await setTimeout(5000);
      }
    }
    const result = await status();
    if (!isActive(result)) throw new Error(`Version ${versionId} is not receiving 100% of production traffic`);
    return result;
  }, { versionId });
  buildEvent("deploy", "production website", "verified", { versionId, deploymentId: deployment.id });
}
