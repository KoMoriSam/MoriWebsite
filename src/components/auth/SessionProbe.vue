<template>
  <div
    v-if="state.hasSession"
    class="pointer-events-none fixed -left-[10000px] w-96"
    aria-hidden="true"
    inert
  >
    <Giscus
      :key="state.revision"
      id="github-profile-probe"
      v-bind="discussion"
      :lang="commentLocale"
      :theme="themeStore.giscusTheme"
      emit-metadata="1"
      loading="eager"
    />
  </div>
</template>
<script setup>
import { defineAsyncComponent, watch, onBeforeUnmount } from "vue";
import CONFIG from "@/constants/config";
import { useGithubSession } from "@/composables/auth/useGithubSession";
import { useLocale } from "@/i18n";
import { useThemeStore } from "@/stores/themeStore";
const Giscus = defineAsyncComponent(() => import("@giscus/vue"));
const { state, probeFailed } = useGithubSession();
const { commentLocale } = useLocale();
const themeStore = useThemeStore();
const discussion = {
  repo: CONFIG.GISCUS.novelRepo.name,
  repoId: CONFIG.GISCUS.novelRepo.id,
  category: CONFIG.GISCUS.categories.general.name,
  categoryId: CONFIG.GISCUS.categories.general.id,
  mapping: "number",
  term: "2",
  strict: "1",
  reactionsEnabled: "0",
  inputPosition: "top",
  theme: "preferred_color_scheme",
  lang: "zh-CN",
};
let timeout;
watch(
  () => [state.revision, state.status],
  ([revision, status]) => {
    clearTimeout(timeout);
    if (status === "checking")
      timeout = setTimeout(() => probeFailed(revision), 15000);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timeout));
</script>
