<template>
  <section
    class="not-prose min-w-0 w-full max-w-full"
    :class="[
      page ? (mobileNovel ? MOBILE_READER_PAGE_CLASS : READER_PAGE_CLASS) : '',
      !page && mobileNovel ? 'flex h-full min-h-0 flex-1 flex-col overflow-hidden' : '',
      preview ? '[&_.skeleton]:animate-none' : '',
    ]"
    :role="preview ? undefined : 'status'"
    :aria-live="preview ? undefined : 'polite'"
    :aria-busy="preview ? undefined : true"
    :aria-label="preview ? undefined : translate('common.navigationFeedback.loading')"
  >
    <span v-if="!preview" class="sr-only">{{
      translate("common.navigationFeedback.loading")
    }}</span>
    <ContentGrid
      v-if="page"
      :container-class="mobileNovel ? MOBILE_READER_CONTAINER_CLASS : 'py-6'"
      :grid-class="mobileNovel ? MOBILE_READER_GRID_CLASS : READER_GRID_CLASS"
      :content-class="mobileNovel ? MOBILE_READER_CONTENT_CLASS : ''"
      :show-toc="!mobileNovel"
      :show-aside="!mobileNovel"
      sticky-top="2rem"
    >
      <template #mobile-toc><TocPlaceholder mobile :novel="kind === 'novel'" /></template>
      <template #toc><TocPlaceholder :novel="kind === 'novel'" /></template>
      <ContentPlaceholder :kind="kind" :article="article" :chapter="chapter" :mobile="mobileNovel" :show-header="showHeader" />
      <template #aside><CommentsPlaceholder :novel="kind === 'novel'" /></template>
    </ContentGrid>
    <ContentPlaceholder v-else :kind="kind" :article="article" :chapter="chapter" :mobile="mobileNovel" :show-header="showHeader" />
  </section>
</template>

<script setup>
import { useLocale } from "@/i18n";
import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import ContentGrid from '@/components/reader/layout/ContentGrid.vue';
import ContentPlaceholder from './ContentPlaceholder.vue';
import TocPlaceholder from './TocPlaceholder.vue';
import CommentsPlaceholder from './CommentsPlaceholder.vue';
import {
  READER_PAGE_CLASS, READER_GRID_CLASS, MOBILE_READER_PAGE_CLASS,
  MOBILE_READER_CONTAINER_CLASS, MOBILE_READER_GRID_CLASS, MOBILE_READER_CONTENT_CLASS,
} from '@/constants/reader-layout';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  page: { type: Boolean, default: true },
  kind: { type: String, default: 'article' },
  article: { type: Object, default: null },
  chapter: { type: Object, default: null },
  showHeader: { type: Boolean, default: true },
  preview: { type: Boolean, default: false },
});

const { t: translate } = useLocale();
const mobile = useMediaQuery('(max-width: 1023px)');
const mobileNovel = computed(() => props.kind === 'novel' && mobile.value);
</script>
