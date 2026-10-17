<template>
  <ReadingGate v-if="chapterIntent && !auth.authenticated.value" />
  <KeepAlive v-else :key="auth.state.revision">
    <component :is="components[currentComponent]"></component>
  </KeepAlive>
</template>

<script setup>
import { useChapterSetup } from "@/composables/novel/useChapterSetup";
import { computed, defineAsyncComponent, h, watch } from "vue";
import { useRoute } from "vue-router";

import ReadingGate from "@/components/novel/feedback/ReadingGate.vue";
import { useGithubSession } from "@/composables/auth/useGithubSession";
const auth = useGithubSession();
import NovelDetail from "@/views/novel/NovelDetail.vue";
import LoadingPlaceholder from "@/components/reader/feedback/LoadingPlaceholder.vue";
import { useNovelStore } from '@/stores/novel';

const novel = useNovelStore();
const loadReader = () => import("@/views/novel/NovelReader.vue");
const Reader = defineAsyncComponent({
  loader: loadReader,
  loadingComponent: {
    setup: () => () => h(LoadingPlaceholder, { kind: 'novel', chapter: novel.currentChapter }),
  },
  delay: 0,
});

const { setupWatchers } = useChapterSetup();
setupWatchers();

const route = useRoute();

const chapterIntent = computed(() =>
  Boolean(route.params.volumeSlug || route.query.chapter || route.query.c),
);
// 会话校验期间只预载阅读器代码，挂载与正文请求仍由登录状态控制。
watch(
  () => chapterIntent.value && auth.state.hasSession,
  (shouldPreload) => {
    if (shouldPreload) void loadReader().catch(() => {});
  },
  { immediate: true },
);

const components = {
  NovelDetail,
  Reader,
};

const currentComponent = computed(() => {
  const volumeSlug = String(route.params.volumeSlug || "");
  const chapterSlug = String(route.params.chapterSlug || "");
  return volumeSlug && chapterSlug ? "Reader" : "NovelDetail";
});
</script>
