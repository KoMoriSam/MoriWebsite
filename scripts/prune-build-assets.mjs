import { readFile, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const unusedPagefindFiles = [
  "pagefind-ui.js", "pagefind-ui.css",
  "pagefind-component-ui.js", "pagefind-component-ui.css",
  "pagefind-modular-ui.js", "pagefind-modular-ui.css",
  "pagefind-highlight.js",
];

export async function pruneBuildAssets(directory) {
  const dist = await realpath(directory);
  const candidates = [
    ".vite/ssr-manifest.json",
    ...["pagefind", "pagefind-novel"].flatMap((bundle) => unusedPagefindFiles.map((file) => `${bundle}/${file}`)),
  ];
  // Only discard the old duplicate when it is byte-for-byte identical.
  try {
    const [flat, nested] = await Promise.all([
      readFile(path.join(dist, "licenses.html")),
      readFile(path.join(dist, "licenses/index.html")),
    ]);
    if (flat.equals(nested)) candidates.push("licenses/index.html");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let bytes = 0;
  const removed = [];
  for (const candidate of candidates) {
    const filename = path.join(dist, candidate);
    try {
      const resolved = await realpath(filename);
      const relative = path.relative(dist, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Unsafe build asset: ${filename}`);
      const info = await stat(resolved);
      if (!info.isFile()) throw new Error(`Expected a build file: ${filename}`);
      await unlink(filename);
      bytes += info.size;
      removed.push(candidate);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { bytes, removed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = await realpath(path.join(root, "dist"));
  const relative = path.relative(await realpath(root), dist);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Build directory is outside the workspace");
  const result = await pruneBuildAssets(dist);
  console.log(`Removed ${result.removed.length} unused build files (${(result.bytes / 1048576).toFixed(2)} MiB).`);
}
