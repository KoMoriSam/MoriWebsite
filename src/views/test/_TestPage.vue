<template>
  <ContentPage
    eyebrow="Development Diagnostics"
    :title="section?.title || '测试项'"
    :description="section?.description"
  >
    <template #badges>
      <span class="inline-flex items-center gap-1">
        <i class="ri-test-tube-line"></i>
        仅开发环境
      </span>
    </template>

    <slot></slot>
  </ContentPage>
  <FootBar />
</template>

<script setup>
import { computed } from "vue";
import { TEST_SECTIONS } from "@/constants/test-sections";
import ContentPage from "@/components/layout/ContentPage.vue";
import FootBar from "@/components/layout/FootBar.vue";

const props = defineProps({
  sectionId: {
    type: String,
    required: true,
  },
});

const section = computed(() =>
  TEST_SECTIONS.find((item) => item.id === props.sectionId),
);
</script>
