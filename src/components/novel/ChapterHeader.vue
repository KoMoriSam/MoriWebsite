<template>
  <header
    id="novel-reading-start"
    class="flex w-full min-w-0 max-w-full flex-col gap-3 font-sans lg:flex-row lg:items-end"
  >
    <!-- 标题区域 -->
    <section class="group min-w-0 max-w-full lg:flex-1" aria-label="章节信息">
      <hgroup class="min-w-0">
        <!-- 卷标（桌面端显示） -->
        <section
          v-if="chapter?.volumeTitle"
          class="hidden min-w-0 items-center gap-2 lg:flex"
        >
          <!-- 返回封面 -->
          <nav
            aria-label="导航"
            class="tooltip tooltip-right shrink-0"
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
          <p
            class="badge badge-outline badge-primary m-0! min-w-0 max-w-full truncate"
          >
            <i
              class="ri-bookmark-line shrink-0 font-normal"
              aria-hidden="true"
            ></i>
            {{ chapter.volumeTitle }}
          </p>
        </section>

        <!-- 章节标题 -->
        <h1
          :id="headerParagraphId || undefined"
          :data-reader-paragraph-id="headerParagraphId || undefined"
          data-source-type="novel"
          data-reader-comment-scope="chapter"
          :tabindex="headerParagraphId ? 0 : undefined"
          class="chapter-header-title m-0! min-w-0 max-w-full p-0! text-left! text-pretty! text-3xl! leading-tight! font-serif font-bold tracking-normal! text-base-content break-words indent-0! [overflow-wrap:anywhere] md:text-4xl!"
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
    <section
      v-if="stats.length"
      aria-label="章节统计"
      class="min-w-0 lg:max-w-[40%] lg:shrink"
    >
      <ul
        class="chapter-header-stats flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60 lg:justify-end"
      >
        <li
          v-for="(stat, index) in stats"
          :key="index"
          class="chapter-header-stat inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
        >
          <i
            v-if="stat.icon"
            class="shrink-0"
            :class="stat.icon"
            aria-hidden="true"
          ></i>

          <span>{{ stat.text }}</span>
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
