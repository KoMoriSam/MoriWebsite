import assert from 'node:assert/strict';
import { createServer } from 'vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createGithubSession } from '../src/composables/auth/useGithubSession.js';
import { searchPagefindBundle } from '../src/services/search-access.js';

const storage = () => ({ data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); }, removeItem(key) { this.data.delete(key); } });
const listeners = new Map();
const local = storage(); const savedReturn = storage();
let widget = { id: 'github-profile-probe', __session: 'first', iframeRef: { contentWindow: {} } };
globalThis.document = { querySelectorAll: () => [widget] };
globalThis.window = {
  localStorage: local, sessionStorage: savedReturn, location: { href: 'https://komori.cc/novel/volume/chapter?c=123456&giscus=first#paragraph-2', assign(value) { this.assigned = value; } },
  history: { replaceState(_, __, url) { window.location.href = url; } },
  addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); }, setInterval() { return 1; }, clearInterval() {},
};
globalThis.localStorage = local;
globalThis.sessionStorage = savedReturn;
let profileResponse = { name: 'Actual GitHub Name', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4', email: 'never@example.com' };
let pendingProfile;
let profileCalls = 0;
globalThis.fetch = async () => { profileCalls++; if (pendingProfile) return pendingProfile; return { ok: true, json: async () => profileResponse }; };
const tick = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const emitViewer = login => listeners.get('message')({ origin: 'https://giscus.app', source: widget.iframeRef.contentWindow, data: { giscus: { viewer: { login } } } });
savedReturn.setItem('mori:github:return', 'https://komori.cc/novel/volume/chapter?c=123456#paragraph-original');
const auth = createGithubSession();
const stop = auth.start({ replace(url) { assert.ok(url.endsWith('#paragraph-original')); } });
assert.equal(auth.state.authenticated, false);
assert.equal(new URL(window.location.href).searchParams.has('giscus'), false);
emitViewer('account'); await tick();
assert.equal(auth.state.profile.name, 'Actual GitHub Name');
assert.equal(auth.state.profile.email, 'never@example.com');
auth.login();
assert.equal(new URL(window.location.assigned).searchParams.get('redirect_uri'), window.location.href);
auth.logout(); assert.equal(auth.state.profile, null); assert.equal(auth.state.authenticated, false);
assert.equal(local.getItem('mori:github:profile'), null);

local.setItem('giscus-session', JSON.stringify('second')); listeners.get('storage')(); widget.__session = 'second';
profileResponse = { name: null, avatar_url: null }; emitViewer('fallback-account'); await tick();
assert.equal(auth.state.profile.name, 'fallback-account'); assert.equal(auth.state.profile.avatarUrl, ''); assert.equal(auth.state.profile.email, '');
let resolveProfile; pendingProfile = new Promise(resolve => { resolveProfile = resolve; });
auth.retry(); auth.logout(); resolveProfile({ ok: true, json: async () => ({ name: 'Old account' }) }); await tick();
assert.equal(auth.state.profile, null);
pendingProfile = null;
local.setItem('giscus-session', JSON.stringify('third')); listeners.get('storage')(); widget.__session = 'third';
emitViewer('third-account'); await tick();
listeners.get('message')({ origin: 'https://giscus.app', source: {}, data: { giscus: { signOut: true } } });
assert.equal(auth.state.authenticated, true, 'unrelated frame cannot sign out');
listeners.get('message')({ origin: 'https://giscus.app', source: widget.iframeRef.contentWindow, data: { giscus: { error: 'Bad credentials' } } });
assert.equal(auth.state.authenticated, false); stop();
// 取消授权也回到原段落；公开资料接口失败保持游客资料并允许重试。
window.location.href = 'https://komori.cc/novel/volume/chapter#github-login-fallback';
savedReturn.setItem('mori:github:return', 'https://komori.cc/novel/volume/chapter#original-position');
const canceled = createGithubSession();
const stopCanceled = canceled.start({ replace(url) { assert.ok(url.endsWith('#original-position')); } });
assert.equal(canceled.state.authenticated, false); stopCanceled();
const failing = createGithubSession();
local.setItem('giscus-session', JSON.stringify('profile-failure')); widget.__session = 'profile-failure';
const stopFailing = failing.start({ replace() {} });
globalThis.fetch = async () => ({ ok: false }); emitViewer('unavailable'); await tick();
assert.equal(failing.state.profile, null); assert.equal(failing.state.error, 'profile');
globalThis.fetch = async () => ({ ok: true, json: async () => ({ name: 'Recovered', avatar_url: '' }) });
failing.retry(); await tick(); assert.equal(failing.state.profile.name, 'Recovered'); failing.logout(); stopFailing();

let canRead = false; let queries = 0; let reads = 0;
const engine = { async search() { queries++; return { results: [{ data: async () => { reads++; return {}; } }] }; } };
assert.deepEqual(await searchPagefindBundle(engine, 'query', {}, () => canRead), []);
assert.equal(queries, 0);
let resolveSearch; canRead = true;
const searching = searchPagefindBundle({ search: () => new Promise(resolve => { resolveSearch = resolve; }) }, 'query', {}, () => canRead);
canRead = false; resolveSearch({ results: [{ data: () => { reads++; return {}; } }] });
assert.deepEqual(await searching, []); assert.equal(reads, 0);
canRead = true; let resolveData;
const reading = searchPagefindBundle({ search: async () => ({ results: [{ data: () => new Promise(resolve => { resolveData = resolve; }) }] }) }, 'query', {}, () => canRead);
await tick(); canRead = false; resolveData({ meta: { type: 'novel' } }); assert.deepEqual(await reading, []);

// 与实际服务共用代码；无 Pagefind 的本地回退也必须拒绝未登录小说请求。
window.fetch = (...args) => globalThis.fetch(...args);
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/github-access', optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { fetchNovelSearchIndex, fetchGlobalSearchIndex, fetchNovelSearchCatalog } = await server.ssrLoadModule('/src/services/search-content.js');
  let requests = [];
  globalThis.fetch = async url => { requests.push(String(url)); throw new Error('offline'); };
  await assert.rejects(fetchNovelSearchIndex(), /LOGIN_REQUIRED/); assert.equal(requests.length, 0);
  await fetchGlobalSearchIndex().catch(() => {});
  assert.equal(requests.some(url => /theHorizon|\/chapters\//i.test(url)), false);
  // 登录后目录统计无需请求正文；退出期间正在读取的正文不能进入本地缓存。
  const { useGithubSession } = await server.ssrLoadModule('/src/composables/auth/useGithubSession.js');
  const serviceAuth = useGithubSession();
  globalThis.window = {
    localStorage: local, sessionStorage: savedReturn, location: { href: 'https://komori.cc/novel' }, history: { replaceState() {} },
    addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); }, setInterval() { return 1; }, clearInterval() {},
  };
  globalThis.document = { querySelectorAll: () => [widget] };
  widget.__session = 'local-search'; local.setItem('giscus-session', JSON.stringify(widget.__session));
  let contentReads = 0; let resolveContent;
  globalThis.fetch = async url => {
    if (String(url).includes('api.github.com/users/')) return new Response(JSON.stringify({ name: 'Search reader' }));
    if (String(url).endsWith('/index.json')) return new Response(JSON.stringify({ first: { volumeInfo: { title: 'Volume' }, chapters: [{ uuid: 'chapter-id', path: 'first.md', title: 'Chapter', uploadDate: '2026-09-30' }] } }));
    contentReads++;
    return new Promise(resolve => { resolveContent = resolve; });
  };
  const stopService = serviceAuth.start({ replace() {} }); emitViewer('reader'); await tick();
  const catalog = await fetchNovelSearchCatalog(); assert.equal(catalog.length, 1); assert.equal(contentReads, 0);
  const pending = fetchNovelSearchIndex();
  for (let i = 0; i < 20 && !resolveContent; i++) await tick();
  assert.ok(resolveContent, "novel fallback started its content request");
  serviceAuth.logout(); resolveContent(new Response('Secret text'));
  await assert.rejects(pending, /LOGIN_REQUIRED/);
  await assert.rejects(fetchNovelSearchIndex(), /LOGIN_REQUIRED/);
  stopService(); delete globalThis.window; delete globalThis.document;
} finally { await server.close(); }
console.log('GitHub access: callback, display name, logout, cross-tab, stale profile, Pagefind races and local fallback checks passed (' + profileCalls + ' profile requests).');

if (process.argv.includes('--indexes')) {
  globalThis.fetch = async url => {
    let file = String(url).split('?')[0];
    if (file.startsWith('/pagefind')) file = path.resolve('dist' + file);
    else if (file.startsWith('file:')) file = new URL(file);
    return new Response(readFileSync(file));
  };
  for (const bundle of ['pagefind', 'pagefind-novel']) {
    const module = await import(pathToFileURL(path.resolve('dist', bundle, 'pagefind.js')).href);
    const engine = module.createInstance({ basePath: `/${bundle}/`, language: 'zh' });
    try {
      await engine.init();
      const types = Object.keys((await engine.filters()).type || {});
      assert.ok(types.length);
      assert.ok(types.every(type => bundle === 'pagefind-novel' ? type === 'novel' : ['blog', 'changelog', 'licenses'].includes(type)), `${bundle}: mixed content types`);
      const result = await engine.search(bundle === 'pagefind-novel' ? 'z009ad8008003' : 'JavaScript');
      for (const item of result.results) {
        const data = await item.data();
        assert.equal(data.meta.type === 'novel', bundle === 'pagefind-novel');
      }
    } finally { await engine.destroy(); }
  }
  console.log('Pagefind runtime: public and novel bundles are isolated.');
}
