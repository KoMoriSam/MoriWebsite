import { readdir } from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT, run } from "./lib/commands.mjs";

const script = (file, ...args) => ["node", `scripts/${file}`, ...args];
const changelog = (...args) => script("release/changelog.mjs", ...args);
const assets = script("build/static-assets.mjs");
const routes = script("build/routes.mjs");
const prepare = (production) => [
  ...(!production ? [script("build/mock-articles.mjs")] : []),
  assets,
  script("build/images.mjs", ...(production ? ["--production"] : [])),
  changelog("generate"),
  ...(production ? [routes, script("build/rss.mjs")] : []),
  script("build/licenses.mjs", "--source"),
];
const generators = {
  mock: [script("build/mock-articles.mjs")],
  assets: [assets],
  images: [script("build/images.mjs")],
  changelog: [changelog("generate")],
  routes: [routes],
  rss: [routes, script("build/rss.mjs")],
  licenses: [script("build/licenses.mjs")],
  pagefind: [script("build/pagefind.mjs")],
  sitemap: [script("build/sitemap.mjs")],
  fonts: [["python", "scripts/sinhala/generate-fonts.py"]],
  lexicon: [script("sinhala/generate-lexicon.mjs")],
  "pdf-glyphs": [["python", "scripts/sinhala/generate-pdf-glyphs.py"]],
};
const deployments = {
  website: [script("build/deploy.mjs", "website")],
  api: [["wrangler", "deploy", "--config", "wrangler.api.jsonc", "--keep-vars"]],
  content: [script("build/deploy.mjs", "content")],
  giscus: [["wrangler", "pages", "deploy", "giscus", "--project-name", "giscus", "--branch", "main"]],
};

async function sequence(steps, args = []) {
  for (const [index, step] of steps.entries()) {
    await run(index === steps.length - 1 ? [...step, ...args] : [...step]);
  }
}

const isHelp = (name) => !name || ["help", "--help", "-h"].includes(name);
function select(tasks, name, command) {
  if (isHelp(name)) {
    console.log(`用法：pnpm ${command} <目标> [参数]\n\n目标：${Object.keys(tasks).sort().join(", ")}`);
    return null;
  }
  if (!Object.hasOwn(tasks, name)) throw new Error(`未知目标：${name}。运行 pnpm ${command} 查看可用目标。`);
  return tasks[name];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "dev") {
    const target = args[0] && !args[0].startsWith("-") ? args.shift() : "site";
    if (args.includes("--help") || target === "help") {
      console.log("用法：pnpm dev [site|games] [参数]");
      return;
    }
    if (target === "games") {
      await run(["wrangler", "dev", "--config", "wrangler.games-dev.jsonc", "--port", "8787", ...args]);
    } else if (target === "site") {
      await sequence(prepare(false));
      await run(["vite", "--host", "0.0.0.0", ...args]);
    } else throw new Error(`未知开发目标：${target}`);
  } else if (command === "build") {
    if (args.includes("--help")) {
      console.log("用法：pnpm build [vite-ssg 参数]；整合私有内容、Kaiming Release 与 raw 资源，生成网站和内容 Worker。");
      return;
    }
    const { default: dotenv } = await import("dotenv");
    dotenv.config({ path: [".env.production", ".env"], quiet: true });
    process.env.VITE_BLOG_RAW ||= "https://raw.komori.cc/post";
    process.env.VITE_NOVEL_RAW ||= "https://raw.komori.cc/novel";
    process.env.VITE_GISCUS_CSS_RAW ||= "https://raw.komori.cc/giscus";
    await run(script("build/content.mjs"));
    process.env.CONTENT_BUILD_DIR = path.join(PROJECT_ROOT, ".output/content");
    await sequence(prepare(true));
    await run(["vite-ssg", "build", ...args]);
    await sequence([
      script("build/pagefind.mjs"), script("build/sitemap.mjs"),
      script("build/licenses.mjs", "--dist"), script("build/prune-assets.mjs"),
      script("build/content.mjs", "--seal"),
    ]);
  } else if (command === "preview") {
    await run(["vite", "preview", "--host", "0.0.0.0", ...args]);
  } else if (command === "release") {
    const target = ["changelog", "announcement"].includes(args[0]) ? args.shift() : "cli";
    await run(script(`release/${target}.mjs`, ...args));
  } else if (command === "check") {
    const names = (await readdir(new URL("./checks/", import.meta.url)))
      .filter((name) => name.endsWith(".mjs")).map((name) => name.slice(0, -4));
    const tasks = Object.fromEntries(names.map((name) => [name, [script(`checks/${name}.mjs`)]]));
    tasks.changelog = [changelog("check")];
    tasks.images = tasks["responsive-images"];
    tasks.avalon = ["avalon", "avalon-extensions", "avalon-knowledge"].map((name) => script(`checks/${name}.mjs`));
    tasks.blog = ["blog-translations", "blog-translations-runtime", "blog-translations-ssr"].map((name) => script(`checks/${name}.mjs`));
    tasks.markdown = ["markdown-xss", "markdown-styles", "markdown-avatars"].map((name) => script(`checks/${name}.mjs`));
    tasks.github = ["github-access", "github-profile"].map((name) => script(`checks/${name}.mjs`));
    tasks.games.push(script("checks/room-dissolution.mjs"));
    tasks["site-perf"].unshift(assets);
    const steps = select(tasks, args.shift(), "check");
    if (steps) for (const step of steps) await run([...step, ...args]);
  } else if (command === "generate" || command === "deploy") {
    const steps = select(command === "generate" ? generators : deployments, args.shift(), command === "deploy" ? "run deploy" : command);
    if (steps) await sequence(steps, args);
  } else if (isHelp(command)) {
    console.log("可用命令：dev, build, preview, check, generate, release, deploy。运行对应命令的 --help 查看用法。");
  } else throw new Error(`未知命令：${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = error.exitCode || 1;
});
