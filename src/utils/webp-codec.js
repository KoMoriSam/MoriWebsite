let modulePromise;

async function getModule() {
  if (!modulePromise) {
    modulePromise = Promise.all([
      import("wasm-webp/dist/esm/webp-wasm.js"),
      import("wasm-webp/dist/esm/webp-wasm.wasm?url"),
    ]).then(([{ default: createModule }, { default: wasmUrl }]) =>
      createModule({
        locateFile(path) {
          return path.endsWith(".wasm") ? wasmUrl : path;
        },
      }),
    );
  }
  return modulePromise;
}

export async function encodeWebP(data, width, height, config) {
  const module = await getModule();
  return module.encode(data, width, height, true, normalizeConfig(config));
}

export async function encodeAnimatedWebP(width, height, frames) {
  const module = await getModule();
  const vector = new module.VectorWebPAnimationFrame();
  try {
    for (const frame of frames) {
      vector.push_back({
        duration: frame.duration,
        data: frame.data,
        config: normalizeConfig(frame.config),
        has_config: true,
      });
    }
    return module.encodeAnimation(width, height, true, vector);
  } finally {
    vector.delete?.();
  }
}

export async function decodeWebP(data) {
  const module = await getModule();
  return module.decodeRGBA(data);
}

export async function decodeAnimatedWebP(data) {
  const module = await getModule();
  return module.decodeAnimation(data, true);
}

function normalizeConfig(config = {}) {
  return {
    lossless: Math.max(0, Math.min(1, Number(config.lossless) || 0)),
    quality: Math.max(0, Math.min(100, Number(config.quality) || 100)),
  };
}
