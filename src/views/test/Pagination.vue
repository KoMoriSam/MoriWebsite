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
      </div>
      <div class="flex justify-center rounded-lg bg-base-100 p-4">
        <Pagination
          v-model:current-page="currentPage"
          :total-pages="totalPages"
        />
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import Pagination from "@/components/base/Pagination.vue";

import TestPage from "./_TestPage.vue";

const currentPage = ref(12);
const totalPages = ref(24);

function setScenario(nextPage, nextTotalPages) {
  totalPages.value = nextTotalPages;
  currentPage.value = nextPage;
}
</script>
