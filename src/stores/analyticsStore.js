import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";

import {
  fetchAnalyticsStats,
  hasAnalyticsApi,
  recordAnalyticsEvent,
} from "@/services/api-analytics";

const SESSION_STORAGE_KEY = "ANALYTICS_SESSION_V1";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_PERSIST_INTERVAL_MS = 60 * 1000;
const CONTENT_STATS_BATCH_SIZE = 50;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createSessionId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
};

const getContentKey = (contentType, contentId) => {
  const type = String(contentType || "").trim();
  const id = String(contentId || "").trim();
  return type && id ? `${type}:${id}` : "";
};

export const useAnalyticsStore = defineStore("analytics", () => {
  const todayVisits = ref(null);
  const totalVisits = ref(null);
  const totalReads = ref(null);
  const startedAt = ref("");
  const sessionId = ref("");
  const globalStatus = ref(hasAnalyticsApi ? "idle" : "disabled");
  const contentReads = reactive({});
  const contentTypeReads = reactive({});
  const contentStatus = reactive({});
  const contentTypeStatus = reactive({});

  const analyticsAvailable = computed(() => hasAnalyticsApi);
  const visitPromises = new Map();
  const statsPromises = new Map();
  const visitedSessions = new Set();
  const recordedReads = new Set();
  let currentSession = null;
  let lastPersistedAt = 0;
  let trackingStarted = false;

  const applyPayload = (
    payload,
    contentType = "",
    contentId = "",
    requestedContentIds = [],
  ) => {
    if (!payload) return;

    todayVisits.value = payload.todayVisits;
    totalVisits.value = payload.totalVisits;
    totalReads.value = payload.totalReads;
    startedAt.value = payload.startedAt;
    globalStatus.value = "ready";

    const key = getContentKey(contentType, contentId);
    if (key && Object.hasOwn(payload, "contentReads")) {
      contentReads[key] = payload.contentReads;
      contentStatus[key] = "ready";
    }

    if (contentType && Object.hasOwn(payload, "contentTypeReads")) {
      contentTypeReads[contentType] = payload.contentTypeReads;
      contentTypeStatus[contentType] = "ready";
    }

    if (contentType && payload.contentReadsById) {
      for (const requestedContentId of requestedContentIds) {
        const requestedKey = getContentKey(contentType, requestedContentId);
        contentReads[requestedKey] =
          payload.contentReadsById[requestedContentId] ?? 0;
        contentStatus[requestedKey] = "ready";
      }
    }
  };

  const readStoredSession = () => {
    if (typeof localStorage === "undefined") return null;

    try {
      const value = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
      const id = String(value?.id || "");
      const lastActivity = Number(value?.lastActivity);

      if (
        !SESSION_ID_PATTERN.test(id) ||
        !Number.isFinite(lastActivity) ||
        lastActivity <= 0
      ) {
        return null;
      }

      return { id, lastActivity };
    } catch {
      return null;
    }
  };

  const persistSession = (session) => {
    if (typeof localStorage === "undefined") return;

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    lastPersistedAt = session.lastActivity;
  };

  const ensureSession = () => {
    const now = Date.now();

    if (!currentSession) {
      currentSession = readStoredSession();
    }

    const expired =
      !currentSession || now - currentSession.lastActivity >= SESSION_IDLE_MS;

    if (expired) {
      currentSession = {
        id: createSessionId(),
        lastActivity: now,
      };
      sessionId.value = currentSession.id;
      persistSession(currentSession);
      return { ...currentSession, isNew: true };
    }

    currentSession.lastActivity = now;
    sessionId.value = currentSession.id;
    if (now - lastPersistedAt >= SESSION_PERSIST_INTERVAL_MS) {
      persistSession(currentSession);
    }

    return { ...currentSession, isNew: false };
  };

  const loadStats = async (contentType = "", contentId = "") => {
    if (!hasAnalyticsApi || typeof window === "undefined") return null;

    const key = getContentKey(contentType, contentId);
    const requestKey = key || "global";
    if (statsPromises.has(requestKey)) return statsPromises.get(requestKey);

    if (globalStatus.value !== "ready") globalStatus.value = "loading";
    if (key) contentStatus[key] = "loading";

    const request = fetchAnalyticsStats({ contentType, contentId })
      .then((payload) => {
        applyPayload(payload, contentType, contentId);
        return payload;
      })
      .catch((error) => {
        if (globalStatus.value !== "ready") globalStatus.value = "error";
        if (key) contentStatus[key] = "error";
        console.warn("读取访问统计失败：", error);
        return null;
      })
      .finally(() => {
        statsPromises.delete(requestKey);
      });

    statsPromises.set(requestKey, request);
    return request;
  };

  const loadContentStats = async (contentType, contentIds = []) => {
    if (!hasAnalyticsApi || typeof window === "undefined") return null;

    const type = String(contentType || "").trim();
    const ids = [...new Set(contentIds.map((id) => String(id || "").trim()))]
      .filter(Boolean);
    const chunks = [];

    if (ids.length === 0) {
      chunks.push([]);
    } else {
      for (let index = 0; index < ids.length; index += CONTENT_STATS_BATCH_SIZE) {
        chunks.push(ids.slice(index, index + CONTENT_STATS_BATCH_SIZE));
      }
    }

    contentTypeStatus[type] = "loading";
    for (const id of ids) {
      const key = getContentKey(type, id);
      if (contentStatus[key] !== "ready") contentStatus[key] = "loading";
    }

    const requests = chunks.map((chunk) => {
      const requestKey = `batch:${type}:${chunk.join("\u001f")}`;
      if (statsPromises.has(requestKey)) return statsPromises.get(requestKey);

      const request = fetchAnalyticsStats({ contentType: type, contentIds: chunk })
        .then((payload) => {
          applyPayload(payload, type, "", chunk);
          return payload;
        })
        .catch((error) => {
          if (contentTypeStatus[type] !== "ready") {
            contentTypeStatus[type] = "error";
          }
          for (const id of chunk) {
            const key = getContentKey(type, id);
            if (contentStatus[key] !== "ready") contentStatus[key] = "error";
          }
          console.warn("读取内容列表统计失败：", error);
          return null;
        })
        .finally(() => {
          statsPromises.delete(requestKey);
        });

      statsPromises.set(requestKey, request);
      return request;
    });

    return Promise.all(requests);
  };

  const recordVisitForSession = async (sessionId) => {
    if (!sessionId || visitedSessions.has(sessionId)) return null;
    if (visitPromises.has(sessionId)) return visitPromises.get(sessionId);

    if (globalStatus.value !== "ready") globalStatus.value = "loading";
    const request = recordAnalyticsEvent({
      eventType: "visit",
      sessionId,
    })
      .then((payload) => {
        if (payload) {
          visitedSessions.add(sessionId);
          applyPayload(payload);
        }
        return payload;
      })
      .catch((error) => {
        if (globalStatus.value !== "ready") globalStatus.value = "error";
        console.warn("记录访问统计失败：", error);
        return null;
      })
      .finally(() => {
        visitPromises.delete(sessionId);
      });

    visitPromises.set(sessionId, request);
    return request;
  };

  const trackVisit = async () => {
    if (
      !hasAnalyticsApi ||
      typeof document === "undefined" ||
      document.visibilityState === "hidden"
    ) {
      return null;
    }

    const session = ensureSession();
    const payload = await recordVisitForSession(session.id);
    if (!payload && globalStatus.value === "error") {
      return loadStats();
    }
    return payload;
  };

  const recordRead = async (contentType, contentId) => {
    if (!hasAnalyticsApi || typeof document === "undefined") return false;

    const key = getContentKey(contentType, contentId);
    if (!key) return false;

    const session = ensureSession();
    const sessionReadKey = `${session.id}:${key}`;
    if (recordedReads.has(sessionReadKey)) return true;

    await recordVisitForSession(session.id);
    contentStatus[key] = "loading";

    try {
      const payload = await recordAnalyticsEvent({
        eventType: "read",
        sessionId: session.id,
        contentType,
        contentId,
      });

      if (!payload) return false;
      recordedReads.add(sessionReadKey);
      applyPayload(payload, contentType, contentId);
      return true;
    } catch (error) {
      contentStatus[key] = "error";
      console.warn("记录阅读统计失败：", error);
      return false;
    }
  };

  const handleActivity = () => {
    if (document.visibilityState === "hidden") return;
    const session = ensureSession();
    if (session.isNew) void recordVisitForSession(session.id);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") handleActivity();
  };

  const handleStorageChange = (event) => {
    if (event.key !== SESSION_STORAGE_KEY) return;
    currentSession = readStoredSession();
    sessionId.value = currentSession?.id || "";
    lastPersistedAt = currentSession?.lastActivity || 0;
  };

  const startTracking = () => {
    if (
      trackingStarted ||
      !hasAnalyticsApi ||
      typeof window === "undefined"
    ) {
      return;
    }

    trackingStarted = true;
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void trackVisit();
  };

  const stopTracking = () => {
    if (!trackingStarted || typeof window === "undefined") return;

    trackingStarted = false;
    window.removeEventListener("pointerdown", handleActivity);
    window.removeEventListener("keydown", handleActivity);
    window.removeEventListener("scroll", handleActivity);
    window.removeEventListener("storage", handleStorageChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const getContentReads = (contentType, contentId) => {
    const key = getContentKey(contentType, contentId);
    return key && Number.isFinite(contentReads[key]) ? contentReads[key] : null;
  };

  const getContentStatus = (contentType, contentId) => {
    const key = getContentKey(contentType, contentId);
    return key ? contentStatus[key] || "idle" : "disabled";
  };

  const getContentTypeReads = (contentType) => {
    const type = String(contentType || "").trim();
    return type && Number.isFinite(contentTypeReads[type])
      ? contentTypeReads[type]
      : null;
  };

  const getContentTypeStatus = (contentType) => {
    const type = String(contentType || "").trim();
    return type ? contentTypeStatus[type] || "idle" : "disabled";
  };

  return {
    analyticsAvailable,
    todayVisits,
    totalVisits,
    totalReads,
    startedAt,
    sessionId,
    globalStatus,
    contentTypeReads,
    contentTypeStatus,
    loadStats,
    loadContentStats,
    trackVisit,
    recordRead,
    startTracking,
    stopTracking,
    getContentReads,
    getContentStatus,
    getContentTypeReads,
    getContentTypeStatus,
  };
});
