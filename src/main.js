import "@/assets/main.css";
import "nprogress/nprogress.css";
import "highlight.js/styles/github-dark.css";

import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-sc";
import "@fontsource-variable/noto-serif-sc";
import "@fontsource-variable/noto-sans-sinhala";
import "@fontsource-variable/noto-serif-sinhala";
import "@fontsource/maname";

import { ViteSSG } from "vite-ssg";
import { createPinia } from "pinia";
import App from "./App.vue";
import { routes } from "./router";
import { lazyPlugin, fadeIn } from "./directive";

export const createApp = ViteSSG(
  App,
  {
    routes,
    base: import.meta.env.BASE_URL,
  },
  ({ app }) => {
    const pinia = createPinia();

    app.use(pinia);

    app.use(lazyPlugin);

    app.directive("fade-in", fadeIn);
  },
);
