<template>
  <section
    v-if="related.length"
    class="not-prose mt-8 font-sans"
    data-pagefind-ignore
    :aria-labelledby="headingId"
  >
    <h2 :id="headingId" class="mb-3 text-base font-bold">
      {{ translate("blog.article.related") }}
    </h2>
    <ul
      :id="listId"
      class="m-0 list-none divide-y divide-base-300/60 p-0 text-sm leading-relaxed"
    >
      <li v-for="item in visibleArticles" :key="item.id">
        <RouterLink
          :to="item.routePath"
          :lang="item.lang"
          class="group -mx-3 block rounded-lg px-3 py-4 transition-colors hover:bg-base-200/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
          @click="navigate(item, $event)"
        >
          <span class="flex items-start justify-between gap-3">
            <span
              class="min-w-0 font-semibold text-base-content wrap-break-word decoration-primary/50 underline-offset-4 group-hover:text-primary group-focus-visible:text-primary"
            >
              {{ item.title }}
            </span>
            <i
              class="ri-arrow-right-line mt-0.5 shrink-0 text-base-content/35 transition-colors group-hover:text-primary"
              aria-hidden="true"
            ></i>
          </span>
          <span
            class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-base-content/50"
          >
            <CatalogMeta
              :icon="
                ['mutual', 'mentioned', 'backlink'].includes(item.relatedReason)
                  ? 'ri-links-line'
                  : 'ri-node-tree'
              "
            >
              {{
                translate(`blog.article.relatedReasons.${item.relatedReason}`)
              }}
            </CatalogMeta>
            <CatalogMeta
              v-if="item.publishedDate"
              tag="time"
              :datetime="item.publishedDate"
              icon="ri-calendar-line"
            >
              {{ date(item.publishedDate) }}
            </CatalogMeta>
            <CatalogMeta v-if="item.readingTime" icon="ri-time-line">
              {{
                translate(
                  "common.counts.minutes",
                  { count: item.readingTime },
                  item.readingTime,
                )
              }}
            </CatalogMeta>
            <CatalogMeta
              v-if="item.displayTags.length"
              icon="ri-price-tag-3-line"
            >
              {{ item.displayTags.join(" · ") }}
            </CatalogMeta>
          </span>
        </RouterLink>
      </li>
    </ul>
    <button
      v-if="related.length > INITIAL_VISIBLE_COUNT"
      type="button"
      class="btn btn-ghost btn-sm mt-2 gap-1.5"
      :aria-expanded="expanded"
      :aria-controls="listId"
      @click="expanded = !expanded"
    >
      {{ translate(expanded ? "blog.article.relatedCollapse" : "blog.article.relatedExpand") }}
      <i :class="expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'" aria-hidden="true"></i>
    </button>
  </section>
</template>

<script setup>
import { computed, ref, useId, watch } from "vue";
import { RouterLink } from "vue-router";
import { useLocale } from "@/i18n";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";
import {
  formatArticleTag,
  normalizeArticleDate,
} from "@/composables/blog/useArticleFilter";
import { getRelatedArticles } from "@/utils/blog/related-articles";

const props = defineProps({
  article: { type: Object, required: true },
  articles: { type: Array, default: () => [] },
  content: { type: String, default: "" },
});
const emit = defineEmits(["navigate"]);
const { t: translate, date } = useLocale();
const headingId = `related-articles-${useId()}`;
const listId = `${headingId}-list`;
const INITIAL_VISIBLE_COUNT = 5;
const expanded = ref(false);
const related = computed(() =>
  getRelatedArticles(props.article, props.articles, props.content).map(
    (article) => ({
      ...article,
      publishedDate: normalizeArticleDate(article.date),
      readingTime:
        Number(article.length) > 0
          ? Math.max(1, Math.ceil(Number(article.length) / 300))
          : null,
      displayTags: (article.tags || []).slice(0, 2).map(formatArticleTag),
    }),
  ),
);
const visibleArticles = computed(() =>
  expanded.value ? related.value : related.value.slice(0, INITIAL_VISIBLE_COUNT),
);

watch([() => props.article.id, () => props.article.lang], () => {
  expanded.value = false;
});

function navigate(article, event) {
  if (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    emit("navigate", article, event);
  }
}
</script>
