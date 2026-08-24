<template>
  <TestPage section-id="toast">
    <section title="Toast 通知">
      <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <button
          class="btn btn-sm btn-success"
          @click="toast.success('操作成功！')"
        >
          Success
        </button>
        <button class="btn btn-sm btn-error" @click="toast.error('操作失败！')">
          Error
        </button>
        <button
          class="btn btn-sm btn-warning"
          @click="toast.warning('请注意！')"
        >
          Warning
        </button>
        <button
          class="btn btn-sm btn-info"
          @click="toast.info('提示信息', { closable: true, duration: 0 })"
        >
          Info
        </button>
        <button
          class="btn btn-sm btn-ghost"
          @click="loadingToast ? finishLoading() : startLoading()"
        >
          {{ loadingToast ? "结束 Loading" : "Loading" }}
        </button>
        <button class="btn btn-sm" @click="showCustomToast">
          自定义图标
        </button>
      </div>
      <p class="mb-2 text-xs font-semibold opacity-60">不同位置</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="position in toastPositions"
          :key="position"
          class="btn btn-xs btn-outline"
          @click="testToastPos(position)"
        >
          {{ position }}
        </button>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useToast } from "@/composables/useToast";
import { TOAST_ICONS, TOAST_POSITIONS } from "@/constants/toast";

import TestPage from "./_TestPage.vue";

const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});

const toastPositions = Object.keys(TOAST_POSITIONS).filter((position) =>
  position.includes("-"),
);
const loadingToast = ref(null);

function startLoading() {
  loadingToast.value = toast.loading("加载中…");
}

function finishLoading() {
  if (!loadingToast.value) return;
  toast.remove(loadingToast.value.id, loadingToast.value.position);
  loadingToast.value = null;
  toast.success("加载完成");
}

function showCustomToast() {
  toast.add("自定义图标通知", {
    type: "info",
    icon: TOAST_ICONS.star,
  });
}

function testToastPos(position) {
  useToast({ position, duration: 1500, closable: false }).info(position);
}

onBeforeUnmount(() => {
  if (!loadingToast.value) return;
  toast.remove(loadingToast.value.id, loadingToast.value.position);
});
</script>
