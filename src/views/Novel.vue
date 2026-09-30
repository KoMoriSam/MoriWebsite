<template>
  <ReadingGate v-if="chapterIntent && !auth.authenticated.value" />
  <KeepAlive v-else :key="auth.state.revision">
    <component :is="components[currentComponent]"></component>
  </KeepAlive>
</template>

<script setup>
import { useChapterSetup } from "@/composables/novel/useChapterSetup";
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";

import ReadingGate from '@/components/novel/feedback/ReadingGate.vue';
import { useGithubSession } from '@/composables/auth/useGithubSession';
const auth = useGithubSession();
import NovelDetail from "@/views/novel/NovelDetail.vue";

const Reader = defineAsyncComponent(
  () => import("@/views/novel/NovelReader.vue"),
);

const { setupWatchers } = useChapterSetup();
setupWatchers();

const route = useRoute();

const chapterIntent = computed(() => Boolean(route.params.volumeSlug || route.query.chapter || route.query.c));
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
