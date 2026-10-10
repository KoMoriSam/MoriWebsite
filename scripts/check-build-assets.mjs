import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build, createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { singleThreadCodecs, stripThreadedCodecs } from "./vite-single-thread-codecs.mjs";
import { pruneBuildAssets } from "./prune-build-assets.mjs";

const require = createRequire(import.meta.url);
const { parseAst } = createRequire(require.resolve("vite/package.json"))("rollup/parseAst");
const tempRoot = path.resolve(".tmp");
await mkdir(tempRoot, { recursive: true });
const fixture = await mkdtemp(path.join(tempRoot, "build-assets-"));
try {
  const dist = path.join(fixture, "dist");
  const unused = ["pagefind-ui.js", "pagefind-ui.css", "pagefind-component-ui.js", "pagefind-component-ui.css", "pagefind-modular-ui.js", "pagefind-modular-ui.css", "pagefind-highlight.js"];
  const retained = ["pagefind.js", "pagefind-worker.js", "wasm.unknown.pagefind", "pagefind-entry.json", "fragment/data.pf_fragment", "index/data.pf_index"];
  await mkdir(path.join(dist, ".vite"), { recursive: true });
  await mkdir(path.join(dist, "licenses"), { recursive: true });
  await writeFile(path.join(dist, ".vite/ssr-manifest.json"), "build-only");
  await writeFile(path.join(dist, "licenses.html"), "licenses");
  await writeFile(path.join(dist, "licenses/index.html"), "licenses");
  for (const bundle of ["pagefind", "pagefind-novel"]) {
    for (const file of [...unused, ...retained]) {
      const filename = path.join(dist, bundle, file);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, file);
    }
  }
  const result = await pruneBuildAssets(dist);
  assert.equal(result.removed.length, unused.length * 2 + 2);
  assert.ok(result.bytes > 0);
  for (const bundle of ["pagefind", "pagefind-novel"]) {
    for (const file of retained) assert.equal(await readFile(path.join(dist, bundle, file), "utf8"), file);
  }
  assert.equal(await readFile(path.join(dist, "licenses.html"), "utf8"), "licenses");
  assert.deepEqual(await pruneBuildAssets(dist), { bytes: 0, removed: [] });
  await writeFile(path.join(dist, "licenses/index.html"), "different page");
  assert.deepEqual(await pruneBuildAssets(dist), { bytes: 0, removed: [] });

  const transformedModules = new Map();
  for (const specifier of ["@jsquash/avif/encode", "@jsquash/oxipng/optimise"]) {
    const filename = require.resolve(specifier);
    const source = await readFile(filename, "utf8");
    const transformed = stripThreadedCodecs(source, filename, parseAst);
    assert.ok(transformed);
    assert.ok(!transformed.includes("wasm-feature-detect"));
    assert.equal(stripThreadedCodecs(source, "unrelated.js", parseAst), null);
    assert.throws(() => stripThreadedCodecs(source.replaceAll("threads()", "changed()"), filename, parseAst));
    assert.throws(() => stripThreadedCodecs(source.replaceAll("./codec/", "./changed/"), filename, parseAst));
    const absoluteImports = transformed.replace(/(["'])(\.\/[^"']+)\1/g, (_, quote, relative) =>
      `${quote}${pathToFileURL(path.resolve(path.dirname(filename), relative)).href}${quote}`,
    );
    transformedModules.set(specifier, await import(`data:text/javascript;base64,${Buffer.from(absoluteImports).toString("base64")}`));
  }
  const avifPath = path.dirname(require.resolve("@jsquash/avif/encode"));
  const avif = transformedModules.get("@jsquash/avif/encode");
  const originalAvif = await import("@jsquash/avif/encode.js");
  const decoder = await import("@jsquash/avif/decode.js");
  const encoderBinary = new WebAssembly.Module(await readFile(path.join(avifPath, "codec/enc/avif_enc.wasm")));
  await avif.init(encoderBinary);
  await originalAvif.init(encoderBinary);
  await decoder.init(new WebAssembly.Module(await readFile(path.join(avifPath, "codec/dec/avif_dec.wasm"))));
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  const image = { data: pixels, width: 2, height: 2 };
  for (const options of [{ quality: 70, speed: 8, subsample: 1, tune: 0 }, { lossless: true, speed: 8 }]) {
    const encoded = await avif.default(image, options);
    assert.deepEqual(new Uint8Array(encoded), new Uint8Array(await originalAvif.default(image, options)));
    const decoded = await decoder.default(encoded);
    assert.equal(decoded.width, 2);
    assert.equal(decoded.height, 2);
    if (options.lossless) assert.deepEqual(decoded.data, pixels);
  }
  await assert.rejects(() => avif.default(image, { bitDepth: 9 }), /Invalid bit depth/);
  await assert.rejects(() => avif.default(image, { bitDepth: 10 }), /Uint16Array/);

  const oxipngPath = path.dirname(require.resolve("@jsquash/oxipng/optimise"));
  const png = transformedModules.get("@jsquash/oxipng/optimise");
  const originalPng = await import("@jsquash/oxipng/optimise.js");
  const pngBinary = await readFile(path.join(oxipngPath, "codec/pkg/squoosh_oxipng_bg.wasm"));
  await png.init(pngBinary);
  await originalPng.init(pngBinary);
  const sharp = (await import("sharp")).default;
  const inputPng = await sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } }).png().toBuffer();
  const optimizedPng = await png.default(inputPng, { level: 1 });
  assert.deepEqual(new Uint8Array(optimizedPng), new Uint8Array(await originalPng.default(inputPng, { level: 1 })));
  assert.deepEqual(await sharp(Buffer.from(optimizedPng)).raw().toBuffer(), Buffer.from(pixels));

  const input = path.join(fixture, "entry.mjs");
  await writeFile(input, 'export {default as encode} from "@jsquash/avif/encode"; export {optimise} from "@jsquash/oxipng"; export const worker=()=>new Worker(new URL("./worker.mjs",import.meta.url),{type:"module"});');
  await writeFile(path.join(fixture, "worker.mjs"), 'import encode from "@jsquash/avif/encode"; import {optimise} from "@jsquash/oxipng"; self.onmessage=async({data})=>self.postMessage(data.kind==="avif"?await encode(data.image):await optimise(data.buffer));');
  const sizes = [];
  for (const optimized of [false, true]) {
    const output = (await build({
      configFile: false, publicDir: false, logLevel: "error",
      plugins: optimized ? [singleThreadCodecs()] : [],
      worker: { format: "es", plugins: () => optimized ? [singleThreadCodecs()] : [] },
      build: { write: false, emptyOutDir: false, rollupOptions: { input, preserveEntrySignatures: "strict" } },
    })).output;
    const wasm = output.filter((file) => file.type === "asset" && file.fileName.endsWith(".wasm"));
    assert.equal(wasm.length, optimized ? 2 : 4);
    assert.ok(wasm.some((file) => file.fileName.includes("avif_enc-")));
    assert.ok(output.some((file) => file.type === "asset" && /worker-[\w-]+\.js$/.test(file.fileName)));
    if (optimized) assert.ok(!output.some((file) => file.fileName.includes("avif_enc_mt")));
    sizes.push(output.reduce((sum, file) => sum + (file.type === "chunk" ? Buffer.byteLength(file.code) : typeof file.source === "string" ? Buffer.byteLength(file.source) : file.source.length), 0));
  }
  assert.ok(sizes[0] - sizes[1] > 3.5 * 1048576);
  const server = await createServer({
    configFile: false, plugins: [vue()],
    resolve: { alias: { "@": path.resolve("src") } },
    cacheDir: path.join(fixture, "vite-cache"), server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { default: LicensePage } = await server.ssrLoadModule("/src/views/Licenses.vue");
    const { LOCALE_SERVICE } = await server.ssrLoadModule("/src/i18n/index.js");
    const { default: data } = await server.ssrLoadModule("/src/router/license-data.js");
    const app = createSSRApp(LicensePage);
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: "/", name: "home", component: {} },
      { path: "/licenses", name: "licenses", component: LicensePage },
      { path: "/changelog", name: "changelog", component: {} },
    ] });
    app.use(createPinia());
    app.use(router);
    app.provide(LOCALE_SERVICE, { t: (key) => key, text: (value) => value });
    await router.push("/licenses");
    await router.isReady();
    const html = await renderToString(app);
    const dependenciesHtml = html.slice(html.indexOf('id="dependencies"'), html.indexOf('id="supplemental"'));
    assert.ok(dependenciesHtml.length > 0);
    assert.ok(!dependenciesHtml.includes("<pre"), "Closed license bodies are not embedded in SSR HTML");
    assert.ok(html.includes("/legal/THIRD_PARTY_LICENSES.txt"));
    for (const dependency of data.dependencyNotices) assert.ok(dependenciesHtml.includes(`${dependency.name}@${dependency.version}`));
    assert.ok(data.dependencyNotices.some((dependency) => dependency.licenseFiles.some((file) => file.text.length > 2000)), "Full license texts remain available to the page and index generator");
    console.log(`License page SSR: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB; all ${data.dependencyCount} dependency summaries retained.`);
  } finally {
    await server.close();
  }
  console.log(`Build assets: codec round trips and worker bundles passed; ${(sizes[0] / 1048576).toFixed(2)} → ${(sizes[1] / 1048576).toFixed(2)} MiB. Cleanup preserves search engines, indices and distinct HTML.`);
} finally {
  assert.equal(path.dirname(fixture), tempRoot);
  assert.ok(path.basename(fixture).startsWith("build-assets-"));
  await rm(fixture, { recursive: true, force: true });
}
