import { spawn } from "node:child_process";
import { copyFile, mkdir, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";

export function snapshotStore() {
  const {
    SSG_R2_ENDPOINT: endpoint,
    SSG_R2_BUCKET: bucket,
    SSG_R2_ACCESS_KEY: key,
    SSG_R2_SECRET_KEY: secret,
    SSG_SNAPSHOT_NAMESPACE: namespace,
  } = process.env;
  if (![endpoint, bucket, key, secret, namespace].some(Boolean)) return null;
  if (
    !/^https:\/\/[a-f0-9]+\.r2\.cloudflarestorage\.com$/u.test(
      endpoint || "",
    ) ||
    !/^[a-z0-9-]+$/u.test(bucket || "") ||
    !/^[a-z0-9-]+$/u.test(namespace || "") ||
    !/^[a-zA-Z0-9]+$/u.test(key || "") ||
    !/^[a-zA-Z0-9]+$/u.test(secret || "")
  ) {
    throw new Error("Invalid R2 snapshot configuration");
  }
  async function request(method, name, { input, output, create } = {}) {
    const args = [
      "--silent",
      "--show-error",
      "--max-time",
      "300",
      "--aws-sigv4",
      "aws:amz:auto:s3",
      "--config",
      "-",
      "--request",
      method,
      "--output",
      output || "/dev/null",
      "--write-out",
      "%{http_code}",
    ];
    if (input) args.push("--upload-file", input);
    if (create) args.push("--header", "If-None-Match: *");
    args.push(`${endpoint}/${bucket}/${namespace}/${name}`);
    if (!output && process.platform === "win32")
      args[args.indexOf("/dev/null")] = "NUL";
    return new Promise((resolveRequest, reject) => {
      const child = spawn("curl", args, { stdio: ["pipe", "pipe", "inherit"] });
      let status = "";
      child.stdout.on("data", (data) => {
        status += data;
      });
      child.once("error", reject);
      child.stdin.on("error", reject);
      child.once("close", (code) =>
        code === 0
          ? resolveRequest(Number(status))
          : reject(new Error(`R2 snapshot request failed (${method} ${name})`)),
      );
      child.stdin.end(`user = "${key}:${secret}"\n`);
    });
  }
  return {
    async get(name, output) {
      const status = await request("GET", name, { output });
      if (status === 404) return false;
      if (status !== 200) throw new Error(`R2 GET ${name}: ${status}`);
      return true;
    },
    async put(name, input, create = false) {
      const status = await request("PUT", name, { input, create });
      if (create && status === 412) return false;
      if (status !== 200) throw new Error(`R2 PUT ${name}: ${status}`);
      return true;
    },
    async delete(name) {
      const status = await request("DELETE", name);
      if (status !== 204) throw new Error(`R2 DELETE ${name}: ${status}`);
    },
  };
}

export async function localSnapshotStore() {
  const directory = resolve(".tmp/site-snapshots");
  await mkdir(directory, { recursive: true });
  return {
    async get(name, output) {
      try {
        await copyFile(resolve(directory, name), output);
      } catch (error) {
        if (error.code === "ENOENT") return false;
        throw error;
      }
      return true;
    },
    async put(name, input) {
      const target = resolve(directory, name);
      await copyFile(input, `${target}.tmp`);
      await rename(`${target}.tmp`, target);
      return true;
    },
    async delete(name) {
      await rm(resolve(directory, name), { force: true });
    },
  };
}
