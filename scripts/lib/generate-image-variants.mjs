import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTHS = [64, 128, 320, 640, 960, 1440, 1920];
// Bound the resized frame stack (~256 MiB RGBA), while decoding frames sequentially.
const MAX_ANIMATION_PIXELS = 64 * 1024 * 1024;
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");

export async function generateImageVariants({ root, exclude = [] }) {
  root = path.resolve(root);
  const output = path.join(root, "_optimized");
  const manifestPath = path.join(output, "manifest.json");
  await mkdir(output, { recursive: true });
  let previous = {};
  try {
    previous = JSON.parse(await readFile(manifestPath, "utf8")).images || {};
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  const files = [];
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      const relative = path.relative(root, filename).split(path.sep).join("/");
      if (relative === "_optimized" || exclude.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) continue;
      if (entry.isDirectory()) await scan(filename);
      else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push({ filename, relative });
    }
  }
  await scan(root);
  files.sort((a, b) => a.relative.localeCompare(b.relative, "en"));
  const images = {};
  const kept = new Set(["manifest.json"]);
  for (const { filename, relative } of files) {
    const input = await readFile(filename);
    // Read one page to inspect large animations without hitting the stacked pixel limit.
    const metadata = await sharp(input).metadata();
    const pages = metadata.pages || 1;
    const animated = pages > 1;
    const settings = animated ? `webp:78:4:mixed:${WIDTHS.join(",")}:${MAX_ANIMATION_PIXELS}:animation-v1` : `webp:78:6:${WIDTHS.join(",")}:v1`;
    const revision = createHash("sha256").update(input).update(settings).digest("hex").slice(0, 20);
    const key = encodePath(relative);
    const canKeepOriginal = animated || [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(filename).toLowerCase());
    const cached = previous[key];
    if (cached?.revision === revision && await Promise.all(cached.variants.map(async ({ src }) => {
      if (src === key) return true;
      if (!/^_optimized\/[a-f0-9]+-\d+\.webp$/u.test(src)) return false;
      try { return (await stat(path.join(root, src))).isFile(); } catch { return false; }
    })).then((results) => results.every(Boolean))) {
      const variants = [];
      for (const variant of cached.variants) {
        const keepOriginal = canKeepOriginal && variant.width === cached.width && (variant.src === key || (await stat(path.join(root, variant.src))).size >= input.length);
        variants.push(keepOriginal ? { ...variant, src: key } : variant);
        if (!keepOriginal) kept.add(path.basename(variant.src));
      }
      images[key] = { ...cached, variants };
      continue;
    }
    const rotated = !animated && [5, 6, 7, 8].includes(metadata.orientation);
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (!width || !height) throw new Error(`Missing image dimensions: ${relative}`);
    let maxWidth = width;
    if (animated) {
      maxWidth = Math.min(width, 1920, 16383, Math.floor(16383 * width / height), Math.floor(Math.sqrt(MAX_ANIMATION_PIXELS * width / (height * pages))));
      while (maxWidth > 0 && maxWidth * Math.max(1, Math.round(height * maxWidth / width)) * pages > MAX_ANIMATION_PIXELS) maxWidth -= 1;
      if (maxWidth < 1) {
        console.warn(`Animation exceeds the resized frame budget: ${relative}; using original.`);
        continue;
      }
    }
    const variants = [];
    for (const targetWidth of [...new Set(WIDTHS.map((size) => Math.min(size, maxWidth)))]) {
      const name = `${revision}-${targetWidth}.webp`;
      const pipeline = animated
        ? sharp(input, { animated: true, sequentialRead: true, limitInputPixels: width * height * pages })
        : sharp(input).rotate();
      const options = animated ? { quality: 78, effort: 4, mixed: true, loop: metadata.loop, delay: metadata.delay } : { quality: 78, effort: 6 };
      const { data, info } = await pipeline.resize({ width: targetWidth, withoutEnlargement: true }).webp(options).toBuffer({ resolveWithObject: true });
      const frameHeight = info.pageHeight || info.height;
      if (canKeepOriginal && info.width === width && data.length >= input.length) {
        variants.push({ src: key, width: info.width, height: frameHeight });
        continue;
      }
      if (animated && data.length >= input.length) continue;
      await writeFile(path.join(output, name), data);
      kept.add(name);
      variants.push({ src: `_optimized/${name}`, width: info.width, height: frameHeight });
    }
    if (animated && !variants.length) variants.push({ src: key, width, height });
    images[key] = { width, height, revision, variants };
  }
  const manifest = { version: 1, images };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  // Only remove files created by this generator, inside its exact output directory.
  for (const entry of await readdir(output, { withFileTypes: true })) {
    if (entry.isFile() && /^[a-f0-9]+-\d+\.webp$/u.test(entry.name) && !kept.has(entry.name)) {
      const target = path.resolve(output, entry.name);
      if (path.dirname(target) !== output) throw new Error("Unsafe generated image path");
      await unlink(target);
    }
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node scripts/lib/generate-image-variants.mjs <image-directory>");
  const manifest = await generateImageVariants({ root: process.argv[2] });
  console.log(`Generated variants for ${Object.keys(manifest.images).length} images.`);
}
