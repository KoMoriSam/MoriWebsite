import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

import { singleThreadCodecs } from "./scripts/build/single-thread-codecs.mjs";
import { initializeSiteTheme, SITE_THEME_NAMES } from "./src/utils/layout/site-theme.js";

const outputPaths = {
  entryFileNames: "js/[name]-[hash].js",
  chunkFileNames: "js/[name]-[hash].js",
  assetFileNames(assetInfo) {
    if (assetInfo.name.endsWith(".wasm")) {
      return "js/wasm/[name]-[hash].[ext]";
    }
    if (/\.(?:js|mjs|cjs)$/.test(assetInfo.name)) {
      return "js/[name]-[hash].[ext]";
    }
    if (assetInfo.name.endsWith(".css")) {
      return "css/[name]-[hash].css";
    }
    if (/\.(?:png|jpg|jpeg|webp|gif|svg)$/.test(assetInfo.name)) {
      return "assets/images/[name]-[hash].[ext]";
    }
    if (/\.(?:ttf|otf|woff|woff2|eot)$/.test(assetInfo.name)) {
      return "assets/fonts/[name]-[hash].[ext]";
    }
    return "assets/[name]-[hash].[ext]";
  },
};

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  server: {
    proxy: {
      "/api/github/": {
        target: "https://api.komori.cc",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/games/rooms": {
        target: "http://127.0.0.1:8787",
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/announcements": {
        target: "https://api.komori.cc",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/changelog": {
        target: "https://api.komori.cc",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  optimizeDeps: {
    exclude: [
      "@jsquash/avif",
      "@jsquash/jpeg",
      "@jsquash/oxipng",
      "photoswipe",
    ],
  },
  worker: {
    format: "es",
    plugins: () => [singleThreadCodecs()],
    rollupOptions: { output: { ...outputPaths } },
  },
  plugins: [
    {
      name: "initial-site-theme",
      transformIndexHtml: {
        order: "pre",
        handler: () => [{
          tag: "script",
          children: `(${initializeSiteTheme.toString()})(${JSON.stringify(SITE_THEME_NAMES)});`,
          injectTo: "head-prepend",
        }],
      },
    },
    singleThreadCodecs(),
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    rollupOptions: {
      output: { ...outputPaths },
    },
  },
});
