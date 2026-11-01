import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { parse, compileScript } from "vue/compiler-sfc";
import { createServer } from "vite";
import { createRenderer, h, nextTick } from "vue";
import { createRouter, createMemoryHistory, RouterView } from "vue-router";
import { createPinia } from "pinia";

const source = {
  id: "sample", path: "sample.md", title: "原文", date: "2026-09-25", summary: "摘要",
  translations: {
    en: { path: "en/sample.md", title: "English", summary: "Summary", machineTranslated: true },
    si: { path: "si/sample.md", title: "සිංහල", machineTranslated: false },
  },
};
const other = { id: "other", path: "other.md", title: "Another source" };
const englishOnly = { ...source, id: "english-only", path: "english-only.md", translations: {
  en: { ...source.translations.en, path: "en/english-only.md" },
} };
const state = { articles: [source, other, englishOnly], pending: [], props: null };
globalThis.__blogTranslationCheck = state;
const fixtureCode = `
  import { h } from 'vue';
  const state = globalThis.__blogTranslationCheck;
  export const useArticleApi = () => ({ fetchArticleContent(path, options) {
    return new Promise((resolve, reject) => state.pending.push({ path, options, resolve, reject }));
  }});
  export const fetchBlogSearchArticles = async () => state.holdLists
    ? new Promise((resolve) => state.listRequests.push(resolve)) : state.articles;
  export const usePosTracker = () => () => {};
  export const captureTrackedPosition = () => null;
  export const restoreTrackedPosition = () => false;
  export const useReadingProgress = () => ({ getOptions: () => ({}), hasProgress: () => false });
  export const useToast = () => ({ info() {} });
  export default {
    props: ['article', 'articles', 'content', 'loading', 'error', 'listRoute'],
    emits: ['refresh', 'language', 'ready', 'back', 'navigate'],
    setup(props, {emit}) { return () => { state.props = props; state.emit = emit; return h('div', props.content || ''); }; }
  };
`;
const server = await createServer({
  configFile: false, cacheDir: "node_modules/.cache/blog-translations-runtime",
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { "@": path.resolve("src") } },
  server: { middlewareMode: true, watch: null }, appType: "custom",
  plugins: [{
    name: "blog-translations-check",
    resolveId(id) { if (id.startsWith("virtual:blog-")) return `\0${id}`; },
    load(id) {
      if (id === "\0virtual:blog-fixtures") return fixtureCode;
      if (id !== "\0virtual:blog-component") return;
      const { descriptor } = parse(readFileSync("src/views/Blog.vue", "utf8"));
      return compileScript(descriptor, { id: "blog-translations-runtime", inlineTemplate: true }).content
        .replaceAll(/(["'])@\/(?:services\/(?:api-articles|search-content)|composables\/(?:usePosTracker|useToast|blog\/useReadingProgress)|views\/blog\/(?:ArticleList|ArticleReader)\.vue|components\/reader\/feedback\/LoadingPlaceholder\.vue)\1/g, '"virtual:blog-fixtures"');
    },
  }],
});
const renderer = createRenderer({
  createElement: () => ({ children: [] }), createText: (text) => ({ text }), createComment: () => ({}),
  setElementText: (node, text) => { node.text = text; }, setText: (node, text) => { node.text = text; },
  insert: (node, parent, anchor) => {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(node); else parent.children.splice(index, 0, node);
  },
  remove: (node) => { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); },
  patchProp() {}, parentNode: (node) => node.parent, nextSibling: () => null,
});
const flush = async () => { for (let i = 0; i < 12; i++) { await new Promise((resolve) => setImmediate(resolve)); await nextTick(); } };
let app;
try {
  const { default: Blog } = await server.ssrLoadModule("virtual:blog-component");
  const { createLocaleService } = await server.ssrLoadModule("/src/i18n/index.js");
  const { useArticlePageStore } = await server.ssrLoadModule("/src/stores/article-page.js");
  const locale = createLocaleService();
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: "/blog", component: Blog, meta: { blogList: true, articles: state.articles } },
    { path: "/blog/:articleId/:locale?", component: Blog, meta: { articles: state.articles } },
  ] });
  router.beforeResolve((to) => locale.loadRoute({ ...to, meta: { ...to.meta, localeGroups: ['blog', 'reader'] } }));
  await router.push("/blog/sample?reader=1#section");
  app = renderer.createApp({ render: () => h(RouterView) });
  const pinia = createPinia();
  app.use(router); app.use(pinia); locale.install(app); app.mount({ children: [] });
  await flush();
  assert.equal(router.currentRoute.value.path, "/blog/sample", "wait for preference restoration");
  await locale.switchLocale("en", { save: false });
  locale.localeRestored.value = true;
  await flush();
  assert.equal(router.currentRoute.value.fullPath, "/blog/sample/en?reader=1#section");
  assert.equal(state.props.article.lang, "en");
  assert.equal(state.props.content, "");
  assert.equal(state.props.loading, true);
  const resolveLatest = async (file, content) => {
    const pending = state.pending.findLast((request) => request.path === file);
    assert.ok(pending, `missing request: ${file}`);
    pending.resolve(content); await flush();
  };
  await resolveLatest("en/sample.md", "English body");
  assert.equal(state.props.content, "English body");
  assert.equal(state.props.article.machineTranslated, true);
  await router.push("/blog/sample/si?reader=1#section"); await flush();
  const slowSinhala = state.pending.at(-1);
  await router.push("/blog/sample/zh-CN?reader=1#section"); await flush();
  await resolveLatest("sample.md", "Chinese body");
  slowSinhala.resolve("Outdated Sinhala body"); await flush();
  assert.equal(state.props.article.lang, "zh-CN");
  assert.equal(state.props.content, "Chinese body", "late translation must not overwrite the selected language");
  await locale.switchLocale("si", { save: false }); await flush();
  assert.equal(router.currentRoute.value.fullPath, "/blog/sample/si?reader=1#section");
  assert.equal(state.props.content, "");
  await resolveLatest('si/sample.md', 'Sinhala after UI switch');
  assert.equal(state.props.content, 'Sinhala after UI switch');
  await router.push("/blog/sample/fr"); await flush();
  assert.equal(state.props.content, "");
  assert.equal(useArticlePageStore(pinia).page.unavailable, true);
  await router.push("/blog/other"); await flush();
  assert.equal(router.currentRoute.value.path, "/blog/other/zh-CN", "missing preferred translation falls back to the source");
  await resolveLatest("other.md", "Other body");
  await locale.switchLocale('en', {save:false}); await flush();
  assert.equal(router.currentRoute.value.path, '/blog/other/zh-CN', 'unavailable UI language keeps the source URL');
  assert.equal(state.props.content, 'Other body');
  await router.push("/blog/sample/en"); await flush();
  await resolveLatest("en/sample.md", "Fresh English body");
  state.emit('refresh'); await flush();
  assert.equal(state.pending.at(-1).path, 'en/sample.md');
  assert.equal(state.pending.at(-1).options.force, true);
  await resolveLatest('en/sample.md', 'Refreshed English body');
  assert.equal(state.props.article.lang, 'en');
  assert.equal(state.props.content, 'Refreshed English body');
  const beforeHash = state.pending.length;
  await router.replace({ hash: "#fn1" }); await flush();
  assert.equal(state.pending.length, beforeHash, "footnotes never reload article content");
  await locale.switchLocale('si', {save:false}); await flush();
  await router.push('/blog/english-only?reader=1#section'); await flush();
  assert.equal(router.currentRoute.value.fullPath, '/blog/english-only/en?reader=1#section');
  await resolveLatest('en/english-only.md', 'English fallback body');
  assert.equal(state.props.article.lang, 'en');
  assert.equal(state.props.content, 'English fallback body');
  await locale.switchLocale('zh-CN', {save:false}); await flush();
  await resolveLatest('english-only.md', 'Chinese source body');
  await locale.switchLocale('si', {save:false}); await flush();
  assert.equal(router.currentRoute.value.path, '/blog/english-only/en');
  await resolveLatest('en/english-only.md', 'English after UI switch');
  assert.equal(state.props.content, 'English after UI switch');
  app.unmount(); app = null;
  const originalFetch = globalThis.fetch;
  const requests = [];
  let fail = false;
  try {
    globalThis.fetch = async (url, options) => {
      const pathname = new URL(url, 'https://example.com').pathname;
      if (pathname.endsWith('/manifest.json')) return Response.json({version:1, images:{}});
      requests.push({pathname, options});
      if (fail) return new Response('error', {status:503});
      return new Response('---\npublic: true\n---\nCached body');
    };
    const { useArticleApi } = await server.ssrLoadModule('/src/services/api-articles.js');
    const api = useArticleApi();
    await Promise.all([api.fetchArticleContent('cache-check.md'), api.fetchArticleContent('cache-check.md')]);
    assert.equal(requests.length, 1, 'deduplicate concurrent requests');
    await api.fetchArticleContent('en/cache-check.md');
    assert.equal(requests.length, 2, 'cache each language independently');
    await api.fetchArticleContent('cache-check.md', {force:true});
    assert.equal(requests.length, 3);
    assert.equal(requests.at(-1).options.cache, 'reload');
    fail = true;
    await assert.rejects(api.fetchArticleContent('retry-check.md'));
    fail = false;
    await api.fetchArticleContent('retry-check.md');
    assert.equal(requests.length, 5, 'failed requests never poison the cache');
    globalThis.fetch = async (url) => {
      const pathname = new URL(url, 'https://example.com').pathname;
      if (pathname.endsWith('/index.json')) return Response.json([englishOnly]);
      if (pathname.endsWith('/manifest.json')) return Response.json({version:1, images:{}});
      return new Response('---\npublic: true\n---\n' + (pathname.includes('/en/') ? 'Searchable English fallback' : 'Chinese source'));
    };
    const { fetchBlogSearchArticles } = await server.ssrLoadModule('/src/services/search-content.js');
    const searchCatalog = await fetchBlogSearchArticles('si');
    assert.equal(searchCatalog[0].translations.en.content, 'Searchable English fallback', 'Sinhala search loads the English fallback body');
  } finally { globalThis.fetch = originalFetch; }
  // A stored English UI preference can restore while the initial index is
  // still loading. The first catalog must remain usable by an explicit URL.
  state.pending = []; state.listRequests = []; state.holdLists = true;
  const restoredLocale = createLocaleService();
  const freshRouter = createRouter({ history: createMemoryHistory(), routes: [{
    path: '/blog/:articleId/:locale', component: Blog,
  }] });
  freshRouter.beforeResolve((to) => restoredLocale.loadRoute({ ...to, meta: { localeGroups: ['blog', 'reader'] } }));
  await freshRouter.push('/blog/sample/zh-CN');
  app = renderer.createApp({ render: () => h(RouterView) });
  app.use(freshRouter); app.use(createPinia()); restoredLocale.install(app); app.mount({ children: [] });
  await flush();
  await restoredLocale.switchLocale('en', {save:false}); restoredLocale.localeRestored.value = true;
  await flush();
  assert.equal(state.listRequests.length, 2);
  state.listRequests[0](state.articles); await flush();
  assert.equal(state.pending.at(-1)?.path, 'sample.md');
  state.pending.at(-1).resolve('Chinese after refresh'); await flush();
  state.listRequests[1](state.articles); await flush();
  assert.equal(state.props.article.lang, 'zh-CN');
  assert.equal(state.props.content, 'Chinese after refresh');
  assert.equal(restoredLocale.locale.value, 'en');
  assert.equal(freshRouter.currentRoute.value.path, '/blog/sample/zh-CN');
  app.unmount(); app = null;
  console.log("Blog runtime: explicit URL restoration, site/article language synchronization, legacy replace, async races, missing versions, source fallback and hash navigation passed.");
} finally {
  app?.unmount(); await server.close(); delete globalThis.__blogTranslationCheck;
}
