import { workerPort } from "./scripts/dev/config.mjs";
import base from "./vite.config.js";

export default {
  ...base,
  envDir: false,
  define: {
    "import.meta.env.VITE_BLOG_RAW": JSON.stringify("/mock/article"),
    "import.meta.env.VITE_NOVEL_RAW": JSON.stringify("/mock/novel"),
  },
  server: {
    host: "localhost",
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.tmp/**", "**/.output/**", "**/.dev.vars*"] },
    proxy: {
      "^/(?:api|auth|site-data|mock/novel|content/kaiming|pagefind-novel)(?:/|$)": {
        target: `http://127.0.0.1:${workerPort}`, ws: true,
      },
    },
  },
};
