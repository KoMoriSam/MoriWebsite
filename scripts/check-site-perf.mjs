import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { build, createServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter, RouterView, useRoute } from "vue-router";
import { createIconStyles, createWoff2FontStyles, listFogportArt } from "./generate-static-assets.mjs";
import { createArticleMetadata, createPageData, installPageData, restorePageData } from "../src/utils/ssg/page-data.js";

const require = createRequire(import.meta.url);
const tempRoot = path.resolve(".tmp");
await mkdir(tempRoot, { recursive: true });
const fixture = await mkdtemp(path.join(tempRoot, "site-perf-"));
try {
  assert.deepEqual(await listFogportArt(path.join(fixture, "missing")), []);
  assert.deepEqual(await listFogportArt(fixture), []);
  for (const file of ["map.png", "map.svg", "map.webp", "card-back.avif", "note.txt"]) {
    await writeFile(path.join(fixture, file), "fixture");
  }
  await mkdir(path.join(fixture, "district-01.png"));
  const files = await listFogportArt(fixture);
  assert.deepEqual(files, ["card-back.avif", "map.png", "map.svg", "map.webp"]);
  const artSource = (await readFile("src/games/fogport/art-assets.js", "utf8"))
    .replace(/import artFiles[^\n]+;/, `const artFiles = ${JSON.stringify(files)};`);
  assert.ok(!artSource.includes("import.meta.glob"));
  const art = await import(`data:text/javascript;base64,${Buffer.from(artSource).toString("base64")}`);
  assert.deepEqual(art.artCandidates("map"), ["svg", "webp", "png"].map((ext) => `/assets/images/games/fogport/map.${ext}`));
  assert.deepEqual(art.artCandidates("district-01"), []);
  assert.deepEqual(art.artCandidates("../map"), []);
  assert.deepEqual(art.artCandidates("card-back"), ["/assets/images/games/fogport/card-back.avif"]);

  const official = await readFile(require.resolve("remixicon/fonts/remixicon.css"), "utf8");
  const generated = createIconStyles(official);
  const rules = (source) => {
    const result = [];
    postcss.parse(source).walkRules((rule) => result.push(rule.toString()));
    return result;
  };
  assert.deepEqual(rules(generated), rules(official), "All icon selectors and declarations are preserved");
  assert.equal((generated.match(/url\(/g) || []).length, 1);
  const iconFontUrl = generated.match(/url\("([^"]+)"\)/)[1];
  const iconFont = await readFile(require.resolve("remixicon/fonts/remixicon.woff2"));
  assert.deepEqual(await readFile(path.resolve("src/assets/font", iconFontUrl)), iconFont);
  assert.ok(generated.includes("Copyright RemixIcon.com"));
  assert.throws(() => createIconStyles(official.replaceAll("remixicon.woff2", "missing.woff2")));
  assert.throws(() => createIconStyles(`${official}\n@font-face {font-family: other}`));
  assert.equal(await readFile("src/assets/font/remixicon.generated.css", "utf8"), generated);

  // Exercise Tailwind's URL rebasing and Vite's asset emission together.
  const bundle = await build({
    configFile: false,
    publicDir: false,
    plugins: [tailwindcss()],
    logLevel: "error",
    build: { write: false, rollupOptions: { input: "src/assets/main.css" } },
  });
  const bundledIcons = bundle.output.filter((file) => file.type === "asset" && /^assets\/remixicon-[^/]+\.woff2$/.test(file.fileName));
  assert.equal(bundledIcons.length, 1, "Exactly one Remix Icon WOFF2 is emitted");
  assert.deepEqual(Buffer.from(bundledIcons[0].source), iconFont);
  const bundledCss = bundle.output.find((file) => file.type === "asset" && file.fileName.endsWith(".css"));
  const iconFace = String(bundledCss.source).match(/@font-face\{[^}]*font-family:remixicon[;}][^}]*\}/)?.[0];
  assert.ok(iconFace?.includes(`/${bundledIcons[0].fileName}`), "The final icon CSS references the emitted font");
  assert.ok(!bundle.output.some((file) => file.type === "asset" && /^assets\/remixicon-.*\.(?:eot|ttf|woff|svg)$/.test(file.fileName)));

  const server = await createServer({
    configFile: false,
    publicDir: false,
    plugins: [tailwindcss()],
    logLevel: "error",
    server: { middlewareMode: true, hmr: false },
  });
  const httpServer = createHttpServer(server.middlewares);
  try {
    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(0, "127.0.0.1", resolve);
    });
    const origin = `http://127.0.0.1:${httpServer.address().port}`;
    const cssResponse = await fetch(`${origin}/src/assets/main.css?direct`);
    assert.equal(cssResponse.status, 200);
    let devFontUrl;
    postcss.parse(await cssResponse.text()).walkAtRules("font-face", (face) => {
      if (face.nodes.some((node) => node.prop === "font-family" && node.value.replace(/["']/g, "") === "remixicon")) {
        devFontUrl = face.nodes.find((node) => node.prop === "src")?.value.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      }
    });
    assert.ok(devFontUrl, "Development CSS includes the icon font URL");
    const fontResponse = await fetch(new URL(devFontUrl, origin));
    assert.equal(fontResponse.status, 200, "The development font URL is served successfully");
    assert.deepEqual(Buffer.from(await fontResponse.arrayBuffer()), iconFont);
  } finally {
    await server.close();
    if (httpServer.listening) await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
  }

  const packageName = "@fontsource/zhi-mang-xing";
  const fontSource = await readFile(require.resolve(`${packageName}/index.css`), "utf8");
  const fontStyles = createWoff2FontStyles(fontSource, packageName);
  const fontFaces = (source) => {
    const result = [];
    postcss.parse(source).walkAtRules("font-face", (face) => {
      const descriptors = [];
      face.walkDecls((decl) => {
        if (decl.prop !== "src") descriptors.push([decl.prop, decl.value]);
      });
      result.push(descriptors);
    });
    return result;
  };
  assert.deepEqual(fontFaces(fontStyles), fontFaces(fontSource), "All font faces and character ranges are preserved");
  const fontUrls = (source) => [...source.matchAll(/([\w-]+\.woff2)\b/g)].map((match) => match[1]);
  assert.deepEqual(fontUrls(fontStyles), fontUrls(fontSource), "The same WOFF2 subsets are used");
  assert.ok(!/\.woff\b/.test(fontStyles));
  assert.ok(fontStyles.includes(`url("${packageName}/files/`));
  assert.throws(() => createWoff2FontStyles(fontSource.replaceAll(".woff2", ".missing"), packageName));
  assert.throws(() => createWoff2FontStyles("", packageName));
  assert.equal(await readFile("src/assets/font/zhi-mang-xing.generated.css", "utf8"), fontStyles);
} finally {
  assert.equal(path.dirname(fixture), tempRoot);
  assert.ok(path.basename(fixture).startsWith("site-perf-"));
  await rm(fixture, { recursive: true, force: true });
}

const snapshot = {
  articles: [
    { id: "a", path: "/blog/a", article: { id: "a", title: "A", tags: ["tag"], content: "hidden body", markdown: "hidden body" }, content: "Article A </script><script>alert(1)</script>\u2028\u2029" },
    { id: "b", path: "/blog/b", article: { id: "b", title: "B" }, content: "Article B" },
  ],
  changelog: { items: [{ version: "1" }] },
  novelChapters: { volume: [{ title: "Chapter" }] },
};
const meta = createArticleMetadata(snapshot.articles);
assert.deepEqual(meta.map((entry) => entry.article.title), ["A", "B"]);
assert.ok(!JSON.stringify(meta).includes("hidden body"));
assert.ok(!JSON.stringify(meta).includes("Article A"));
assert.equal(snapshot.articles[0].article.content, "hidden body", "Metadata generation does not mutate the source");
const routeA = { path: "/blog/a", meta: { article: meta[0].article } };
const routeB = { path: "/blog/b", meta: { article: meta[1].article } };
const dataA = createPageData(snapshot, routeA);
assert.deepEqual(Object.keys(dataA), ["path", "article"]);
assert.ok(!JSON.stringify(dataA).includes("Article B"));
assert.equal(createPageData(snapshot, { path: "/", name: "home" }), null);
assert.equal(restorePageData(dataA, routeB), null);
assert.equal(restorePageData(dataA, { ...routeA, path: "/blog/a/" }).article.id, "a", "Trailing slash aliases restore the same article");
assert.equal(restorePageData({ ...dataA, article: { id: "b", content: "wrong" } }, routeA), null);
assert.equal(restorePageData({ ...dataA, article: { id: "a", content: 1 } }, routeA), null);
assert.throws(() => createPageData(snapshot, { path: "/blog/missing", meta: routeA.meta }));
const logRoute = { path: "/changelog", name: "changelog" };
const log = createPageData(snapshot, logRoute);
log.changelog.items[0].version = "changed";
assert.equal(snapshot.changelog.items[0].version, "1", "Each SSR page receives its own data");
const novelRoute = { path: "/novel/volume", name: "novel-reader" };
assert.deepEqual(Object.keys(createPageData(snapshot, novelRoute)), ["path", "novelChapters"]);
assert.equal(restorePageData(dataA, novelRoute), null);

// Exercise the actual router hooks used by main.js before component setup.
const Page = { setup: () => {
  const route = useRoute();
  return () => h("article", route.meta.pageData?.article?.content || String(route.name || ""));
} };
const routes = [
  { path: "/", name: "home", component: Page },
  ...meta.map((entry) => ({ path: entry.path, component: Page, meta: { article: entry.article } })),
  { path: "/changelog", name: "changelog", component: Page },
  { path: "/novel/:volume?", name: "novel-reader", component: Page },
];
const createFixture = (initialState = {}, isServer = true) => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  installPageData(router, initialState, { snapshot, isServer });
  const app = createSSRApp({ render: () => h(RouterView) });
  app.use(router);
  return { app, router, initialState };
};
const serverA = createFixture();
const serverB = createFixture();
await Promise.all([serverA.router.push("/blog/a"), serverB.router.push("/blog/b")]);
assert.equal(serverA.initialState.pageData.article.id, "a");
assert.equal(serverB.initialState.pageData.article.id, "b");
const serverHtml = await renderToString(serverA.app);
const client = createFixture(structuredClone(serverA.initialState), false);
await client.router.push("/blog/a");
assert.equal(await renderToString(client.app), serverHtml, "Initial client setup renders the same content as SSR");
const slashClient = createFixture(structuredClone(serverA.initialState), false);
await slashClient.router.push("/blog/a/");
assert.equal(await renderToString(slashClient.app), serverHtml);
await client.router.push("/blog/b");
assert.equal(client.router.currentRoute.value.meta.pageData, null, "SPA navigation uses the existing API path");
await client.router.push("/blog/a");
assert.equal(client.router.currentRoute.value.meta.pageData, null, "Returning does not replay initial page state");
assert.ok(client.router.getRoutes().every((route) => !Object.hasOwn(route.meta, "pageData")));
const home = createFixture();
await home.router.push("/");
assert.deepEqual(home.initialState, {});
await serverB.router.push("/changelog");
assert.deepEqual(Object.keys(serverB.initialState.pageData), ["path", "changelog"]);
await serverB.router.push("/novel/volume");
assert.deepEqual(Object.keys(serverB.initialState.pageData), ["path", "novelChapters"]);
await serverB.router.push("/");
assert.deepEqual(serverB.initialState, {});

// Verify escaping with the serializer shipped in the installed ViteSSG.
const shared = path.join(path.dirname(require.resolve("vite-ssg")), "shared");
let serializer;
for (const file of await readdir(shared)) {
  if (file.endsWith(".mjs") && (await readFile(path.join(shared, file), "utf8")).includes("function serializeState(state)")) {
    serializer = await import(pathToFileURL(path.join(shared, file)).href);
    break;
  }
}
assert.ok(serializer, "Installed ViteSSG serializer found");
const serialized = serializer.s(serverA.initialState);
assert.ok(!serialized.includes("</script>"));
assert.ok(!serialized.includes("\u2028") && !serialized.includes("\u2029"));
assert.deepEqual(serializer.d(JSON.parse(serialized)), serverA.initialState);

const { parse, compileScript, compileTemplate } = require("vue/compiler-sfc");
const components = [
  "src/components/announcement/interaction/NoticeDialog.vue",
  "src/components/interaction/controls/FontSelect.vue",
  "src/components/markdown/Renderer.vue",
  "src/views/Blog.vue",
  "src/views/Changelog.vue",
  "src/views/Licenses.vue",
  "src/views/tools/SinhalaFontConverter.vue",
];
for (const file of components) {
  const { descriptor, errors } = parse(await readFile(file, "utf8"), { filename: file });
  assert.deepEqual(errors, [], file);
  const { bindings } = compileScript(descriptor, { id: file });
  const result = compileTemplate({ source: descriptor.template.content, filename: file, id: file, compilerOptions: { bindingMetadata: bindings } });
  assert.deepEqual(result.errors, [], file);
}
console.log(`Site performance: asset inventory, full icon mappings, page isolation, initial rendering, state escaping and ${components.length} Vue components passed.`);
