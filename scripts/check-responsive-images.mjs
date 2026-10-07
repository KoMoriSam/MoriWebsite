import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { generateImageVariants } from "./lib/generate-image-variants.mjs";
import { getImageAttrs, getImageUrl, loadImageManifest, registerImageManifest, restoreOriginalImage } from "../src/utils/images/responsive-images.js";
import { parseHtmlFragment, renderHtmlFragment } from "../src/utils/markdown/render-html-vnodes.js";
import { createArticleAssetResolver } from "../src/utils/resolve-article-assets.js";

const tempRoot = path.resolve(".tmp");
sharp.cache(false);
await mkdir(tempRoot, { recursive: true });
const fixture = await mkdtemp(path.join(tempRoot, "responsive-images-"));
try {
  const source = await sharp({ create: { width: 1000, height: 600, channels: 4, background: "#abcdef80" } }).png().toBuffer();
  await writeFile(path.join(fixture, "中文 图.png"), source);
  await sharp({ create: { width: 40, height: 20, channels: 3, background: "#abcdef" } }).jpeg().toFile(path.join(fixture, "small.jpg"));
  await sharp({ create: { width: 80, height: 40, channels: 3, background: "#abcdef" } }).jpeg().withMetadata({ orientation: 6 }).toFile(path.join(fixture, "rotated.jpg"));
  const animation = await readFile("public/assets/images/animates/idle.gif");
  assert.ok((await sharp(animation, { animated: true }).metadata()).pages > 1);
  await writeFile(path.join(fixture, "animation.gif"), animation);
  const frameWidth = 96;
  const frameHeight = 64;
  const pixels = Buffer.alloc(frameWidth * frameHeight * 3 * 4);
  for (let frame = 0; frame < 3; frame += 1) {
    for (let y = 8; y < frameHeight - 8; y += 1) {
      for (let x = 8; x < frameWidth - 8; x += 1) {
        const offset = ((frame * frameHeight + y) * frameWidth + x) * 4;
        pixels[offset] = (x * 7 + frame * 80) % 256;
        pixels[offset + 1] = (y * 11 + frame * 50) % 256;
        pixels[offset + 2] = (x * y + frame * 120) % 256;
        pixels[offset + 3] = 255;
      }
    }
  }
  const timedAnimation = await sharp(pixels, { raw: { width: frameWidth, height: frameHeight * 3, channels: 4, pageHeight: frameHeight } }).gif({ loop: 3, delay: [40, 90, 150], keepDuplicateFrames: true }).toBuffer();
  await writeFile(path.join(fixture, "timed-animation.gif"), timedAnimation);
  await sharp(timedAnimation, { animated: true }).webp({ lossless: true }).toFile(path.join(fixture, "timed-animation.webp"));
  const animationMetadata = await sharp(animation).metadata();
  const headerLength = 13 + ((animation[10] & 0x80) ? 3 * 2 ** ((animation[10] & 7) + 1) : 0);
  const repetitions = Math.ceil(300_000_000 / (animationMetadata.width * animationMetadata.height * animationMetadata.pages));
  const largeAnimation = Buffer.concat([
    animation.subarray(0, headerLength),
    ...Array.from({ length: repetitions }, () => animation.subarray(headerLength, -1)),
    Buffer.from([0x3b]),
  ]);
  await assert.rejects(sharp(largeAnimation, { animated: true }).metadata(), /pixel limit/u);
  await writeFile(path.join(fixture, "large-animation.gif"), largeAnimation);
  await writeFile(path.join(fixture, "vector.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');

  const manifest = await generateImageVariants({ root: fixture });
  assert.equal(Object.keys(manifest.images).length, 7);
  const entry = manifest.images["%E4%B8%AD%E6%96%87%20%E5%9B%BE.png"];
  assert.deepEqual(entry.variants.map(({ width }) => width), [64, 128, 320, 640, 960, 1000]);
  assert.deepEqual(manifest.images["small.jpg"].variants.map(({ width }) => width), [40]);
  assert.equal(manifest.images["rotated.jpg"].width, 40);
  assert.equal(manifest.images["rotated.jpg"].height, 80);
  for (const variant of entry.variants) {
    const metadata = await sharp(path.join(fixture, variant.src)).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
    assert.ok(metadata.hasAlpha);
  }
  for (const key of ["animation.gif", "timed-animation.gif", "timed-animation.webp", "large-animation.gif"]) {
    const originalMetadata = await sharp(path.join(fixture, key)).metadata();
    const animatedEntry = manifest.images[key];
    assert.equal(animatedEntry.width, originalMetadata.width);
    assert.equal(animatedEntry.height, originalMetadata.height);
    assert.ok(animatedEntry.variants.some(({ src }) => src.startsWith("_optimized/")), `${key} has compressed animation variants`);
    for (const variant of animatedEntry.variants) {
      const result = await sharp(path.join(fixture, variant.src)).metadata();
      assert.ok(result.pages > 1);
      assert.equal(result.loop, originalMetadata.loop);
      assert.equal(result.delay.reduce((sum, delay) => sum + delay, 0), originalMetadata.delay.reduce((sum, delay) => sum + delay, 0));
      assert.equal(result.width, variant.width);
      assert.equal(result.height, variant.height);
      assert.ok(variant.width <= originalMetadata.width);
      if (variant.src.startsWith("_optimized/")) {
        assert.ok(variant.width * variant.height * originalMetadata.pages <= 64 * 1024 * 1024);
        assert.ok((await stat(path.join(fixture, variant.src))).size < (await stat(path.join(fixture, key))).size);
      }
      if (key.startsWith("timed-")) {
        assert.equal(result.pages, 3);
        assert.deepEqual(result.delay, [40, 90, 150]);
        assert.ok(result.hasAlpha);
        const { data, info } = await sharp(path.join(fixture, variant.src), { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const stride = info.width * info.height / result.pages * info.channels;
        for (let frame = 0; frame < result.pages; frame += 1) assert.equal(data[frame * stride + 3], 0);
        assert.notDeepEqual(data.subarray(0, stride), data.subarray(stride, stride * 2));
      }
    }
  }
  assert.deepEqual(await readFile(path.join(fixture, "中文 图.png")), source);
  assert.deepEqual(await readFile(path.join(fixture, "animation.gif")), animation);
  assert.deepEqual(await readFile(path.join(fixture, "large-animation.gif")), largeAnimation);
  const variantFile = path.join(fixture, entry.variants[0].src);
  const before = (await stat(variantFile)).mtimeMs;
  assert.deepEqual(await generateImageVariants({ root: fixture }), manifest);
  assert.equal((await stat(variantFile)).mtimeMs, before);
  await writeFile(path.join(fixture, "_optimized", "deadbeef-64.webp"), "obsolete");
  await writeFile(path.join(fixture, "_optimized", "keep.txt"), "unrelated");
  await generateImageVariants({ root: fixture });
  const outputs = await readdir(path.join(fixture, "_optimized"));
  assert.ok(!outputs.includes("deadbeef-64.webp"));
  assert.ok(outputs.includes("keep.txt"));

  const base = "https://pages.example/repository/images/";
  registerImageManifest(manifest, base);
  const original = `${base}%E4%B8%AD%E6%96%87%20%E5%9B%BE.png`;
  const attrs = getImageAttrs(original, "320px");
  assert.equal(attrs["data-original-src"], original);
  assert.equal(attrs.sizes, "320px");
  assert.match(attrs.srcset, / 64w, .* 128w, .* 320w, .* 640w, .* 960w, .* 1000w$/u);
  assert.equal(getImageAttrs(attrs.src)["data-original-src"], original);
  assert.deepEqual(getImageAttrs("https://unmanaged.example/image.png"), { src: "https://unmanaged.example/image.png" });
  assert.equal(getImageUrl(original, 1920), `${base}${entry.variants.at(-1).src}`);
  const html = await renderToString(createSSRApp({ render: () => h("div", null, renderHtmlFragment(parseHtmlFragment(`<figure><img src="${original}" alt="测试"><figcaption>说明</figcaption></figure>`))) }));
  assert.match(html, /srcset=/u);
  assert.match(html, /loading="lazy"/u);
  assert.match(html, /width="1000" height="600"/u);
  assert.match(html, /data-original-src=/u);
  const spoofed = await renderToString(createSSRApp({ render: () => h("div", null, renderHtmlFragment(parseHtmlFragment('<img src="/unknown.png" data-original-src="https://evil.example/image.png">'))) }));
  assert.doesNotMatch(spoofed, /evil\.example/u);
  const fakeImage = { src: attrs.src, getAttribute(name) { return name === "src" ? this.src : attrs[name]; }, removed: [], removeAttribute(name) { this.removed.push(name); } };
  let stopped = 0;
  restoreOriginalImage({ currentTarget: fakeImage, stopImmediatePropagation() { stopped += 1; } });
  assert.equal(fakeImage.src, original);
  assert.deepEqual(fakeImage.removed, ["srcset", "sizes"]);
  assert.equal(stopped, 1);
  restoreOriginalImage({ currentTarget: fakeImage });
  assert.equal(fakeImage.removed.length, 2);

  registerImageManifest({ version: 1, images: { "unsafe.png": { width: 100, height: 100, variants: [{ src: "javascript:alert(1)", width: 100 }, { src: "../outside.webp", width: 100 }, { src: "https://evil.example/x.webp", width: 100 }] } } }, "https://safe.example/images/");
  assert.deepEqual(getImageAttrs("https://safe.example/images/unsafe.png"), { src: "https://safe.example/images/unsafe.png" });
  registerImageManifest({ version: 1, images: {} }, base);
  assert.deepEqual(getImageAttrs(original), { src: original });

  const { normalizeMarkdown } = createArticleAssetResolver("https://pages.example/novel");
  assert.equal(normalizeMarkdown('<img src="images/emotes/tea.webp" alt="tea">'), '<img src="https://pages.example/novel/images/emotes/tea.webp" alt="tea">');
  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => { fetches += 1; return { ok: false, status: 404 }; };
  try {
    await Promise.all([loadImageManifest("https://missing.example"), loadImageManifest("https://missing.example")]);
    assert.equal(fetches, 1);
    await loadImageManifest("https://missing.example");
    assert.equal(fetches, 2);
  } finally { globalThis.fetch = originalFetch; }
  console.log("Responsive image checks passed: sizing, orientation, animated GIF/WebP timing, loop, alpha, large-frame budgets, cache, cleanup, SSR, original fallback and manifest safety.");
} finally {
  if (path.dirname(fixture) !== tempRoot || !path.basename(fixture).startsWith("responsive-images-")) throw new Error("Unsafe fixture cleanup path");
  await rm(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
