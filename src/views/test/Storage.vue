<template>
  <TestPage section-id="storage">
    <section title="localStorage">
      <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-sm btn-warning" @click="clearStorage">
          清空三组持久化数据
        </button>
        <button class="btn btn-sm" @click="seedCommentCount">
          写入测试段评计数
        </button>
        <button class="btn btn-sm btn-outline" @click="clearCommentCount">
          清除测试段评计数
        </button>
        <button class="btn btn-sm btn-ghost" @click="refreshStorage">
          刷新
        </button>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { useGlobalStorage } from "@/utils/storage/use-global-storage";
import { useReaderSettingsStorage } from "@/utils/storage/use-reader-settings-storage";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";
import { useParagraphCommentsStorage } from "@/utils/storage/use-paragraph-comments-storage";

import TestPage from "./_TestPage.vue";

const { GLOBAL_INFO } = useGlobalStorage();
const { READER_SETTINGS } = useReaderSettingsStorage();
const { READING_STATE } = useReadingStateStorage();
const {
  PARAGRAPH_COMMENTS,
  PARAGRAPH_COMMENTS_FETCHED,
  setCount,
} = useParagraphCommentsStorage();
const refreshVersion = ref(0);
const TEST_PARAGRAPH_ID = "storage-test-1";

const storageGroups = computed(() => {
  refreshVersion.value;

  return [
    {
      key: "GLOBAL_INFO",
      label: "GLOBAL_INFO · localStorage",
      data: JSON.stringify(GLOBAL_INFO.value, null, 2),
    },
    {
      key: "READER_SETTINGS",
      label: "READER_SETTINGS · localStorage",
      data: JSON.stringify(READER_SETTINGS.value, null, 2),
    },
    {
      key: "READING_STATE",
      label: "READING_STATE · localStorage",
      data: JSON.stringify(READING_STATE.value, null, 2),
    },
    {
      key: "PARAGRAPH_COMMENTS",
      label: "段评计数 · 内存缓存",
      data: JSON.stringify(
        {
          counts: PARAGRAPH_COMMENTS,
          fetched: PARAGRAPH_COMMENTS_FETCHED,
        },
        null,
        2,
      ),
    },
  ];
});

function refreshStorage() {
  refreshVersion.value += 1;
}

function clearStorage() {
  if (!window.confirm("确定清空测试页展示的三组持久化数据？")) return;

  ["GLOBAL_INFO", "READER_SETTINGS", "READING_STATE"].forEach((key) =>
    localStorage.removeItem(key),
  );
  GLOBAL_INFO.value = {};
  READER_SETTINGS.value = {};
  READING_STATE.value = {};
  refreshStorage();
}

function seedCommentCount() {
  setCount(TEST_PARAGRAPH_ID, 12, "article");
  refreshStorage();
}

function clearCommentCount() {
  delete PARAGRAPH_COMMENTS.article?.[TEST_PARAGRAPH_ID];
  delete PARAGRAPH_COMMENTS_FETCHED.article?.[TEST_PARAGRAPH_ID];
  refreshStorage();
}
</script>
