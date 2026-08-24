<template>
  <TestPage section-id="pagination">
    <section title="Pagination 分页">
      <p class="mb-3 text-xs opacity-60">
        完全由当前测试页本地状态驱动：当前第 {{ currentPage }} 页，共
        {{ totalPages }} 页。
      </p>
      <div class="mb-4 flex flex-wrap gap-2">
        <button class="btn btn-xs" @click="setScenario(3, 5)">少量页</button>
        <button class="btn btn-xs" @click="setScenario(1, 24)">第一页</button>
        <button class="btn btn-xs" @click="setScenario(12, 24)">中间页</button>
        <button class="btn btn-xs" @click="setScenario(24, 24)">
          最后一页
        </button>
        <button class="btn btn-xs" @click="setScenario(1, 5, 'before')">
          可跨到上一项
        </button>
        <button class="btn btn-xs" @click="setScenario(5, 5, 'after')">
          可跨到下一项
        </button>
      </div>
      <label class="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input v-model="routeMode" type="checkbox" class="toggle toggle-sm" />
        <span>启用路由链接模式（链接写入当前测试页的 page 查询参数）</span>
      </label>
      <div class="flex justify-center rounded-lg bg-base-100 p-4">
        <Pagination
          v-model:current-page="currentPage"
          :total-pages="totalPages"
          :can-navigate-before="canNavigateBefore"
          :can-navigate-after="canNavigateAfter"
          before-boundary-label="上一项"
          after-boundary-label="下一项"
          :get-page-route="routeMode ? getPageRoute : null"
          @change="recordEvent('change', $event)"
          @navigate-before="recordEvent('navigate-before')"
          @navigate-after="recordEvent('navigate-after')"
        />
      </div>
      <p class="mt-3 text-xs text-base-content/60" aria-live="polite">
        最近事件：<code>{{ eventLog }}</code>
      </p>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import Pagination from "@/components/base/Pagination.vue";

import TestPage from "./_TestPage.vue";

const currentPage = ref(12);
const totalPages = ref(24);
const canNavigateBefore = ref(false);
const canNavigateAfter = ref(false);
const routeMode = ref(false);
const eventLog = ref("尚未触发");

function setScenario(nextPage, nextTotalPages, boundary = "none") {
  totalPages.value = nextTotalPages;
  currentPage.value = nextPage;
  canNavigateBefore.value = boundary === "before";
  canNavigateAfter.value = boundary === "after";
  eventLog.value = `切换场景：第 ${nextPage}/${nextTotalPages} 页`;
}

const getPageRoute = (page) => ({
  name: "pagination",
  query: { page },
});

function recordEvent(type, page) {
  eventLog.value = page ? `${type}: ${page}` : type;
}
</script>
