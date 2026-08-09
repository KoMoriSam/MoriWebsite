<template>
  <Submenu
    title="章节目录"
    :meta="`${chapterVolumes.length} 卷 · ${chapterCount} 章`"
    :density="isDetailVariant ? 'comfortable' : 'compact'"
  >
    <template #btn>
      <div class="tooltip tooltip-left" data-tip="刷新章节目录">
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          aria-label="刷新章节目录"
          title="刷新章节目录"
          :disabled="isLoadingList"
          @click="novelStore.refreshChapters()"
        >
          <i
            class="ri-refresh-line"
            :class="{ 'animate-spin': isLoadingList }"
            aria-hidden="true"
          ></i>
        </button>
      </div>
      <div class="tooltip tooltip-left" data-tip="清除阅读记录">
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
          aria-label="清除阅读记录"
          title="清除阅读记录"
          :disabled="isLoadingList"
          @click="novelStore.refreshReadChapters()"
        >
          <i class="ri-delete-bin-6-line" aria-hidden="true"></i>
        </button>
      </div>
    </template>

    <li v-if="isLoadingList" class="list-none">
      <Loading :size="`my-48`" />
    </li>

    <template v-else-if="chapterVolumes.length > 0">
      <li
        v-for="(volume, volumeIndex) in chapterVolumes"
        :key="volume.volumeInfo.uuid"
        class="min-w-0"
      >
        <details open class="collapse collapse-arrow rounded-none group/volume">
          <summary
            class="collapse-title flex min-w-0 items-center transition-colors hover:bg-base-200/60 [&::-webkit-details-marker]:hidden"
            :class="
              isDetailVariant ? 'gap-4 px-5 py-4 sm:px-6' : 'gap-3 px-4 py-3.5'
            "
          >
            <span
              class="flex shrink-0 items-center justify-center rounded bg-base-200 font-serif font-bold text-base-content/65"
              :class="isDetailVariant ? 'size-9 text-sm' : 'size-8 text-xs'"
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
            class="collapse-content grid border-t border-base-300 bg-base-200/15 py-2"
            :class="
              isDetailVariant ? 'px-5 md:grid-cols-2' : 'grid-cols-1 px-2'
            "
          >
            <li
              v-for="(chapter, chapterIndex) in volume.chapters"
              :key="chapter.uuid"
              class="min-w-0"
            >
              <button
                v-if="chapter"
                type="button"
                class="group/chapter btn btn-ghost h-fit w-full min-w-0 justify-start rounded py-3 text-left transition-[background-color,transform] duration-150 active:translate-y-px"
                :class="[
                  {
                    'btn-active':
                      isReaderRoute && chapter.uuid === currentChapterUuid,
                  },
                ]"
                :aria-current="
                  isReaderRoute && chapter.uuid === currentChapterUuid
                    ? 'page'
                    : undefined
                "
                :disabled="isDisabled"
                @click="onClick(chapter.uuid)"
              >
                <span
                  class="w-7 shrink-0 font-serif font-semibold tabular-nums text-base-content/35 transition-colors group-hover/chapter:text-primary"
                  :class="isDetailVariant ? 'text-sm' : 'text-xs'"
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
                    class="mt-2 flex flex-wrap items-center gap-y-1 text-xs text-base-content/50"
                    :class="isDetailVariant ? 'gap-x-3' : 'gap-x-2.5'"
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
                      <i
                        class="ri-time-line font-normal"
                        aria-hidden="true"
                      ></i>
                      {{ useDateFormat(chapter.uploadDate, "YYYY/M/D") }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <i
                        class="ri-file-text-line font-normal"
                        aria-hidden="true"
                      ></i>
                      {{ chapter.length }} 字
                    </span>
                    <span
                      v-if="chapter.modifiedDate"
                      class="inline-flex items-center gap-1"
                      title="该章节有过更新"
                    >
                      <i
                        class="ri-edit-line font-normal"
                        aria-hidden="true"
                      ></i>
                      已修订
                    </span>
                  </span>
                </span>

                <i
                  class="ri-arrow-right-line mt-0.5 shrink-0 text-base-content/0 transition-all group-hover/chapter:translate-x-0.5 group-hover/chapter:text-base-content/45"
                  aria-hidden="true"
                ></i>
              </button>
            </li>
          </ol>
        </details>
      </li>
    </template>

    <li
      v-else
      class="flex flex-col items-center justify-center gap-2 text-center text-base-content/50"
      :class="isDetailVariant ? 'min-h-64 px-6 py-12' : 'min-h-52 px-5 py-10'"
    >
      <i
        class="ri-book-open-line"
        :class="isDetailVariant ? 'text-3xl' : 'text-2xl'"
        aria-hidden="true"
      ></i>
      <p class="font-semibold text-base-content/70">暂时没有可阅读的章节</p>
      <p :class="isDetailVariant ? 'text-sm' : 'text-xs'">刷新目录后再试一次</p>
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
