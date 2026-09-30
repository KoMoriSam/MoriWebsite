import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  toValue,
  watch,
} from "vue";

import { useAnalyticsStore } from "@/stores/analyticsStore";

const READ_VISIBLE_DURATION_MS = 10 * 1000;
const READ_RECORD_RETRY_DELAY_MS = 15 * 1000;
const READ_RECORD_RETRY_LIMIT = 1;

export function useContentReadTracking({ contentType, contentId, ready }) {
  const analyticsStore = useAnalyticsStore();
  let mounted = false;
  let active = true;
  let timer = 0;
  let visibleStartedAt = 0;
  let visibleDuration = 0;
  let trackedKey = "";
  let generation = 0;
  let recording = false;
  let recorded = false;
  let retryCount = 0;

  const resolveContent = () => ({
    type: String(toValue(contentType) || "").trim(),
    id: String(toValue(contentId) || "").trim(),
    ready: Boolean(toValue(ready)),
  });

  const clearTimer = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  };

  const pause = () => {
    clearTimer();
    if (!visibleStartedAt) return;

    visibleDuration += Date.now() - visibleStartedAt;
    visibleStartedAt = 0;
  };

  const schedule = (delayOverride = null) => {
    if (
      !mounted ||
      !active ||
      recorded ||
      recording ||
      typeof document === "undefined" ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    const content = resolveContent();
    if (!content.ready || !content.type || !content.id) return;

    const key = `${content.type}:${content.id}`;
    if (key !== trackedKey) return;

    visibleStartedAt = Date.now();
    const remaining = Math.max(
      0,
      READ_VISIBLE_DURATION_MS - visibleDuration,
    );
    timer = window.setTimeout(
      () => {
        void complete();
      },
      delayOverride ?? remaining,
    );
  };

  const complete = async () => {
    pause();
    if (recording || recorded) return;

    const content = resolveContent();
    const key = `${content.type}:${content.id}`;
    if (!content.ready || !content.type || !content.id || key !== trackedKey) {
      return;
    }

    const requestGeneration = generation;
    recording = true;
    let success = false;
    try {
      success = await analyticsStore.recordRead(content.type, content.id);
    } catch (error) {
      console.warn("记录阅读统计失败：", error);
    }

    if (requestGeneration !== generation) return;

    recorded = success;
    recording = false;

    if (!success && retryCount < READ_RECORD_RETRY_LIMIT) {
      retryCount += 1;
      schedule(READ_RECORD_RETRY_DELAY_MS);
    }
  };

  const reset = () => {
    pause();
    generation += 1;
    visibleDuration = 0;
    recording = false;
    recorded = false;
    retryCount = 0;

    const content = resolveContent();
    trackedKey =
      content.type && content.id ? `${content.type}:${content.id}` : "";

    if (
      mounted &&
      content.ready &&
      content.type &&
      content.id &&
      typeof window !== "undefined"
    ) {
      void analyticsStore.loadStats(content.type, content.id);
      schedule();
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") schedule();
    else pause();
  };

  watch(
    () => {
      const content = resolveContent();
      return [
        content.type,
        content.id,
        content.ready,
        analyticsStore.sessionId,
      ];
    },
    reset,
    { immediate: true },
  );

  onMounted(() => {
    mounted = true;
    active = true;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reset();
  });

  onActivated(() => {
    active = true;
    schedule();
  });

  onDeactivated(() => {
    active = false;
    pause();
  });

  onBeforeUnmount(() => {
    mounted = false;
    active = false;
    pause();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  const contentReads = computed(() => {
    const content = resolveContent();
    return analyticsStore.getContentReads(content.type, content.id);
  });

  const contentReadStatus = computed(() => {
    const content = resolveContent();
    return analyticsStore.getContentStatus(content.type, content.id);
  });

  const analyticsAvailable = computed(
    () => analyticsStore.analyticsAvailable,
  );

  return {
    analyticsAvailable,
    contentReads,
    contentReadStatus,
  };
}
