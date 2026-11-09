import "@/assets/main.css";
import "@/assets/font/core-fonts.css";

import { ViteSSG } from "vite-ssg";
import { createPinia } from "pinia";
import App from "./App.vue";
import { routes, scrollBehavior } from "./router";
import {
  generatedBlogPagePaths,
  installArticleMetadata,
} from "./router/ssg-data";
import { lazyPlugin, fadeIn } from "./directive";
import { createLocaleService } from "./i18n";
import { readBuildData } from "./router/build-data";
import { registerImageManifest } from "./utils/images/responsive-images";
export {
  imageDependency,
  trackImageReads,
  stopTrackingImageReads,
} from "./utils/images/responsive-images";
export { normalizeArticleDate } from "./composables/blog/useArticleFilter";
import { installPageData } from "./utils/ssg/page-data";
import { useNovelStore } from "./stores/novel";
import { rememberBlogListScroll } from "./utils/blog/list-scroll";

export const includedRoutes = (paths) => [
  ...new Set([
    ...paths.filter((path) => !path.includes(":") && !path.includes("*")),
    ...generatedBlogPagePaths,
  ]),
];

function configureApp(articles, snapshot) {
  return ViteSSG(
    App,
    {
      routes: installArticleMetadata(articles, routes),
      base: import.meta.env.BASE_URL,
      scrollBehavior,
    },
    async ({ app, router, initialState }) => {
      installPageData(router, initialState, {
        snapshot,
        isServer: import.meta.env.SSR,
      });
      if (!import.meta.env.SSR) {
        router.beforeEach((_to, from) => {
          rememberBlogListScroll(from, {
            left: window.scrollX,
            top: window.scrollY,
          });
        });
      }
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
          void localeService
            .loadRoute(router.currentRoute.value)
            .catch(() => {});
        }
      };
      router.afterEach((to, from, failure) => {
        if (failure) restoreRoute(to);
      });
      router.onError((error, to) => restoreRoute(to));

      app.use(lazyPlugin);

      app.directive("fade-in", fadeIn);
    },
    {
      hydration:
        !import.meta.env.SSR &&
        document.getElementById("app")?.hasAttribute("data-server-rendered"),
    },
  );
}

async function bootstrap() {
  const [articles, imageManifests, snapshot] = await Promise.all([
    import.meta.env.DEV ? [] : readBuildData("articles"),
    import.meta.env.DEV
      ? import("./utils/images/image-manifests.generated.json").then(
          (module) => module.default,
        )
      : readBuildData("images"),
    import.meta.env.SSR && !import.meta.env.DEV
      ? readBuildData("snapshot")
      : {},
  ]);
  imageManifests.forEach(({ manifest, base }) =>
    registerImageManifest(manifest, base),
  );
  return configureApp(articles, snapshot);
}

let application;
export async function createApp(route) {
  application ||= bootstrap();
  return (await application)(route);
}

export function novelSsgRoutes(app, volumes) {
  return app.runWithContext(() => {
    const novel = useNovelStore();
    novel.hydrateChapters(volumes);
    return novel.visibleChapters.flatMap((chapter) => {
      const permalink = novel.getPermalinkByUuid(chapter.uuid);
      const segments = [permalink?.volumeSlug, permalink?.chapterSlug];
      const staticPermalink = segments.every(
        (segment) =>
          segment && !/[<>:"/\\|?*\u0000-\u001f]|[. ]$/u.test(segment),
      );
      return [
        { path: `/novel/${encodeURIComponent(chapter.uuid)}`, chapter },
        ...(staticPermalink
          ? [
              {
                path: `/novel/${segments.map(encodeURIComponent).join("/")}`,
                chapter,
              },
            ]
          : []),
      ];
    });
  });
}

if (!import.meta.env.SSR) application = bootstrap();
