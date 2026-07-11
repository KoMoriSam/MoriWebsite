<template>
  <KeepAlive>
    <component :is="components[currentComponent]"></component>
  </KeepAlive>
</template>

<script setup>
import { useChapterSetup } from "@/composables/useChapterSetup";
import { computed } from "vue";
import { useRoute } from "vue-router";

import NovelDetail from "@/components/novel/NovelDetail.vue";
import Reader from "@/components/novel/NovelReader.vue";

const { setupWatchers } = useChapterSetup();
setupWatchers();

const route = useRoute();

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
