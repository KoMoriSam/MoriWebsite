<template>
  <TestPage section-id="image-load">
    <section class="min-w-0">
      <div class="flex items-center gap-4">
        <div class="relative h-32 w-32 overflow-hidden rounded-lg bg-base-300">
          <div v-if="!imageLoaded" class="skeleton absolute inset-0 z-10"></div>
          <img
            src="/assets/images/avatar/komorisam.webp"
            alt="avatar"
            class="h-full w-full object-cover"
            @load="imageLoaded = true"
          />
        </div>
        <p class="flex items-center gap-2 text-sm">
          <span>状态:</span>
          <span
            class="inline-flex items-center gap-1"
            :class="imageLoaded ? 'text-success' : 'text-warning'"
          >
            <i
              :class="
                imageLoaded
                  ? 'ri-checkbox-circle-line'
                  : 'ri-loader-4-line animate-spin'
              "
              aria-hidden="true"
            ></i>
            {{ imageLoaded ? "已加载" : "加载中…" }}
          </span>
        </p>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";

import TestPage from "./_TestPage.vue";

const imageLoaded = ref(false);
</script>
