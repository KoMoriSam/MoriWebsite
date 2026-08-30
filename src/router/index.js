import {
  articleRoutes,
  generatedArticleList,
  generatedBlogTotalPages,
} from "./ssg-data";

import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from "vue-router";
import {
  TEST_SECTIONS,
  TEST_SECTION_COMPONENTS,
} from "@/constants/test-sections";
import { MARKDOWN_SAMPLES } from "@/views/test/markdown-samples";

if (
  !import.meta.env.SSR &&
  typeof window !== "undefined" &&
  !globalThis.__moriModalFallbackDispatcherInstalled
) {
  globalThis.__moriModalFallbackDispatcherInstalled = true;
  window.addEventListener(
    "popstate",
    (event) => {
      const handleModalFallback = globalThis.__moriModalFallbackPopstateHandler;
      if (typeof handleModalFallback !== "function") return;

      event.stopImmediatePropagation();
      handleModalFallback(event);
    },
    { capture: true },
  );
}

export const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/Home.vue"),
    meta: { title: "主页 | 远方之森", navName: "home" },
  },
  {
    path: "/home",
    redirect: () => ({
      name: "home",
    }),
  },
  // 生产构建时由统一的 SSG 数据快照提供具体文章路径。
  // 开发环境该数组为空，不依赖 generated 文件。
  ...articleRoutes,
  {
    path: "/blog",
    name: "blog",
    component: () => import("@/views/Blog.vue"),
    meta: {
      title: "博客 | 远方之森",
      navName: "blog",
      blogList: true,
      blogTotalPages: generatedBlogTotalPages,
      articles: generatedArticleList,
    },
  },
  {
    path: "/blog/page/:page(\\d+)",
    name: "blog-page",
    component: () => import("@/views/Blog.vue"),
    meta: {
      title: "博客 | 远方之森",
      navName: "blog",
      blogList: true,
      blogTotalPages: generatedBlogTotalPages,
      articles: generatedArticleList,
    },
  },
  {
    path: "/changelog",
    name: "changelog",
    component: () => import("@/views/Changelog.vue"),
    meta: { title: "更新日志 | 远方之森" },
  },
  {
    path: "/licenses",
    name: "licenses",
    component: () => import("@/views/Licenses.vue"),
    meta: { title: "开源许可与第三方声明 | 远方之森" },
  },
  {
    path: "/blog/:articleId",
    name: "blog-article",
    component: () => import("@/views/Blog.vue"),
    meta: {
      title: "博客 | 远方之森",
      navName: "blog",
      hideToTop: true,
    },
  },
  {
    path: "/novel",
    name: "novel",
    component: () => import("@/views/Novel.vue"),
    meta: { title: "《向远方》 | 远方之森", navName: "novel" },
  },
  {
    path: "/novel/:volumeSlug/:chapterSlug?",
    name: "novel-reader",
    component: () => import("@/views/Novel.vue"),
    meta: {
      title: "《向远方》 | 远方之森",
      navName: "novel",
      hideToTop: true,
    },
  },
  {
    path: "/tools",
    name: "tools",
    component: () => import("@/views/Tools.vue"),
    meta: { title: "工具集 | 远方之森", navName: "tools" },
  },
  {
    path: "/tools/server-status",
    name: "server-status",
    component: () => import("@/views/tools/ServerStatus.vue"),
    meta: { title: "Minecraft 服务器状态 | 远方之森", navName: "tools" },
  },
  {
    path: "/tools/sinhala-font-converter",
    name: "sinhala-font-converter",
    component: () => import("@/views/tools/SinhalaFontConverter.vue"),
    meta: { title: "僧伽罗字体编码转换器 | 远方之森", navName: "tools" },
  },
  {
    path: "/kaiming",
    name: "kaiming",
    component: () => import("@/views/projects/Kaiming.vue"),
    meta: { title: "开明标点 | 远方之森" },
  },
  // 仅开发环境可见，生产构建自动移除
  ...(import.meta.env.DEV
    ? [
        {
          path: "/test",
          name: "test",
          component: () => import("@/views/Test.vue"),
          meta: { title: "测试 | 远方之森" },
        },
        ...TEST_SECTIONS.map((section) => ({
          path: `/test/${section.id}`,
          name: section.id,
          component: TEST_SECTION_COMPONENTS[section.id],
          meta: {
            title: `${section.title}测试 | 远方之森`,
            navName: "test",
          },
        })),
        ...MARKDOWN_SAMPLES.map(({ slug, name }) => ({
          path: `/test/markdown/${slug}`,
          name: slug,
          component: TEST_SECTION_COMPONENTS.markdown,
          meta: {
            title: `${name} | Markdown 测试`,
            navName: "test",
          },
        })),
      ]
    : []),
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: { title: "404! | 远方之森" },
  },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (globalThis.__moriModalFallbackRestoring) return false;
    if (savedPosition) return savedPosition;
    if (to.hash && typeof document !== "undefined") {
      const rawHash = to.hash.slice(1);
      let anchorId = rawHash;

      try {
        anchorId = decodeURIComponent(rawHash);
      } catch {
        // 非法转义交给原始 ID 尝试匹配。
      }

      const target = document.getElementById(anchorId);
      if (target) return { el: target, top: 96 };
    }
    if (to.path !== from.path) return { top: 0 };
    return false;
  },
});

export default router;

router.beforeEach((to, from, next) => {
  // 兼容旧的 .html 地址
  if (to.path === "/index.html") {
    next({
      path: "/",
      query: to.query,
      hash: to.hash,
      replace: true,
    });
    return;
  }

  if (/\.html$/i.test(to.path)) {
    const normalizedPath = to.path.replace(/\.html$/i, "") || "/";

    next({
      path: normalizedPath,
      query: to.query,
      hash: to.hash,
      replace: true,
    });
    return;
  }

  const legacyArticleId =
    typeof to.query.article === "string" ? to.query.article.trim() : "";
  if (!to.params.articleId && legacyArticleId && to.path === "/blog") {
    const nextQuery = { ...to.query };
    delete nextQuery.article;
    next({
      name: "blog-article",
      params: { articleId: legacyArticleId },
      query: nextQuery,
      hash: to.hash,
      replace: true,
    });
    return;
  }

  const currentPath = to.fullPath.split("#")[0];
  const previousPath = from.fullPath.split("#")[0];

  if (currentPath === previousPath && to.hash !== from.hash) {
    next();
    return;
  }

  if (to.path === "/novel" || to.path.startsWith("/novel/")) {
    next();
    return;
  }

  if (typeof document !== "undefined") {
    document.title = to.meta.title || "Welcome KoMoriSam's Website!";
  }

  next();
});

router.afterEach((to, from) => {
  const currentPath = to.fullPath.split("#")[0];
  const previousPath = from.fullPath.split("#")[0];

  if (currentPath === previousPath && to.hash !== from.hash) {
    return;
  }

  if (to.path === "/novel" || to.path.startsWith("/novel/")) {
    return;
  }

  if (typeof document !== "undefined") {
    document.title = to.meta.title || "Welcome KoMoriSam's Website!";
  }
});
