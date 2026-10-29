import { onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { useNovelStore } from "@/stores/novel";
import CONFIG from "@/constants/config";

export function useNovelChapters() {
  const novelStore = useNovelStore();
  const route = useRoute();
  const { visibleChapters: chapters } = storeToRefs(novelStore);
  if (route.meta.pageData?.novelChapters) {
    novelStore.hydrateChapters(route.meta.pageData.novelChapters);
  }
  const loading = ref(chapters.value.length === 0);
  let disposed = false;
  let request = null;

  function refresh({ force = true } = {}) {
    if (request) return request;
    if (disposed) return Promise.resolve(false);
    loading.value = true;
    request = (async () => {
      const { useChapterApi } = await import("@/services/api-chapters");
      if (disposed) return false;
      const index = await useChapterApi().fetchChapters({ force });
      if (disposed) return false;
      if (!index || typeof index !== "object" || Array.isArray(index)
        || Object.values(index).some((volume) => !volume?.volumeInfo || !Array.isArray(volume.chapters))) {
        throw new Error("Invalid novel index");
      }
      novelStore.hydrateChapters(index);
      novelStore.storedChapters = index;
      novelStore.lastUpdated = Date.now();
      return true;
    })().finally(() => {
      request = null;
      if (!disposed) loading.value = false;
    });
    return request;
  }

  onMounted(() => {
    const cached = novelStore.storedChapters;
    if (cached && Object.keys(cached).length) {
      const fresh = Date.now() - novelStore.lastUpdated < CONFIG.getDynamicCacheExpiration();
      if (!chapters.value.length || fresh) novelStore.hydrateChapters(cached);
      if (fresh) {
        loading.value = false;
        return;
      }
    }
    void refresh({ force: false }).catch(() => {});
  });
  onBeforeUnmount(() => { disposed = true; });

  return { chapters, loading, refresh };
}
