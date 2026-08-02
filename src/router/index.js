import NProgress from "nprogress";
NProgress.configure({
  easing: "ease", // 动画方式
  speed: 500, // 递增进度条的速度
  showSpinner: false, // 是否显示加载ico
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
});

import { articleRoutes, generatedArticleList } from "./ssg-data";

import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
} from "vue-router";

export const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("@/views/Home.vue"),
    meta: { title: "主页 | KoMoriSam", navName: "home" },
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
      title: "博客 | KoMoriSam",
      navName: "blog",
      articles: generatedArticleList,
    },
  },
  {
    path: "/changelog",
    name: "changelog",
    component: () => import("@/views/Changelog.vue"),
    meta: { title: "更新日志 | KoMoriSam" },
  },
  {
    path: "/licenses",
    name: "licenses",
    component: () => import("@/views/Licenses.vue"),
    meta: { title: "开源许可与第三方声明 | KoMoriSam" },
  },
  {
    path: "/blog/:articleId",
    name: "blog-article",
    component: () => import("@/views/Blog.vue"),
    meta: {
      title: "博客 | KoMoriSam",
      navName: "blog",
      hideToTop: true,
    },
  },
  {
    path: "/novel",
    name: "novel",
    component: () => import("@/views/Novel.vue"),
    meta: { title: "向远方 | KoMoriSam", navName: "novel" },
  },
  {
    path: "/novel/:volumeSlug/:chapterSlug?",
    name: "novel-reader",
    component: () => import("@/views/Novel.vue"),
    meta: {
      title: "向远方 | KoMoriSam",
      navName: "novel",
      hideToTop: true,
    },
  },
  {
    path: "/tools/:toolSlug?",
    name: "tools",
    component: () => import("@/views/Tools.vue"),
    meta: { title: "工具 | KoMoriSam", navName: "tools" },
  },
  {
    path: "/kaiming",
    name: "kaiming",
    component: () => import("@/views/Kaiming.vue"),
    meta: { title: "开明标点 | KoMoriSam" },
  },
  // 仅开发环境可见，生产构建自动移除
  ...(import.meta.env.DEV
    ? [
        {
          path: "/test",
          name: "test",
          component: () => import("@/views/Test.vue"),
          meta: { title: "测试 | KoMoriSam" },
        },
      ]
    : []),
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: { title: "404! | KoMoriSam" },
  },
];

const router = createRouter({
  history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
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
  if (typeof document !== "undefined") {
    NProgress.start();
  }

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
  if (typeof document !== "undefined") {
    NProgress.start();
  }

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
