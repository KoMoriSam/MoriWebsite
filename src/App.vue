<template>
  <NavBar />
  <router-view />
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useHead } from "@unhead/vue";
import { useRoute } from "vue-router";
import NavBar from "@/components/layout/NavBar.vue";

import { checkUpdateNotice } from "@/utils/update-notice";
import { useStorageMigration } from "@/utils/storage/migrate-storage";
import { useDiscardStorage } from "@/utils/storage/discard-storage";

const route = useRoute();
const pageTitle = computed(() =>
  String(route.meta.title || "Welcome! | KoMoriSam"),
);

// ViteSSG 会在构建时把该标题写入每个静态页面，并在客户端路由切换时同步更新。
useHead({
  title: pageTitle,
});

const isPrerenderBot =
  typeof navigator !== "undefined" &&
  /HeadlessChrome|Prerender/i.test(navigator.userAgent);

onMounted(() => {
  if (isPrerenderBot) {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }

    return;
  }

  checkUpdateNotice();

  const { migrateStorage } = useStorageMigration();

  migrateStorage();

  useDiscardStorage();
});
</script>
