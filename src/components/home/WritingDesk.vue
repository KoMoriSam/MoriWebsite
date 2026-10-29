<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p
        class="mb-2 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
        lang="en"
      >
        Blog &amp; fiction
      </p>
      <div class="flex items-center gap-2">
        <h2 id="home-writing-title" class="font-serif text-2xl font-bold md:text-3xl">
          {{ translate("home.writing.title") }}
        </h2>
        <div class="tooltip" :data-tip="translate('home.writing.refresh')">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square shrink-0 text-base-content/55"
            :disabled="busy"
            :aria-label="translate(busy ? 'home.writing.refreshing' : 'home.writing.refresh')"
            @click="refreshWriting"
          >
            <i class="ri-refresh-line text-base" :class="busy ? 'animate-spin motion-reduce:animate-none' : ''" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <router-link to="/blog" class="btn btn-ghost btn-sm"
        >{{ translate("common.navigation.blog")
        }}<i class="ri-arrow-right-line" aria-hidden="true"></i
      ></router-link>
      <router-link to="/novel" class="btn btn-ghost btn-sm">
        {{ translate("common.navigation.novel") }}<i class="ri-arrow-right-line" aria-hidden="true"></i>
      </router-link>
    </div>
  </header>
  <div
    class="grid grid-cols-1 items-start gap-5 md:grid-cols-12 md:items-stretch md:gap-6 xl:gap-8"
    :aria-busy="busy"
  >
    <article
      v-for="(entry, index) in entries"
      :key="entry.id"
      class="min-w-0"
      :style="{
        '--writing-row': Math.max(index, 1),
        '--featured-rows': Math.max(entries.length - 1, 1),
      }"
      :class="
        index === 0
          ? 'md:col-span-6 md:col-start-1 md:row-start-1 md:row-span-(--featured-rows)'
          : 'md:col-span-6 md:col-start-7 md:row-start-(--writing-row)'
      "
    >
      <ArticlePreview
        v-if="entry.type === 'article'"
        :article="entry.article"
        :featured="index === 0"
      />
      <NovelPreview
        v-else
        :chapter="entry.chapter"
        :featured="index === 0"
      />
    </article>
    <div
      v-if="!entries.length && (loading || novelLoading)"
      class="space-y-4 md:col-span-6 md:col-start-1 md:row-start-1"
      role="status"
    >
      <span class="sr-only">{{ translate("home.writing.loading") }}</span>
      <div
        class="skeleton aspect-4/3 rounded-box motion-reduce:animate-none"
      ></div>
      <div class="skeleton h-8 w-4/5 motion-reduce:animate-none"></div>
    </div>
    <router-link
      v-else-if="!entries.length"
      to="/blog"
      class="card card-border min-h-64 justify-center bg-base-100 p-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:col-span-6 md:col-start-1 md:row-start-1"
    >
      <i
        class="ri-quill-pen-line mb-4 text-4xl text-primary"
        aria-hidden="true"
      ></i>
      <h3 class="font-serif text-2xl">
        {{ translate("home.writing.emptyTitle") }}
      </h3>
      <p class="mt-4 text-sm text-base-content/65">
        {{ translate("common.navigation.blog") }} →
      </p>
    </router-link>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { useLocale } from "@/i18n";
import { useToast } from "@/composables/useToast";
import { useNovelChapters } from "@/composables/home/useNovelChapters";
import ArticlePreview from "@/components/home/ArticlePreview.vue";
import NovelPreview from "@/components/home/NovelPreview.vue";
const props = defineProps({
  articles: { type: Array, default: () => [] },
  loading: Boolean,
  refreshArticles: { type: Function, required: true },
});
const { t: translate } = useLocale();
const { chapters, loading: novelLoading, refresh: refreshChapters } = useNovelChapters();
const toast = useToast();
const refreshing = ref(false);
const busy = computed(() => refreshing.value || props.loading || novelLoading.value);
let disposed = false;
onBeforeUnmount(() => { disposed = true; });

async function refreshWriting() {
  if (busy.value) return;
  refreshing.value = true;
  try {
    const results = await Promise.allSettled([
      props.refreshArticles({ force: true }),
      refreshChapters({ force: true }),
    ]);
    if (disposed) return;
    if (results.every((result) => result.status === "fulfilled" && result.value === true)) {
      toast.success(translate("home.writing.refreshed"));
    } else {
      toast.error(translate("home.writing.refreshFailed"));
    }
  } finally {
    if (!disposed) refreshing.value = false;
  }
}

const publicationTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};
const entries = computed(() => {
  const items = props.articles.map((article) => ({
    id: `article:${article.id}`,
    type: "article",
    article,
    published: article.publishedTime ?? publicationTime(article.date || article.displayDate),
  }));
  for (const chapter of chapters.value) {
    if (!chapter.uuid) continue;
    items.push({
      id: `novel:${chapter.uuid}`,
      type: "novel",
      chapter,
      published: publicationTime(chapter.uploadDate),
    });
  }
  return items.sort((a, b) => b.published - a.published).slice(0, 4);
});
</script>
