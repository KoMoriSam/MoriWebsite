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

const descriptions = {
  generate: {
    mock: "更新本地博客目录", assets: "准备网站图片与字体资源", images: "生成适合不同屏幕的图片",
    changelog: "生成网站更新日志", routes: "准备可直接阅读的静态页面", rss: "生成博客订阅源",
    licenses: "汇总项目与第三方许可", pagefind: "生成全站搜索索引", sitemap: "生成搜索引擎站点地图",
    fonts: "生成兼容传统编码的僧伽罗字体", lexicon: "生成英文与僧语识别词库", "pdf-glyphs": "生成 PDF 文字识别映射",
  },
  "run deploy": {
    website: "发布网站与配套内容", content: "发布博客、小说和开明字体", api: "发布网站 API 服务",
    giscus: "独立发布评论主题和加载动画",
  },
  check: {
    announcements: "公告内容与发布流程", avalon: "阿瓦隆规则与角色能力", "avalon-extensions": "阿瓦隆扩展角色",
    "avalon-knowledge": "阿瓦隆身份信息与招募", blog: "博客阅读与多语言版本", "blog-build": "博客静态页面与搜索",
    "blog-translations": "文章版本与内容一致性", "blog-translations-runtime": "文章语言切换与阅读导航",
    "blog-translations-ssr": "文章预渲染与语言提示", "build-assets": "构建资源与许可页面",
    "content-build": "内容发布与评论资源访问", "content-licenses": "文章版权协议", fogport: "雾港商纪规则与对局",
    "game-room-client": "游戏房间连接与音效", games: "多人房间与服务端对局", github: "GitHub 登录与资料读取",
    "github-access": "GitHub 登录与账号恢复", "github-profile": "GitHub 公开资料读取",
    i18n: "多语言界面与文案", "i18n-loading": "语言切换与英文回退", "i18n-quantities": "数量表达与页面显示",
    "i18n-runtime": "语言设置与交互状态", "image-converter": "图片转换", images: "不同屏幕下的图片显示",
    markdown: "正文渲染与样式", "markdown-avatars": "正文头像与资源地址", "markdown-styles": "正文样式",
    "markdown-xss": "正文内容安全", "responsive-images": "图片尺寸与动图",
    "room-dissolution": "房间关闭与退出", rss: "博客 RSS 订阅", sinhala: "僧伽罗语编码转换",
    "site-perf": "网站资源加载", changelog: "版本更新日志",
  },
};

async function sequence(steps, args = []) {
  for (const [index, step] of steps.entries()) {
    await run(index === steps.length - 1 ? [...step, ...args] : [...step]);
  }
}

const isHelp = (name) => !name || ["help", "--help", "-h"].includes(name);
function select(tasks, name, command, args = []) {
  if (isHelp(name) || args.some((arg) => ["--help", "-h"].includes(arg))) {
    if (!isHelp(name) && !Object.hasOwn(tasks, name)) throw new Error(`找不到目标“${name}”。运行 pnpm ${command} 查看可用操作。`);
    const names = isHelp(name) ? Object.keys(tasks).sort() : [name];
    console.log(`用法：pnpm ${command} ${isHelp(name) ? "<目标>" : name} [参数]\n\n${names.map((target) => `  ${target.padEnd(28)} ${descriptions[command][target]}`).join("\n")}`);
    return null;
  }
  if (!Object.hasOwn(tasks, name)) throw new Error(`找不到目标“${name}”。运行 pnpm ${command} 查看可用操作。`);
  return tasks[name];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "dev") {
    const target = args[0] && !args[0].startsWith("-") ? args.shift() : "site";
    if (args.some((arg) => ["--help", "-h"].includes(arg)) || target === "help") {
      console.log("启动本地开发环境。\n\n  pnpm dev          预览并实时更新网站\n  pnpm dev games    启动本地多人游戏服务");
      return;
    }
    if (target === "games") {
      console.log("正在启动本地多人游戏服务…");
      await run(["wrangler", "dev", "--config", "wrangler.games-dev.jsonc", "--port", "8787", ...args]);
    } else if (target === "site") {
      console.log("正在准备本地网站…");
      await sequence(prepare(false));
      await run(["vite", "--host", "0.0.0.0", ...args]);
    } else throw new Error(`无法启动“${target}”。运行 pnpm dev --help 选择网站或游戏服务。`);
  } else if (command === "build") {
    if (args.some((arg) => ["--help", "-h"].includes(arg))) {
      console.log("生成可部署的网站和内容资源。\n\n用法：pnpm build [参数]\n\n输出：\n  dist/             网站、RSS、搜索与许可文件\n  .output/content/  博客、小说与开明字体\n\n构建需要内容源访问权限。完成后运行 pnpm preview 预览，或运行 pnpm run deploy website 发布。\n评论主题和加载动画通过 pnpm run deploy giscus 独立发布。");
      return;
    }
    console.log("正在构建网站和内容资源…");
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
    console.log("构建完成。\n网站：dist/\n内容资源：.output/content/\n预览：pnpm preview\n发布：pnpm run deploy website");
  } else if (command === "preview") {
    if (args.some((arg) => ["--help", "-h"].includes(arg))) {
      console.log("预览已构建的网站。\n\n用法：pnpm preview [参数]\n\n请先运行 pnpm build，再打开终端显示的地址。");
      return;
    }
    console.log("正在打开网站构建预览…");
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
    const target = args.shift();
    const steps = select(tasks, target, "check", args);
    if (steps) console.log(`正在检查：${descriptions.check[target]}…`);
    if (steps) for (const step of steps) await run([...step, ...args]);
  } else if (command === "generate" || command === "deploy") {
    const target = args.shift();
    const name = command === "deploy" ? "run deploy" : command;
    const steps = select(command === "generate" ? generators : deployments, target, name, args);
    if (steps) console.log(`正在${descriptions[name][target]}…`);
    if (steps) await sequence(steps, args);
    if (steps && command === "deploy") console.log(`${descriptions[name][target]}完成。`);
  } else if (isHelp(command)) {
    console.log("选择要完成的操作：\n\n  pnpm dev                  本地开发网站\n  pnpm build                构建可部署的网站与内容\n  pnpm preview              预览网站构建\n  pnpm check                查看可检查的功能\n  pnpm generate             查看可生成的资源\n  pnpm release              准备和管理网站版本\n  pnpm run deploy           查看发布目标\n\n在命令后添加 --help 查看用法。");
  } else throw new Error(`无法识别命令“${command}”。运行 pnpm run 查看项目命令。`);
}

main().catch((error) => {
  const operation = { dev: "本地开发", build: "网站构建", preview: "网站预览", check: "功能检查", generate: "资源生成", release: "版本发布", deploy: "资源发布" }[process.argv[2]] || "操作";
  console.error(`${operation}未完成：${error.message}`);
  process.exitCode = error.exitCode || 1;
});
