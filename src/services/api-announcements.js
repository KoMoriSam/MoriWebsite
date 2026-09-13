const normalizeEndpoint = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const ENDPOINT = normalizeEndpoint(
  import.meta.env?.VITE_ANNOUNCEMENTS_API ||
    (import.meta.env?.PROD
      ? "https://api.komori.cc/announcements"
      : "/api/announcements"),
);
const REQUEST_TIMEOUT_MS = 6000;

const normalizeAnnouncement = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const revision = value.revision;
  const startsAtTimestamp =
    typeof value.startsAt === "string" ? Date.parse(value.startsAt) : NaN;
  const endsAtTimestamp =
    value.endsAt == null
      ? null
      : typeof value.endsAt === "string"
        ? Date.parse(value.endsAt)
        : NaN;
  const tone = value.tone;
  const priority = value.priority;
  const pinned = value.pinned ?? false;

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.summary !== "string" ||
    !value.summary.trim() ||
    typeof value.body !== "string" ||
    !value.body.trim() ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !["info", "warning", "error"].includes(tone) ||
    !["normal", "important"].includes(priority) ||
    typeof pinned !== "boolean" ||
    !Number.isFinite(startsAtTimestamp) ||
    (endsAtTimestamp !== null &&
      (!Number.isFinite(endsAtTimestamp) ||
        endsAtTimestamp <= startsAtTimestamp)) ||
    typeof value.active !== "boolean"
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    revision,
    title: value.title.trim(),
    summary: value.summary.trim(),
    body: value.body.trim(),
    tone,
    priority,
    pinned,
    startsAt: new Date(startsAtTimestamp).toISOString(),
    endsAt: endsAtTimestamp === null ? null : new Date(endsAtTimestamp).toISOString(),
    active: value.active,
  };
};

export const normalizeAnnouncementsPayload = (payload) => {
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
    throw new TypeError("公告接口返回了无效的数据结构。");
  }

  const seenIds = new Set();
  const items = payload.items.reduce((result, value) => {
    const item = normalizeAnnouncement(value);
    if (!item || seenIds.has(item.id)) return result;
    seenIds.add(item.id);
    result.push(item);
    return result;
  }, []);

  return {
    schemaVersion: 1,
    updatedAt: payload.updatedAt,
    serverTime: payload.serverTime,
    items,
  };
};

export async function fetchAnnouncements({ force = false } = {}) {
  if (typeof window === "undefined") return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(ENDPOINT, {
      cache: force ? "reload" : "default",
      headers: { Accept: "application/json" },
      mode: "cors",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        String(payload?.message || `公告接口请求失败：${response.status}`),
      );
      error.status = response.status;
      throw error;
    }

    return normalizeAnnouncementsPayload(payload);
  } finally {
    window.clearTimeout(timeout);
  }
}
