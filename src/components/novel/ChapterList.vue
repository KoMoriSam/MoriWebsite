<template>
  <Submenu title="章节目录">
    <template #btn>
      <button
        class="btn btn-info btn-square btn-sm btn-soft ml-auto"
        @click="novelStore.refreshChapters()"
        :disabled="isLoadingList"
      >
        <div class="tooltip" data-tip="刷新章节目录">
          <i class="ri-refresh-line m-2"></i>
        </div>
      </button>
      <button
        class="btn btn-info btn-square btn-sm btn-soft"
        @click="novelStore.refreshReadChapters()"
        :disabled="isLoadingList"
      >
        <div class="tooltip" data-tip="清除阅读记录">
          <i class="ri-delete-bin-6-line"></i>
        </div>
      </button>
    </template>
    <Loading :size="`my-48`" v-if="isLoadingList" />

    <li v-else v-for="volume in chapters" :key="volume.volumeInfo.uuid">
      <details open>
        <summary class="font-bold">{{ volume.volumeInfo.title }}</summary>
        <ul v-if="volume.chapters && volume.chapters.length > 0">
          <li v-for="chapter in volume.chapters" :key="chapter.uuid">
            <a
              v-if="chapter"
              @click="onClick(chapter.uuid)"
              class="block"
              :class="{
                'menu-active':
                  isReaderRoute && chapter.uuid === currentChapterUuid,
                'btn-disabled': isDisabled,
              }"
            >
              <!-- 章节名称 -->

              <span>{{ chapter.title }}</span>

              <!-- 章节状态指示 -->
              <span
                v-if="
                  isRecent(chapter.uuid, chapter.uploadDate) &&
                  !isRead(chapter.uuid)
                "
                class="badge badge-xs badge-warning mx-1"
              >
                NEW
              </span>

              <br />

              <div class="flex items-center gap-1 flex-wrap my-1">
                <span v-if="isRead(chapter.uuid)" class="badge badge-xs">
                  <i class="status status-accent"></i>
                  已读
                </span>
                <span v-else class="badge badge-xs">
                  <i class="status status-info animate-bounce"></i>
                  未读
                </span>
                <span class="badge badge-xs">
                  <i class="ri-time-line"></i>
                  {{ useDateFormat(chapter.uploadDate, "YYYY/M/D HH:mm") }}
                </span>
                <span v-if="chapter.modifiedDate" class="badge badge-xs">
                  <i class="ri-file-edit-line"></i>
                  {{ useDateFormat(chapter.modifiedDate, "YYYY/M/D HH:mm") }}
                </span>
                <span class="badge badge-xs">
                  <i class="ri-file-text-line"></i>
                  {{ chapter.length }} 字
                </span>
              </div>
            </a>
          </li>
        </ul>
      </details>
    </li>
  </Submenu>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useDateFormat } from "@vueuse/core";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useNovelStore } from "@/stores/novelStore";

import { useChapters } from "@/composables/useChapters";

import Loading from "@/components/base/Loading.vue";
import Submenu from "@/components/ui/menu/Submenu.vue";

const novelStore = useNovelStore();
const { isLoadingList, chapters, currentChapterUuid } = storeToRefs(novelStore);

const route = useRoute();
const isReaderRoute = computed(() => {
  return Boolean(route.params.volumeSlug && route.params.chapterSlug);
});

const { isRead, handleAnyChapter, isRecent } = useChapters();

const handleChapter = (newId) => {
  handleAnyChapter(newId);
};

import { useClickLimit } from "@/composables/useClickLimit";

const { isDisabled, handleClick } = useClickLimit();

// 点击事件
const onClick = (newId) => {
  handleClick(handleChapter, newId);
};
</script>
