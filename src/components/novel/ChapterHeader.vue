<template>
  <header
    id="novel-reading-start"
    class="flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between font-sans"
  >
    <!-- 标题区域 -->
    <section class="group min-w-0 max-w-full flex-1" aria-label="章节信息">
      <!-- 章节标题 -->
      <hgroup>
        <!-- 卷标（桌面端显示） -->
        <section
          v-if="chapter?.volumeTitle"
          class="max-lg:hidden flex gap-2 items-center"
        >
          <!-- 返回封面 -->
          <nav
            aria-label="导航"
            class="tooltip tooltip-right"
            data-tip="返回封面页"
          >
            <RouterLink
              to="/novel"
              class="btn btn-outline btn-primary btn-xs btn-circle"
              aria-label="返回小说封面"
            >
              <i class="ri-arrow-left-line" aria-hidden="true"></i>
            </RouterLink>
          </nav>

          <!-- 卷标 -->
          <p class="badge badge-outline badge-primary truncate">
            <i
              class="ri-bookmark-line shrink-0 font-normal"
              aria-hidden="true"
            ></i>
            {{ chapter.volumeTitle }}
          </p>
        </section>
        <h1
          :id="headerParagraphId || undefined"
          :data-reader-paragraph-id="headerParagraphId || undefined"
          data-source-type="novel"
          data-reader-comment-scope="chapter"
          :tabindex="headerParagraphId ? 0 : undefined"
          class="chapter-header-title text-base-content m-0! min-w-0 max-w-full flex-1 p-0! text-left! text-pretty! text-3xl! leading-tight! font-serif font-bold tracking-normal! break-words indent-0! [overflow-wrap:anywhere] md:text-4xl!"
        >
          {{ chapter?.title }}
          <CommentTrigger
            v-if="headerParagraphId"
            :paragraph-id="headerParagraphId"
            source-type="novel"
            @open="openComments"
          />
        </h1>
      </hgroup>
    </section>

    <!-- 统计信息 -->
    <section aria-label="章节统计">
      <ul
        v-if="stats.length"
        class="chapter-header-stats m-0! flex min-w-0 max-w-full list-none! flex-wrap items-center gap-1.5 p-0! lg:max-w-64 lg:shrink-0 lg:justify-end"
      >
        <li
          v-for="(stat, index) in stats"
          :key="index"
          class="chapter-header-stat m-0! flex min-w-0 max-w-full p-0! text-base! tracking-normal! indent-0!"
        >
          <span class="badge badge-sm min-w-0 max-w-full gap-1 overflow-hidden">
            <i
              v-if="stat.icon"
              class="shrink-0"
              :class="stat.icon"
              aria-hidden="true"
            ></i>
            <span class="truncate">{{ stat.text }}</span>
          </span>
        </li>
      </ul>
    </section>
  </header>
</template>

<script setup>
import { computed } from "vue";
import CommentTrigger from "@/components/reader/CommentTrigger.vue";

const props = defineProps({
  chapter: {
    type: Object,
    default: null,
  },
  stats: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["open-comments"]);

const headerParagraphId = computed(() => {
  const uuid = String(props.chapter?.uuid || "").trim();
  return uuid ? `${uuid}-0` : "";
});

const openComments = (event) => {
  event?.preventDefault();
  emit("open-comments", event);
};
</script>
