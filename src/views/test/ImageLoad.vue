<template>
  <TestPage section-id="image-load">
    <section class="min-w-0">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="relative h-32 w-32 overflow-hidden rounded-lg bg-base-300">
          <div
            v-if="!imageLoaded && !imageError"
            class="skeleton absolute inset-0 z-10"
          ></div>
          <img
            v-show="!imageError"
            :key="imageKey"
            :src="imageSrc"
            alt="图片加载状态测试"
            class="h-full w-full object-cover"
            @load="handleImageLoad"
            @error="handleImageError"
          />
          <div
            v-if="imageError"
            class="absolute inset-0 flex items-center justify-center text-error"
            role="img"
            aria-label="图片加载失败"
          >
            <i class="ri-image-close-line text-4xl" aria-hidden="true"></i>
          </div>
        </div>
        <div class="space-y-3">
          <p class="flex items-center gap-2 text-sm" aria-live="polite">
            <span>状态:</span>
            <span class="inline-flex items-center gap-1" :class="statusClass">
              <i :class="statusIcon" aria-hidden="true"></i>
              {{ statusText }}
            </span>
          </p>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-sm" @click="loadImage('success')">
              测试成功
            </button>
            <button class="btn btn-sm btn-outline" @click="loadImage('error')">
              测试失败
            </button>
            <button class="btn btn-sm btn-ghost" @click="loadImage(mode)">
              重试当前地址
            </button>
          </div>
        </div>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { useImageLoad } from "@/composables/useImageLoad";

import TestPage from "./_TestPage.vue";

const mode = ref("success");
const imageKey = ref(0);
const { imageLoaded, imageError, handleImageLoad, handleImageError } =
  useImageLoad();

const imageSrc = computed(() => {
  const path =
    mode.value === "success"
      ? "/assets/images/avatar/komorisam.webp"
      : "/assets/images/image-load-test-missing.webp";
  return `${path}?attempt=${imageKey.value}`;
});
const statusText = computed(() => {
  if (imageError.value) return "加载失败";
  if (imageLoaded.value) return "加载成功";
  return "加载中…";
});
const statusClass = computed(() => {
  if (imageError.value) return "text-error";
  if (imageLoaded.value) return "text-success";
  return "text-warning";
});
const statusIcon = computed(() => {
  if (imageError.value) return "ri-close-circle-line";
  if (imageLoaded.value) return "ri-checkbox-circle-line";
  return "ri-loader-4-line animate-spin";
});

function loadImage(nextMode) {
  mode.value = nextMode;
  imageLoaded.value = false;
  imageError.value = false;
  imageKey.value += 1;
}
</script>
