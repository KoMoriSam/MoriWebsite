<template>
  <div
    class="min-w-0 w-full"
    :class="mobile ? 'rounded-box border border-base-300 bg-base-100/95 p-2' : ''"
    aria-hidden="true"
  >
    <div class="flex min-w-0 items-center gap-2" :class="mobile ? 'px-1' : ''">
      <i class="shrink-0 text-2xl text-primary" :class="novel ? 'ri-book-2-line' : 'ri-list-unordered'"></i>
      <div class="min-w-0 flex-1">
        <span :class="mobile ? 'block text-xs font-bold' : 'text-base font-bold'">{{ translate('reader.toc.progress') }}</span>
        <div v-if="mobile" class="skeleton mt-1 h-3 w-2/3 motion-reduce:animate-none"></div>
      </div>
      <div class="skeleton h-3 w-7 motion-reduce:animate-none"></div>
      <i v-if="mobile" class="ri-arrow-down-s-line"></i>
    </div>
    <div class="skeleton mt-2 h-1.5 w-full rounded-full motion-reduce:animate-none" :class="mobile ? 'mb-1' : 'mb-3'"></div>
    <div v-if="!mobile" class="space-y-1 py-2">
      <div v-for="line in 12" :key="line" class="flex h-8 items-center gap-2 px-2" :class="line % 4 === 1 ? 'bg-base-200/60 rounded-lg' : 'ml-4'">
        <span v-if="novel && line % 4 === 1" class="skeleton size-3 shrink-0 motion-reduce:animate-none"></span>
        <span class="skeleton h-3 motion-reduce:animate-none" :class="line % 3 ? 'w-4/5' : 'w-3/5'"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocale } from '@/i18n';

defineProps({
  mobile: { type: Boolean, default: false },
  novel: { type: Boolean, default: false },
});
const { t: translate } = useLocale();
</script>
