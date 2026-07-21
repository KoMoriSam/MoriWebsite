import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import legacy from "@vitejs/plugin-legacy";
import tailwindcss from "@tailwindcss/vite";

import seoPrerender from "vite-plugin-seo-prerender";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const isCI = process.env.CI || process.env.CF_PAGES === "1";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    legacy({
      targets: ["ie>=11"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
    // 预渲染
    seoPrerender({
      routes: ["/", "/blog", "/novel", "/tools", "/changelog"],

      puppeteer: {
        ...(isCI
          ? {}
          : {
              executablePath:
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            }),

        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    }),
    {
      name: "copy-404",
      apply: "build",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");
        const indexPath = resolve(distDir, "index.html");
        const notFoundPath = resolve(distDir, "404.html");

        // 检查 index.html 是否存在，确保预渲染已完成
        if (!existsSync(indexPath)) {
          console.error("index.html 不存在，可能是预渲染未完成！");
          return;
        }

        try {
          copyFileSync(indexPath, notFoundPath);
          console.log("404.html 已成功创建！");
        } catch (error) {
          console.error("创建 404.html 时出错：", error);
        }
      },
    },
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
      output: {
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames(assetInfo) {
          if (assetInfo.name.endsWith(".css")) {
            return "css/[name]-[hash].css";
          }
          if (
            [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].some((ext) =>
              assetInfo.name.endsWith(ext),
            )
          ) {
            return "assets/images/[name]-[hash].[ext]";
          }
          if (
            [".ttf", ".otf", ".woff", ".woff2", ".eot"].some((ext) =>
              assetInfo.name.endsWith(ext),
            )
          ) {
            return "assets/fonts/[name]-[hash].[ext]";
          }
          return "assets/[name]-[hash].[ext]";
        },
      },
    },
  },
});
