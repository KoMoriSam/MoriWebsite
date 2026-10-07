import "@/assets/main.css";

if (!import.meta.env.SSR) {
  void import("@/assets/font/core-fonts.css");
}

import { ViteSSG } from "vite-ssg";
import { createPinia } from "pinia";
import App from "./App.vue";
import { routes } from "./router";
import { generatedBlogPagePaths } from "./router/ssg-data";
import { lazyPlugin, fadeIn } from "./directive";
import { createLocaleService } from "./i18n";

export const includedRoutes = (paths) => [
  ...new Set([
    ...paths.filter((path) => !path.includes(":") && !path.includes("*")),
    ...generatedBlogPagePaths,
  ]),
];

export const createApp = ViteSSG(
  App,
  {
    routes,
    base: import.meta.env.BASE_URL,
  },
  ({ app, router }) => {
    const pinia = createPinia();

    app.use(pinia);
    const localeService = createLocaleService();
    localeService.install(app);
    let loadingRoute = null;
    router.beforeResolve((to) => {
      loadingRoute = to;
      return localeService.loadRoute(to);
    });
    const restoreRoute = (to) => {
      if (to === loadingRoute) {
        loadingRoute = null;
        void localeService.loadRoute(router.currentRoute.value).catch(() => {});
      }
    };
    router.afterEach((to, from, failure) => {
      if (failure) restoreRoute(to);
    });
    router.onError((error, to) => restoreRoute(to));

    app.use(lazyPlugin);

    app.directive("fade-in", fadeIn);
  },
);
