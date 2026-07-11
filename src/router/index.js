import NProgress from "nprogress";
NProgress.configure({
  easing: "ease", // 动画方式
  speed: 500, // 递增进度条的速度
  showSpinner: false, // 是否显示加载ico
  trickleSpeed: 200, // 自动递增间隔
  minimum: 0.3, // 初始化时的最小百分比
});

import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/Home.vue"),
      meta: { title: "主页 | KoMoriSam" },
    },
    {
      path: "/home",
      redirect: () => ({
        name: "home",
      }),
    },
    {
      path: "/novel/:volumeSlug?/:chapterSlug?",
      name: "novel",
      component: () => import("@/views/Novel.vue"),
      meta: { title: "向远方 | KoMoriSam" },
    },
    {
      path: "/contact",
      name: "contact",
      component: () => import("@/views/Contact.vue"),
      meta: { title: "联系 | KoMoriSam" },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/About.vue"),
      meta: { title: "关于 | KoMoriSam" },
    },
    {
      path: "/changelog",
      name: "changelog",
      component: () => import("@/views/Changelog.vue"),
      meta: { title: "更新日志 | KoMoriSam" },
    },
    {
      path: "/blog/:articleId?",
      name: "blog",
      component: () => import("@/views/Blog.vue"),
      meta: { title: "博客 | KoMoriSam" },
    },
    // 🧪 仅在开发环境可见，生产构建自动移除
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
  ],
});

export default router;

router.beforeEach((to, from, next) => {
  NProgress.start();

  const legacyArticleId =
    typeof to.query.article === "string" ? to.query.article.trim() : "";
  if (!to.params.articleId && legacyArticleId && to.path === "/blog") {
    const nextQuery = { ...to.query };
    delete nextQuery.article;
    next({
      name: "blog",
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

  document.title = to.meta.title || "Welcome KoMoriSam's Website!";

  next();
});

router.afterEach((to, from) => {
  NProgress.done();

  const currentPath = to.fullPath.split("#")[0];
  const previousPath = from.fullPath.split("#")[0];

  if (currentPath === previousPath && to.hash !== from.hash) {
    return;
  }

  if (to.path === "/novel" || to.path.startsWith("/novel/")) {
    return;
  }

  document.title = to.meta.title || "Welcome KoMoriSam's Website!";
});
