<template>
  <section class="not-prose min-w-0 w-full space-y-5 font-sans" aria-hidden="true">
    <div v-if="novel" class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-serif text-2xl font-bold">{{ translate('reader.novelReader.chapterComments') }}</span>
      <div class="skeleton h-6 w-24 rounded-field motion-reduce:animate-none"></div>
    </div>
    <div class="flex items-center gap-2 py-2">
      <div v-for="reaction in 4" :key="reaction" class="skeleton h-7 w-10 rounded-full motion-reduce:animate-none"></div>
    </div>
    <div class="flex items-center justify-between gap-3 border-b border-base-300 pb-3">
      <div class="skeleton h-4 w-24 motion-reduce:animate-none"></div>
      <div class="skeleton h-4 w-12 motion-reduce:animate-none"></div>
    </div>
    <div v-for="comment in 2" :key="comment" class="flex gap-3 pt-2">
      <div class="skeleton size-8 shrink-0 rounded-full motion-reduce:animate-none"></div>
      <div class="min-w-0 flex-1 space-y-3">
        <div class="skeleton h-3 w-2/5 motion-reduce:animate-none"></div>
        <div class="skeleton h-3 w-full motion-reduce:animate-none"></div>
        <div class="skeleton h-3 w-3/4 motion-reduce:animate-none"></div>
      </div>
    </div>
    <div class="overflow-hidden rounded-lg border border-base-300">
      <div class="flex gap-4 border-b border-base-300 bg-base-200/50 p-3">
        <div class="skeleton h-4 w-12 motion-reduce:animate-none"></div>
        <div class="skeleton h-4 w-12 motion-reduce:animate-none"></div>
      </div>
      <div class="p-3">
        <div class="skeleton h-28 w-full motion-reduce:animate-none"></div>
        <div class="mt-3 flex justify-end">
          <div class="skeleton h-8 w-24 motion-reduce:animate-none"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';

defineProps({ novel: { type: Boolean, default: false } });
const { t: translate } = useLocale();
</script>
