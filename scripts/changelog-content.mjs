import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import frontMatter from "front-matter";
import yaml from "js-yaml";
import MarkdownIt from "markdown-it";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
export const CHANGELOG_DIR = join(PROJECT_ROOT, "changelog", "releases");
export const STATIC_CHANGELOG_PATH = join(
  PROJECT_ROOT,
  "public",
  "changelog.v1.json",
);
export const LEGACY_CHANGELOG_PATH = join(
  PROJECT_ROOT,
  "public",
  "changelog.json",
);
export const CHANGELOG_SCHEMA_VERSION = 1;

export const CHANGELOG_TYPES = Object.freeze({
  feature: "功能",
  improve: "改进",
  fix: "修复",
  performance: "优化",
  refactor: "重构",
  chore: "维护",
});
export const CHANGELOG_TYPE_ORDER = Object.freeze([
  "feature",
  "improve",
  "fix",
  "performance",
  "refactor",
  "chore",
]);
export const SEMVER_BUMPS = Object.freeze(["major", "minor", "patch"]);

const SPECIAL_SECTIONS = Object.freeze({
  版本说明: "note",
  升级前请注意: "warning",
});
const HEADING_TO_TYPE = new Map(
  Object.entries(CHANGELOG_TYPES).map(([type, label]) => [label, type]),
);
const MARKDOWN = new MarkdownIt({ html: false });
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RELEASE_STATUSES = new Set(["draft", "released"]);
const PLACEHOLDERS = [
  "请填写本次更新摘要",
  "请填写版本概述。",
  "请填写更新内容。",
  "请说明破坏性变化和升级方式。",
];
const TEXT_LIMITS = {
  summary: 320,
  section: 30000,
};

export const formatLocalIso = (date = new Date()) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(
    absoluteOffset % 60,
  )}`;
};

export const formatLocalDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

const normalizeDate = (value) => {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return typeof value === "string" ? value.trim() : "";
};

const normalizeText = (value, limit = Infinity) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text && text.length <= limit ? text : "";
};

const isValidDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
};

const versionParts = (version) => {
  const [core, prerelease = ""] = String(version).split("-", 2);
  return {
    core: core.split(".").map(Number),
    prerelease,
  };
};

export const compareVersions = (left, right) => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a.core[index] || 0) - (b.core[index] || 0);
    if (difference !== 0) return difference;
  }
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
};

const countTopLevelListItems = (markdown) => {
  const items = MARKDOWN.parse(markdown, {}).filter(
    (token) => token.type === "list_item_open",
  );
  if (!items.length) return 0;
  const minimumLevel = Math.min(...items.map((token) => token.level));
  return items.filter((token) => token.level === minimumLevel).length;
};

const splitReleaseBody = (body, source) => {
  const lines = String(body || "").replace(/\r\n?/g, "\n").split("\n");
  const headings = [];
  const tokens = MARKDOWN.parse(lines.join("\n"), {});

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.type !== "heading_open" ||
      token.tag !== "h2" ||
      token.level !== 0 ||
      !token.map
    ) {
      continue;
    }
    const label = String(tokens[index + 1]?.content || "").trim();
    headings.push({ label, start: token.map[0], contentStart: token.map[1] });
  }

  const intro = lines.slice(0, headings[0]?.start ?? lines.length).join("\n").trim();
  const groups = [];
  const seenTypes = new Set();
  const special = { note: "", warning: "" };
  let lastGroupOrder = -1;
  let specialOrder = -1;

  headings.forEach((heading, index) => {
    const end = headings[index + 1]?.start ?? lines.length;
    const markdown = lines.slice(heading.contentStart, end).join("\n").trim();
    const type = HEADING_TO_TYPE.get(heading.label);
    const specialKey = SPECIAL_SECTIONS[heading.label];

    if (!type && !specialKey) {
      throw new Error(
        `${source} 包含未知的二级标题“${heading.label}”；仅支持更新分类、版本说明和升级前请注意。`,
      );
    }
    if (!markdown) {
      throw new Error(`${source} 的“${heading.label}”内容不能为空。`);
    }
    if (markdown.length > TEXT_LIMITS.section) {
      throw new Error(`${source} 的“${heading.label}”内容过长。`);
    }

    if (type) {
      if (specialOrder >= 0) {
        throw new Error(`${source} 的更新分类必须位于版本说明和升级警告之前。`);
      }
      if (seenTypes.has(type)) {
        throw new Error(`${source} 重复定义了“${heading.label}”分类。`);
      }
      const groupOrder = CHANGELOG_TYPE_ORDER.indexOf(type);
      if (groupOrder <= lastGroupOrder) {
        throw new Error(
          `${source} 的分类顺序必须为：${CHANGELOG_TYPE_ORDER.map((item) => CHANGELOG_TYPES[item]).join("、")}。`,
        );
      }
      const count = countTopLevelListItems(markdown);
      if (!count || !MARKDOWN.parse(markdown, {}).some((token) => token.type === "bullet_list_open")) {
        throw new Error(`${source} 的“${heading.label}”必须包含项目符号列表。`);
      }
      lastGroupOrder = groupOrder;
      seenTypes.add(type);
      groups.push({ type, markdown, count });
      return;
    }

    const nextSpecialOrder = specialKey === "note" ? 0 : 1;
    if (nextSpecialOrder <= specialOrder) {
      throw new Error(`${source} 的版本说明必须位于升级警告之前。`);
    }
    if (special[specialKey]) {
      throw new Error(`${source} 重复定义了“${heading.label}”。`);
    }
    specialOrder = nextSpecialOrder;
    special[specialKey] = markdown;
  });

  if (!groups.length) {
    throw new Error(`${source} 至少需要一个更新分类。`);
  }

  return { intro, groups, ...special };
};

export const validateRelease = (release, source = "更新日志") => {
  const errors = [];
  const version = normalizeText(release?.version, 80);
  const status = normalizeText(release?.status, 20);
  const summary = normalizeText(release?.summary, TEXT_LIMITS.summary);
  const date = normalizeDate(release?.date);
  const breaking = release?.breaking ?? false;

  if (!VERSION_PATTERN.test(version)) errors.push("version 必须是有效的语义版本号");
  if (!RELEASE_STATUSES.has(status)) errors.push("status 必须是 draft 或 released");
  if (!summary) errors.push(`summary 必须是 1-${TEXT_LIMITS.summary} 个字符`);
  if (date && !isValidDate(date)) errors.push("date 必须是 YYYY-MM-DD 格式的有效日期");
  if (status === "released" && !date) errors.push("正式版本必须提供 date");
  if (typeof breaking !== "boolean") errors.push("breaking 必须是布尔值");
  if (!Array.isArray(release?.groups) || !release.groups.length) {
    errors.push("至少需要一个更新分类");
  }
  if (breaking && !normalizeText(release.warning, TEXT_LIMITS.section)) {
    errors.push("破坏性版本必须提供“升级前请注意”");
  }

  if (errors.length) {
    throw new Error(`${source} 校验失败：\n- ${errors.join("\n- ")}`);
  }

  return {
    version,
    status,
    ...(date ? { date } : {}),
    summary,
    breaking,
    intro: normalizeText(release.intro, TEXT_LIMITS.section),
    groups: release.groups,
    note: normalizeText(release.note, TEXT_LIMITS.section),
    warning: normalizeText(release.warning, TEXT_LIMITS.section),
  };
};

export const parseReleaseMarkdown = (content, source = "更新日志文件") => {
  if (!frontMatter.test(content)) {
    throw new Error(`${source} 缺少 YAML front matter。`);
  }
  const parsed = frontMatter(content);
  const sections = splitReleaseBody(parsed.body, source);
  const release = validateRelease(
    {
      version: parsed.attributes.version,
      status: parsed.attributes.status,
      date: parsed.attributes.date,
      summary: parsed.attributes.summary,
      breaking: parsed.attributes.breaking,
      ...sections,
    },
    source,
  );

  if (PLACEHOLDERS.some((placeholder) => content.includes(placeholder))) {
    throw new Error(`${source} 仍包含未填写的占位内容。`);
  }
  return release;
};

export const renderReleaseMarkdown = (release) => {
  const normalized = validateRelease(release);
  const metadata = yaml.dump(
    {
      version: normalized.version,
      status: normalized.status,
      ...(normalized.date ? { date: normalized.date } : {}),
      summary: normalized.summary,
      ...(normalized.breaking ? { breaking: true } : {}),
    },
    { lineWidth: -1, noRefs: true, sortKeys: false },
  );
  const sections = [normalized.intro];
  normalized.groups.forEach((group) => {
    sections.push(`## ${CHANGELOG_TYPES[group.type]}\n\n${group.markdown}`);
  });
  if (normalized.note) sections.push(`## 版本说明\n\n${normalized.note}`);
  if (normalized.warning) {
    sections.push(`## 升级前请注意\n\n${normalized.warning}`);
  }
  return `---\n${metadata}---\n\n${sections.filter(Boolean).join("\n\n")}\n`;
};

export const releasePath = (version) => join(CHANGELOG_DIR, `${version}.md`);

export const nextVersion = (version, bump) => {
  if (!SEMVER_BUMPS.includes(bump)) {
    throw new Error(`不支持的版本升级类型：${bump}`);
  }
  const parsed = versionParts(version);
  if (parsed.prerelease || parsed.core.length !== 3 || parsed.core.some((part) => !Number.isSafeInteger(part) || part < 0)) {
    throw new Error(`无法从无效版本号计算下一版本：${version}`);
  }
  const [major, minor, patch] = parsed.core;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

export const inferReleaseBump = (release) => {
  if (release.breaking) return "major";
  return release.groups.some((group) => group.type === "feature")
    ? "minor"
    : "patch";
};

export const validateReleaseChain = (entries, source = "更新日志版本链") => {
  const releases = entries
    .map((entry) => entry.release || entry)
    .filter((release) => release.status === "released")
    .sort((left, right) => compareVersions(left.version, right.version));
  const drafts = entries
    .map((entry) => entry.release || entry)
    .filter((release) => release.status === "draft");

  if (!releases.length || releases[0].version !== "1.0.0") {
    throw new Error(`${source} 必须从 1.0.0 开始。`);
  }
  if (drafts.length > 1) {
    throw new Error(`${source} 同时只能存在一个草稿版本。`);
  }

  for (let index = 1; index < releases.length; index += 1) {
    const previous = releases[index - 1];
    const current = releases[index];
    const bump = inferReleaseBump(current);
    const expected = nextVersion(previous.version, bump);
    if (current.version !== expected) {
      throw new Error(
        `${source} 中 ${current.version} 的内容要求 ${bump.toUpperCase()} 升级；上一版本 ${previous.version} 的下一合法版本应为 ${expected}。`,
      );
    }
    if (current.date < previous.date) {
      throw new Error(`${source} 中 ${current.version} 的发布日期早于上一版本。`);
    }
  }

  if (drafts.length) {
    const latest = releases.at(-1);
    const draft = drafts[0];
    const bump = inferReleaseBump(draft);
    const expected = nextVersion(latest.version, bump);
    if (draft.version !== expected) {
      throw new Error(
        `${source} 中草稿 ${draft.version} 的内容要求 ${bump.toUpperCase()} 升级；下一合法版本应为 ${expected}。`,
      );
    }
  }

  return { releases, drafts };
};

export const readReleaseFiles = async () => {
  await mkdir(CHANGELOG_DIR, { recursive: true });
  const names = (await readdir(CHANGELOG_DIR))
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .sort((left, right) => compareVersions(basename(right, ".md"), basename(left, ".md")));
  const releases = [];
  const versions = new Set();

  for (const name of names) {
    const path = join(CHANGELOG_DIR, name);
    const content = await readFile(path, "utf8");
    const release = parseReleaseMarkdown(content, name);
    if (name !== `${release.version}.md`) {
      throw new Error(`${name} 的文件名必须与 version ${release.version} 一致。`);
    }
    if (versions.has(release.version)) {
      throw new Error(`更新日志版本重复：${release.version}`);
    }
    versions.add(release.version);
    releases.push({ path, name, content, release });
  }
  validateReleaseChain(releases);
  return releases;
};

export const toPublicRelease = (release) => ({
  version: release.version,
  date: release.date,
  summary: release.summary,
  intro: release.intro || "",
  groups: release.groups.map(({ type, markdown, count }) => ({
    type,
    markdown,
    count,
  })),
  ...(release.note ? { note: release.note } : {}),
  ...(release.warning ? { warning: release.warning } : {}),
});

const extractTopLevelListItems = (markdown) => {
  const tokens = MARKDOWN.parse(markdown, {});
  const itemLevels = tokens
    .filter((token) => token.type === "list_item_open")
    .map((token) => token.level);
  if (!itemLevels.length) return [];
  const topLevel = Math.min(...itemLevels);
  const items = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type !== "list_item_open" || tokens[index].level !== topLevel) {
      continue;
    }
    const content = [];
    for (index += 1; index < tokens.length; index += 1) {
      if (tokens[index].type === "list_item_close" && tokens[index].level === topLevel) {
        break;
      }
      if (tokens[index].type === "inline") content.push(tokens[index].content);
    }
    items.push(content.join(" ").trim());
  }
  return items.filter(Boolean);
};

const createLegacyChangelog = (releases) =>
  Object.fromEntries(
    releases
      .map((entry) => entry.release || entry)
      .filter((release) => release.status === "released")
      .sort((left, right) => compareVersions(right.version, left.version))
      .map((release) => [
        release.version,
        {
          date: release.date,
          changes: Object.fromEntries(
            release.groups.map((group) => [
              group.type,
              extractTopLevelListItems(group.markdown),
            ]),
          ),
          ...(release.intro || release.note
            ? {
                note: [release.intro, release.note]
                  .filter(Boolean)
                  .join("\n\n"),
              }
            : {}),
          ...(release.warning ? { warning: release.warning } : {}),
        },
      ]),
  );

export const createChangelogPayload = (
  releases,
  { updatedAt, serverTime } = {},
) => {
  const items = releases
    .map((entry) => entry.release || entry)
    .filter((release) => release.status === "released")
    .sort((left, right) => compareVersions(right.version, left.version))
    .map(toPublicRelease);
  const deterministicTime = items.length
    ? `${items.reduce((latest, item) => (item.date > latest ? item.date : latest), items[0].date)}T00:00:00.000Z`
    : "1970-01-01T00:00:00.000Z";

  return {
    schemaVersion: CHANGELOG_SCHEMA_VERSION,
    updatedAt: updatedAt || deterministicTime,
    ...(serverTime ? { serverTime } : {}),
    items,
  };
};

export const validateChangelogPayload = (
  payload,
  { requireServerTime = false, source = "更新日志数据" } = {},
) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.schemaVersion !== CHANGELOG_SCHEMA_VERSION ||
    !Array.isArray(payload.items) ||
    typeof payload.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.updatedAt)) ||
    (requireServerTime &&
      (typeof payload.serverTime !== "string" ||
        !Number.isFinite(Date.parse(payload.serverTime))))
  ) {
    throw new Error(`${source} 不是有效的 changelog:v1 数据。`);
  }

  const seenVersions = new Set();
  const items = payload.items.map((item, index) => {
    const itemSource = `${source}#items[${index}]`;
    if (
      !item ||
      typeof item !== "object" ||
      !VERSION_PATTERN.test(String(item.version || "")) ||
      !isValidDate(String(item.date || "")) ||
      !normalizeText(item.summary, TEXT_LIMITS.summary) ||
      typeof item.intro !== "string" ||
      !Array.isArray(item.groups) ||
      !item.groups.length ||
      (item.note != null && typeof item.note !== "string") ||
      (item.warning != null && typeof item.warning !== "string")
    ) {
      throw new Error(`${itemSource} 结构无效。`);
    }
    if (seenVersions.has(item.version)) {
      throw new Error(`${source} 包含重复版本：${item.version}`);
    }
    seenVersions.add(item.version);
    const seenTypes = new Set();
    const groups = item.groups.map((group) => {
      if (
        !group ||
        !Object.hasOwn(CHANGELOG_TYPES, group.type) ||
        seenTypes.has(group.type) ||
        !normalizeText(group.markdown, TEXT_LIMITS.section) ||
        !Number.isSafeInteger(group.count) ||
        group.count < 1
      ) {
        throw new Error(`${itemSource} 包含无效或重复的更新分类。`);
      }
      seenTypes.add(group.type);
      return {
        type: group.type,
        markdown: group.markdown.trim(),
        count: group.count,
      };
    });
    return {
      version: item.version,
      date: item.date,
      summary: item.summary.trim(),
      intro: item.intro.trim(),
      groups,
      ...(item.note?.trim() ? { note: item.note.trim() } : {}),
      ...(item.warning?.trim() ? { warning: item.warning.trim() } : {}),
    };
  });

  return {
    schemaVersion: CHANGELOG_SCHEMA_VERSION,
    updatedAt: new Date(Date.parse(payload.updatedAt)).toISOString(),
    ...(payload.serverTime
      ? { serverTime: new Date(Date.parse(payload.serverTime)).toISOString() }
      : {}),
    items: items.sort((left, right) => compareVersions(right.version, left.version)),
  };
};

export const writeStaticChangelog = async (releases = null) => {
  const entries = releases || (await readReleaseFiles());
  const basePayload = createChangelogPayload(entries);
  const payload = { ...basePayload, serverTime: basePayload.updatedAt };
  await mkdir(dirname(STATIC_CHANGELOG_PATH), { recursive: true });
  await writeFile(
    STATIC_CHANGELOG_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    LEGACY_CHANGELOG_PATH,
    `${JSON.stringify(createLegacyChangelog(entries), null, 2)}\n`,
    "utf8",
  );
  return payload;
};

const legacyReleaseToMarkdown = (version, item) => {
  const groups = Object.entries(item?.changes || {}).map(([type, changes]) => {
    if (!Object.hasOwn(CHANGELOG_TYPES, type) || !Array.isArray(changes)) {
      throw new Error(`${version} 包含不支持的更新分类：${type}`);
    }
    const markdown = changes.map((change) => `- ${String(change).trim()}`).join("\n");
    return { type, markdown, count: changes.length };
  });
  const firstChange = groups
    .flatMap((group) => group.markdown.split("\n"))
    .map((line) => line.replace(/^-\s+/, ""))
    .find(Boolean);
  return renderReleaseMarkdown({
    version,
    status: "released",
    date: item.date,
    summary: firstChange || item.note || item.warning || `${version} 版本更新`,
    intro: "",
    groups,
    note: item.note || "",
    warning: item.warning || "",
  });
};

export const migrateLegacyChangelog = async () => {
  const legacy = JSON.parse(await readFile(LEGACY_CHANGELOG_PATH, "utf8"));
  if (legacy?.schemaVersion === CHANGELOG_SCHEMA_VERSION) {
    throw new Error("public/changelog.json 已是新版结构，不能重复迁移。");
  }
  await mkdir(CHANGELOG_DIR, { recursive: true });
  for (const [version, item] of Object.entries(legacy)) {
    await writeFile(
      releasePath(version),
      legacyReleaseToMarkdown(version, item),
      "utf8",
    );
  }
  return Object.keys(legacy).length;
};
