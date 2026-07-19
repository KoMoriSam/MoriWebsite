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

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { lazyPlugin, fadeIn } from "./directive";

const pinia = createPinia();
const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(lazyPlugin);

app.directive("fade-in", fadeIn);

app.mount("#app");
