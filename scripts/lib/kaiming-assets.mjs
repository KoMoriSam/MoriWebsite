import { setTimeout } from "node:timers/promises";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js";

const repository = "KoMoriSam/Kaiming";
const archiveName = "KaimingPunctuation-VF.zip";
const files = [
  ["fonts/kaiming-sans-variable.woff2", "Sans-VF.woff2"],
  ["fonts/kaiming-serif-variable.woff2", "Serif-VF.woff2"],
  ["index.css", "index.css"],
  ["LICENSE", "LICENSE"],
];

export async function extractKaiming(archive, checksum, destination) {
  const digest = createHash("sha256").update(archive).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(checksum) || digest !== checksum.toLowerCase()) throw new Error("Kaiming release checksum mismatch");
  const reader = new ZipReader(new Uint8ArrayReader(archive), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    await mkdir(destination, { recursive: true });
    for (const [source, target] of files) {
      const matches = entries.filter((entry) => entry.filename === `KaimingPunctuation-VF/${source}`);
      if (matches.length !== 1 || matches[0].directory || matches[0].uncompressedSize > 2 * 1024 * 1024) throw new Error(`Invalid Kaiming release file: ${source}`);
      const data = await matches[0].getData(new Uint8ArrayWriter(), { checkSignature: true });
      if (target.endsWith(".woff2") && Buffer.from(data.subarray(0, 4)).toString() !== "wOF2") throw new Error(`Invalid WOFF2 font: ${source}`);
      await writeFile(path.join(destination, target), data);
    }
  } finally {
    await reader.close();
  }
  return digest;
}

async function fetchRelease(url, options) {
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (attempt >= 2) throw error;
    }
    if (response && (attempt >= 2 || (response.status !== 429 && response.status < 500))) return response;
    await response?.body?.cancel();
    await setTimeout(750 * 2 ** attempt);
  }
}

async function download(url, limit) {
  const response = await fetchRelease(url);
  if (!response.ok) throw new Error(`Kaiming download failed (${response.status}): ${url}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new Error(`Kaiming download exceeds size limit: ${url}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function prepareKaiming(destination) {
  let tag = process.env.CONTENT_KAIMING_RELEASE;
  if (!tag) {
    // Resolve once, then fetch both assets from the same release, without a GitHub API token.
    const response = await fetchRelease(`https://github.com/${repository}/releases/latest`, { redirect: "manual" });
    await response.body?.cancel();
    const location = new URL(response.headers.get("Location") || "", `https://github.com/${repository}/releases/latest`);
    const prefix = `/${repository}/releases/tag/`;
    if (response.status !== 302 || location.origin !== "https://github.com" || !location.pathname.startsWith(prefix)) throw new Error("Could not resolve latest Kaiming release");
    tag = decodeURIComponent(location.pathname.slice(prefix.length));
  }
  if (!/^v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(tag)) throw new Error(`Invalid Kaiming release tag: ${tag}`);
  const base = `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}`;
  const [archive, sums] = await Promise.all([download(`${base}/${archiveName}`, 8 * 1024 * 1024), download(`${base}/SHA256SUMS`, 16384)]);
  const checksum = sums.toString("utf8").split(/\r?\n/).map((line) => line.trim().split(/\s+/)).find(([, filename]) => filename === archiveName)?.[0];
  const sha256 = await extractKaiming(archive, checksum, destination);
  return { repository, release: tag, sha256 };
}
