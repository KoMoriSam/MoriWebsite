/**
 * 文章 SSG 路由。
 *
 * `article-data.generated.js` 只会在 `pnpm build` 的 prebuild 阶段生成。
 * 开发环境即使没有该文件，import.meta.glob 也只会得到空对象，
 * `/blog/:articleId?` 仍由普通动态路由处理，不影响 `pnpm dev`。
 */
const generatedDataModules = import.meta.glob(
  "./article-data.generated.js",
  {
    eager: true,
    import: "default",
  },
);

const generatedArticles = import.meta.env.DEV
  ? []
  : generatedDataModules["./article-data.generated.js"] || [];

const articleRoutes = Array.isArray(generatedArticles)
  ? generatedArticles.map((entry) => ({
      path: entry.path,
      component: () => import("@/views/Blog.vue"),
      meta: {
        title: `${entry.article?.title || "博客"} | KoMoriSam`,
        navName: "blog",
        article: entry.article,
        content: entry.content,
      },
    }))
  : [];

export default articleRoutes;
