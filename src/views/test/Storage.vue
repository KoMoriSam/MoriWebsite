<template>
  <TestPage section-id="storage">
    <TestCard title="localStorage">
      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          v-for="group in storageGroups"
          :key="group.key"
          class="rounded-lg bg-base-100 p-3"
        >
          <h4 class="mb-1 text-sm font-semibold">{{ group.label }}</h4>
          <pre
            class="max-h-48 overflow-auto rounded bg-base-300 p-2 text-[10px] leading-tight"
            >{{ group.data || "(空)" }}</pre
          >
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-warning" @click="clearStorage">
          清空全部
        </button>
        <button class="btn btn-sm btn-info" @click="refreshStorage">
          刷新
        </button>
      </div>
    </TestCard>
  </TestPage>
</template>

<script setup>
import { computed } from "vue";
import { useGlobalStorage } from "@/utils/storage/use-global-storage";
import { useReaderSettingsStorage } from "@/utils/storage/use-reader-settings-storage";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const { GLOBAL_INFO } = useGlobalStorage();
const { READER_SETTINGS } = useReaderSettingsStorage();
const { READING_STATE } = useReadingStateStorage();

const storageGroups = computed(() => [
  {
    key: "GLOBAL_INFO",
    label: "GLOBAL_INFO",
    data: JSON.stringify(GLOBAL_INFO.value, null, 2),
  },
  {
    key: "READER_SETTINGS",
    label: "READER_SETTINGS",
    data: JSON.stringify(READER_SETTINGS.value, null, 2),
  },
  {
    key: "READING_STATE",
    label: "READING_STATE",
    data: JSON.stringify(READING_STATE.value, null, 2),
  },
]);

function refreshStorage() {
  GLOBAL_INFO.value = { ...GLOBAL_INFO.value };
  READER_SETTINGS.value = { ...READER_SETTINGS.value };
  READING_STATE.value = { ...READING_STATE.value };
}

function clearStorage() {
  if (confirm("确定清空全部 localStorage？")) {
    localStorage.clear();
    refreshStorage();
  }
}
</script>
