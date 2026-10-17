import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import { renderToString } from "@vue/server-renderer";
import { createRouter, createMemoryHistory } from "vue-router";
import { createHead, renderSSRHead } from "@unhead/vue/server";
import { resolveArticleVersion } from "../src/utils/blog/article-versions.js";
import fs from "node:fs";
import fm from "front-matter";

const source = {
  id: "sample", path: "sample.md", title: "中文标题", summary: "中文摘要", date: "2026-09-25", tags: ["科普"],
  translations: {
    en: { path: "en/sample.md", title: "English title", summary: "English summary", machineTranslated: true },
    si: { path: "si/sample.md", title: "සිංහල ලිපිය", summary: "සිංහල සාරාංශය", machineTranslated: false },
  },
};
const server = await createServer({
  configFile: false, cacheDir: "node_modules/.cache/blog-translations-ssr", plugins: [vue()],
  optimizeDeps: { noDiscovery: true, include: [] }, resolve: { alias: { "@": path.resolve("src") } },
  server: { middlewareMode: true, watch: null }, appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.vue");
  const { default: Blog } = await server.ssrLoadModule("/src/views/Blog.vue");
  const { routes } = await server.ssrLoadModule("/src/router/index.js");
  const { createLocaleService } = await server.ssrLoadModule("/src/i18n/index.js");
  const paragraphIds = [];
  for (const [lang, uiLocale, legacy] of [["en", "zh-CN", false], ["si", "zh-CN", false], ["zh-CN", "en", false], ["zh-CN", "zh-CN", true]]) {
    const article = resolveArticleVersion(source, lang);
    const content = { en: "English body paragraph.", si: "සිංහල අන්තර්ගතය.", "zh-CN": "中文正文段落。" }[lang];
    const routePath = legacy ? "/blog/sample" : article.routePath;
    const router = createRouter({ history: createMemoryHistory(), routes: [{
      path: routePath, component: Blog,
      meta: { article, articles: [source], legacyArticle: legacy, localeGroups: ["blog", "reader"], pageData: { article: { id: source.id, lang, content } } },
    }, ...routes] });
    await router.push(routePath); await router.isReady();
    const locale = createLocaleService(); await locale.loadRoute(router.currentRoute.value);
    await locale.switchLocale(uiLocale, { save: false });
    const head = createHead();
    const app = createSSRApp(App); app.use(router); app.use(createPinia()); app.use(head); locale.install(app);
    app.directive("fade-in", { getSSRProps: () => ({}) });
    app.component("ClientOnly", { render: () => null });
    const html = await renderToString(app);
    const seo = await renderSSRHead(head);
    assert.ok(html.includes(content), `${lang}: SSR must contain translated body`);
    assert.ok(html.includes(article.title), `${lang}: SSR must contain translated title`);
    assert.ok(seo.headTags.includes(`<title>${article.title} | 远方之森</title>`));
    assert.ok(seo.headTags.includes(`rel="canonical" href="https://komori.cc/blog/sample/${lang}"`));
    for (const language of ["zh-CN", "en", "si"]) {
      assert.ok(seo.headTags.includes(`hreflang="${language}" href="https://komori.cc/blog/sample/${language}"`));
    }
    assert.ok(seo.headTags.includes(`"inLanguage":"${lang}"`));
    assert.ok(seo.htmlAttrs.includes(`lang="${lang}"`));
    assert.ok(html.includes(`lang="${lang}"`));
    assert.ok(seo.headTags.includes(`content="${{ en: "en_US", si: "si_LK", "zh-CN": "zh_CN" }[lang]}"`));
    assert.equal(html.includes("本文由机器翻译"), lang === "en");
    const ids = [...html.matchAll(/data-reader-paragraph-id="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(ids.length, `${lang}: paragraph comment IDs must exist`);
    paragraphIds.push(ids);
  }
  assert.deepEqual(paragraphIds[0], paragraphIds[1], "translations share paragraph discussions");
  assert.deepEqual(paragraphIds[0], paragraphIds[2]);
  {
    const { default: Reader } = await server.ssrLoadModule('/src/views/blog/ArticleReader.vue');
    const router = createRouter({history:createMemoryHistory(), routes});
    await router.push('/blog/sample/zh-CN');
    const names = {
      'zh-CN': {'zh-CN':'中文（简体）', en:'英语', si:'僧伽罗语'},
      en: {'zh-CN':'Chinese (Simplified)', en:'English', si:'Sinhala'},
      si: {'zh-CN':'චීන භාෂාව (සරල)', en:'ඉංග්‍රීසි භාෂාව', si:'සිංහල භාෂාව'},
    };
    for (const uiLocale of ['zh-CN', 'en', 'si']) {
      const locale = createLocaleService();
      await locale.loadRoute({meta:{localeGroups:['blog','reader']}});
      await locale.switchLocale(uiLocale, {save:false});
      locale.localeRestored.value = true;
      for (const lang of ['zh-CN', 'en', 'si']) {
        const article = resolveArticleVersion({...source, sourceLocale:lang, tags:[], translations:{}}, uiLocale);
        const app = createSSRApp(Reader, {article, content:'Source only body'});
        app.use(router); app.use(createPinia()); locale.install(app);
        app.component('ClientOnly',{render:()=>null});
        app.directive('fade-in',{getSSRProps:()=>({})});
        const html = await renderToString(app);
        if (lang === uiLocale) assert.ok(!html.includes('role="status"'), 'available languages need no fallback notice');
        else {
          const requested = names[uiLocale][uiLocale];
          const current = names[uiLocale][lang];
          const expected = {
            'zh-CN': `本文暂无${requested}版本，当前显示${current}版本。`,
            en: `This article is not available in ${requested}. Showing ${current} instead.`,
            si: `මෙම ලිපිය ${requested} භාෂාවෙන් නොමැත. ඒ වෙනුවට ${current} අනුවාදය පෙන්වයි.`,
          }[uiLocale];
          assert.ok(html.includes(expected), `${uiLocale}/${lang}: localize both language names in the notice`);
        }
        if (uiLocale === 'en') assert.ok(html.includes('aria-label="Back to articles"'), 'return control remains available without tags');
        assert.ok(!html.includes('<select'), 'do not offer unavailable article languages');
      }
      for (const sourceLocale of ['zh-CN', 'en', 'si']) {
        const lang = sourceLocale === 'en' ? 'si' : 'en';
        const article = resolveArticleVersion({...source, sourceLocale, translations:{
          [lang]: {title:'Translated title', machineTranslated:true},
        }}, lang);
        const app = createSSRApp(Reader, {article, content:'Machine translated body'});
        app.use(router); app.use(createPinia()); locale.install(app);
        app.component('ClientOnly',{render:()=>null});
        app.directive('fade-in',{getSSRProps:()=>({})});
        const html = await renderToString(app);
        const notice = html.match(/<p role="note"[^>]*>([\s\S]*?)<\/p>/)?.[1];
        assert.ok(notice?.includes(`href="/blog/sample/${sourceLocale}"`), `${uiLocale}/${sourceLocale}: machine notice links to the source language`);
        const label = {'zh-CN':'原文', en:'the original', si:'මුල් ලිපිය'}[uiLocale];
        assert.match(notice, new RegExp(`<a[^>]*>\\s*${label}\\s*</a>`));
        assert.ok(!notice.includes('{original}'));
      }
    }
    console.log('Fallback notices: all nine UI/content language combinations use localized language names.');
    console.log('Machine notices: all nine UI/source language combinations link to the original article.');
  }
  if (fs.existsSync('mock/article/index.json')) {
    const { default: Renderer } = await server.ssrLoadModule('/src/components/markdown/Renderer.vue');
    for (const article of JSON.parse(fs.readFileSync('mock/article/index.json', 'utf8')).filter((article) => Object.keys(article.translations || {}).length)) {
      let originalIds;
      for (const lang of [article.sourceLocale, ...Object.keys(article.translations)]) {
        const version = resolveArticleVersion(article, lang);
        const body = fm(fs.readFileSync(path.join('mock/article', version.path), 'utf8')).body;
        const router = createRouter({ history: createMemoryHistory(), routes: [{path:'/reader',component:Renderer}] });
        await router.push('/reader');
        const service = createLocaleService(); await service.loadRoute({meta:{localeGroups:['blog','reader']}});
        const app = createSSRApp(Renderer, {content:body, lang, headerData:{uuid:article.id,title:version.title,page:1,sourceType:'article'}});
        app.use(router); app.use(createPinia()); service.install(app); app.directive('fade-in',{getSSRProps:()=>({})});
        const html = await renderToString(app);
        const ids = [...html.matchAll(/data-reader-paragraph-id="([^"]+)"/g)].map((match) => match[1]);
        if (lang === article.sourceLocale) originalIds = ids;
        else assert.deepEqual(ids, originalIds, `${version.path}: mock translations preserve paragraph discussions`);
      }
    }
    console.log('Mock translations: source and translated Markdown produce identical paragraph discussion IDs.');
  }
  console.log("Blog SSR: real reader renders Chinese, English and Sinhala bodies, machine notices, canonical, hreflang, JSON-LD, Open Graph and shared paragraph IDs independently of UI locale.");
} finally { await server.close(); }
