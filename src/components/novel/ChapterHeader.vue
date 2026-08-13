<template>
  <header
    id="novel-reading-start"
    class="chapter-header not-prose flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
  >
    <div class="chapter-header-main group min-w-0 max-w-full flex-1">
      <div
        v-if="chapter?.volumeTitle"
        class="chapter-header-volume max-lg:hidden mb-2 flex min-w-0 max-w-full items-center"
      >
        <div class="tooltip tooltip-right" data-tip="返回封面页">
          <RouterLink
            to="/novel"
            class="btn btn-outline btn-primary btn-xs btn-circle mr-2"
            aria-label="返回小说封面"
          >
            <i class="ri-arrow-left-line" aria-hidden="true"></i>
          </RouterLink>
        </div>

        <span
          class="badge badge-outline badge-primary min-w-0 max-w-full gap-1 overflow-hidden font-normal"
        >
          <i class="ri-bookmark-line shrink-0" aria-hidden="true"></i>
          <span class="min-w-0 truncate">
            {{ chapter.volumeTitle }}
          </span>
        </span>
      </div>

      <h1
        class="chapter-header-title text-base-content m-0! min-w-0 max-w-full flex-1 p-0! text-left! text-pretty! text-3xl! leading-tight! font-serif font-bold tracking-normal! break-words indent-0! [overflow-wrap:anywhere] md:text-4xl!"
      >
        {{ chapter?.title }}
      </h1>
    </div>

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
  </header>
</template>

<script setup>
defineProps({
  chapter: {
    type: Object,
    default: null,
  },
  stats: {
    type: Array,
    default: () => [],
  },
});
</script>
