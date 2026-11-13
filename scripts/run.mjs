import { readdir } from "node:fs/promises";
import path from "node:path";
import { descriptions } from "./lib/task-descriptions.mjs";
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
  integration: [
    script("dev/start.mjs", "seed"),
    script("preview/build.mjs"),
    script("preview/deploy-integration.mjs"),
  ],
  website: [script("build/deploy.mjs", "website")],
  api: [
    ["wrangler", "deploy", "--config", "wrangler.api.jsonc", "--keep-vars"],
  ],
  content: [script("build/deploy.mjs", "content")],
  auth: [["wrangler", "deploy", "--config", "wrangler.auth.jsonc"]],
};

async function sequence(steps, args = []) {
  for (const [index, step] of steps.entries()) {
    await run(index === steps.length - 1 ? [...step, ...args] : [...step]);
  }
}

const isHelp = (name) => !name || ["help", "--help", "-h"].includes(name);
function select(tasks, name, command, args = []) {
  if (isHelp(name) || args.some((arg) => ["--help", "-h"].includes(arg))) {
    if (!isHelp(name) && !Object.hasOwn(tasks, name))
      throw new Error(
        `找不到目标“${name}”。运行 pnpm ${command} 查看可用操作。`,
      );
    const names = isHelp(name) ? Object.keys(tasks).sort() : [name];
    console.log(
      `用法：pnpm ${command} ${isHelp(name) ? "<目标>" : name} [参数]\n\n${names.map((target) => `  ${target.padEnd(28)} ${descriptions[command][target]}`).join("\n")}`,
    );
    return null;
  }
  if (!Object.hasOwn(tasks, name))
    throw new Error(`找不到目标“${name}”。运行 pnpm ${command} 查看可用操作。`);
  return tasks[name];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "dev") {
    const target = args[0] && !args[0].startsWith("-") ? args.shift() : "site";
    if (
      args.some((arg) => ["--help", "-h"].includes(arg)) ||
      target === "help"
    ) {
      console.log(
        "启动本地开发环境。\n\n  pnpm dev          预览并实时更新网站\n  pnpm dev:seed      刷新隔离的本地测试数据\n  pnpm dev games    启动本地多人游戏服务",
      );
      return;
    }
    if (target === "games") {
      console.log("正在启动本地多人游戏服务…");
      await run([
        "wrangler",
        "dev",
        "--config",
        "wrangler.games-dev.jsonc",
        "--port",
        "8787",
        ...args,
      ]);
    } else if (target === "site") {
      console.log("正在准备本地网站…");
      await run(script("dev/start.mjs", "site", ...args));
    } else
      throw new Error(
        `无法启动“${target}”。运行 pnpm dev --help 选择网站或游戏服务。`,
      );
  } else if (command === "build") {
    if (args.some((arg) => ["--help", "-h"].includes(arg))) {
      console.log(
        "生成可部署的网站和内容资源。\n\n用法：pnpm build [参数]\n\n输出：\n  dist/             网站、RSS、搜索与许可文件\n  .output/content/  博客、小说与开明字体\n\n构建需要内容源访问权限。完成后运行 pnpm preview 预览。正式版本由 Cloudflare Workers Builds 上传、部署并验证。\n小说正文和全文索引由发布命令上传到私有 R2。",
      );
      return;
    }
    console.log("正在构建网站和内容资源…");
    const { default: dotenv } = await import("dotenv");
    dotenv.config({ path: [".env.production", ".env"], quiet: true });
    process.env.VITE_BLOG_RAW ||= "/content/post";
    process.env.VITE_NOVEL_RAW ||= "/content/novel";
    await run(script("build/content.mjs"));
    process.env.CONTENT_BUILD_DIR = path.join(PROJECT_ROOT, ".output/content-build");
    await sequence(prepare(true));
    await run(script("build/prerender.mjs", "--full", ...args));
    await sequence([
      script("build/pagefind.mjs"),
      script("build/sitemap.mjs"),
      script("build/licenses.mjs", "--dist"),
      script("build/prune-assets.mjs"),
      script("build/content.mjs", "--seal", "--include-public"),
    ]);
    console.log(
      "构建完成。\n网站：dist/\n内容资源：.output/content/\n预览：pnpm preview\n正式发布由 Cloudflare Workers Builds 执行",
    );
  } else if (command === "preview") {
    if (args.some((arg) => ["--help", "-h"].includes(arg))) {
      console.log(
        "预览已构建的网站。\n\n用法：pnpm preview [参数]\n\n请先运行 pnpm build，再打开终端显示的地址。",
      );
      return;
    }
    console.log("正在打开网站构建预览…");
    await run(["vite", "preview", "--host", "0.0.0.0", ...args]);
  } else if (command === "release") {
    const target = ["changelog", "announcement"].includes(args[0]) ? args.shift() : "cli";
    await run(script(`release/${target}.mjs`, ...args));
  } else if (command === "check") {
    const names = (await readdir(new URL("./checks/", import.meta.url)))
      .filter((name) => name.endsWith(".mjs"))
      .map((name) => name.slice(0, -4));
    const tasks = Object.fromEntries(
      names.map((name) => [name, [script(`checks/${name}.mjs`)]]),
    );
    tasks.changelog = [changelog("check")];
    tasks.images = tasks["responsive-images"];
    tasks.avalon = ["avalon", "avalon-extensions", "avalon-knowledge"].map(
      (name) => script(`checks/${name}.mjs`),
    );
    tasks.blog = [
      "blog-translations",
      "blog-translations-runtime",
      "blog-translations-ssr",
    ].map((name) => script(`checks/${name}.mjs`));
    tasks.markdown = [
      "markdown-xss",
      "markdown-styles",
      "markdown-avatars",
    ].map((name) => script(`checks/${name}.mjs`));
    tasks.github = ["github-access", "github-profile"].map((name) =>
      script(`checks/${name}.mjs`),
    );
    tasks.games.push(script("checks/room-dissolution.mjs"));
    tasks["site-perf"].unshift(assets);
    const target = args.shift();
    const steps = select(tasks, target, "check", args);
    if (steps) console.log(`正在检查：${descriptions.check[target]}…`);
    if (steps) for (const step of steps) await run([...step, ...args]);
  } else if (command === "generate" || command === "deploy") {
    const target = args.shift();
    const name = command === "deploy" ? "run deploy" : command;
    const steps = select(
      command === "generate" ? generators : deployments,
      target,
      name,
      args,
    );
    if (steps && command === "deploy" && target === "integration" && args.length)
      throw new Error("用法：pnpm run deploy integration。");
    if (steps) console.log(`正在${descriptions[name][target]}…`);
    if (steps) await sequence(steps, args);
    if (steps && command === "deploy")
      console.log(`${descriptions[name][target]}完成。`);
  } else if (isHelp(command)) {
    console.log(
      "运行 pnpm menu 可用方向键选择项目操作。以下命令也可直接运行：\n\n  pnpm dev                  本地开发网站\n  pnpm build                构建可部署的网站与内容\n  pnpm preview              预览网站构建\n  pnpm check                查看可检查的功能\n  pnpm generate             查看可生成的资源\n  pnpm release              准备和管理网站版本\n  pnpm run deploy           查看发布目标\n\n在命令后添加 --help 查看用法。",
    );
  } else
    throw new Error(`无法识别命令“${command}”。运行 pnpm run 查看项目命令。`);
}

main().catch((error) => {
  const operation =
    {
      dev: "本地开发",
      build: "网站构建",
      preview: "网站预览",
      check: "功能检查",
      generate: "资源生成",
      release: "版本发布",
      deploy: "资源发布",
    }[process.argv[2]] || "操作";
  console.error(`${operation}未完成：${error.message}`);
  process.exitCode = error.exitCode || 1;
});
