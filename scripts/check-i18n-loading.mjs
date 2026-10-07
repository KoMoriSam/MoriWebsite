import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.cache/i18n-loading',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
});

try {
  const { createLocaleService } = await server.ssrLoadModule('/src/i18n/index.js');
  const { messageLoaders } = await server.ssrLoadModule('/src/i18n/message-groups.js');
  const { default: router, routes } = await server.ssrLoadModule('/src/router/index.js');
  const calls = [];
  let failHome = true;
  const loaders = Object.fromEntries(Object.entries(messageLoaders).map(([key, loader]) => [key, async () => {
    calls.push(key);
    if (key === './messages/si/home.json' && failHome) {
      failHome = false;
      throw new Error('network');
    }
    return loader();
  }]));
  const service = createLocaleService({ loaders });
  const home = router.resolve('/');
  const image = router.resolve('/tools/image-converter');
  const avalon = router.resolve('/games/avalon');
  const id = (code, group) => `./messages/${code}/${group}.json`;

  await service.loadRoute(home);
  await service.switchLocale('en', { save: false });
  assert.deepEqual(calls.sort(), [id('zh-CN', 'home'), id('en', 'common'), id('en', 'home')].sort());
  assert.equal(service.i18n.global.te('avalon.phases.discussion', 'en'), false);
  assert.equal(service.text('正在处理 2/10 帧'), 'Processing frame 2/10');
  await Promise.all([service.loadRoute(image), service.loadRoute(image)]);
  assert.equal(calls.filter(key => key === id('en', 'image-converter')).length, 1);
  assert.equal(calls.filter(key => key === id('zh-CN', 'image-converter')).length, 1);
  await service.loadRoute(home);
  await assert.rejects(service.switchLocale('si', { save: false }), /network/);
  assert.equal(service.locale.value, 'en');
  await service.switchLocale('si', { save: false });
  assert.equal(calls.filter(key => key === id('si', 'home')).length, 2);
  assert.equal(calls.filter(key => key === id('si', 'common')).length, 1);
  assert.ok(!calls.includes(id('si', 'image-converter')), 'Language switching only loads current page');
  const count = calls.length;
  await service.loadRoute(home);
  assert.equal(calls.length, count, 'Revisiting a page uses cached messages');

  // Each SSG app receives its own catalog, including its source-text index.
  const isolated = createLocaleService();
  assert.equal(isolated.locale.value, 'zh-CN');
  assert.equal(isolated.i18n.global.te('pages.home.readTheBlog'), false);
  assert.equal(isolated.text('阅读博客'), '阅读博客');
  const render = () => {
    const ssr = createSSRApp({ render: () => h('p', isolated.t('pages.home.readTheBlog')) });
    isolated.install(ssr);
    return renderToString(ssr);
  };
  await isolated.loadRoute(home);
  assert.ok((await render()).includes('阅读博客'));
  await isolated.switchLocale('en', { save: false });
  assert.ok((await render()).includes('Read the blog'));

  // A switch in flight must also load the page selected during that switch.
  let releaseHome;
  let homeStarted;
  const homeReady = new Promise(resolve => { homeStarted = resolve; });
  const homeGate = new Promise(resolve => { releaseHome = resolve; });
  const raceCalls = [];
  const raceLoaders = Object.fromEntries(Object.entries(messageLoaders).map(([key, loader]) => [key, async () => {
    raceCalls.push(key);
    if (key === id('en', 'home')) {
      homeStarted();
      await homeGate;
    }
    return loader();
  }]));
  const racing = createLocaleService({ loaders: raceLoaders });
  await racing.loadRoute(home);
  const switching = racing.switchLocale('en', { save: false });
  await homeReady;
  const navigating = racing.loadRoute(avalon);
  releaseHome();
  await Promise.all([switching, navigating]);
  assert.equal(racing.locale.value, 'en');
  assert.equal(racing.t('avalon.title'), 'Avalon');
  assert.equal(raceCalls.filter(key => key === id('en', 'avalon')).length, 1);
  assert.ok(!raceCalls.includes(id('en', 'fogport')));

  // Every page declares existing groups, including development and game routes.
  for (const route of routes.filter(route => !route.redirect)) {
    assert.ok(route.meta.localeGroups?.length, `${route.path}: missing locale groups`);
    for (const group of route.meta.localeGroups) {
      for (const code of ['zh-CN', 'en', 'si']) {
        assert.ok(messageLoaders[id(code, group)], `${route.path}: missing ${code}/${group}`);
      }
    }
    await service.loadRoute(router.resolve({ path: route.path }));
  }
  service.i18n.dispose();
  isolated.i18n.dispose();
  racing.i18n.dispose();
  console.log('i18n loading: page isolation, cache, request deduplication, retry, navigation/switch races, SSG isolation, and bilingual SSR passed.');
} finally {
  await server.close();
}
