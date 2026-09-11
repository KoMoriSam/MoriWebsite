import {
  IMAGE_FORMATS,
  calculateOutputDimensions,
  detectImageFormat,
  isAnimatedWebP,
  makeOutputName,
  patchWebPLoopCount,
  readGifLoopCount,
  readWebPLoopCount,
  validateEncodedImage,
} from "@/utils/image-converter";
import { drawImageWatermark } from "@/utils/image-watermark";

const cancelledJobs = new Set();

self.addEventListener("message", async ({ data }) => {
  if (data?.type === "cancel") {
    cancelledJobs.add(data.jobId);
    return;
  }
  if (!["convert", "preview"].includes(data?.type)) return;

  const { jobId } = data;
  try {
    if (data.type === "preview") {
      const source = await decodeSource(data.buffer, data.sourceFormat);
      assertNotCancelled(jobId);
      const decodedBytes =
        source.width * source.height * 4 * source.frames.length;
      if (decodedBytes > data.memoryLimit) {
        throw new Error(
          `预计解码占用 ${formatMiB(decodedBytes)}，超过当前设备 ${formatMiB(data.memoryLimit)} 的安全上限`,
        );
      }
      const previewFrames = await createPreviewFrames(
        source.frames,
        source.width,
        source.height,
        jobId,
      );
      emit(
        jobId,
        "previewResult",
        { previewFrames },
        previewFrames.map((item) => item.buffer),
      );
      return;
    }

    emit(jobId, "progress", { value: 4, stage: "正在解码" });
    const source = await decodeSource(data.buffer, data.sourceFormat);
    assertNotCancelled(jobId);

    const decodedBytes = source.width * source.height * 4 * source.frames.length;
    if (decodedBytes > data.memoryLimit) {
      throw new Error(`预计解码占用 ${formatMiB(decodedBytes)}，超过当前设备 ${formatMiB(data.memoryLimit)} 的安全上限`);
    }

    emit(jobId, "metadata", {
      width: source.width,
      height: source.height,
      frames: source.frames.length,
      animated: source.frames.length > 1,
      loopCount: source.loopCount,
    });

    const outputSize = calculateOutputDimensions(source.width, source.height, data.settings.resize);
    const watermarkBitmap = await decodeWatermark(data.watermark);
    const transformed = [];
    for (let index = 0; index < source.frames.length; index += 1) {
      assertNotCancelled(jobId);
      transformed.push(
        transformFrame(source.frames[index], source.width, source.height, outputSize, data.settings, data.watermark, watermarkBitmap),
      );
      emit(jobId, "progress", {
        value: 12 + Math.round(((index + 1) / source.frames.length) * 43),
        stage: `正在处理 ${index + 1}/${source.frames.length} 帧`,
      });
      await yieldToEventLoop();
    }
    watermarkBitmap?.close?.();

    assertNotCancelled(jobId);
    emit(jobId, "progress", { value: 60, stage: "正在编码" });
    const outputs = await encodeOutputs({
      frames: transformed,
      width: outputSize.width,
      height: outputSize.height,
      loopCount: source.loopCount,
      sourceFormat: data.sourceFormat,
      sourceName: data.name,
      settings: data.settings,
      jobId,
    });
    assertNotCancelled(jobId);

    const previewFrames = source.frames.length > 1
      ? await createPreviewFrames(transformed, outputSize.width, outputSize.height, jobId)
      : [];

    const transfer = [...outputs, ...previewFrames].map((item) => item.buffer);
    emit(jobId, "result", {
      outputs,
      previewFrames,
      width: outputSize.width,
      height: outputSize.height,
      frameCount: source.frames.length,
      warnings: buildWarnings(source, data.settings, data.sourceAnimatedHint),
    }, transfer);
  } catch (error) {
    if (error?.name === "AbortError") emit(jobId, "cancelled");
    else emit(jobId, "error", { message: error instanceof Error ? error.message : String(error) });
  } finally {
    cancelledJobs.delete(jobId);
  }
});

async function decodeSource(buffer, declaredFormat) {
  const bytes = new Uint8Array(buffer);
  const format = detectImageFormat(bytes);
  if (!format || format !== declaredFormat) throw new Error("文件签名与识别格式不一致");

  if (format === "gif") return decodeGif(buffer, bytes);
  if (format === "webp" && isAnimatedWebP(bytes)) return decodeAnimatedWebP(bytes);
  if (format === "bmp") {
    try { return decodeBmp(bytes); } catch { /* 尝试浏览器解码。 */ }
  }
  return decodeStatic(buffer, format);
}

async function decodeStatic(buffer, format) {
  try {
    const bitmap = await createImageBitmap(new Blob([buffer], { type: IMAGE_FORMATS[format].mime }), {
      imageOrientation: "from-image",
      premultiplyAlpha: "none",
      colorSpaceConversion: "default",
    });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return {
      width: canvas.width,
      height: canvas.height,
      frames: [{ data: context.getImageData(0, 0, canvas.width, canvas.height).data, duration: 0 }],
      loopCount: 0,
    };
  } catch (nativeError) {
    if (format === "avif") {
      const { default: decode } = await import("@jsquash/avif/decode");
      const image = await decode(buffer);
      if (image) return { width: image.width, height: image.height, frames: [{ data: image.data, duration: 0 }], loopCount: 0 };
    }
    if (format === "webp") {
      const { decodeWebP } = await import("@/utils/webp-codec");
      const image = await decodeWebP(new Uint8Array(buffer));
      if (image) return { width: image.width, height: image.height, frames: [{ data: image.data, duration: 0 }], loopCount: 0 };
    }
    throw new Error(`浏览器无法解码该 ${IMAGE_FORMATS[format].label} 文件：${nativeError instanceof Error ? nativeError.message : "未知错误"}`);
  }
}

async function decodeAnimatedWebP(bytes) {
  const { decodeAnimatedWebP: decodeAnimation } = await import("@/utils/webp-codec");
  const decoded = await decodeAnimation(bytes);
  if (!decoded?.length) throw new Error("无法解码动画 WebP");
  const width = decoded[0].width;
  const height = decoded[0].height;
  return {
    width,
    height,
    frames: decoded.map((frame) => ({ data: new Uint8ClampedArray(frame.data), duration: Math.max(10, frame.duration || 100) })),
    loopCount: readWebPLoopCount(bytes),
  };
}

async function decodeGif(buffer, bytes) {
  const { parseGIF, decompressFrames } = await import("gifuct-js");
  const parsed = parseGIF(buffer);
  const decoded = decompressFrames(parsed, true);
  if (!decoded.length) throw new Error("GIF 中没有可用帧");
  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const composed = new Uint8ClampedArray(width * height * 4);
  const frames = [];

  for (const frame of decoded) {
    const before = frame.disposalType === 3 ? new Uint8ClampedArray(composed) : null;
    drawPatch(composed, width, height, frame.patch, frame.dims);
    frames.push({ data: new Uint8ClampedArray(composed), duration: Math.max(10, frame.delay || 100) });
    if (frame.disposalType === 2) clearRect(composed, width, height, frame.dims);
    else if (frame.disposalType === 3 && before) composed.set(before);
  }
  return { width, height, frames, loopCount: readGifLoopCount(bytes) };
}

function decodeBmp(bytes) {
  return import("@nktkas/bmp").then(({ decode }) => {
    const raw = decode(bytes);
    const rgba = new Uint8ClampedArray(raw.width * raw.height * 4);
    for (let source = 0, target = 0; target < rgba.length; source += raw.channels, target += 4) {
      if (raw.channels === 1) rgba[target] = rgba[target + 1] = rgba[target + 2] = raw.data[source];
      else {
        rgba[target] = raw.data[source];
        rgba[target + 1] = raw.data[source + 1];
        rgba[target + 2] = raw.data[source + 2];
      }
      rgba[target + 3] = raw.channels === 4 ? raw.data[source + 3] : 255;
    }
    return { width: raw.width, height: raw.height, frames: [{ data: rgba, duration: 0 }], loopCount: 0 };
  });
}

function transformFrame(frame, sourceWidth, sourceHeight, size, settings, watermark, watermarkBitmap) {
  const source = new OffscreenCanvas(sourceWidth, sourceHeight);
  const sourceContext = source.getContext("2d");
  sourceContext.putImageData(new ImageData(new Uint8ClampedArray(frame.data), sourceWidth, sourceHeight), 0, 0);

  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!IMAGE_FORMATS[settings.format].alpha) {
    context.fillStyle = settings.backgroundColor || "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, size.width, size.height);
  drawImageWatermark(context, size, watermark, watermarkBitmap);
  return { data: context.getImageData(0, 0, size.width, size.height).data, duration: frame.duration };
}

async function decodeWatermark(watermark) {
  if (watermark?.enabled && watermark.buffer) {
    return createImageBitmap(new Blob([watermark.buffer], { type: watermark.mime || "image/png" }));
  }
  return null;
}

async function encodeOutputs({ frames, width, height, loopCount, sourceFormat, sourceName, settings, jobId }) {
  const staticTarget = !["gif", "webp"].includes(settings.format);
  const exportFrames = frames.length > 1 && staticTarget && settings.animationMode === "frames";
  if (exportFrames) {
    const base = makeOutputName(sourceName, settings.format).replace(/\.[^.]+$/, "");
    const outputs = [];
    for (let index = 0; index < frames.length; index += 1) {
      assertNotCancelled(jobId);
      const buffer = await encodeStatic(frames[index], width, height, settings);
      outputs.push({
        name: `${base}/frame-${String(index + 1).padStart(4, "0")}.${IMAGE_FORMATS[settings.format].extension}`,
        type: IMAGE_FORMATS[settings.format].mime,
        buffer,
      });
      emit(jobId, "progress", { value: 60 + Math.round(((index + 1) / frames.length) * 35), stage: `正在编码 ${index + 1}/${frames.length} 帧` });
    }
    const manifest = JSON.stringify({ sourceFormat, width, height, loopCount, frames: frames.map((frame, index) => ({ file: `frame-${String(index + 1).padStart(4, "0")}.${IMAGE_FORMATS[settings.format].extension}`, duration: frame.duration })) }, null, 2);
    outputs.push({ name: `${base}/manifest.json`, type: "application/json", buffer: new TextEncoder().encode(manifest).buffer });
    return outputs;
  }

  let buffer;
  if (settings.format === "gif") buffer = await encodeGif(frames, width, height, loopCount, settings);
  else if (settings.format === "webp") buffer = await encodeWebP(frames, width, height, loopCount, settings);
  else buffer = await encodeStatic(frames[0], width, height, settings);
  if (!validateEncodedImage(buffer, settings.format)) throw new Error(`${IMAGE_FORMATS[settings.format].label} 编码器返回了错误的文件签名`);
  return [{ name: makeOutputName(sourceName, settings.format), type: IMAGE_FORMATS[settings.format].mime, buffer }];
}

async function encodeStatic(frame, width, height, settings) {
  const imageData = new ImageData(new Uint8ClampedArray(frame.data), width, height);
  if (settings.format === "avif") {
    const { default: encode } = await import("@jsquash/avif/encode");
    return encode(imageData, { quality: settings.quality, qualityAlpha: settings.quality, speed: settings.avifSpeed, subsample: 1, tune: 0, lossless: settings.lossless });
  }
  if (settings.format === "bmp") {
    const { encode } = await import("@nktkas/bmp");
    const rgb = new Uint8Array(width * height * 3);
    for (let source = 0, target = 0; source < frame.data.length; source += 4, target += 3) {
      rgb[target] = frame.data[source]; rgb[target + 1] = frame.data[source + 1]; rgb[target + 2] = frame.data[source + 2];
    }
    const bytes = encode({ width, height, channels: 3, data: rgb }, { bitsPerPixel: 24, compression: 0 });
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d").putImageData(imageData, 0, 0);
  if (settings.format === "png") {
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const raw = await blob.arrayBuffer();
    if (!settings.pngOptimize) return raw;
    const { optimise } = await import("@jsquash/oxipng");
    return optimise(raw, { level: settings.pngLevel, interlace: false, optimiseAlpha: true });
  }
  if (settings.format === "jpeg") {
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: settings.quality / 100 });
    const raw = await blob.arrayBuffer();
    if (blob.type === "image/jpeg" && validateEncodedImage(raw, "jpeg")) return raw;
    const { default: encode } = await import("@jsquash/jpeg/encode");
    return encode(imageData, { quality: settings.quality });
  }
  throw new Error("不支持的静态输出格式");
}

async function encodeWebP(frames, width, height, loopCount, settings) {
  const { encodeWebP: encode, encodeAnimatedWebP: encodeAnimation } = await import("@/utils/webp-codec");
  const config = { lossless: settings.lossless ? 1 : 0, quality: settings.quality };
  let bytes;
  if (frames.length > 1) {
    bytes = await encodeAnimation(width, height, frames.map((frame) => ({ data: new Uint8Array(frame.data), duration: frame.duration, config })));
    if (bytes) bytes = patchWebPLoopCount(bytes, loopCount);
  } else bytes = await encode(new Uint8Array(frames[0].data), width, height, config);
  if (!bytes) throw new Error("WebP 编码失败");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function encodeGif(frames, width, height, loopCount, settings) {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const gif = GIFEncoder();
  for (let index = 0; index < frames.length; index += 1) {
    const rgba = new Uint8Array(frames[index].data);
    const palette = quantize(rgba, settings.gifColors, { format: "rgba4444", oneBitAlpha: settings.gifAlphaThreshold });
    const indexed = applyPalette(rgba, palette, "rgba4444");
    const transparentIndex = palette.findIndex((color) => (color[3] ?? 255) < settings.gifAlphaThreshold);
    gif.writeFrame(indexed, width, height, { palette, delay: frames[index].duration || 100, repeat: loopCount, transparent: transparentIndex >= 0, transparentIndex, dispose: transparentIndex >= 0 ? 2 : 1 });
  }
  gif.finish();
  const bytes = gif.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function createPreviewFrames(frames, width, height, jobId) {
  const preview = new OffscreenCanvas(width, height);
  const previewContext = preview.getContext("2d");
  const result = [];
  for (let index = 0; index < frames.length; index += 1) {
    assertNotCancelled(jobId);
    previewContext.putImageData(
      new ImageData(new Uint8ClampedArray(frames[index].data), width, height),
      0,
      0,
    );
    const blob = await preview.convertToBlob({ type: "image/png" });
    result.push({ buffer: await blob.arrayBuffer(), type: "image/png", duration: frames[index].duration || 100 });
  }
  return result;
}

function drawPatch(target, width, height, patch, dims) {
  for (let y = 0; y < dims.height; y += 1) {
    for (let x = 0; x < dims.width; x += 1) {
      const source = (y * dims.width + x) * 4;
      if (patch[source + 3] === 0) continue;
      const targetX = dims.left + x;
      const targetY = dims.top + y;
      if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) continue;
      const destination = (targetY * width + targetX) * 4;
      target[destination] = patch[source]; target[destination + 1] = patch[source + 1]; target[destination + 2] = patch[source + 2]; target[destination + 3] = patch[source + 3];
    }
  }
}

function clearRect(target, width, height, dims) {
  for (let y = Math.max(0, dims.top); y < Math.min(height, dims.top + dims.height); y += 1) {
    for (let x = Math.max(0, dims.left); x < Math.min(width, dims.left + dims.width); x += 1) {
      const offset = (y * width + x) * 4;
      target[offset] = target[offset + 1] = target[offset + 2] = target[offset + 3] = 0;
    }
  }
}

function buildWarnings(source, settings, sourceAnimatedHint = false) {
  const warnings = [];
  if (source.frames.length > 1 && !["gif", "webp"].includes(settings.format) && settings.animationMode === "first") warnings.push("动画来源仅输出第一帧");
  if (settings.format === "avif" && source.frames.length > 1) warnings.push(settings.animationMode === "frames" ? "AVIF 不支持动画，已逐帧输出" : "AVIF 不支持动画，已输出第一帧");
  if (sourceAnimatedHint && source.frames.length === 1) warnings.push("动画 AVIF 当前仅处理第一帧");
  return warnings;
}

function assertNotCancelled(jobId) {
  if (cancelledJobs.has(jobId)) throw new DOMException("已取消", "AbortError");
}

function emit(jobId, type, payload = {}, transfer = []) {
  self.postMessage({ jobId, type, ...payload }, transfer);
}

function yieldToEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function formatMiB(bytes) {
  return `${Math.ceil(bytes / 1024 / 1024)} MiB`;
}
