import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useLocale } from '@/i18n';
import { generatedArticleList } from '@/router/ssg-data';
import { resolveArticleVersion } from '@/utils/blog/article-versions';
import { normalizeArticleDate } from '@/composables/blog/useArticleFilter';

export function useLatestArticles(limit = 3) {
  const { locale } = useLocale();
  const sources = ref(generatedArticleList);
  const loading = ref(sources.value.length === 0);
  let disposed = false;
  let request = null;

  const articles = computed(() => sources.value
    .filter((article) => article.public !== false)
    .map((article) => {
      const date = normalizeArticleDate(article.date);
      const timestamp = new Date(article.date).getTime();
      return {
        article,
        date,
        publishedTime: Number.isFinite(timestamp) ? timestamp : Date.parse(date) || 0,
      };
    })
    .sort((a, b) => b.publishedTime - a.publishedTime)
    .slice(0, limit)
    .map(({ article, date, publishedTime }) => ({
      ...resolveArticleVersion(article, locale.value),
      displayDate: date,
      publishedTime,
    })));

  function refresh({ force = true } = {}) {
    if (request) return request;
    if (disposed) return Promise.resolve(false);
    loading.value = true;
    request = (async () => {
      const { useArticleApi } = await import('@/services/api-articles');
      if (disposed) return false;
      const result = await useArticleApi().fetchArticleList({ force });
      if (disposed) return false;
      sources.value = result;
      return true;
    })().finally(() => {
      request = null;
      if (!disposed) loading.value = false;
    });
    return request;
  }

  onMounted(() => {
    if (!sources.value.length) void refresh({ force: false }).catch(() => {});
  });
  onBeforeUnmount(() => { disposed = true; });

  return { articles, loading, refresh };
}
