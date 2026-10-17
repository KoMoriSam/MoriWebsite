<template>
  <article
    class="not-prose min-w-0 w-full max-w-full"
    :class="{ 'flex min-h-0 flex-1 flex-col overflow-hidden': mobile }"
    :style="typographyStyle"
    aria-hidden="true"
  >
    <header
      v-if="showHeader && kind === 'article'"
      class="mb-8 flex min-h-72 flex-col justify-end overflow-hidden rounded-lg bg-base-200 p-5 font-sans shadow-lg sm:min-h-80 sm:p-8"
    >
      <div class="mb-3 flex items-center gap-2">
        <span class="skeleton size-6 shrink-0 rounded-full motion-reduce:animate-none"></span>
        <span v-for="tag in 2" :key="tag" class="skeleton h-5 w-14 motion-reduce:animate-none"></span>
      </div>
      <h1 v-if="article?.title" class="m-0 font-serif text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-5xl">
        {{ article.title }}
      </h1>
      <template v-else>
        <div class="skeleton h-9 w-4/5 motion-reduce:animate-none sm:h-10 lg:h-12"></div>
        <div class="skeleton mt-3 h-9 w-1/2 motion-reduce:animate-none sm:hidden"></div>
      </template>
      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        <span v-for="stat in 3" :key="stat" class="skeleton h-4 w-16 motion-reduce:animate-none"></span>
      </div>
    </header>

    <header
      v-else-if="showHeader"
      class="flex min-w-0 flex-col gap-3 font-sans lg:flex-row lg:items-end"
      :style="{ marginBottom: 'var(--placeholder-header-gap)' }"
    >
      <div class="min-w-0 lg:flex-1">
        <div v-if="!mobile" class="mb-1 hidden min-w-0 items-center gap-2 lg:flex">
          <span class="skeleton size-6 shrink-0 rounded-full motion-reduce:animate-none"></span>
          <span v-if="chapter?.volumeTitle" class="truncate rounded bg-primary/10 px-2 text-sm text-primary">{{ chapter.volumeTitle }}</span>
          <span v-else class="skeleton h-5 w-28 motion-reduce:animate-none"></span>
        </div>
        <h1 v-if="chapter?.title" class="m-0 text-left font-serif text-3xl leading-tight font-bold break-words md:text-4xl">
          {{ chapter.title }}
        </h1>
        <div v-else class="skeleton h-9 w-3/4 motion-reduce:animate-none md:h-10"></div>
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-2 lg:max-w-[40%] lg:justify-end">
        <span v-for="stat in 3" :key="stat" class="skeleton h-4 w-14 motion-reduce:animate-none"></span>
      </div>
    </header>

    <div
      class="min-w-0 space-y-(--placeholder-paragraph-gap)"
      :class="{ 'min-h-0 flex-1 overflow-hidden': mobile }"
    >
      <div v-for="paragraph in 6" :key="paragraph">
        <div
          v-for="line in (paragraph % 2 === 0 ? 5 : 4)"
          :key="line"
          class="flex h-(--placeholder-line-height) items-center"
          :class="line === 1 ? 'ml-[2em]' : ''"
        >
          <div
            class="skeleton h-[0.55em] motion-reduce:animate-none"
            :class="line === (paragraph % 2 === 0 ? 5 : 4) ? (paragraph % 2 ? 'w-3/5' : 'w-4/5') : 'w-full'"
          ></div>
        </div>
      </div>
    </div>
    <footer v-if="mobile" class="mt-auto flex h-6 min-h-6 shrink-0 items-center gap-3">
      <span class="skeleton mr-auto h-2 w-2/5 motion-reduce:animate-none"></span>
      <span class="skeleton h-2 w-9 motion-reduce:animate-none"></span>
      <span class="skeleton h-2 w-8 motion-reduce:animate-none"></span>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { useReaderStore } from '@/stores/readerStore';

const props = defineProps({
  kind: { type: String, default: 'article' },
  article: { type: Object, default: null },
  chapter: { type: Object, default: null },
  mobile: { type: Boolean, default: false },
  showHeader: { type: Boolean, default: true },
});
const reader = useReaderStore();
const typographyStyle = computed(() => {
  const { fontSize, lineHeight, paraHeight } = reader.styleConfigs;
  const line = fontSize * lineHeight;
  return {
    fontSize: `${fontSize}px`,
    '--placeholder-line-height': `${line}px`,
    '--placeholder-paragraph-gap': `${line * paraHeight}px`,
    '--placeholder-header-gap': `${props.mobile ? line : line * 1.5}px`,
  };
});
</script>
