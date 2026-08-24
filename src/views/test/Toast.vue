<template>
  <TestPage section-id="toast">
    <TestCard title="Toast 通知">
      <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <button class="btn btn-sm btn-success" @click="toast.success('操作成功！')">
          Success
        </button>
        <button class="btn btn-sm btn-error" @click="toast.error('操作失败！')">
          Error
        </button>
        <button class="btn btn-sm btn-warning" @click="toast.warning('请注意！')">
          Warning
        </button>
        <button
          class="btn btn-sm btn-info"
          @click="toast.info('提示信息', { closable: true, duration: 0 })"
        >
          Info
        </button>
        <button class="btn btn-sm btn-ghost" @click="toast.loading('加载中…')">
          Loading
        </button>
        <button class="btn btn-sm btn-accent" @click="toast.star('发现彩蛋')">
          Star
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
    </TestCard>
  </TestPage>
</template>

<script setup>
import { useToast } from "@/composables/useToast";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const toast = useToast({
  position: "center-top",
  duration: 2000,
  closable: false,
});

const toastPositions = [
  "start-top",
  "center-top",
  "end-top",
  "start-middle",
  "center-middle",
  "end-middle",
  "end-bottom",
];

function testToastPos(position) {
  useToast({ position, duration: 1500, closable: false }).info(position);
}
</script>
