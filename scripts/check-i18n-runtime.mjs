import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';
import { createSSRApp, createRenderer, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia } from 'pinia';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/i18n-runtime', plugins: [vuePlugin()], optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { '@': path.resolve('src') } }, server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { createLocaleService, useLocale } = await server.ssrLoadModule('/src/i18n/index.js');
  const a = createLocaleService();
  const b = createLocaleService();
  assert.equal(a.locale.value, 'zh-CN');
  assert.deepEqual(a.i18n.global.availableLocales, ['zh-CN']);
  await a.switchLocale('en', { save: false });
  assert.equal(b.locale.value, 'zh-CN');
  assert.equal(a.text('正在处理 2/10 帧'), 'Processing frame 2/10');
  assert.equal(a.text('作者写的标题'), '作者写的标题');
  assert.equal(a.text('搜索'), 'Search');
  const renderer = createRenderer({
    createElement: () => ({ children: [], text: '' }),
    createText: text => ({ text }), createComment: () => ({}),
    setElementText: (node, text) => { node.text = text; },
    setText: (node, text) => { node.text = text; },
    insert: (node, parent) => { parent.children.push(node); },
    remove: () => {}, patchProp: () => {}, parentNode: () => null, nextSibling: () => null,
  });
  const input = ref('preserved tool input');
  const probe = { setup() {
    const service = useLocale();
    return () => h('p', service.text('搜索') + ':' + input.value);
  } };
  const root = { children: [] }, childRoot = { children: [] };
  const mainApp = renderer.createApp(probe), auxiliaryApp = renderer.createApp(probe);
  a.install(mainApp); a.provide(auxiliaryApp);
  mainApp.mount(root); auxiliaryApp.mount(childRoot);
  auxiliaryApp.unmount();
  await a.switchLocale('si', { save: false });
  await nextTick();
  assert.equal(root.children[0].text, a.text('搜索') + ':preserved tool input');
  assert.equal(input.value, 'preserved tool input');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: () => '{"SET_LOCALE":"si-LK"}' } } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['en-US'] } });
    const info = ref({ SET_THEME: 'forest', SET_LOCALE: 'si-LK' });
    await b.restoreLocale(info);
    assert.equal(b.locale.value, 'si');
    await b.switchLocale('en');
    assert.deepEqual(info.value, { SET_THEME: 'forest', SET_LOCALE: 'en' });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { get localStorage() { throw Error('blocked'); } } });
    await b.restoreLocale();
    assert.equal(b.locale.value, 'en');
    await b.switchLocale('si');
    assert.equal(b.locale.value, 'si');
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else delete globalThis.navigator;
  }
  const router = createRouter({ history: createMemoryHistory(), routes: ['home','blog','novel','tools','test','image-converter','server-status','sinhala-font-converter','changelog','licenses'].map(name => ({ path: name === 'home' ? '/' : '/'+name, name, component: { render: () => null } })) });
  await router.push('/');
  await router.isReady();
  const cases = [
    ['/src/views/Tools.vue', {}, 'Image converter', 'රූප පරිවර්තකය'],
    ['/src/components/layout/NavLinks.vue', {}, 'Home', 'මුල් පිටුව'],
    ['/src/components/ui/Modal.vue', { visible: true }, 'Close', 'වසන්න'],
    ['/src/components/base/Pagination.vue', { currentPage: 1, totalPages: 3 }, 'Next page', 'ඊළඟ පිටුව'],
    ['/src/components/tools/sinhala/Info.vue', {}, 'About Sinhala', 'සිංහල පැරණි'],
    ['/src/views/tools/SinhalaFontConverter.vue', {}, 'Unicode text', 'Unicode පෙළ'],
    ['/src/views/tools/ImageConverter.vue', {}, 'Image converter', 'රූප පරිවර්තකය'],
  ];
  for (const [file, props, en, si] of cases) {
    const { default: component } = await server.ssrLoadModule(file);
    for (const [code, expected] of [['en', en], ['si', si]]) {
      const app = createSSRApp({ render: () => h(component, props) });
      app.use(createPinia()); app.use(router); a.install(app);
      await a.switchLocale(code, { save: false });
      assert.ok((await renderToString(app)).includes(expected), `${file}: ${code} render`);
    }
  }
  mainApp.unmount();
  console.log('i18n runtime: instance isolation, lazy loading, preferences, denied storage, auxiliary app disposal, preserved input, and 7 bilingual renders passed.');
} finally { await server.close(); }
