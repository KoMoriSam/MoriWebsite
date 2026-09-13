import { compareVersions } from "@/utils/type-changelog";

const normalizeEndpoint = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const REMOTE_ENDPOINT = normalizeEndpoint(
  import.meta.env?.VITE_CHANGELOG_API ||
    (import.meta.env?.PROD
      ? "https://api.komori.cc/changelog"
      : "/api/changelog"),
);
const STATIC_ENDPOINT = "/changelog.v1.json";
const REQUEST_TIMEOUT_MS = 6000;
const CHANGELOG_TYPES = new Set([
  "feature",
  "fix",
  "improve",
  "performance",
  "refactor",
  "chore",
]);
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
};

const normalizeRelease = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = typeof value.version === "string" ? value.version.trim() : "";
  const date = typeof value.date === "string" ? value.date.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const intro = typeof value.intro === "string" ? value.intro.trim() : null;

  if (
    !VERSION_PATTERN.test(version) ||
    !isValidDate(date) ||
    !summary ||
    intro === null ||
    !Array.isArray(value.groups) ||
    !value.groups.length
  ) {
    return null;
  }

  const seenTypes = new Set();
  const groups = [];
  for (const group of value.groups) {
    const type = typeof group?.type === "string" ? group.type.trim() : "";
    const markdown =
      typeof group?.markdown === "string" ? group.markdown.trim() : "";
    if (
      !CHANGELOG_TYPES.has(type) ||
      seenTypes.has(type) ||
      !markdown ||
      !Number.isSafeInteger(group.count) ||
      group.count < 1
    ) {
      return null;
    }
    seenTypes.add(type);
    groups.push({ type, markdown, count: group.count });
  }

  return {
    version,
    date,
    summary,
    intro,
    groups,
    ...(typeof value.note === "string" && value.note.trim()
      ? { note: value.note.trim() }
      : {}),
    ...(typeof value.warning === "string" && value.warning.trim()
      ? { warning: value.warning.trim() }
      : {}),
  };
};

export const normalizeChangelogPayload = (payload) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.schemaVersion !== 1 ||
    !Array.isArray(payload.items) ||
    typeof payload.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.updatedAt)) ||
    typeof payload.serverTime !== "string" ||
    !Number.isFinite(Date.parse(payload.serverTime))
  ) {
    throw new TypeError("更新日志接口返回了无效的数据结构。");
  }

  const seenVersions = new Set();
  const items = [];
  for (const value of payload.items) {
    const item = normalizeRelease(value);
    if (!item || seenVersions.has(item.version)) continue;
    seenVersions.add(item.version);
    items.push(item);
  }

  return {
    schemaVersion: 1,
    updatedAt: new Date(Date.parse(payload.updatedAt)).toISOString(),
    serverTime: new Date(Date.parse(payload.serverTime)).toISOString(),
    items: items.sort((left, right) =>
      compareVersions(right.version, left.version),
    ),
  };
};

const fetchPayload = async (endpoint, { force = false } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      cache: force ? "reload" : "default",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        String(payload?.message || `更新日志请求失败：${response.status}`),
      );
      error.status = response.status;
      throw error;
    }
    return normalizeChangelogPayload(payload);
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchRemoteChangelog = (options) =>
  fetchPayload(REMOTE_ENDPOINT, options);

export const fetchStaticChangelog = (options) =>
  fetchPayload(STATIC_ENDPOINT, options);

export const fetchChangelogWithFallback = async (options = {}) => {
  try {
    return {
      payload: await fetchRemoteChangelog(options),
      source: "remote",
      remoteError: null,
    };
  } catch (remoteError) {
    return {
      payload: await fetchStaticChangelog(options),
      source: "static",
      remoteError,
    };
  }
};
