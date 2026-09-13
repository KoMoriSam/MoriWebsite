import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

import frontMatter from "front-matter";
import yaml from "js-yaml";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const ANNOUNCEMENTS_DIR = join(PROJECT_ROOT, "announcements");
const CONFIG_PATH = "wrangler.api.jsonc";
const KV_BINDING = "ANNOUNCEMENTS_KV";
const KV_KEY = "announcements:v1";
const PUBLIC_ENDPOINT = "https://api.komori.cc/announcements";
const WRANGLER_BIN = join(
  PROJECT_ROOT,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
const BACKUP_DIR = join(PROJECT_ROOT, ".tmp", "announcement-backups");
const TEMP_DIR = join(PROJECT_ROOT, ".tmp", "announcements");
const VALID_TONES = new Set(["info", "warning", "error"]);
const VALID_PRIORITIES = new Set(["normal", "important"]);
const BODY_PLACEHOLDER = "请在这里填写公告正文。";
const TEXT_LIMITS = {
  id: 128,
  title: 160,
  summary: 320,
  body: 20000,
};

const helpText = `公告发布工具

用法：pnpm announcement <command> [options]

命令：
  new                         交互式创建公告并打开 Markdown 编辑器
  list                        查看本地公告
  edit <id>                   编辑公告
  bump <id>                   将公告 revision 加一
  expire <id>                 将公告结束时间设为现在
  check                       校验全部本地公告
  import <json-file>          将现有公告 JSON 转换为 Markdown
  pull                        从远端 KV 导入 Markdown
  publish [--dry-run] [--yes] 校验、备份并发布到远端 KV

选项：
  --force                     import/pull 时覆盖同 ID 的本地文件
  --dry-run                   仅显示发布差异，不写入 KV
  --yes                       跳过发布确认
`;

const formatLocalIso = (date = new Date()) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const pad = (value) => String(value).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${milliseconds}`,
    `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`,
  ].join("");
};

const normalizeDateValue = (value) =>
  value instanceof Date ? value.toISOString() : value;

const normalizeAnnouncement = (attributes, body) => ({
  id: attributes.id,
  revision: attributes.revision,
  title: attributes.title,
  summary: attributes.summary,
  body: String(body || "").trim(),
  tone: attributes.tone,
  priority: attributes.priority,
  pinned: attributes.pinned ?? false,
  startsAt: normalizeDateValue(attributes.startsAt),
  ...(attributes.endsAt == null || attributes.endsAt === ""
    ? {}
    : { endsAt: normalizeDateValue(attributes.endsAt) }),
});

export const validateAnnouncement = (announcement, source = "公告") => {
  announcement = {
    ...announcement,
    pinned: announcement.pinned ?? false,
  };
  const errors = [];
  const requireText = (field, limit) => {
    const value = announcement[field];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} 必须是非空字符串`);
    } else if (value.length > limit) {
      errors.push(`${field} 不能超过 ${limit} 个字符`);
    }
  };

  requireText("id", TEXT_LIMITS.id);
  requireText("title", TEXT_LIMITS.title);
  requireText("summary", TEXT_LIMITS.summary);
  requireText("body", TEXT_LIMITS.body);

  if (!Number.isSafeInteger(announcement.revision) || announcement.revision < 1) {
    errors.push("revision 必须是大于等于 1 的整数");
  }
  if (!VALID_TONES.has(announcement.tone)) {
    errors.push("tone 必须是 info、warning 或 error");
  }
  if (!VALID_PRIORITIES.has(announcement.priority)) {
    errors.push("priority 必须是 normal 或 important");
  }
  if (typeof announcement.pinned !== "boolean") {
    errors.push("pinned 必须是 true 或 false");
  }

  const startsAt =
    typeof announcement.startsAt === "string"
      ? Date.parse(announcement.startsAt)
      : NaN;
  if (!Number.isFinite(startsAt)) {
    errors.push("startsAt 必须是有效的 ISO 日期时间");
  }

  if (announcement.endsAt != null) {
    const endsAt =
      typeof announcement.endsAt === "string"
        ? Date.parse(announcement.endsAt)
        : NaN;
    if (!Number.isFinite(endsAt)) {
      errors.push("endsAt 必须是有效的 ISO 日期时间");
    } else if (Number.isFinite(startsAt) && endsAt <= startsAt) {
      errors.push("endsAt 必须晚于 startsAt");
    }
  }

  if (errors.length) {
    throw new Error(`${source} 校验失败：\n- ${errors.join("\n- ")}`);
  }

  return announcement;
};

export const parseAnnouncementMarkdown = (content, source = "公告文件") => {
  if (!frontMatter.test(content)) {
    throw new Error(`${source} 缺少 YAML front matter`);
  }
  const parsed = frontMatter(content);
  return validateAnnouncement(
    normalizeAnnouncement(parsed.attributes, parsed.body),
    source,
  );
};

export const parseAnnouncementsJson = (content) =>
  JSON.parse(String(content || "").replace(/^\uFEFF/, ""));

const orderedMetadata = (announcement) => ({
  id: announcement.id,
  revision: announcement.revision,
  title: announcement.title,
  summary: announcement.summary,
  tone: announcement.tone,
  priority: announcement.priority,
  pinned: announcement.pinned,
  startsAt: announcement.startsAt,
  ...(announcement.endsAt ? { endsAt: announcement.endsAt } : {}),
});

export const renderAnnouncementMarkdown = (announcement) => {
  validateAnnouncement(announcement);
  const metadata = yaml.dump(orderedMetadata(announcement), {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  return `---\n${metadata}---\n\n${announcement.body.trim()}\n`;
};

const safeFilename = (id) => {
  const normalized = id
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[. -]+|[. -]+$/g, "")
    .slice(0, 80);
  if (normalized && normalized === id) return `${normalized}.md`;
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 8);
  return `${normalized || "announcement"}-${digest}.md`;
};

const readAnnouncementFiles = async () => {
  await mkdir(ANNOUNCEMENTS_DIR, { recursive: true });
  const names = (await readdir(ANNOUNCEMENTS_DIR))
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));

  return Promise.all(
    names.map(async (name) => {
      const path = join(ANNOUNCEMENTS_DIR, name);
      const content = await readFile(path, "utf8");
      return {
        path,
        name,
        announcement: parseAnnouncementMarkdown(content, name),
      };
    }),
  );
};

const validateUniqueIds = (entries) => {
  const seen = new Map();
  for (const entry of entries) {
    const id = entry.announcement.id;
    if (seen.has(id)) {
      throw new Error(
        `公告 ID 重复：${id}\n- ${seen.get(id)}\n- ${entry.name}`,
      );
    }
    seen.set(id, entry.name);
  }
};

const loadLocalAnnouncements = async () => {
  const entries = await readAnnouncementFiles();
  validateUniqueIds(entries);
  return entries;
};

const findLocalAnnouncement = async (id) => {
  if (!id) throw new Error("请提供公告 ID。");
  const entries = await loadLocalAnnouncements();
  const entry = entries.find((item) => item.announcement.id === id);
  if (!entry) throw new Error(`未找到公告：${id}`);
  return entry;
};

const writeAnnouncementFile = async (announcement, existingPath) => {
  const path = existingPath || join(ANNOUNCEMENTS_DIR, safeFilename(announcement.id));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderAnnouncementMarkdown(announcement), "utf8");
  return path;
};

const parseEditorCommand = (value) => {
  const parts = String(value || "").match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return parts.map((part) => part.replace(/^"|"$/g, ""));
};

const openEditor = async (path) => {
  const configuredEditor = process.env.VISUAL || process.env.EDITOR;
  const parts = configuredEditor
    ? parseEditorCommand(configuredEditor)
    : process.platform === "win32"
      ? ["notepad.exe"]
      : ["vi"];
  const [command, ...editorArgs] = parts;

  if (!command) {
    console.log(`公告已保存，请手动编辑：${path}`);
    return;
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, [...editorArgs, path], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      windowsHide: false,
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`编辑器退出，状态码：${code}`));
    });
  });
};

const withPrompt = async (callback) => {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await callback(prompt);
  } finally {
    prompt.close();
  }
};

const ask = async (prompt, label, defaultValue = "") => {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await prompt.question(`${label}${suffix}：`)).trim();
  return answer || defaultValue;
};

const confirm = async (message) => {
  if (!process.stdin.isTTY) {
    throw new Error("非交互环境发布时请显式添加 --yes。");
  }
  return withPrompt(async (prompt) => {
    const answer = (await prompt.question(`${message} [y/N] `)).trim();
    return /^(?:y|yes)$/i.test(answer);
  });
};

const defaultAnnouncementId = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `announcement-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
};

const createAnnouncement = async () => {
  const announcement = await withPrompt(async (prompt) => {
    const title = await ask(prompt, "标题");
    const id = await ask(prompt, "ID", defaultAnnouncementId());
    const summary = await ask(prompt, "摘要");
    const tone = await ask(prompt, "语气 info/warning/error", "info");
    const priority = await ask(prompt, "优先级 normal/important", "normal");
    const pinnedAnswer = await ask(prompt, "是否置顶 y/N", "n");
    if (!/^(?:y|yes|n|no)$/i.test(pinnedAnswer)) {
      throw new Error("是否置顶请输入 y 或 n。");
    }
    const startsAt = await ask(prompt, "开始时间", formatLocalIso());
    const endsAt = await ask(prompt, "结束时间（可留空）");

    return {
      id,
      revision: 1,
      title,
      summary,
      body: BODY_PLACEHOLDER,
      tone,
      priority,
      pinned: /^(?:y|yes)$/i.test(pinnedAnswer),
      startsAt,
      ...(endsAt ? { endsAt } : {}),
    };
  });

  validateAnnouncement(announcement);
  const existing = (await loadLocalAnnouncements()).find(
    (entry) => entry.announcement.id === announcement.id,
  );
  if (existing) throw new Error(`公告 ID 已存在：${announcement.id}`);

  const path = await writeAnnouncementFile(announcement);
  console.log(`已创建：${path}`);
  await openEditor(path);
  const saved = parseAnnouncementMarkdown(
    await readFile(path, "utf8"),
    basename(path),
  );
  if (saved.body === BODY_PLACEHOLDER) {
    throw new Error(`公告正文尚未填写：${path}`);
  }
  console.log("公告校验通过。使用 pnpm announcement publish 发布。");
};

const listAnnouncements = async () => {
  const entries = await loadLocalAnnouncements();
  if (!entries.length) {
    console.log("本地尚无公告。使用 pnpm announcement new 创建。");
    return;
  }

  console.log(`本地公告：${entries.length} 条。远端数据请使用 pnpm announcement pull 查看。`);
  console.table(
    entries.map(({ announcement }) => ({
      id: announcement.id,
      revision: announcement.revision,
      priority: announcement.priority,
      pinned: announcement.pinned ? "是" : "否",
      tone: announcement.tone,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt || "—",
      title: announcement.title,
    })),
  );
};

const editAnnouncement = async (id) => {
  const entry = await findLocalAnnouncement(id);
  await openEditor(entry.path);
  parseAnnouncementMarkdown(await readFile(entry.path, "utf8"), entry.name);
  console.log("公告校验通过。使用 pnpm announcement publish 发布。");
};

const bumpAnnouncement = async (id) => {
  const entry = await findLocalAnnouncement(id);
  const announcement = {
    ...entry.announcement,
    revision: entry.announcement.revision + 1,
  };
  await writeAnnouncementFile(announcement, entry.path);
  console.log(`${id} revision：${entry.announcement.revision} → ${announcement.revision}`);
};

const expireAnnouncement = async (id) => {
  const entry = await findLocalAnnouncement(id);
  const endsAt = formatLocalIso();
  if (Date.parse(endsAt) <= Date.parse(entry.announcement.startsAt)) {
    throw new Error("公告尚未开始，不能设置为现在结束；请直接调整 startsAt 或删除草稿。");
  }
  await writeAnnouncementFile(
    { ...entry.announcement, endsAt },
    entry.path,
  );
  console.log(`${id} 已设置结束时间：${endsAt}`);
};

const runWrangler = async (args, { capture = false } = {}) => {
  const result = await new Promise((resolvePromise, rejectPromise) => {
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
      else {
        rejectPromise(
          new Error(
            `Wrangler 命令失败（${code}）${stderr.trim() ? `：\n${stderr.trim()}` : ""}`,
          ),
        );
      }
    });
  });
  return result;
};

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
  const { stdout } = await runWrangler([...kvArguments("get"), "--text"], {
    capture: true,
  });
  const output = stdout;
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  const hasBom =
    output.codePointAt(0) === 0xfeff ||
    (firstBrace > 0 && output.slice(0, firstBrace).includes("\uFEFF"));
  const raw =
    firstBrace >= 0 && lastBrace > firstBrace
      ? output.slice(firstBrace, lastBrace + 1)
      : output.trim();
  if (!raw) throw new Error("远端公告 KV 为空，无法创建安全备份。");

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("远端公告不是有效 JSON，已停止发布以避免覆盖。");
  }

  return { raw, payload, hasBom };
};

const validatePayload = (payload, source) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.schemaVersion !== 1 ||
    typeof payload.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.updatedAt)) ||
    !Array.isArray(payload.items)
  ) {
    throw new Error(`${source} 不是有效的 announcements:v1 数据。`);
  }
  const entries = payload.items.map((item, index) => ({
    name: `${source}#items[${index}]`,
    announcement: validateAnnouncement({ ...item }, `${source}#items[${index}]`),
  }));
  validateUniqueIds(entries);
  return entries.map((entry) => entry.announcement);
};

const importPayload = async (payload, { force = false, source = "JSON" } = {}) => {
  const announcements = validatePayload(payload, source);
  const localEntries = await loadLocalAnnouncements();
  const localById = new Map(
    localEntries.map((entry) => [entry.announcement.id, entry]),
  );
  let imported = 0;
  let skipped = 0;

  for (const announcement of announcements) {
    const existing = localById.get(announcement.id);
    if (existing && !force) {
      skipped += 1;
      continue;
    }
    await writeAnnouncementFile(announcement, existing?.path);
    imported += 1;
  }

  console.log(`导入完成：${imported} 条写入，${skipped} 条跳过。`);
  if (skipped) console.log("如需覆盖同 ID 文件，请添加 --force。");
};

const importJsonFile = async (file, force) => {
  if (!file) throw new Error("请提供 JSON 文件路径。");
  const path = resolve(PROJECT_ROOT, file);
  const payload = parseAnnouncementsJson(await readFile(path, "utf8"));
  await importPayload(payload, { force, source: basename(path) });
};

const pullAnnouncements = async (force) => {
  const { payload } = await getRemotePayload();
  await importPayload(payload, { force, source: "远端 KV" });
};

export const diffAnnouncements = (localItems, remoteItems) => {
  const local = new Map(localItems.map((item) => [item.id, item]));
  const remote = new Map(remoteItems.map((item) => [item.id, item]));
  const added = localItems.filter((item) => !remote.has(item.id));
  const removed = remoteItems.filter((item) => !local.has(item.id));
  const changed = localItems.filter((item) => {
    const previous = remote.get(item.id);
    return previous && JSON.stringify(previous) !== JSON.stringify(item);
  });
  return { added, changed, removed };
};

export const findRevisionRollback = (localItems, remoteItems) => {
  const remoteById = new Map(remoteItems.map((item) => [item.id, item]));
  return localItems.find((item) => {
    const previous = remoteById.get(item.id);
    return previous && item.revision < previous.revision;
  });
};

const printDiff = ({ added, changed, removed }) => {
  const printGroup = (symbol, label, items) => {
    if (!items.length) return;
    console.log(`\n${label}（${items.length}）`);
    for (const item of items) {
      console.log(`  ${symbol} ${item.id} r${item.revision} · ${item.title}`);
    }
  };
  printGroup("+", "新增", added);
  printGroup("~", "修改", changed);
  printGroup("-", "移除", removed);
  if (!added.length && !changed.length && !removed.length) {
    console.log("本地与远端公告内容一致。仅 updatedAt 会刷新。");
  }
};

const verifyRemoteWrite = async (expectedUpdatedAt) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { payload, hasBom } = await getRemotePayload();
    if (!hasBom && payload.updatedAt === expectedUpdatedAt) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  return false;
};

const verifyPublicEndpoint = async (expectedUpdatedAt) => {
  try {
    const response = await fetch(`${PUBLIC_ENDPOINT}?publish=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return (
      payload.schemaVersion === 1 &&
      Date.parse(payload.updatedAt) === Date.parse(expectedUpdatedAt)
    );
  } catch {
    return false;
  }
};

export const publishAnnouncements = async ({ dryRun = false, yes = false } = {}) => {
  const entries = await loadLocalAnnouncements();
  const localItems = entries
    .map((entry) => entry.announcement)
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt));
  if (!localItems.length) {
    throw new Error(
      "本地 announcements 目录没有公告，已拒绝用空数据覆盖远端 KV。",
    );
  }
  const remote = await getRemotePayload();
  const remoteItems = validatePayload(remote.payload, "远端 KV");
  const diff = diffAnnouncements(localItems, remoteItems);
  const revisionRollback = findRevisionRollback(localItems, remoteItems);
  if (revisionRollback) {
    throw new Error(
      `${revisionRollback.id} 的 revision 不能低于远端版本。请执行 bump 或修正 Markdown。`,
    );
  }

  console.log(`本地公告：${localItems.length} 条；远端公告：${remoteItems.length} 条。`);
  if (remote.hasBom) {
    console.log("远端 JSON 包含 UTF-8 BOM；本次发布会自动清除。");
  }
  printDiff(diff);
  if (dryRun) {
    console.log("\nDry run 完成，未写入远端 KV。");
    return { published: false };
  }

  if (!yes && !(await confirm("确认用本地 Markdown 公告覆盖远端 announcements:v1？"))) {
    console.log("已取消发布。");
    return { published: false };
  }

  const updatedAt = formatLocalIso();
  const payload = { schemaVersion: 1, updatedAt, items: localItems };
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `${timestamp}.json`);
  const publishPath = join(TEMP_DIR, `publish-${process.pid}.json`);
  await mkdir(BACKUP_DIR, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(remote.payload, null, 2)}\n`, "utf8");
  await writeFile(publishPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  try {
    await runWrangler([
      ...kvArguments("put"),
      "--path",
      publishPath,
    ]);
  } finally {
    await unlink(publishPath).catch(() => {});
  }

  if (!(await verifyRemoteWrite(updatedAt))) {
    throw new Error(`KV 写入后校验失败。远端旧数据备份位于：${backupPath}`);
  }

  const publicVerified = await verifyPublicEndpoint(updatedAt);
  console.log(`\n发布成功：${localItems.length} 条公告。`);
  console.log(`远端备份：${backupPath}`);
  console.log(
    publicVerified
      ? "公开接口已返回本次数据。"
      : "KV 已验证写入；公开接口仍可能受边缘缓存或传播延迟影响。",
  );
  return { published: true, payload };
};

const checkAnnouncements = async () => {
  const entries = await loadLocalAnnouncements();
  console.log(`公告校验通过：${entries.length} 条。`);
};

const main = async () => {
  const [command = "help", argument, ...rest] = process.argv.slice(2);
  const options = new Set([argument, ...rest].filter((item) => item?.startsWith("--")));
  const value = argument?.startsWith("--") ? undefined : argument;

  switch (command) {
    case "new":
      await createAnnouncement();
      break;
    case "list":
      await listAnnouncements();
      break;
    case "edit":
      await editAnnouncement(value);
      break;
    case "bump":
      await bumpAnnouncement(value);
      break;
    case "expire":
      await expireAnnouncement(value);
      break;
    case "check":
      await checkAnnouncements();
      break;
    case "import":
      await importJsonFile(value, options.has("--force"));
      break;
    case "pull":
      await pullAnnouncements(options.has("--force"));
      break;
    case "publish":
      await publishAnnouncements({
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

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(resolve(process.argv[1])));

if (isMain) {
  main().catch((error) => {
    console.error(`\n公告工具执行失败：${error.message}`);
    process.exitCode = 1;
  });
}
