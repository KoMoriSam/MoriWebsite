import daisyui from "daisyui";
import typography from "@tailwindcss/typography";
import theme from "tailwindcss/theme.css?raw";
import fontStyles from "@/assets/font/index.css?raw";
import mainStyles from "@/assets/main.css?raw";
import { createMarkdownStyleCompiler } from "@/utils/markdown/markdown-style-compiler";

let compiler;
let queue = Promise.resolve();

self.onmessage = ({ data: { id, classes, existing } }) => {
  queue = queue.then(async () => {
    compiler ||= createMarkdownStyleCompiler({
      theme,
      sources: [fontStyles, mainStyles],
      loadPlugin: async (name) => {
        if (name === "daisyui") return daisyui;
        if (name === "@tailwindcss/typography") return typography;
        throw new Error(`Unknown Markdown style plugin: ${name}`);
      },
    });
    const build = await compiler;
    const css = await build(classes, existing);
    self.postMessage({ id, css });
  }).catch((error) => {
    compiler = null;
    self.postMessage({ id, error: String(error?.message || error) });
  });
};
