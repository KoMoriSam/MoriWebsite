import assert from "node:assert/strict";
import {
  localFontFamilySupportsWeight,
  localizeKnownFontFamily,
  parseLocalizedFontFamily,
  readLocalizedFontFamilyBlob,
  shouldAvoidLocalFontPreview,
  stripLocalFontStyleSuffix,
} from "../src/utils/font-name.js";
import {
  calculateOutputDimensions,
  detectImageFormat,
  estimateDecodedBytes,
  makeOutputName,
  makeUniqueName,
  patchWebPLoopCount,
  readImageDimensions,
  readWebPLoopCount,
} from "../src/utils/image-converter.js";
import {
  calculateWatermarkBaseSize,
  calculateWatermarkGraphicSize,
  drawImageWatermark,
} from "../src/utils/image-watermark.js";

const bytes = (...values) => Uint8Array.from(values);
const ascii = (text) => new TextEncoder().encode(text);
const utf16Be = (text) => {
  const result = new Uint8Array(text.length * 2);
  for (let index = 0; index < text.length; index += 1) {
    result[index * 2] = text.charCodeAt(index) >> 8;
    result[index * 2 + 1] = text.charCodeAt(index) & 0xff;
  }
  return result;
};

const englishFontName = utf16Be("Test Font");
const chineseFontName = utf16Be("测试字体");
const nameTable = new Uint8Array(30 + englishFontName.length + chineseFontName.length);
const nameView = new DataView(nameTable.buffer);
nameView.setUint16(2, 2);
nameView.setUint16(4, 30);
for (const [record, language, value, valueOffset] of [
  [0, 0x0409, englishFontName, 0],
  [1, 0x0804, chineseFontName, englishFontName.length],
]) {
  const offset = 6 + record * 12;
  nameView.setUint16(offset, 3);
  nameView.setUint16(offset + 2, 1);
  nameView.setUint16(offset + 4, language);
  nameView.setUint16(offset + 6, 1);
  nameView.setUint16(offset + 8, value.length);
  nameView.setUint16(offset + 10, valueOffset);
  nameTable.set(value, 30 + valueOffset);
}
assert.equal(parseLocalizedFontFamily(nameTable.buffer, ["zh-CN"]), "测试字体");
assert.equal(parseLocalizedFontFamily(nameTable.buffer, ["en-US"]), "Test Font");
const sfnt = new Uint8Array(28 + nameTable.length);
const sfntView = new DataView(sfnt.buffer);
sfnt.set(bytes(0, 1, 0, 0), 0);
sfntView.setUint16(4, 1);
sfnt.set(ascii("name"), 12);
sfntView.setUint32(20, 28);
sfntView.setUint32(24, nameTable.length);
sfnt.set(nameTable, 28);
assert.equal(
  await readLocalizedFontFamilyBlob(new Blob([sfnt]), ["zh-CN"]),
  "测试字体",
);
assert.equal(localizeKnownFontFamily("Microsoft YaHei UI"), "微软雅黑 UI");
assert.equal(localizeKnownFontFamily("  KaiTi  "), "楷体");
assert.equal(localizeKnownFontFamily("Noto Sans JP"), "Noto Sans JP");
assert.equal(localizeKnownFontFamily("Sarasa Gothic SC"), "更纱黑体 SC");
assert.equal(
  localizeKnownFontFamily("Sarasa Mono Slab SC"),
  "等距更纱黑体 Slab SC",
);
assert.equal(
  localizeKnownFontFamily("Sarasa Term SC"),
  "更纱黑体 Term SC",
);
assert.equal(
  shouldAvoidLocalFontPreview({ family: "Sarasa Gothic SC" }),
  true,
);
assert.equal(shouldAvoidLocalFontPreview({ family: "更纱黑体" }), true);
assert.equal(
  shouldAvoidLocalFontPreview({
    family: "Example CJK",
    fullName: "Example CJK Variable",
  }),
  true,
);
assert.equal(shouldAvoidLocalFontPreview({ family: "Arial" }), false);
assert.equal(
  stripLocalFontStyleSuffix("霞鹜文楷 GB Light", { style: "Light" }),
  "霞鹜文楷 GB",
);
assert.equal(
  stripLocalFontStyleSuffix("思源黑体 HW Bold", { style: "Bold" }),
  "思源黑体 HW",
);
assert.equal(
  stripLocalFontStyleSuffix("字体 Bold Italic", { style: "Bold Italic" }),
  "字体",
);
assert.equal(
  stripLocalFontStyleSuffix("Arial Black", { style: "Regular" }),
  "Arial Black",
);
assert.equal(
  localFontFamilySupportsWeight([
    { family: "Example", style: "Regular" },
    { family: "Example", style: "Bold" },
  ]),
  true,
);
assert.equal(
  localFontFamilySupportsWeight([
    { family: "Example", style: "Regular" },
  ]),
  false,
);
assert.equal(
  localFontFamilySupportsWeight([
    { family: "Example Variable", style: "Regular" },
  ]),
  true,
);

assert.equal(detectImageFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0)), "png");
assert.equal(detectImageFormat(bytes(0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0)), "jpeg");
assert.equal(detectImageFormat(ascii("GIF89a......")), "gif");
assert.equal(detectImageFormat(ascii("BM..........")), "bmp");
assert.equal(detectImageFormat(ascii("RIFF....WEBP")), "webp");
assert.equal(detectImageFormat(bytes(0, 0, 0, 24, ...ascii("ftyp"), ...ascii("avif"), 0, 0, 0, 0)), "avif");
assert.equal(detectImageFormat(ascii("not-an-image")), null);

const pngHeader = new Uint8Array(24);
pngHeader.set(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
new DataView(pngHeader.buffer).setUint32(16, 640);
new DataView(pngHeader.buffer).setUint32(20, 360);
assert.deepEqual(readImageDimensions(pngHeader, "png"), { width: 640, height: 360 });

const webpHeader = new Uint8Array(30);
webpHeader.set(ascii("RIFF"), 0);
webpHeader.set(ascii("WEBPVP8X"), 8);
webpHeader[16] = 10;
webpHeader[24] = 0xff;
webpHeader[27] = 0x7f;
assert.deepEqual(readImageDimensions(webpHeader, "webp"), { width: 256, height: 128 });

assert.deepEqual(calculateOutputDimensions(4000, 2000, { enabled: true, mode: "width", width: 1000 }), { width: 1000, height: 500 });
assert.deepEqual(calculateOutputDimensions(400, 200, { enabled: true, mode: "width", width: 1000, preventUpscale: true }), { width: 400, height: 200 });
assert.deepEqual(calculateOutputDimensions(4000, 2000, { enabled: true, mode: "contain", width: 500, height: 500 }), { width: 500, height: 250 });
assert.equal(estimateDecodedBytes(100, 50, 3), 60000);
assert.equal(makeOutputName("a/bad:name.PNG", "jpeg"), "a-bad-name.jpg");

assert.equal(calculateWatermarkBaseSize({ width: 1000 }, 0.05), 50);
assert.deepEqual(
  calculateWatermarkGraphicSize({ width: 1000 }, 0.05, 200, 200),
  { width: 50, height: 50 },
);
assert.deepEqual(
  calculateWatermarkGraphicSize({ width: 1000 }, 0.05, 100, 200),
  { width: 25, height: 50 },
);
assert.deepEqual(
  calculateWatermarkGraphicSize({ width: 1000 }, 0.05, 400, 100),
  { width: 150, height: 37.5 },
);
const shadowContext = {
  globalAlpha: 1,
  shadowColor: "transparent",
  shadowBlur: 0,
  shadowOffsetX: 1,
  shadowOffsetY: 1,
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  drawImage() {},
};
drawImageWatermark(
  shadowContext,
  { width: 1000, height: 500 },
  {
    enabled: true,
    kind: "image",
    opacity: 1,
    scale: 0.05,
    shadow: true,
    mode: "single",
    position: "bottom-right",
  },
  { width: 100, height: 100 },
);
assert.equal(shadowContext.shadowColor, "rgba(0,0,0,.45)");
assert.equal(shadowContext.shadowBlur, 4);
assert.equal(shadowContext.shadowOffsetX, 0);
assert.equal(shadowContext.shadowOffsetY, 0);

const names = new Set();
assert.equal(makeUniqueName("photo.webp", names), "photo.webp");
assert.equal(makeUniqueName("photo.webp", names), "photo-2.webp");

const webp = new Uint8Array(26);
webp.set(ascii("RIFF"), 0);
webp.set(ascii("WEBP"), 8);
webp.set(ascii("ANIM"), 12);
webp[16] = 6;
const patched = patchWebPLoopCount(webp, 7);
assert.equal(readWebPLoopCount(patched), 7);

const { BlobReader, BlobWriter, ZipWriter } = await import("@zip.js/zip.js");
const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
await zipWriter.add("sample.txt", new BlobReader(new Blob(["ok"])), { level: 0 });
const zipBytes = new Uint8Array(await (await zipWriter.close()).arrayBuffer());
assert.deepEqual([...zipBytes.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);

console.log("image-converter checks passed");
