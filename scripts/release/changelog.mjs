import { spawn } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { waitForPublishedContent } from "./verify-published.mjs";

import {
  CHANGELOG_DIR,
  PROJECT_ROOT,
  SEMVER_BUMPS,
  STATIC_CHANGELOG_PATH,
  compareVersions,
  createChangelogPayload,
  formatLocalDate,
  formatLocalIso,
  nextVersion,
  parseReleaseMarkdown,
  readReleaseFiles,
  releasePath,
  renderReleaseMarkdown,
  validateChangelogPayload,
  validateReleaseChain,
  writeStaticChangelog,
} from "./changelog-content.mjs";
const CONFIG_PATH = "wrangler.api.jsonc";
const KV_BINDING = "CHANGELOG_KV";
const KV_KEY = "changelog:v1";
const PUBLIC_ENDPOINT = "https://api.komori.cc/changelog";
const WRANGLER_BIN = join(PROJECT_ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const BACKUP_DIR = join(PROJECT_ROOT, ".tmp", "changelog-backups");
const TEMP_DIR = join(PROJECT_ROOT, ".tmp", "changelog");
const PACKAGE_PATH = join(PROJECT_ROOT, "package.json");
const README_PATHS = ["README.md", "README_en.md", "README_fr.md", "README_si.md"].map((name) =>
  join(PROJECT_ROOT, name),
);
const README_VERSION_PATTERN = /^([\t ]*(?:当前版本：|Current version:|Version actuelle :|වත්මන් අනුවාදය:)[\t ]*<strong>)([^<\r\n]+)(<\/strong>)/gm;
const DRAFT_INTRO = "请填写版本概述。";
const DRAFT_CHANGE = "- 请填写更新内容。";
const DRAFT_WARNING = "请说明破坏性变化和升级方式。";

const helpText = `撰写版本更新日志，准备发布资料，并将更新内容展示到网站。

用法：pnpm release changelog <命令> [选项]

命令：
  new <major|minor|patch|version>       创建版本日志草稿并打开编辑器
  edit <version>                        编辑版本日志
  list                                  查看全部本地版本
  check                                 检查版本内容与发布顺序
  generate                              生成供网站展示的更新日志
  prepare <version> [--date YYYY-MM-DD] 同步版本号、项目说明和更新日志
  publish [--dry-run] [--yes]           上线全部正式版本的更新记录

选项：
  --dry-run    预览版本准备或发布结果
  --yes        跳过远端发布确认
`;

const parseOptions = (args) => {
  const options = new Map();
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const [name, inlineValue] = value.split("=", 2);
    if (inlineValue !== undefined) {
      options.set(name, inlineValue);
    } else if (name === "--date" && args[index + 1] && !args[index + 1].startsWith("--")) {
      options.set(name, args[index + 1]);
      index += 1;
    } else {
      options.set(name, true);
    }
  }
  return { positional, options };
};

const parseEditorCommand = (value) =>
  String(value || "").match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) || [];

const openEditor = async (path) => {
  const configuredEditor = process.env.VISUAL || process.env.EDITOR;
  const parts = configuredEditor
    ? parseEditorCommand(configuredEditor)
    : process.platform === "win32"
      ? ["notepad.exe"]
      : ["vi"];
  const [command, ...args] = parts;
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, [...args, path], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      windowsHide: false,
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) =>
      code === 0
        ? resolvePromise()
        : rejectPromise(new Error(`编辑器退出，状态码：${code}`)),
    );
  });
};

const confirm = async (message) => {
  if (!process.stdin.isTTY) throw new Error("非交互环境发布时请添加 --yes。");
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^(?:y|yes)$/i.test((await prompt.question(`${message} [y/N] `)).trim());
  } finally {
    prompt.close();
  }
};

const runWrangler = async (args, { capture = false } = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [WRANGLER_BIN, ...args], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
    }
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else rejectPromise(new Error(`Wrangler 命令失败（${code}）${stderr.trim() ? `：\n${stderr.trim()}` : ""}`));
    });
  });

const kvArguments = (command) => [
  "kv",
  "key",
  command,
  KV_KEY,
  "--binding",
  KV_BINDING,
  "--remote",
  "--config",
  CONFIG_PATH,
];

const getRemotePayload = async () => {
  const { stdout } = await runWrangler([...kvArguments("get"), "--text"], { capture: true });
  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");
  const raw = firstBrace >= 0 && lastBrace > firstBrace
    ? stdout.slice(firstBrace, lastBrace + 1)
    : stdout.trim();
  if (!raw) throw new Error("远端 changelog:v1 尚未初始化。");
  let payload;
  try {
    payload = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("远端 changelog:v1 不是有效 JSON，已停止发布。");
  }
  return validateChangelogPayload(payload, { source: "远端 KV" });
};

const releaseMap = (items) => new Map(items.map((item) => [item.version, item]));

const diffPayloads = (localItems, remoteItems) => {
  const local = releaseMap(localItems);
  const remote = releaseMap(remoteItems);
  return {
    added: localItems.filter((item) => !remote.has(item.version)),
    changed: localItems.filter((item) => remote.has(item.version) && JSON.stringify(item) !== JSON.stringify(remote.get(item.version))),
    removed: remoteItems.filter((item) => !local.has(item.version)),
  };
};

const printDiff = ({ added, changed, removed }) => {
  const print = (symbol, label, items) => {
    if (!items.length) return;
    console.log(`\n${label}（${items.length}）`);
    items.forEach((item) => console.log(`  ${symbol} ${item.version} · ${item.summary}`));
  };
  print("+", "新增", added);
  print("~", "修改", changed);
  print("-", "移除", removed);
  if (!added.length && !changed.length && !removed.length) {
    console.log("更新日志已与网站一致。本次发布将更新同步时间。");
  }
};

const verifyRemoteWrite = async (updatedAt) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = await getRemotePayload();
    if (payload.updatedAt === new Date(Date.parse(updatedAt)).toISOString()) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  return false;
};

const verifyPublicEndpoint = async (updatedAt) => {
  try {
    const response = await fetch(`${PUBLIC_ENDPOINT}?publish=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return false;
    const payload = validateChangelogPayload(await response.json(), {
      requireServerTime: true,
      source: "公开接口",
    });
    return payload.updatedAt === new Date(Date.parse(updatedAt)).toISOString();
  } catch {
    return false;
  }
};

const publishReleases = async (releases, { dryRun = false, yes = false, releaseVersion } = {}) => {
  let updatedAt = formatLocalIso();
  const localPayload = createChangelogPayload(releases, { updatedAt });
  const remotePayload = await getRemotePayload();
  if (releaseVersion) {
    if (remotePayload.items.some(({ version }) => compareVersions(version, releaseVersion) > 0))
      throw new Error("远端更新日志已有更新版本，已停止同步。");
    const items = releaseMap(remotePayload.items);
    for (const release of localPayload.items) {
      if (release.version === releaseVersion || !items.has(release.version)) items.set(release.version, release);
    }
    localPayload.items = [...items.values()].sort((left, right) => compareVersions(right.version, left.version));
  }
  const diff = diffPayloads(localPayload.items, remotePayload.items);
  console.log(`本地正式版本：${localPayload.items.length} 个；远端版本：${remotePayload.items.length} 个。`);
  const unchanged = !diff.added.length && !diff.changed.length && !diff.removed.length;
  if (releaseVersion && unchanged) console.log("更新日志已同步，检查线上接口。");
  else printDiff(diff);
  if (dryRun) {
    console.log("\n更新日志发布预览完成。确认以上内容后，移除 --dry-run 再次运行以正式发布。");
    return { published: false, payload: localPayload };
  }
  if (!yes && !(await confirm("确认将以上正式版本的更新日志发布到网站？已发布内容将备份后替换。"))) {
    console.log("已取消发布。");
    return { published: false, payload: localPayload };
  }

  if (releaseVersion && unchanged) {
    updatedAt = remotePayload.updatedAt;
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(BACKUP_DIR, `${timestamp}.json`);
    const publishPath = join(TEMP_DIR, `publish-${process.pid}.json`);
    await mkdir(BACKUP_DIR, { recursive: true });
    await mkdir(TEMP_DIR, { recursive: true });
    await writeFile(backupPath, `${JSON.stringify(remotePayload, null, 2)}\n`, "utf8");
    await writeFile(publishPath, `${JSON.stringify(localPayload, null, 2)}\n`, "utf8");
    try {
      await runWrangler([...kvArguments("put"), "--path", publishPath]);
    } finally {
      await unlink(publishPath).catch(() => {});
    }
    if (!(await verifyRemoteWrite(updatedAt))) {
      throw new Error(`KV 写入后校验失败。远端旧数据备份位于：${backupPath}`);
    }
    console.log(`远端备份：${backupPath}`);
  }
  const publicVerified = releaseVersion
    ? await waitForPublishedContent(() => verifyPublicEndpoint(updatedAt))
    : await verifyPublicEndpoint(updatedAt);
  console.log(`\n发布成功：${localPayload.items.length} 个版本。`);
  console.log(publicVerified ? "网站已可获取本次更新日志。" : "更新日志已保存到云端，网站接口尚未返回本次内容。请稍后查看网站。");
  return { published: true, payload: localPayload };
};

const findRelease = async (version, options) => {
  if (!version) throw new Error("请提供版本号。");
  const entries = await readReleaseFiles(options);
  const entry = entries.find((item) => item.release.version === version);
  if (!entry) throw new Error(`未找到版本：${version}`);
  return { entries, entry };
};

const resolveDraftTarget = (value, entries) => {
  if (!value) throw new Error("请提供 major、minor、patch 或明确版本号。");
  const latest = entries
    .map((entry) => entry.release)
    .filter((release) => release.status === "released")
    .sort((left, right) => compareVersions(right.version, left.version))[0];
  if (!latest) throw new Error("缺少可用于计算下一版本的正式日志。");
  if (entries.some((entry) => entry.release.status === "draft")) {
    throw new Error("当前已经存在草稿版本，请先编辑、发布或移除该草稿。");
  }

  const candidates = new Map(
    SEMVER_BUMPS.map((bump) => [nextVersion(latest.version, bump), bump]),
  );
  if (SEMVER_BUMPS.includes(value)) {
    return { bump: value, version: nextVersion(latest.version, value) };
  }
  const bump = candidates.get(value);
  if (!bump) {
    throw new Error(
      `${value} 不是 ${latest.version} 的下一合法版本；可用版本为 ${Array.from(candidates.keys()).join("、")}。`,
    );
  }
  return { bump, version: value };
};

const createDraft = async (value) => {
  const entries = await readReleaseFiles();
  const { bump, version } = resolveDraftTarget(value, entries);
  const path = releasePath(version);
  try {
    await readFile(path, "utf8");
    throw new Error(`版本文件已存在：${version}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(CHANGELOG_DIR, { recursive: true });
  const heading = bump === "patch" ? "修复" : "功能";
  const metadata = `---\nversion: ${version}\nstatus: draft\nsummary: 请填写本次更新摘要\n${bump === "major" ? "breaking: true\n" : ""}---\n\n`;
  const warning = bump === "major"
    ? `\n\n## 升级前请注意\n\n${DRAFT_WARNING}`
    : "";
  await writeFile(
    path,
    `${metadata}${DRAFT_INTRO}\n\n## ${heading}\n\n${DRAFT_CHANGE}${warning}\n`,
    "utf8",
  );
  console.log(`已创建：${path}`);
  await openEditor(path);
  const release = parseReleaseMarkdown(await readFile(path, "utf8"), basename(path));
  validateReleaseChain([...entries, { release }]);
  console.log("草稿校验通过。");
};

const listReleases = async () => {
  const entries = await readReleaseFiles();
  console.table(entries.map(({ release }) => ({
    version: release.version,
    status: release.status,
    date: release.date || "—",
    changes: release.groups.reduce((sum, group) => sum + group.count, 0),
    summary: release.summary,
  })));
};

const checkReleases = async () => {
  const entries = await readReleaseFiles();
  const releasedCount = entries.filter(
    ({ release }) => release.status === "released",
  ).length;
  console.log(
    `更新日志校验通过：${entries.length} 个本地版本，${releasedCount} 个正式版本。`,
  );
};

const readReadmeVersions = async () =>
  Promise.all(README_PATHS.map(async (path) => {
    const content = await readFile(path, "utf8");
    const matches = [...content.matchAll(README_VERSION_PATTERN)];
    if (matches.length !== 1) {
      throw new Error(`${basename(path)} 必须包含唯一的当前版本标记。`);
    }
    return { path, content, version: matches[0][2].trim() };
  }));

export const verifyReleaseVersion = async (expectedVersion) => {
  const entries = await readReleaseFiles();
  const released = entries
    .map((entry) => entry.release)
    .filter((release) => release.status === "released")
    .sort((left, right) => compareVersions(right.version, left.version));
  const latest = released[0];
  const pkg = JSON.parse(await readFile(PACKAGE_PATH, "utf8"));

  if (!latest) throw new Error("缺少正式更新日志。");
  if (pkg.version !== latest.version) {
    throw new Error(
      `package.json 版本 ${pkg.version} 与最新正式日志 ${latest.version} 不一致。`,
    );
  }
  if (expectedVersion && expectedVersion !== latest.version) {
    throw new Error(
      `发布版本 ${expectedVersion} 与最新正式日志 ${latest.version} 不一致。`,
    );
  }

  for (const readme of await readReadmeVersions()) {
    if (readme.version !== latest.version) {
      throw new Error(
        `${basename(readme.path)} 版本 ${readme.version} 与最新正式日志 ${latest.version} 不一致。`,
      );
    }
  }

  return { entries, version: latest.version };
};

export const publishAllReleases = async ({ dryRun, yes }) => {
  const entries = await readReleaseFiles();
  const result = await publishReleases(entries, { dryRun, yes });
  if (result.published) {
    await writeStaticChangelog(entries);
    console.log("静态更新日志快照已同步。\n");
  }
  return result;
};

const readOptionalFile = async (path) => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

const restoreFile = async (path, content) => {
  if (content === null) {
    await unlink(path).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
};

const updatePackageVersion = (content, currentVersion, nextVersionValue) => {
  const escapedVersion = currentVersion.replaceAll(".", "\\.");
  const pattern = new RegExp(
    `(\\"version\\"\\s*:\\s*\\")${escapedVersion}(\\")`,
  );
  const updated = content.replace(pattern, `$1${nextVersionValue}$2`);
  if (updated === content && currentVersion !== nextVersionValue) {
    throw new Error("无法更新 package.json 的 version 字段。");
  }
  return updated;
};

export const prepareRelease = async (version, { date, dryRun = false } = {}) => {
  const { entries, entry } = await findRelease(version);
  if (entry.release.status !== "draft") throw new Error(`${version} 已是正式版本。`);
  const packageContent = await readFile(PACKAGE_PATH, "utf8");
  const pkg = JSON.parse(packageContent);
  const currentReleasedVersion = entries
    .map((item) => item.release)
    .filter((release) => release.status === "released")
    .sort((left, right) => compareVersions(right.version, left.version))[0]?.version;
  if (pkg.version !== currentReleasedVersion && pkg.version !== version) {
    throw new Error(
      `package.json 当前版本为 ${pkg.version}，应为最新正式版本 ${currentReleasedVersion}。`,
    );
  }
  const releaseContent = renderReleaseMarkdown({
    ...entry.release,
    status: "released",
    date: date || formatLocalDate(),
  });
  const release = parseReleaseMarkdown(releaseContent, entry.name);
  const candidateEntries = entries.map((item) => item === entry ? { ...item, release } : item);
  validateReleaseChain(candidateEntries);
  const readmes = await readReadmeVersions();
  if (dryRun) {
    console.log(`准备发布：${pkg.version} → ${version}`);
    console.log(`发布日期：${release.date}`);
    console.log("准备结果预览：版本号、各语言项目说明和更新日志将就绪。确认后移除 --dry-run 再次运行。");
    return;
  }

  const snapshots = new Map(readmes.map(({ path, content }) => [path, content]));
  for (const path of [
    entry.path,
    PACKAGE_PATH,
    STATIC_CHANGELOG_PATH,
  ]) {
    snapshots.set(path, await readOptionalFile(path));
  }

  try {
    await writeFile(entry.path, releaseContent, "utf8");
    await writeFile(
      PACKAGE_PATH,
      updatePackageVersion(packageContent, pkg.version, version),
      "utf8",
    );
    for (const { path, content } of readmes) {
      await writeFile(
        path,
        content.replace(README_VERSION_PATTERN, (_, prefix, previousVersion, suffix) =>
          `${prefix}${version}${suffix}`,
        ),
        "utf8",
      );
    }
    await writeStaticChangelog(candidateEntries);
  } catch (error) {
    await Promise.all(
      Array.from(snapshots, ([path, content]) => restoreFile(path, content)),
    );
    throw error;
  }

  console.log(`\n版本 ${version} 的发布资料已准备完成。`);
};

export async function finalizeRelease() {
  const draft = (await readReleaseFiles()).find(({ release }) => release.status === "draft")?.release;
  if (!draft || !/^\d+\.\d+\.\d+$/.test(draft.version))
    throw new Error("请先将一个正式版本号的更新日志草稿提交到 main。");
  await prepareRelease(draft.version);
  await verifyReleaseVersion(draft.version);
  return draft.version;
}

export async function publishReleaseChangelog(version) {
  const { entries } = await verifyReleaseVersion(version);
  await publishReleases(entries, { yes: true, releaseVersion: version });
}

const main = async () => {
  const [command = "help", ...rawArgs] = process.argv.slice(2);
  const { positional, options } = parseOptions(rawArgs);
  const version = positional[0];
  switch (command) {
    case "new":
      await createDraft(version);
      break;
    case "edit": {
      const { entries, entry } = await findRelease(version, { allowDraftPlaceholders: true });
      await openEditor(entry.path);
      const release = parseReleaseMarkdown(
        await readFile(entry.path, "utf8"),
        entry.name,
      );
      validateReleaseChain(
        entries.map((item) => (item === entry ? { ...item, release } : item)),
      );
      console.log("更新日志校验通过。");
      break;
    }
    case "list":
      await listReleases();
      break;
    case "check":
      await checkReleases();
      break;
    case "generate": {
      const payload = await writeStaticChangelog();
      console.log(`网站更新日志已生成：共 ${payload.items.length} 个正式版本。`);
      break;
    }
    case "prepare":
      await prepareRelease(version, {
        date: options.get("--date"),
        dryRun: options.has("--dry-run"),
      });
      break;
    case "publish":
      await publishAllReleases({
        dryRun: options.has("--dry-run"),
        yes: options.has("--yes"),
      });
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(helpText);
      break;
    default:
      throw new Error(`未知命令：${command}\n\n${helpText}`);
  }
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(resolve(process.argv[1])));
if (isMain) {
  main().catch((error) => {
    console.error(`\n更新日志工具执行失败：${error.message}`);
    process.exitCode = 1;
  });
}
