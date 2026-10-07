import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { generateImageVariants } from "./lib/generate-image-variants.mjs";

const mode = process.argv.includes("--production") ? "production" : "development";
dotenv.config({ path: [`.env.${mode}`, ".env"], quiet: true });
const local = await generateImageVariants({ root: "public/assets/images", exclude: ["games/fogport"] });
const sources = [{ base: "/assets/images/", manifest: local }];
const remoteBases = [...new Set([process.env.VITE_BLOG_RAW, process.env.VITE_NOVEL_RAW].filter(Boolean).map((base) => `${base.replace(/\/+$/, "").replace(/\/images$/iu, "")}/images/`))];
await Promise.all(remoteBases.map(async (base) => {
  if (!/^https?:\/\//u.test(base)) return;
  try {
    const response = await fetch(`${base}_optimized/manifest.json`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (manifest.version !== 1 || !manifest.images) throw new Error("Invalid manifest");
    sources.push({ base, manifest });
  } catch (error) {
    console.warn(`Image manifest unavailable at ${base}: ${error.message}; using original images.`);
  }
}));
sources.sort((a, b) => a.base.localeCompare(b.base));
await mkdir("src/utils/images", { recursive: true });
await writeFile(path.resolve("src/utils/images/image-manifests.generated.json"), `${JSON.stringify(sources)}\n`);
console.log(`Generated variants for ${Object.keys(local.images).length} local images.`);
