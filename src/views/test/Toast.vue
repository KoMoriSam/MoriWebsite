<template>
  <PageShell section-id="toast">
    <section title="Toast 通知">
      <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
        <button
          class="btn btn-sm"
          @click="toast.card('卡片样式通知', { closable: true, duration: 0 })"
        >
          Card
        </button>
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
          :disabled="!!loadingToast"
          @click="startLoading"
        >
          {{ loadingToast ? "Loading…" : "Loading" }}
        </button>
        <button class="btn btn-sm" @click="showCustomToast">
          自定义图标
        </button>
      </div>
      <p class="mb-2 text-xs font-semibold opacity-60">Loading 结果（先点击 Loading）</p>
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          class="btn btn-sm btn-outline"
          :disabled="!!loadingToast"
          @click="startFastLoading"
        >
          快速完成（入场中切换）
        </button>
        <button
          v-for="result in loadingResults"
          :key="result.type"
          :class="['btn btn-sm', result.className]"
          :disabled="!loadingToast"
          @click="finishLoading(result.type, result.message)"
        >
          {{ result.label }}
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

    <section class="mt-8" title="路由加载与失败提示">
      <h2 class="mb-2 text-lg font-semibold">路由加载与失败提示</h2>
      <p class="mb-4 text-sm text-base-content/60">
        加载中与打开失败共用同一条 Toast。“重试”不刷新整个网页，演示中会在 1.2 秒后再次显示失败；“刷新并重试”会完整刷新本测试页。
      </p>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-sm" :disabled="navigationLoading" @click="startNavigationLoading">
          路由加载中
        </button>
        <button class="btn btn-sm" @click="showNavigationFailure">页面未能打开</button>
        <button class="btn btn-sm" :disabled="!navigationLoading" @click="clearNavigationFeedback">
          加载成功
        </button>
        <button class="btn btn-sm btn-ghost" @click="clearNavigationFeedback">清除路由提示</button>
      </div>
    </section>
  </PageShell>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "@/composables/useToast";
import { TOAST_ICONS, TOAST_POSITIONS } from "@/constants/toast";
import { useNavigationToast } from "@/composables/useNavigationToast";

import PageShell from "./PageShell.vue";

const toast = useToast({
  duration: 2000,
  closable: false,
});
const route = useRoute();
const navigationLoading = ref(false);
const navigationFailed = ref(false);
let navigationTimer;
useNavigationToast({
  isLoading: navigationLoading,
  failedRoute: navigationFailed,
  reloadHref: computed(() => route.fullPath),
  retry: retryNavigation,
  dismissError: clearNavigationFeedback,
});

function clearNavigationFeedback() {
  clearTimeout(navigationTimer);
  navigationLoading.value = false;
  navigationFailed.value = false;
}

function startNavigationLoading() {
  clearNavigationFeedback();
  navigationLoading.value = true;
}

function showNavigationFailure() {
  clearNavigationFeedback();
  navigationFailed.value = true;
}

function retryNavigation() {
  startNavigationLoading();
  navigationTimer = setTimeout(showNavigationFailure, 1200);
}

onBeforeUnmount(clearNavigationFeedback);

const toastPositions = Object.keys(TOAST_POSITIONS).filter((position) =>
  position.includes("-"),
);
const loadingToast = ref(null);
let loadingTimer;
const loadingResults = [
  { type: "success", label: "成功", className: "btn-success", message: "加载完成，所有内容已更新。" },
  { type: "error", label: "失败", className: "btn-error", message: "加载失败，请稍后重试。" },
  { type: "warning", label: "警告", className: "btn-warning", message: "部分内容未能加载，请检查后重试。" },
  { type: "info", label: "信息", className: "btn-info", message: "加载已取消。" },
  { type: "card", label: "卡片", className: "", message: "加载已结束。" },
];

function startLoading() {
  if (loadingToast.value) return;
  loadingToast.value = toast.loading("正在加载内容，请稍候…");
}

function startFastLoading() {
  if (loadingToast.value) return;
  loadingToast.value = toast.loading("章节内容加载中……");
  loadingTimer = setTimeout(() => finishLoading("success", "章节内容加载完成！"), 80);
}

function finishLoading(type, message) {
  clearTimeout(loadingTimer);
  if (!loadingToast.value) return;
  loadingToast.value[type](message, { duration: 4000 });
  loadingToast.value = null;
}

function showCustomToast() {
  toast.add("自定义图标通知", {
    type: "info",
    icon: TOAST_ICONS.star,
  });
}

function testToastPos(position) {
  toast.info(position, { position, duration: 1500, closable: false });
}

onBeforeUnmount(() => {
  clearTimeout(loadingTimer);
  if (!loadingToast.value) return;
  toast.remove(loadingToast.value.id, loadingToast.value.position);
});
</script>
