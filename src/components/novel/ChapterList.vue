<template>
  <section
    v-if="isDetailVariant"
    class="overflow-hidden rounded-lg border border-base-300 bg-base-100"
  >
    <header
      class="flex flex-col gap-4 border-b border-base-300 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div class="min-w-0">
        <p
          class="mb-1 text-xs font-bold tracking-[0.2em] text-base-content/45 uppercase"
        >
          Contents
        </p>
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 class="font-serif text-3xl font-bold text-balance">章节目录</h2>
          <span class="text-sm text-base-content/55">
            {{ chapterVolumes.length }} 卷 · {{ chapterCount }} 章
          </span>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="btn btn-ghost btn-sm border border-base-300"
          @click="novelStore.refreshChapters()"
          :disabled="isLoadingList"
        >
          <i
            class="ri-refresh-line"
            :class="{ 'animate-spin': isLoadingList }"
          ></i>
          刷新目录
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm border border-base-300 text-error"
          @click="novelStore.refreshReadChapters()"
          :disabled="isLoadingList"
        >
          <i class="ri-delete-bin-6-line"></i>
          清除记录
        </button>
      </div>
    </header>

    <Loading v-if="isLoadingList" :size="`my-48`" />

    <div v-else-if="chapterVolumes.length > 0" class="divide-y divide-base-300">
      <details
        v-for="(volume, volumeIndex) in chapterVolumes"
        :key="volume.volumeInfo.uuid"
        open
        class="collapse collapse-arrow rounded-none group/volume"
      >
        <summary
          class="collapse-title flex items-center gap-4 px-5 py-4 transition-colors hover:bg-base-200/60 sm:px-6 [&::-webkit-details-marker]:hidden"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded bg-base-200 font-serif text-sm font-bold text-base-content/65"
          >
            {{ String(volumeIndex).padStart(2, "0") }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-bold">
              {{ volume.volumeInfo.title }}
            </span>
            <span class="text-xs text-base-content/50">
              {{ volume.chapters?.length || 0 }} 章
            </span>
          </span>
        </summary>
        <ol
          v-if="volume.chapters && volume.chapters.length > 0"
          class="collapse-content grid border-t border-base-300 bg-base-200/15 px-5 py-2 md:grid-cols-2"
        >
          <li
            v-for="(chapter, chapterIndex) in volume.chapters"
            :key="chapter.uuid"
            class="min-w-0"
          >
            <button
              v-if="chapter"
              type="button"
              class="group/chapter btn btn-ghost h-fit py-3 w-full min-w-0 rounded text-left transition-[background-color,transform] duration-150 hover:bg-base-100 active:translate-y-px"
              :disabled="isDisabled"
              @click="onClick(chapter.uuid)"
            >
              <span
                class="w-7 shrink-0 font-serif text-sm font-semibold tabular-nums text-base-content/35 transition-colors group-hover/chapter:text-primary"
              >
                {{ String(chapterIndex + 1).padStart(2, "0") }}
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex min-w-0 items-start gap-2">
                  <span
                    class="min-w-0 flex-1 text-pretty leading-snug font-semibold break-words"
                  >
                    {{ chapter.title }}
                  </span>
                  <span
                    v-if="
                      isRecent(chapter.uuid, chapter.uploadDate) &&
                      !isRead(chapter.uuid)
                    "
                    class="badge badge-warning badge-xs shrink-0"
                  >
                    NEW
                  </span>
                </span>

                <span
                  class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50"
                >
                  <span
                    class="inline-flex items-center gap-1"
                    :class="
                      isRead(chapter.uuid)
                        ? 'text-base-content/45'
                        : 'text-primary'
                    "
                  >
                    <span v-if="isRead(chapter.uuid)" class="status"></span>
                    <span
                      v-else
                      class="status status-primary animate-bounce"
                    ></span>
                    {{ isRead(chapter.uuid) ? "已读" : "未读" }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <i class="ri-time-line"></i>
                    {{ useDateFormat(chapter.uploadDate, "YYYY/M/D") }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <i class="ri-file-text-line"></i>
                    {{ chapter.length }} 字
                  </span>
                  <span
                    v-if="chapter.modifiedDate"
                    class="inline-flex items-center gap-1"
                    title="该章节有过更新"
                  >
                    <i class="ri-edit-line"></i>
                    已修订
                  </span>
                </span>
              </span>

              <i
                class="ri-arrow-right-line mt-0.5 shrink-0 text-base-content/0 transition-all group-hover/chapter:translate-x-0.5 group-hover/chapter:text-base-content/45"
              ></i>
            </button>
          </li>
        </ol>
      </details>
    </div>

    <div
      v-else
      class="flex min-h-64 flex-col items-center justify-center gap-2 px-6 py-12 text-center text-base-content/50"
    >
      <i class="ri-book-open-line text-3xl"></i>
      <p class="font-semibold text-base-content/70">暂时没有可阅读的章节</p>
      <p class="text-sm">刷新目录后再试一次</p>
    </div>
  </section>

  <Submenu v-else title="章节目录">
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

const props = defineProps({
  variant: {
    type: String,
    default: "reader",
    validator: (value) => ["reader", "detail"].includes(value),
  },
});

const novelStore = useNovelStore();
const { isLoadingList, chapters, currentChapterUuid } = storeToRefs(novelStore);

const isDetailVariant = computed(() => props.variant === "detail");
const chapterVolumes = computed(() =>
  Array.isArray(chapters.value)
    ? chapters.value
    : Object.values(chapters.value || {}),
);
const chapterCount = computed(() =>
  chapterVolumes.value.reduce(
    (count, volume) => count + (volume.chapters?.length || 0),
    0,
  ),
);

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
