import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createSSRApp, h } from "vue";
import { createPinia } from "pinia";
import { renderToString } from "@vue/server-renderer";
import { createRouter, createMemoryHistory } from "vue-router";
import { createHead } from "@unhead/vue/server";
import { parse } from "vue/compiler-sfc";

// Catch the original failure even when a quantity and its label use separate
// interpolations: searching message placeholders alone cannot detect it.
const fragments = /^(?:reader\.chapters\.(?:characters|reads|countUnit|volumes)|blog\.list\.(?:countUnit|articleLabel|minutes|found|viewing)|common\.pagination\.(?:of|page|pages)|sinhala\.characters|image\.frames)$/;
for (const root of ["src/views", "src/components", "src/composables"]) {
  for (const name of fs.readdirSync(root, { recursive: true })) {
    if (!/\.(?:vue|js)$/.test(name)) continue;
    const file = path.join(root, name);
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:translate|\bt)\(["']([^"']+)["']/g)) {
      assert.ok(!fragments.test(match[1]), `${file}: quantity fragment ${match[1]}`);
    }
    if (name.endsWith(".vue")) {
      const { descriptor, errors } = parse(source);
      assert.equal(errors.length, 0, file);
      const visit = (node) => {
        const expressions = (node.children || []).filter((child) => child.type === 5);
        for (let index = 1; index < expressions.length; index++) {
          const pair = expressions.slice(index - 1, index + 1).map((child) => child.content.content);
          assert.ok(!pair.some((value) => /translate\(["'](?:common\.counts\.|reader\.chapters\.summary)/.test(value)) ||
            !pair.some((value) => /^\s*(?:\w+\.)*(?:length|count|total|wordCount)\s*$/i.test(value)),
          `${file}: render a complete quantity message`);
        }
        for (const child of node.children || []) visit(child);
      };
      if (descriptor.template?.ast) visit(descriptor.template.ast);
    }
  }
}

const server = await createServer({
  configFile: false,
  cacheDir: "node_modules/.cache/i18n-quantities",
  plugins: [vue()],
  define: { "import.meta.env.VITE_ANALYTICS_API": JSON.stringify("http://localhost/quantity-check") },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { "@": path.resolve("src") } },
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
const text = (html) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
let renders = 0;
try {
  const { createLocaleService } = await server.ssrLoadModule("/src/i18n/index.js");
  const { useAnalyticsStore } = await server.ssrLoadModule("/src/stores/analyticsStore.js");
  const { useCommentCountsStore } = await server.ssrLoadModule("/src/stores/commentCountsStore.js");
  const { useNovelStore } = await server.ssrLoadModule("/src/stores/novel/index.js");
  const components = Object.fromEntries(await Promise.all([
    ["list", "views/blog/ArticleList.vue"], ["article", "views/blog/ArticleReader.vue"],
    ["novel", "views/novel/NovelDetail.vue"], ["chapters", "components/novel/ChapterList.vue"],
    ["tools", "views/Tools.vue"], ["games", "views/Games.vue"],
    ["images", "views/tools/ImageConverter.vue"], ["sinhala", "views/tools/SinhalaFontConverter.vue"],
    ["licenses", "views/Licenses.vue"],
    ["rulebook", "components/games/avalon/display/Rulebook.vue"],
    ["tile", "components/games/fogport/display/TileFace.vue"],
    ["history", "components/games/fogport/display/History.vue"],
  ].map(async ([key, file]) => [key, (await server.ssrLoadModule(`/src/${file}`)).default])));
  const samples = (n) => Array.from({ length: n }, (_, i) => ({
    id: `sample-${i}`, uuid: `sample-${i}`, title: `Sample ${i}`, date: "2026-09-25", uploadDate: "2026-09-25",
    length: 1, tags: [], volumeTitle: "Sample volume", permalink: `sample-${i}`,
  }));
  for (const lang of ["zh-CN", "en", "si"]) {
    const locale = createLocaleService();
    await locale.loadRoute({ meta: { localeGroups: ["blog", "reader", "novel", "home", "tools", "games", "avalon", "fogport", "image-converter", "sinhala-font-converter", "licenses"] } });
    await locale.switchLocale(lang, { save: false });
    for (const n of [0, 1, 14, 1234]) {
      const rendered = locale.t("common.counts.articles", { count: locale.number(n) }, n);
      if (lang === "si") assert.equal(rendered, `ලිපි ${locale.number(n)}ක්`);
      if (lang === "en") assert.equal(rendered, `${locale.number(n)} ${n === 1 ? "article" : "articles"}`);
    }
    for (const n of [0, 1, 14]) {
      const chapters = samples(n);
      async function render(key, props = {}, route = "/blog", hasFailure = false) {
        const pinia = createPinia();
        const router = createRouter({ history: createMemoryHistory(), routes: [
          ...["home", "blog", "novel", "tools", "games", "changelog", "announcements", "licenses", "image-converter", "server-status", "sinhala-font-converter", "kaiming", "avalon", "fogport"].map((name) => ({ name, path: `/${name}`, component: { render: () => null } })),
          { path: "/:pathMatch(.*)*", component: { render: () => null } },
        ] });
        await router.push(route);
        await router.isReady();
        const app = createSSRApp({
          setup() {
            const analytics = useAnalyticsStore(pinia);
            analytics.contentTypeReads.article = n;
            analytics.contentTypeReads.novel = n;
            const comments = useCommentCountsStore(pinia);
            // Supply statistics at the store boundary; render the real templates,
            // including their ClientOnly branches, without contacting live APIs.
            analytics.getContentReads = () => n;
            analytics.getContentStatus = () => "ready";
            comments.getContentCommentTotal = () => n;
            comments.getContentCommentStatus = () => "ready";
            comments.getContentCollectionTotal = () => n;
            comments.getContentCollectionStatus = () => "ready";
            const novel = useNovelStore(pinia);
            novel.flatChapters = chapters;
            novel.chapters = n ? [{ volumeInfo: { uuid: "volume", title: "Sample volume" }, chapters }] : [];
            novel.isLoadingList = false;
            let component = components[key];
            if (key === "images") {
              // Seed the private queue only in this SSR fixture. All messages,
              // computed summaries, branches and markup remain production code.
              component = { ...component, setup(props, context) {
                const state = components.images.setup(props, context);
                state.queue.value = Array.from({ length: n }, (_, index) => ({
                  id: index, file: { name: `sample-${index}.png`, size: 1024 },
                  format: "png", width: 16, height: 16, frameCount: 2,
                  status: hasFailure && index === 0 ? "error" : "done", progress: 100,
                  outputs: [], previewFrames: [], resultPreviewFrames: [],
                }));
                return state;
              } };
            }
            return () => h(component, props);
          },
        });
        app.use(router); app.use(pinia); app.use(createHead()); locale.install(app);
        app.component("ClientOnly", { setup: (_, { slots }) => () => slots.default?.() });
        app.directive("fade-in", { getSSRProps: () => ({}) });
        const html = await renderToString(app);
        renders++;
        assert.ok(!/common\.counts\.|blog\.list\.summary/.test(text(html)), `${key}/${lang}: translated keys`);
        return { html, text: text(html) };
      }
      const list = await render("list", { articles: chapters });
      assert.ok(list.text.includes(locale.t("common.counts.articles", { count: n }, n)), `${lang}/${n}: list article count`);
      if (n) {
        assert.ok(list.html.includes('<strong class="font-semibold text-base-content">'), "bold count survives interpolation");
        if (lang === "si") {
          assert.ok(list.text.includes(`මුළු ලිපි ගණන ${n}කි`));
          assert.ok(list.text.includes(`කියවීම් ${n}ක්`));
          assert.ok(list.text.includes(`අදහස් ${n}ක්`));
          assert.ok(!list.text.includes(`${n} ලිපි`));
        }
      }
      const filtered = await render("list", { articles: samples(14) }, `/blog?q=${n === 0 ? "absent" : n === 1 ? "Sample%2013" : "Sample"}`);
      if (lang === "si") assert.ok(filtered.text.includes(`ගැළපෙන ලිපි ගණන ${n}කි`));
      const article = await render("article", { article: { ...samples(1)[0], length: n }, content: "Sample paragraph." });
      if (lang === "si") {
        assert.ok(article.text.includes(`කියවීම් ${n}ක්`));
        assert.ok(article.text.includes(`අදහස් ${n}ක්`));
        if (n) assert.ok(article.text.includes(`අක්ෂර ${n}ක් පමණ`));
      }
      const novel = await render("novel", {}, "/novel");
      const chapterList = await render("chapters", {}, "/novel");
      const images = await render("images", {}, "/tools/image-converter");
      const history = await render("history", { game: {
        players: [{ id: "player", nickname: "Sample", seat: 0 }], history: [],
        scoring: [{ era: "canal", rows: [{ playerId: "player", links: n, industries: 0, bonus: 0 }] }],
      } }, "/games/fogport");
      const tile = await render("tile", { detail: true, tile: {
        type: "beer", level: 1, cost: n, vp: n, income: n, link: n,
        canal: true, rail: true, develop: true,
      } }, "/games/fogport");
      if (lang === "si") {
        assert.ok(novel.text.includes(`පරිච්ඡේද ${n}ක්`));
        assert.ok(novel.text.includes(`මුළු අක්ෂර ගණන ${n}කි`));
        assert.ok(chapterList.text.includes(`පරිච්ඡේද ගණන ${n}කි`));
        assert.ok(history.text.includes(`ජයග්‍රාහී ලකුණු ${n}කි`));
        assert.ok(tile.text.includes(`ජය ලකුණු: ${n}`));
        if (n) assert.ok(images.text.includes(`මුළු ගොනු ගණන ${n}කි · සම්පූර්ණ කළ ගණන ${n}කි`));
      }
      if (n === 14) {
        await render("tools", {}, "/tools");
        const failedImages = await render("images", {}, "/tools/image-converter", true);
        const converter = await render("sinhala", {}, "/tools/sinhala-font-converter");
        await render("licenses", {}, "/licenses");
        const games = await render("games", {}, "/games");
        const rulebook = await render("rulebook", { playerCount: 5 }, "/games/avalon");
        if (lang === "si") {
          assert.ok(failedImages.text.includes("සම්පූර්ණ කළ ගණන 13කි · සමහර ගොනු අසාර්ථක විය"));
          assert.ok(converter.text.includes("අක්ෂර 0ක්"));
          assert.ok(games.text.includes("ක්‍රීඩකයන් 5–10 දෙනෙක්"));
          assert.ok(rulebook.text.includes("යහපත් ක්‍රීඩකයන් 3 දෙනෙක්"));
          assert.ok(rulebook.text.includes("අයහපත් ක්‍රීඩකයන් 2 දෙනෙක්"));
        }
      }
    }
  }
  console.log(`i18n quantities: ${renders} actual component renders passed across zh-CN/en/si, with 0/1/many and formatted counts.`);
} finally {
  await server.close();
}
