import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { LOCALES } from '../../src/i18n/locale.js';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.cache/i18n-loading',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': path.resolve('src') } },
  server: { middlewareMode: true, watch: null, hmr: false },
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
  assert.deepEqual(calls.sort(), [
    id('en', 'common'),
    ...home.meta.localeGroups.flatMap(group => [id('zh-CN', group), id('en', group)]),
  ].sort());
  for (const key of ['image.title', 'server.title', 'sinhala.title', 'tools.imageDescription', 'kaiming.title', 'kaiming.description', 'avalon.title', 'fogport.title']) {
    assert.ok(service.i18n.global.te(key, 'en'), `Home shared messages: ${key}`);
  }
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

  // Cold non-Chinese sessions must preload English, including missing groups.
  const chineseHome = await messageLoaders[id('zh-CN', 'home')]();
  for (const code of ['fr', 'si']) {
    const fallbackCalls = [];
    const fallbackLoaders = Object.fromEntries(Object.entries(messageLoaders).map(([key, loader]) => [key, async () => {
      fallbackCalls.push(key);
      const messages = structuredClone(await loader());
      if ([id(code, 'home'), id('en', 'home')].includes(key)) {
        delete messages.home.hero.explore;
        if (key === id(code, 'home')) delete messages.home.hero.read;
      }
      return messages;
    }]));
    delete fallbackLoaders[id(code, 'tools')];
    const fallback = createLocaleService({ loaders: fallbackLoaders });
    fallback.i18n.global.missingWarn = false;
    fallback.i18n.global.fallbackWarn = false;
    await fallback.loadRoute(home);
    await fallback.switchLocale(code, { save: false });
    assert.equal(fallback.locale.value, code);
    assert.equal(fallback.t('home.hero.read'), 'Read the blog', `${code}: prefer English for a missing key`);
    assert.equal(fallback.text('阅读博客'), 'Read the blog', `${code}: source-text lookups share the fallback`);
    assert.equal(fallback.t('home.hero.explore'), chineseHome.home.hero.explore, `${code}: Chinese is the final fallback`);
    assert.equal(fallback.t('tools.count', { count: 2 }), 'Tools: 2', `${code}: missing groups use English`);
    assert.equal(fallbackCalls.filter(key => key === id('en', 'home')).length, 1, `${code}: English loads once without an earlier English session`);
    await fallback.switchLocale('zh-CN', { save: false });
    assert.equal(fallback.t('home.hero.read'), chineseHome.home.hero.read, 'Chinese stays preferred after visiting another language');
    fallback.i18n.dispose();
  }

  // Each SSG app receives its own catalog, including its source-text index.
  const isolated = createLocaleService();
  assert.equal(isolated.locale.value, 'zh-CN');
  assert.equal(isolated.i18n.global.te('home.hero.read'), false);
  assert.equal(isolated.text('阅读博客'), '阅读博客');
  const render = () => {
    const ssr = createSSRApp({ render: () => h('p', isolated.t('home.hero.read')) });
    isolated.install(ssr);
    return renderToString(ssr);
  };
  await isolated.loadRoute(home);
  assert.ok((await render()).includes('阅读博客'));
  await isolated.switchLocale('en', { save: false });
  assert.ok((await render()).includes('Read the blog'));
  await isolated.switchLocale('fr-CA', { save: false });
  assert.equal(isolated.locale.value, 'fr');
  assert.equal(isolated.commentLocale.value, 'fr');
  assert.ok((await render()).includes('Lire le blog'));
  assert.equal(isolated.i18n.global.te('image.outputFormat', 'fr'), false, 'French tool messages stay lazy');
  await isolated.loadRoute(image);
  assert.equal(isolated.t('image.outputFormat'), 'Format de sortie');
  assert.equal(isolated.number(1234.5), new Intl.NumberFormat('fr').format(1234.5));
  await isolated.loadRoute(router.resolve('/licenses'));
  assert.equal(isolated.t('licenses.noticeLanguage'), 'Langue des mentions');

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
      for (const { code } of LOCALES) {
        assert.ok(messageLoaders[id(code, group)], `${route.path}: missing ${code}/${group}`);
      }
    }
    await service.loadRoute(router.resolve({ path: route.path }));
  }
  service.i18n.dispose();
  isolated.i18n.dispose();
  racing.i18n.dispose();
  console.log("检查通过：按页加载语言、英文优先回退、语言切换与显示格式。");
} finally {
  await server.close();
}
