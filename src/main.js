import "@/assets/main.css";

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
