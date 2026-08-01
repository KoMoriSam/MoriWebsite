/**
 * 构建期生成的统一 SSG 数据。
 *
 * 开发环境继续使用原有 API 请求；生产构建则让服务端渲染和客户端
 * hydration 读取同一份静态快照。
 */
const generatedDataModules = import.meta.glob("./ssg-data.generated.js", {
  eager: true,
  import: "default",
});

const ssgData = import.meta.env.DEV
  ? {}
  : generatedDataModules["./ssg-data.generated.js"] || {};

export const generatedArticles = Array.isArray(ssgData.articles)
  ? ssgData.articles
  : [];

export const generatedArticleList = generatedArticles.map((entry) => ({
  ...entry.article,
  routePath: entry.path,
  content: entry.content,
  frontmatter: entry.article,
}));

export const articleRoutes = generatedArticles.map((entry) => ({
  path: entry.path,
  component: () => import("@/views/Blog.vue"),
  meta: {
    title: `${entry.article?.title || "博客"} | KoMoriSam`,
    navName: "blog",
    hideToTop: true,
    article: entry.article,
    content: entry.content,
  },
}));

export default ssgData;
