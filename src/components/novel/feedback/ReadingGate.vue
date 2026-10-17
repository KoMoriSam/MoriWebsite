<template>
  <main class="relative h-[calc(100dvh-4rem)] min-h-104 overflow-hidden max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:h-dvh max-lg:min-h-0">
    <div class="h-full overflow-hidden" aria-hidden="true" inert>
      <LoadingPlaceholder kind="novel" :chapter="novel.currentChapter" preview />
    </div>
    <div class="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-base-100/50 p-4 backdrop-blur-sm">
      <LoginGate class="w-full max-w-md" />
    </div>
  </main>
</template>
<script setup>
import LoginGate from '@/components/auth/LoginGate.vue';
import LoadingPlaceholder from '@/components/reader/feedback/LoadingPlaceholder.vue';
import { useNovelStore } from '@/stores/novel';
// 只展示公开目录标题和占位行，阅读器及正文请求仍由登录状态控制。
const novel = useNovelStore();
</script>
