<template>
  <nav class="flex items-center justify-between my-4 gap-1 md:gap-2">
    <!-- 上一章 -->
    <button
      class="btn btn-primary px-2 md:px-auto"
      :disabled="!hasPrevious || isLoadingContent || isDisabled"
      @click="onHandlePrev"
    >
      <i class="ri-arrow-left-s-line"></i>
      <span>上一章</span>
    </button>

    <Pagination
      v-if="totalPages > 1"
      :current-page="currentChapterPage"
      :total-pages="totalPages"
      :can-navigate-before="hasPrevious"
      :can-navigate-after="hasNext"
      before-boundary-label="上一章末页"
      after-boundary-label="下一章首页"
      @change="handleAnyPage"
      @navigate-before="onNavigateBefore"
      @navigate-after="onNavigateAfter"
    />

    <!-- 下一章 -->
    <button
      class="btn btn-primary px-2 md:px-auto"
      :disabled="!hasNext || isLoadingContent || isDisabled"
      @click="onHandleNext"
    >
      <span>下一章</span>
      <i class="ri-arrow-right-s-line"></i>
    </button>
  </nav>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { useChapters } from "@/composables/useChapters";
import { useClickLimit } from "@/composables/useClickLimit";

import { useNovelStore } from "@/stores/novelStore";

import Pagination from "@/components/base/Pagination.vue";

const novelStore = useNovelStore();
const { currentChapterPage, totalPages, isLoadingContent } =
  storeToRefs(novelStore);

const { hasPrevious, hasNext, handlePrev, handleNext, handleAnyPage } =
  useChapters();

const { isDisabled, handleClick } = useClickLimit();

// 点击事件
const onHandlePrev = () => {
  handleClick(handlePrev);
};

const onHandleNext = () => {
  handleClick(handleNext);
};

const onNavigateBefore = () => {
  handleClick(handlePrev, { lastPage: true });
};

const onNavigateAfter = () => {
  handleClick(handleNext);
};
</script>
