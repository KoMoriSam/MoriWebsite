import { computed, ref } from "vue";
import { defineStore } from "pinia";

import {
  fetchChangelogWithFallback,
  normalizeChangelogPayload,
} from "@/services/api-changelog";

export const useChangelogStore = defineStore("changelog", () => {
  const items = ref([]);
  const loading = ref(false);
  const refreshing = ref(false);
  const error = ref(null);
  const loaded = ref(false);
  const updatedAt = ref("");
  const source = ref("");
  let requestPromise = null;

  const latestVersion = computed(() => items.value[0]?.version || "");
  const totalVersions = computed(() => items.value.length);

  const applyPayload = (payload, payloadSource) => {
    const normalized = normalizeChangelogPayload(payload);
    items.value = normalized.items;
    updatedAt.value = normalized.updatedAt;
    source.value = payloadSource;
    loaded.value = true;
  };

  const hydrateChangelog = (payload) => {
    try {
      applyPayload(payload, "static");
      error.value = null;
    } catch (hydrateError) {
      console.error("Error hydrating changelog:", hydrateError);
    }
  };

  const fetchChangelog = ({ force = false } = {}) => {
    if (requestPromise) return requestPromise;
    const hasSnapshot = items.value.length > 0;
    loading.value = !hasSnapshot;
    refreshing.value = hasSnapshot;
    error.value = null;

    requestPromise = fetchChangelogWithFallback({ force })
      .then(({ payload, source: payloadSource, remoteError }) => {
        if (payloadSource !== "static" || !hasSnapshot) {
          applyPayload(payload, payloadSource);
        }
        error.value = remoteError || null;
        return payload;
      })
      .catch((fetchError) => {
        error.value = fetchError;
        loaded.value = true;
        return null;
      })
      .finally(() => {
        loading.value = false;
        refreshing.value = false;
        requestPromise = null;
      });
    return requestPromise;
  };

  const getVersionInfo = (version) =>
    items.value.find((item) => item.version === version);

  const getLatestVersion = () => latestVersion.value || null;

  return {
    items,
    loading,
    refreshing,
    error,
    loaded,
    updatedAt,
    source,
    latestVersion,
    totalVersions,
    hydrateChangelog,
    fetchChangelog,
    getVersionInfo,
    getLatestVersion,
  };
});
