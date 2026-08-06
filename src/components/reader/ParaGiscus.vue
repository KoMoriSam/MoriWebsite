<template>
  <Giscus
    :key="paragraphId"
    :repo="currentRepo.name"
    :repo-id="currentRepo.id"
    :category="currentCategory.name"
    :category-id="currentCategory.id"
    mapping="specific"
    :term="paragraphId"
    strict="0"
    reactions-enabled="1"
    emit-metadata="1"
    input-position="bottom"
    :theme="giscusTheme"
    lang="zh-CN"
    loading="lazy"
  />
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import Giscus from "@giscus/vue";
import { useThemeStore } from "@/stores/themeStore";

import CONFIG from "@/constants/config";
const { GISCUS } = CONFIG;

const themeStore = useThemeStore();
const { giscusTheme } = storeToRefs(themeStore);

const props = defineProps({
  paragraphId: {
    type: String,
    required: true,
  },
  sourceType: {
    type: String,
    default: "article",
    validator: (value) => ["article", "novel"].includes(value),
  },
});

const sourceKey = computed(() =>
  props.sourceType === "novel" ? "novel" : "article",
);

const currentRepo = computed(
  () => GISCUS.paragraphComments[sourceKey.value].repo,
);

const currentCategory = computed(
  () => GISCUS.paragraphComments[sourceKey.value].category,
);

const handleGiscusMetadata = (event) => {
  const payload = event?.data?.giscus;
  if (!payload?.discussion) return;

  const totalCommentCount = Number(payload.discussion.totalCommentCount ?? 0);
  if (!Number.isFinite(totalCommentCount)) return;

  document.dispatchEvent(
    new CustomEvent("paragraph-comment-metadata", {
      detail: {
        paragraphId: props.paragraphId,
        sourceType: props.sourceType,
        totalCommentCount,
      },
    }),
  );
};

onMounted(() => {
  window.addEventListener("message", handleGiscusMetadata);
});

onUnmounted(() => {
  window.removeEventListener("message", handleGiscusMetadata);
});
</script>
