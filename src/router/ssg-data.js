import {
  getBlogPagePaths,
  getBlogTotalPages,
} from "@/constants/blog-pagination";

/**
 * 客户端路由只包含文章元数据。正文通过每页 initialState 恢复，
 * 完整快照仅供 SSR 和搜索索引生成使用。
 */
const generatedDataModules = import.meta.glob("./article-metadata.generated.js", {
  eager: true,
  import: "default",
});

const articleMetadata = import.meta.env.DEV
  ? []
  : generatedDataModules["./article-metadata.generated.js"] || [];

export const generatedArticles = Array.isArray(articleMetadata)
  ? articleMetadata
  : [];

export const generatedArticleList = generatedArticles.map((entry) => ({
  ...entry.article,
  routePath: entry.path,
  frontmatter: entry.article,
}));
export const generatedBlogTotalPages = getBlogTotalPages(
  generatedArticleList.length,
);

export const generatedBlogPagePaths = getBlogPagePaths(
  generatedArticleList.length,
);

export const articleRoutes = generatedArticles.map((entry) => ({
  path: entry.path,
  component: () => import("@/views/Blog.vue"),
  meta: {
    title: `${entry.article?.title || "博客"} | 远方之森`,
    navName: "blog",
    localeGroups: ["blog", "reader"],
    hideToTop: true,
    article: entry.article,
    // 文章列表用于计算上下篇导航，SSR 预渲染阶段即可生成完整翻页按钮
    articles: generatedArticleList,
  },
}));
