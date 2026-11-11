import { publicCoverManifest } from "../../shared/novel-release.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { generateImageVariants } from "../lib/generate-image-variants.mjs";
import { fetchContent } from "../lib/content-source.mjs";

const mode = process.argv.includes("--production")
  ? "production"
  : "development";
dotenv.config({ path: [`.env.${mode}`, ".env"], quiet: true });
const local = process.argv.includes("--reuse-local")
  ? JSON.parse(
      await readFile("dist/assets/images/_optimized/manifest.json", "utf8"),
    )
  : await generateImageVariants({
      root: "public/assets/images",
      exclude: ["games/fogport"],
    });
const sources = [{ base: "/assets/images/", manifest: local }];
const remoteBases = [
  ...new Set(
    [process.env.VITE_BLOG_RAW, process.env.VITE_NOVEL_RAW]
      .filter(Boolean)
      .map(
        (base) =>
          `${base.replace(/\/+$/, "").replace(/\/images$/iu, "")}/images/`,
      ),
  ),
];
await Promise.all(
  remoteBases.map(async (base) => {
    if (!/^https?:\/\//u.test(base)) return;
    try {
      const response = await fetchContent(`${base}_optimized/manifest.json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest.version !== 1 || !manifest.images)
        throw new Error("Invalid manifest");
      const novelBase = process.env.VITE_NOVEL_RAW?.replace(/\/+$/, "").replace(/\/images$/iu, "");
      sources.push({ base, manifest: base === novelBase + "/images/" ? publicCoverManifest(manifest) : manifest });
    } catch (error) {
      if (process.env.CONTENT_BUILD_DIR)
        throw new Error(`Invalid build image manifest for ${base}`, {
          cause: error,
        });
      console.warn(
        `图片将使用原图：无法读取 ${base} 的尺寸信息（${error.message}）。`,
      );
    }
  }),
);
sources.sort((a, b) => a.base.localeCompare(b.base));
await mkdir("src/utils/images", { recursive: true });
await writeFile(
  path.resolve("src/utils/images/image-manifests.generated.json"),
  `${JSON.stringify(sources)}\n`,
);
console.log(
  `网站图片已准备完成：${Object.keys(local.images).length} 张图片可按屏幕尺寸加载。`,
);
