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
  console.log("更新日志草稿随代码推到 main 后，点击 Run workflow 发版。");
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
  return [...targets].map((name) => action(descriptions.check[name] || name, "check", name));
}

const groups = [
  { label: "开发", options: [
    action("启动网站开发环境", "dev"),
    action("启动多人游戏服务", "dev", "games"),
    localScript("刷新本地测试数据", "dev/start", "seed"),
  ] },
  { label: "构建与预览", options: [
    localScript("构建网站（自动选择增量或完整构建）", "build/smart"),
    localScript("强制完整构建", "build/smart", "--full"),
    action("独立完整构建（输出网站和内容部署包）", "build"),
    localScript("查看构建计划", "build/smart", "--dry-run"),
    action("预览已构建的网站", "preview"),
  ] },
  { label: "检查", options: checkOptions },
  { label: "发布", options: [
    { label: "打开 GitHub 网站发版", run: openReleasePage },
    action("更新 Staging 测试版", "deploy", "staging"),
    action("仅更新 Staging 网站 Worker", "deploy", "staging", "--site-only"),
    action("检查网站部署包", "deploy", "website", "--dry-run"),
    action("检查公开内容部署包", "deploy", "content", "--dry-run"),
    action("上传公开内容 Worker 版本", "deploy", "content", "--upload"),
    action("发布正式 API 服务", "deploy", "api"),
    action("发布正式认证服务", "deploy", "auth"),
  ] },
  { label: "内容管理", options: [
    { label: "撰写下一版更新日志", run: () => chooseRelease("draft") },
    { label: "编辑已有更新日志", run: () => chooseRelease("edit") },
    action("查看所有版本", "release", "changelog", "list"),
    action("新建公告", "release", "announcement", "new"),
    { label: "编辑公告", run: () => chooseAnnouncement("选择要编辑的公告", "edit") },
    { label: "提高公告修订号", run: () => chooseAnnouncement("选择要更新修订号的公告", "bump") },
    { label: "结束公告展示", run: () => chooseAnnouncement("选择要结束的公告", "expire") },
    action("下载线上公告", "release", "announcement", "pull"),
    action("预览公告发布差异", "release", "announcement", "publish", "--dry-run"),
    action("发布公告", "release", "announcement", "publish"),
  ] },
  { label: "生成资源", options: Object.entries(descriptions.generate)
    .map(([target, label]) => action(label, "generate", target)) },
];

async function main() {
  if (!stdin.isTTY || !stdout.isTTY || process.argv.includes("--help")) {
    console.log("pnpm menu 在交互终端中打开项目菜单。\n" + groups.map(({ label }) => label).join(" / "));
    return;
  }

  while (!cancelled) {
    const group = await choose("MoriWebsite · 选择操作", [...groups, { label: "退出" }]);
    if (!group?.options) return;
    const options = typeof group.options === "function" ? await group.options() : group.options;
    while (!cancelled) {
      const choice = await choose(group.label, [...options, back]);
      if (!choice?.run) break;
      try {
        console.log(choice.label);
        await choice.run();
      } catch (error) {
        console.error(error.message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
