<template>
  <main class="relative h-[calc(100dvh-4rem)] min-h-104 overflow-hidden bg-base-200/40">
    <div class="mx-auto grid h-full max-w-7xl lg:grid-cols-[15rem_minmax(0,1fr)]" aria-hidden="true" inert>
      <aside class="hidden border-r border-base-300 p-6 lg:block">
        <div class="mb-8 h-5 w-24 rounded bg-base-content/10"></div>
        <div v-for="line in 12" :key="line" class="mb-5 h-3 rounded bg-base-content/10" :class="line % 3 ? 'w-4/5' : 'w-3/5'"></div>
      </aside>
      <article class="mx-auto w-full max-w-3xl bg-base-100 px-6 py-10 sm:px-12 sm:py-14">
        <header class="mb-12 text-center">
          <p class="mb-3 font-serif text-sm text-base-content/55">{{ novel.currentChapter?.volumeTitle }}</p>
          <h1 v-if="novel.currentChapter?.title" class="font-serif text-2xl font-semibold">{{ novel.currentChapter.title }}</h1>
          <div v-else class="mx-auto h-7 w-48 rounded bg-base-content/10"></div>
          <div class="mx-auto mt-5 h-2 w-28 rounded bg-base-content/10"></div>
        </header>
        <div v-for="paragraph in 5" :key="paragraph" class="mb-8 space-y-4">
          <div v-for="line in 4" :key="line" class="h-3 rounded bg-base-content/10" :class="line === 1 ? 'ml-8' : line === 4 ? 'w-3/5' : 'w-full'"></div>
        </div>
      </article>
    </div>
    <div class="absolute inset-0 grid place-items-center bg-base-100/65 p-4 backdrop-blur-sm">
      <LoginGate class="w-full max-w-md" />
    </div>
  </main>
</template>
<script setup>
import LoginGate from '@/components/auth/LoginGate.vue';
import { useNovelStore } from '@/stores/novel';
// 只展示公开目录标题和占位行，阅读器及正文请求仍由登录状态控制。
const novel = useNovelStore();
</script>
