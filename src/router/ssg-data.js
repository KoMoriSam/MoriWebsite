import {
  getBlogPagePaths,
  getBlogTotalPages,
} from "@/constants/blog-pagination";

export let generatedArticleList = [];
export let generatedBlogPagePaths = [];

export function installArticleMetadata(entries, routes) {
  generatedArticleList = entries
    .filter(
      (entry) =>
        !entry.legacy &&
        (!entry.article.lang ||
          entry.article.lang === (entry.article.sourceLocale || "zh-CN")),
    )
    .map((entry) => ({
      ...entry.article,
      routePath: entry.path,
      frontmatter: entry.article,
    }));
  generatedBlogPagePaths = getBlogPagePaths(generatedArticleList.length);
  const totalPages = getBlogTotalPages(generatedArticleList.length);
  const articleRoutes = entries.map((entry) => ({
    path: entry.path,
    component: () => import("@/views/Blog.vue"),
    meta: {
      title: `${entry.article?.title || "博客"} | 远方之森`,
      navName: "blog",
      localeGroups: ["blog", "reader"],
      hideToTop: true,
      article: entry.article,
      legacyArticle: entry.legacy === true,
      articles: generatedArticleList,
    },
  }));
  return [
    ...articleRoutes,
    ...routes.map((route) => {
      if (!route.meta?.blogList && route.name !== "blog-article-locale")
        return route;
      return {
        ...route,
        meta: {
          ...route.meta,
          articles: generatedArticleList,
          blogTotalPages: totalPages,
        },
      };
    }),
  ];
}
