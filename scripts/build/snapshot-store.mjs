import { spawn } from "node:child_process";
import { copyFile, mkdir, open, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { buildEnvironment } from "../lib/build-environment.mjs";

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

export function snapshotStore({ prefix = "SSG_R2", namespace: fixedNamespace } = {}) {
  const settings = Object.fromEntries(
    Object.keys(r2Settings).map((name) => [
      name,
      name === "SSG_SNAPSHOT_NAMESPACE" && fixedNamespace
        ? fixedNamespace
        : process.env[name.replace("SSG_R2", prefix)]?.trim() || "",
    ]),
  );
  if (!Object.keys(settings).some((name) => name.startsWith("SSG_R2") && settings[name]) &&
      (fixedNamespace || !settings.SSG_SNAPSHOT_NAMESPACE)) return null;
  const invalid = [];
  for (const [name, { pattern, expected }] of Object.entries(r2Settings)) {
    if (!settings[name]) invalid.push(`${name.replace("SSG_R2", prefix)} is missing`);
    else if (!pattern.test(settings[name])) invalid.push(`${name.replace("SSG_R2", prefix)} must be ${expected}`);
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
  const objectPrefix = namespace + "/";
  async function request(method, name, { input, output, create, query } = {}) {
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
    if (method === "HEAD") args.push("--head");
    if (input) args.push("--upload-file", input);
    if (create) args.push("--header", "If-None-Match: *");
    args.push(query ? `${endpoint}/${bucket}?${query}` :
      `${endpoint}/${bucket}/${(objectPrefix + name).split("/").map(encodeURIComponent).join("/")}`);
    return new Promise((resolveRequest, reject) => {
      const child = spawn("curl", args, { env: buildEnvironment(), stdio: ["pipe", "pipe", "inherit"] });
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
  const xmlText = (value) => value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) =>
    ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity]);
  return {
    async list(prefix = "") {
      const objects = [];
      let continuation;
      do {
        const query = new URLSearchParams({ "list-type": "2", prefix: objectPrefix + prefix });
        if (continuation) query.set("continuation-token", continuation);
        const response = await request("GET", "", { query });
        if (response.status !== 200 || !response.body.includes("<ListBucketResult"))
          throw await responseError("LIST", prefix, response);
        for (const [, entry] of response.body.matchAll(/<Contents>([\s\S]+?)<\/Contents>/g)) {
          const name = xmlText(entry.match(/<Key>(.*?)<\/Key>/s)?.[1] || "");
          const bytes = Number(entry.match(/<Size>(\d+)<\/Size>/)?.[1]);
          if (!name.startsWith(objectPrefix) || !Number.isSafeInteger(bytes))
            throw new Error("Invalid R2 listing entry");
          objects.push({ key: name.slice(objectPrefix.length), bytes, modifiedAt: entry.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] });
        }
        const next = response.body.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/s)?.[1];
        if (response.body.includes("<IsTruncated>true</IsTruncated>") && (!next || xmlText(next) === continuation))
          throw new Error("Incomplete R2 listing");
        continuation = next && xmlText(next);
      } while (continuation);
      return objects;
    },
    async exists(name) {
      const response = await request("HEAD", name);
      if (response.status === 404) return false;
      if (response.status !== 200) throw new Error(`R2 HEAD ${name}: ${response.status}`);
      return true;
    },
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
