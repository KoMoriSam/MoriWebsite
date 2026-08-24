<template>
  <TestPage section-id="loading">
    <section title="Loading 状态">
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <button
          class="btn btn-sm btn-primary"
          :disabled="loadingOn"
          @click="toggleLoading"
        >
          <span
            v-if="loadingOn"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ loadingOn ? "加载中" : "测试 Loading（3s）" }}
        </button>
        <span
          v-if="loadingOn"
          class="loading loading-spinner loading-sm"
        ></span>
      </div>
      <div
        class="flex min-h-[100px] items-center justify-center rounded-lg bg-base-100 p-6"
      >
        <Loading v-if="loadingOn" size="my-4" />
        <p v-else class="opacity-50">点击按钮查看 Loading 组件</p>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useToast } from "@/composables/useToast";
import Loading from "@/components/base/Loading.vue";

import TestPage from "./_TestPage.vue";

const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});
const loadingOn = ref(false);
let loadingTimer;

function toggleLoading() {
  loadingOn.value = true;
  loadingTimer = window.setTimeout(() => {
    loadingOn.value = false;
    toast.success("加载完成！");
  }, 3000);
}

onBeforeUnmount(() => {
  window.clearTimeout(loadingTimer);
});
</script>
