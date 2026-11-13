import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { emitKeypressEvents } from "node:readline";
import { styleText, stripVTControlCharacters } from "node:util";
import { descriptions } from "./lib/task-descriptions.mjs";
import { run } from "./lib/commands.mjs";

const { stdin, stdout } = process;
const command = (...args) => run(["node", "scripts/run.mjs", ...args]);
const action = (label, ...args) => ({ label, run: () => command(...args) });
const localScript = (label, file, ...args) => ({
  label, run: () => run(["node", `scripts/${file}.mjs`, ...args]),
});
const submenu = (label, options) => ({ label, options });
const back = { label: "返回" };
const color = (style, text) => styleText(style, text, { stream: stdout });
let cancelled = false;

function fitLabel(text, columns) {
  const clean = stripVTControlCharacters(text).replace(/[\x00-\x1f\x7f]/g, " ");
  let width = 0;
  let label = "";
  for (const char of clean) {
    width += /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}\u3000-\u303f\uff00-\uff60]/u.test(char) ? 2 : 1;
    if (width >= columns) return label + "…";
    label += char;
  }
  return label;
}

function choose(title, options) {
  return new Promise((resolve) => {
    emitKeypressEvents(stdin);
    const previousMode = stdin.isRaw;
    let selected = 0;
    let renderedLines = 0;
    const erase = () => stdout.write(`\x1b[${renderedLines}A\r\x1b[J`);

    function render() {
      const pageSize = Math.max(1, Math.min(12, (stdout.rows || 24) - 4));
      const columns = Math.max(1, (stdout.columns || 80) - 5);
      const start = Math.max(0, Math.min(selected - Math.floor(pageSize / 2), options.length - pageSize));
      const items = options.slice(start, start + pageSize);
      const bar = color("cyan", "│");
      const position = options.length > pageSize ? `  ${selected + 1}/${options.length}` : "";
      const lines = [
        `${color("cyan", "◆")}  ${color("bold", fitLabel(title, columns))}`,
        ...items.map(({ label }, index) => {
          const active = start + index === selected;
          const marker = color(active ? "green" : "dim", active ? "●" : "○");
          return `${bar}  ${marker} ${color(active ? "bold" : "dim", fitLabel(label, columns))}`;
        }),
        `${color("cyan", "└")}  ${color("dim", fitLabel(`↑ ↓ 选择 · Enter 确认 · Esc 返回${position}`, columns))}`,
      ];
      if (renderedLines) erase();
      stdout.write(lines.join("\n") + "\n");
      renderedLines = lines.length;
    }

    function finish(value) {
      stdin.removeListener("keypress", onKey);
      stdin.removeListener("end", onEnd);
      stdout.removeListener("resize", render);
      stdin.setRawMode(previousMode);
      stdin.pause();
      erase();
      stdout.write("\x1b[?25h");
      resolve(value);
    }

    const onEnd = () => finish(null);
    function onKey(_, key) {
      if (!key) return;
      if (key.ctrl && key.name === "c") {
        cancelled = true;
        return finish(null);
      }
      if (key.name === "escape") return finish(null);
      if (key.name === "return" || key.name === "enter") return finish(options[selected]);
      if (key.name === "up") selected = (selected + options.length - 1) % options.length;
      else if (key.name === "down") selected = (selected + 1) % options.length;
      else if (key.name === "home") selected = 0;
      else if (key.name === "end") selected = options.length - 1;
      else return;
      render();
    }

    stdin.setRawMode(true);
    stdin.on("keypress", onKey);
    stdin.once("end", onEnd);
    stdout.on("resize", render);
    stdin.resume();
    stdout.write("\x1b[?25l");
    render();
  });
}

async function openReleasePage() {
  const url = "https://github.com/KoMoriSam/MoriWebsite/actions/workflows/release.yml";
  console.log("将更新日志草稿随代码推到 main，再点 Run workflow。");
  const [program, ...args] = process.platform === "win32"
    ? ["rundll32.exe", "url.dll,FileProtocolHandler", url]
    : process.platform === "darwin"
      ? ["open", url]
      : process.env.WSL_DISTRO_NAME ? ["explorer.exe", url] : ["xdg-open", url];
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(program, args, { stdio: "ignore" });
      child.once("error", reject);
      child.once("close", (code) => code === 0 || program === "explorer.exe" && code === 1
        ? resolve() : reject(new Error("无法打开浏览器")));
    });
  } catch {
    console.log(url);
  }
}

async function chooseRelease(actionName) {
  const { nextVersion, readReleaseFiles } = await import("./release/changelog-content.mjs");
  const entries = await readReleaseFiles({ allowDraftPlaceholders: true });
  const draft = entries.find(({ release }) => release.status === "draft");
  if (actionName === "draft" && draft) {
    await command("release", "changelog", "edit", draft.release.version);
    return;
  }
  if (actionName === "draft") {
    const latest = entries.find(({ release }) => release.status === "released").release.version;
    const options = [["修复", "patch"], ["新功能", "minor"], ["有破坏性变更", "major"]]
      .map(([label, bump]) => action(`${label} · ${nextVersion(latest, bump)}`, "release", "changelog", "new", bump));
    const choice = await choose("选择版本类型", [...options, back]);
    await choice?.run?.();
    return;
  }
  const options = entries.map(({ release }) => action(
    `${release.version}${release.status === "draft" ? "（草稿）" : ""}`, "release", "changelog", "edit", release.version,
  ));
  const choice = await choose("选择要编辑的更新日志", [...options, back]);
  await choice?.run?.();
}

async function chooseAnnouncement(label, operation) {
  const { loadLocalAnnouncements } = await import("./release/announcement.mjs");
  const entries = await loadLocalAnnouncements();
  if (!entries.length) {
    console.log("本地还没有公告，可以先新建或下载线上公告。");
    return;
  }
  const options = entries.map(({ announcement }) => action(
    announcement.title.replace(/\s+/g, " "), "release", "announcement", operation, announcement.id,
  ));
  const choice = await choose(label, [...options, back]);
  await choice?.run?.();
}

async function checkOptions() {
  const names = (await readdir(new URL("./checks/", import.meta.url)))
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => name.slice(0, -4));
  const targets = new Set([...Object.keys(descriptions.check), ...names]);
  const groups = [
    ["认证与联调", ["dev", "github", "github-access", "github-profile", "env"]],
    ["阅读与正文", ["blog", "blog-build", "blog-translations", "blog-translations-runtime",
      "blog-translations-ssr", "markdown", "markdown-styles", "markdown-avatars", "markdown-xss"]],
    ["构建与发布", ["build-assets", "content-build", "content-licenses", "rss",
      "site-perf", "announcements", "changelog"]],
    ["语言与翻译", ["i18n", "i18n-loading", "i18n-quantities", "i18n-runtime"]],
    ["游戏", ["games", "game-room-client", "room-dissolution", "avalon",
      "avalon-extensions", "avalon-knowledge", "fogport"]],
    ["图片与转换工具", ["images", "responsive-images", "image-converter", "sinhala", "sinhala-documents"]],
  ];
  const check = (name) => action(descriptions.check[name] || name, "check", name);
  const options = groups.map(([label, checks]) =>
    submenu(label, checks.filter((name) => targets.delete(name)).map(check)));
  if (targets.size) options.push(submenu("其他检查", [...targets].map(check)));
  return options;
}

const generateOptions = (...targets) => targets.map((name) =>
  action(descriptions.generate[name], "generate", name));

const groups = [
  submenu("本地开发", [
    action("启动本地网站", "dev"),
    action("启动本地游戏服务", "dev", "games"),
    localScript("刷新本地测试数据", "dev/start", "seed"),
  ]),
  submenu("构建与预览", [
    localScript("构建网站（自动选增量或全量）", "build/smart"),
    localScript("构建网站（强制全量）", "build/smart", "--full"),
    localScript("查看构建计划", "build/smart", "--dry-run"),
    action("构建网站与内容部署包", "build"),
    action("预览本地构建", "preview"),
    action("检查网站部署包", "deploy", "website", "--dry-run"),
    action("检查内容部署包", "deploy", "content", "--dry-run"),
  ]),
  submenu("检查", checkOptions),
  submenu("测试部署", [
    action("更新测试网站（仅预览）", "deploy", "test"),
    localScript("更新测试 API（评论等）", "release/bootstrap-test", "--apply", "--api-only"),
    localScript("更新测试认证（登录）", "release/bootstrap-test", "--apply", "--auth-only"),
  ]),
  submenu("发布", [
    { label: "打开 GitHub 网站发版", run: openReleasePage },
    action("发布正式 API", "deploy", "api"),
    action("发布正式认证", "deploy", "auth"),
    action("上传公开内容版本", "deploy", "content", "--upload"),
  ]),
  submenu("内容管理", [
    submenu("更新日志", [
      { label: "撰写下一版更新日志", run: () => chooseRelease("draft") },
      { label: "编辑已有更新日志", run: () => chooseRelease("edit") },
      action("查看所有版本", "release", "changelog", "list"),
    ]),
    submenu("公告", [
      action("新建公告", "release", "announcement", "new"),
      { label: "编辑公告", run: () => chooseAnnouncement("选择要编辑的公告", "edit") },
      { label: "提高公告修订号", run: () => chooseAnnouncement("选择要更新修订号的公告", "bump") },
      { label: "结束公告展示", run: () => chooseAnnouncement("选择要结束的公告", "expire") },
      action("下载线上公告", "release", "announcement", "pull"),
      action("预览公告发布差异", "release", "announcement", "publish", "--dry-run"),
      action("发布公告", "release", "announcement", "publish"),
    ]),
  ]),
  submenu("生成资源", [
    submenu("页面与索引", generateOptions("mock", "routes", "pagefind", "sitemap", "rss", "changelog", "licenses")),
    submenu("图片与字体", generateOptions("assets", "images", "fonts")),
    submenu("词库与字形", generateOptions("lexicon", "pdf-glyphs")),
  ]),
];

async function browse(title, items, exit) {
  const options = typeof items === "function" ? await items() : items;
  while (!cancelled) {
    const choice = await choose(title, [...options, exit]);
    if (!choice || choice === exit) return;
    try {
      if (choice.options) {
        await browse(choice.label, choice.options, back);
      } else {
        console.log(choice.label);
        await choice.run();
      }
    } catch (error) {
      console.error(error.message);
    }
  }
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY || process.argv.includes("--help")) {
    console.log("pnpm menu 在交互终端中打开项目菜单。\n" + groups.map(({ label }) => label).join(" / "));
    return;
  }

  await browse("MoriWebsite · 选择操作", groups, { label: "退出" });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
