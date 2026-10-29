<template>
  <CatalogCard
    :to="article.routePath"
    :lang="article.lang"
    :compact="!featured"
    :class="featured ? 'md:h-full' : ''"
    :title="article.title"
    title-tag="h3"
    :description="featured ? article.summary || '' : ''"
    :cover="article.banner || ''"
    :tags="tags"
    icon="ri-article-line"
    :action="featured ? translate('home.writing.read') : ''"
    cover-sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, calc(100vw - 3rem)"
  >
    <template #meta>
      <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <CatalogMeta v-if="article.displayDate" tag="time" :datetime="article.displayDate" icon="ri-calendar-line">{{ date(article.displayDate) }}</CatalogMeta>
        <CatalogMeta v-if="readingTime" icon="ri-time-line">{{ translate('home.writing.readingTime', { count: readingTime }) }}</CatalogMeta>
      </div>
    </template>
  </CatalogCard>
</template>

<script setup>
import { computed } from 'vue';
import { useLocale } from '@/i18n';
import CatalogCard from '@/components/interaction/navigation/CatalogCard.vue';
import CatalogMeta from '@/components/interaction/navigation/CatalogMeta.vue';
import { formatArticleTag } from '@/composables/blog/useArticleFilter';

const props = defineProps({ article: { type: Object, required: true }, featured: Boolean });
const { t: translate, date } = useLocale();
const tags = computed(() => (props.article.tags || []).slice(0, 2).map(formatArticleTag));
const readingTime = computed(() => {
  const length = Number(props.article.length);
  return length > 0 ? Math.max(1, Math.ceil(length / 300)) : null;
});
</script>
