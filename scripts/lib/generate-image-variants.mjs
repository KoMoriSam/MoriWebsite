import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildCache, digest } from "./build-cache.mjs";

const WIDTHS = [64, 128, 320, 640, 960, 1440, 1920];
// Bound the resized frame stack (~256 MiB RGBA), while decoding frames sequentially.
const MAX_ANIMATION_PIXELS = 64 * 1024 * 1024;
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const encodePath = (value) =>
  value.split("/").map(encodeURIComponent).join("/");

export async function generateImageVariants({ root, exclude = [] }) {
  root = path.resolve(root);
  const output = path.join(root, "_optimized");
  const manifestPath = path.join(output, "manifest.json");
  await mkdir(output, { recursive: true });
  const cached = await buildCache(
    process.env.SSG_IMAGE_CACHE || ".tmp/site-image-cache",
  );
  const started = performance.now();
  const stats = {
    hits: 0,
    misses: 0,
    metadataReads: 0,
    encoded: 0,
    reused: 0,
    generatedFiles: 0,
    reusedFiles: 0,
    removed: 0,
  };
  let encodingMs = 0;
  const files = [];
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      const relative = path.relative(root, filename).split(path.sep).join("/");
      if (
        relative === "_optimized" ||
        exclude.some(
          (prefix) => relative === prefix || relative.startsWith(`${prefix}/`),
        )
      )
        continue;
      if (entry.isDirectory()) await scan(filename);
      else if (
        entry.isFile() &&
        EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      )
        files.push({ filename, relative });
    }
  }
  await scan(root);
  const scanMs = Math.round(performance.now() - started);
  files.sort((a, b) => a.relative.localeCompare(b.relative, "en"));
  const images = {};
  const kept = new Set(["manifest.json"]);
  for (const { filename, relative } of files) {
    const input = await readFile(filename);
    const sourceHash = digest(input);
    const { value: metadata } = await cached(
      ["sharp-single-page-metadata-v1", sharp.versions, sourceHash],
      async () => {
        stats.metadataReads++;
        const { width, height, pages, orientation, loop, delay } =
          await sharp(input).metadata();
        return { width, height, pages, orientation, loop, delay };
      },
    );
    const pages = metadata.pages || 1;
    const animated = pages > 1;
    const settings = animated
      ? `webp:78:4:mixed:${WIDTHS.join(",")}:${MAX_ANIMATION_PIXELS}:animation-v1`
      : `webp:78:6:${WIDTHS.join(",")}:v1`;
    const revision = createHash("sha256")
      .update(input)
      .update(settings)
      .digest("hex")
      .slice(0, 20);
    const key = encodePath(relative);
    const canKeepOriginal =
      animated ||
      [".jpg", ".jpeg", ".png", ".webp"].includes(
        path.extname(filename).toLowerCase(),
      );
    const rotated = !animated && [5, 6, 7, 8].includes(metadata.orientation);
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (!width || !height)
      throw new Error(`Missing image dimensions: ${relative}`);
    let maxWidth = width;
    if (animated) {
      maxWidth = Math.min(
        width,
        1920,
        16383,
        Math.floor((16383 * width) / height),
        Math.floor(
          Math.sqrt((MAX_ANIMATION_PIXELS * width) / (height * pages)),
        ),
      );
      while (
        maxWidth > 0 &&
        maxWidth *
          Math.max(1, Math.round((height * maxWidth) / width)) *
          pages >
          MAX_ANIMATION_PIXELS
      )
        maxWidth -= 1;
      if (maxWidth < 1) {
        console.warn(`动图将保留原始尺寸：${relative} 的帧数较多。`);
        stats.hits++;
        continue;
      }
    }
    const variants = [];
    let encoded = false;
    for (const targetWidth of [
      ...new Set(WIDTHS.map((size) => Math.min(size, maxWidth))),
    ]) {
      const name = `${revision}-${targetWidth}.webp`;
      const options = animated
        ? {
            quality: 78,
            effort: 4,
            mixed: true,
            loop: metadata.loop,
            delay: metadata.delay,
          }
        : { quality: 78, effort: 6 };
      // Bump the pipeline version for changes to colour, orientation or resize semantics.
      const { value, hit } = await cached(
        [
          "sharp-resize-webp-v1",
          sharp.versions,
          sourceHash,
          animated ? "animated" : "exif-rotate",
          targetWidth,
          options,
        ],
        async () => {
          const encodeStarted = performance.now();
          const pipeline = animated
            ? sharp(input, {
                animated: true,
                sequentialRead: true,
                limitInputPixels: width * height * pages,
              })
            : sharp(input).rotate();
          const { data, info } = await pipeline
            .resize({ width: targetWidth, withoutEnlargement: true })
            .webp(options)
            .toBuffer({ resolveWithObject: true });
          encodingMs += performance.now() - encodeStarted;
          return { bytes: data.toString("base64"), info };
        },
      );
      if (hit) stats.reused++;
      else {
        stats.encoded++;
        encoded = true;
      }
      const { info } = value;
      const data = Buffer.from(value.bytes, "base64");
      const frameHeight = info.pageHeight || info.height;
      if (
        canKeepOriginal &&
        info.width === width &&
        data.length >= input.length
      ) {
        variants.push({ src: key, width: info.width, height: frameHeight });
        continue;
      }
      if (animated && data.length >= input.length) continue;
      stats[hit ? "reusedFiles" : "generatedFiles"]++;
      const destination = path.join(output, name);
      const existing = await readFile(destination).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!existing?.equals(data)) await writeFile(destination, data);
      kept.add(name);
      variants.push({
        src: `_optimized/${name}`,
        width: info.width,
        height: frameHeight,
      });
    }
    stats[encoded ? "misses" : "hits"]++;
    if (animated && !variants.length)
      variants.push({ src: key, width, height });
    images[key] = { width, height, revision, variants };
  }
  const manifest = { version: 1, images };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  // Only remove files created by this generator, inside its exact output directory.
  for (const entry of await readdir(output, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      /^[a-f0-9]+-\d+\.webp$/u.test(entry.name) &&
      !kept.has(entry.name)
    ) {
      const target = path.resolve(output, entry.name);
      if (path.dirname(target) !== output)
        throw new Error("Unsafe generated image path");
      await unlink(target);
      stats.removed++;
    }
  }
  console.log(
    JSON.stringify({
      phase: "images",
      root,
      originals: files.length,
      ...stats,
      processed: stats.misses,
      scanMs,
      encodingMs: Math.round(encodingMs),
      durationMs: Math.round(performance.now() - started),
      hitRate: files.length ? stats.hits / files.length : 0,
    }),
  );
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!process.argv[2])
    throw new Error(
      "请提供图片文件夹。用法：node scripts/lib/generate-image-variants.mjs <图片目录>",
    );
  const manifest = await generateImageVariants({ root: process.argv[2] });
  console.log(
    `图片已准备完成：${Object.keys(manifest.images).length} 张图片可按屏幕尺寸加载。`,
  );
}
