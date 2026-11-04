import { spawn } from "node:child_process";
import { copyFile, mkdir, open, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";

const r2Settings = {
  SSG_R2_ENDPOINT: {
    pattern: /^https:\/\/[a-f0-9]+(?:\.(?:eu|fedramp|us))?\.r2\.cloudflarestorage\.com\/?$/u,
    expected: "the account S3 API endpoint, without a bucket path",
  },
  SSG_R2_BUCKET: {
    pattern: /^[a-z0-9-]+$/u,
    expected: "the bucket name",
  },
  SSG_R2_ACCESS_KEY: {
    pattern: /^[a-zA-Z0-9]+$/u,
    expected: "the R2 S3 Access Key ID",
  },
  SSG_R2_SECRET_KEY: {
    pattern: /^[a-zA-Z0-9]+$/u,
    expected: "the R2 S3 Secret Access Key",
  },
  SSG_SNAPSHOT_NAMESPACE: {
    pattern: /^[a-z0-9-]+$/u,
    expected: "a lowercase prefix such as production",
  },
};

export function snapshotStore() {
  const settings = Object.fromEntries(
    Object.keys(r2Settings).map((name) => [name, process.env[name]?.trim() || ""]),
  );
  if (!Object.values(settings).some(Boolean)) return null;
  const invalid = [];
  for (const [name, { pattern, expected }] of Object.entries(r2Settings)) {
    if (!settings[name]) invalid.push(`${name} is missing`);
    else if (!pattern.test(settings[name])) invalid.push(`${name} must be ${expected}`);
  }
  if (invalid.length)
    throw new Error(`Invalid R2 snapshot configuration: ${invalid.join(", ")}`);

  const {
    SSG_R2_ENDPOINT: endpointSetting,
    SSG_R2_BUCKET: bucket,
    SSG_R2_ACCESS_KEY: key,
    SSG_R2_SECRET_KEY: secret,
    SSG_SNAPSHOT_NAMESPACE: namespace,
  } = settings;
  const endpoint = endpointSetting.replace(/\/$/u, "");
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
      output || "-",
      "--write-out",
      "%{http_code}",
    ];
    if (input) args.push("--upload-file", input);
    if (create) args.push("--header", "If-None-Match: *");
    args.push(`${endpoint}/${bucket}/${namespace}/${name}`);
    return new Promise((resolveRequest, reject) => {
      const child = spawn("curl", args, { stdio: ["pipe", "pipe", "inherit"] });
      let response = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (data) => {
        response += data;
      });
      child.once("error", reject);
      child.stdin.on("error", reject);
      child.once("close", (code) =>
        code === 0
          ? resolveRequest({
              status: Number(response.slice(-3)),
              body: response.slice(0, -3),
            })
          : reject(new Error(`R2 snapshot request failed (${method} ${name})`)),
      );
      child.stdin.end(`user = "${key}:${secret}"\n`);
    });
  }
  async function responseError(method, name, { status, body }, output) {
    if (output) {
      const file = await open(output, "r").catch(() => null);
      if (file) {
        try {
          const buffer = Buffer.alloc(4096);
          const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
          body = buffer.toString("utf8", 0, bytesRead);
        } finally {
          await file.close();
        }
      }
    }
    // R2 error messages can contain signing details. Log only the S3 error code.
    const code = body.match(/<Code>([A-Za-z][A-Za-z0-9]{0,63})<\/Code>/u)?.[1];
    return new Error(`R2 ${method} ${name}: ${status}${code ? ` (${code})` : ""}`);
  }
  return {
    async get(name, output) {
      const response = await request("GET", name, { output });
      if (response.status === 404) return false;
      if (response.status !== 200)
        throw await responseError("GET", name, response, output);
      return true;
    },
    async put(name, input, create = false) {
      const response = await request("PUT", name, { input, create });
      if (create && response.status === 412) return false;
      if (response.status !== 200)
        throw await responseError("PUT", name, response);
      return true;
    },
    async delete(name) {
      const response = await request("DELETE", name);
      if (response.status !== 204)
        throw await responseError("DELETE", name, response);
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
