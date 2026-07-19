<template>
  <main
    class="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
  >
    <!-- 加载状态 -->
    <Loading v-if="loading" :size="`my-32`" />

    <template v-else-if="articles.length">
      <!-- 页面标题 -->
      <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold sm:text-3xl">文章列表</h1>

          <p class="mt-2 text-sm text-base-content/55">
            共 {{ articles.length }} 篇文章
          </p>
        </div>

        <span
          v-if="hasFilter"
          class="badge badge-primary badge-soft h-auto px-3 py-2"
        >
          找到 {{ filteredArticles.length }} 篇
        </span>
      </header>

      <!-- 检索区域 -->
      <section class="mb-8" aria-label="文章检索">
        <!-- 基础搜索 -->
        <div
          class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto]"
        >
          <label
            class="input input-bordered flex w-full min-w-0 items-center gap-2"
          >
            <i class="ri-search-line shrink-0 text-base-content/45"></i>

            <input
              v-model="keyword"
              type="search"
              class="min-w-0 grow"
              placeholder="搜索标题、摘要或标签…"
              aria-label="搜索文章"
            />

            <button
              v-if="keyword"
              type="button"
              class="btn btn-circle btn-ghost btn-xs shrink-0"
              aria-label="清除搜索关键词"
              @click="keyword = ''"
            >
              <i class="ri-close-line"></i>
            </button>
          </label>

          <select
            v-model="sortType"
            class="select select-bordered w-full"
            aria-label="文章排序"
          >
            <option value="newest">最新发布</option>
            <option value="oldest">最早发布</option>
            <option value="title">标题排序</option>
          </select>

          <button
            type="button"
            class="btn w-full gap-2 md:w-auto"
            :class="
              advancedFilterCount ? 'btn-primary btn-soft' : 'btn-outline'
            "
            :aria-expanded="showAdvancedSearch"
            aria-controls="advanced-search-panel"
            @click="showAdvancedSearch = !showAdvancedSearch"
          >
            <i class="ri-equalizer-2-line"></i>
            高级搜索

            <span
              v-if="advancedFilterCount"
              class="badge badge-primary badge-sm"
            >
              {{ advancedFilterCount }}
            </span>

            <i
              class="ri-arrow-down-s-line transition-transform duration-200"
              :class="{ 'rotate-180': showAdvancedSearch }"
            ></i>
          </button>
        </div>

        <!-- 高级搜索面板 -->
        <div
          v-show="showAdvancedSearch"
          id="advanced-search-panel"
          class="mt-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5"
        >
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold">高级搜索</h2>
              <p class="mt-1 text-sm text-base-content/50">
                按标签或发布日期进一步筛选文章
              </p>
            </div>

            <button
              v-if="advancedFilterCount"
              type="button"
              class="btn btn-ghost btn-sm gap-2"
              @click="resetAdvancedFilter"
            >
              <i class="ri-refresh-line"></i>
              清除高级条件
            </button>
          </div>

          <div
            class="grid min-w-0 grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1fr)]"
          >
            <!-- 标签筛选 -->
            <div class="min-w-0">
              <span class="mb-2 block text-sm font-medium">标签</span>

              <div class="dropdown dropdown-bottom w-full">
                <button
                  tabindex="0"
                  type="button"
                  class="btn btn-outline w-full min-w-0 justify-between gap-2"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <i class="ri-price-tag-3-line shrink-0"></i>
                    <span class="truncate">
                      {{
                        selectedTags.length
                          ? `已选择 ${selectedTags.length} 个标签`
                          : "选择标签"
                      }}
                    </span>
                  </span>

                  <i
                    class="ri-arrow-down-s-line shrink-0 text-base-content/50"
                  ></i>
                </button>

                <div
                  tabindex="0"
                  class="dropdown-content z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
                >
                  <div
                    class="mb-2 flex items-center justify-between gap-3 px-1 text-sm"
                  >
                    <span class="font-medium">选择标签</span>

                    <button
                      v-if="selectedTags.length"
                      type="button"
                      class="btn btn-ghost btn-xs"
                      @click="selectedTags = []"
                    >
                      清空
                    </button>
                  </div>

                  <div
                    v-if="allTags.length"
                    class="max-h-72 space-y-1 overflow-y-auto overscroll-contain pr-1"
                  >
                    <label
                      v-for="tag in allTags"
                      :key="tag"
                      class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-base-200"
                    >
                      <input
                        v-model="selectedTags"
                        type="checkbox"
                        :value="tag"
                        class="checkbox checkbox-primary checkbox-sm"
                      />

                      <span class="min-w-0 flex-1 truncate">
                        {{ tag }}
                      </span>

                      <span class="text-xs text-base-content/40">
                        {{ tagCounts.get(tag) || 0 }}
                      </span>
                    </label>
                  </div>

                  <p
                    v-else
                    class="px-2 py-6 text-center text-sm text-base-content/45"
                  >
                    暂无可用标签
                  </p>
                </div>
              </div>
            </div>

            <!-- 日期范围 -->
            <div class="min-w-0">
              <span class="mb-2 block text-sm font-medium">发布日期</span>

              <div
                class="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
              >
                <label class="min-w-0">
                  <span class="sr-only">起始日期</span>

                  <input
                    v-model="dateFrom"
                    type="date"
                    class="input input-bordered w-full min-w-0"
                    :max="dateTo || undefined"
                    aria-label="起始日期"
                  />
                </label>

                <span
                  class="hidden text-center text-sm text-base-content/35 sm:block"
                >
                  至
                </span>

                <label class="min-w-0">
                  <span class="sr-only">截止日期</span>

                  <input
                    v-model="dateTo"
                    type="date"
                    class="input input-bordered w-full min-w-0"
                    :min="dateFrom || undefined"
                    aria-label="截止日期"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 已启用的高级筛选摘要 -->
        <div
          v-if="advancedFilterCount"
          class="mt-4 flex min-w-0 flex-wrap items-center gap-2"
        >
          <span class="mr-1 text-sm text-base-content/50">高级条件</span>

          <button
            v-for="tag in selectedTags"
            :key="tag"
            type="button"
            class="badge badge-primary badge-soft h-auto max-w-full gap-1 px-2.5 py-1.5"
            :aria-label="`移除标签 ${tag}`"
            @click="removeTag(tag)"
          >
            <span class="truncate">{{ tag }}</span>
            <i class="ri-close-line shrink-0"></i>
          </button>

          <button
            v-if="dateFrom"
            type="button"
            class="badge badge-secondary badge-soft h-auto gap-1 px-2.5 py-1.5"
            aria-label="清除起始日期"
            @click="dateFrom = ''"
          >
            自 {{ dateFrom }}
            <i class="ri-close-line"></i>
          </button>

          <button
            v-if="dateTo"
            type="button"
            class="badge badge-secondary badge-soft h-auto gap-1 px-2.5 py-1.5"
            aria-label="清除截止日期"
            @click="dateTo = ''"
          >
            至 {{ dateTo }}
            <i class="ri-close-line"></i>
          </button>
        </div>
      </section>

      <!-- 结果信息 -->
      <div
        class="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-base-content/55"
      >
        <p>
          <template v-if="hasFilter">
            当前显示
            <strong class="font-semibold text-base-content">
              {{ filteredArticles.length }}
            </strong>
            篇文章
          </template>

          <template v-else> 浏览全部文章 </template>
        </p>

        <p v-if="debouncedKeyword.trim()">
          搜索：
          <span class="font-medium text-base-content">
            “{{ debouncedKeyword.trim() }}”
          </span>
        </p>
      </div>

      <!-- 文章列表 -->
      <div
        v-if="filteredArticles.length"
        class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6"
      >
        <article
          v-for="item in filteredArticles"
          :key="item.id"
          class="group card card-border min-w-0 cursor-pointer overflow-hidden bg-base-100 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
          tabindex="0"
          role="button"
          @click="$emit('select', item.id)"
          @keydown.enter="$emit('select', item.id)"
          @keydown.space.prevent="$emit('select', item.id)"
        >
          <!-- 封面 -->
          <div
            class="relative h-48 shrink-0 overflow-hidden bg-base-200 sm:h-52"
          >
            <div
              v-if="item.banner"
              class="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
              :style="{
                backgroundImage: `url(${resolveBannerUrl(item.banner)})`,
              }"
            />

            <div
              v-else
              class="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 transition-transform duration-500 group-hover:scale-105"
            />

            <template v-if="!item.banner">
              <div
                class="absolute -right-10 -top-14 size-40 rounded-full bg-primary/10 blur-2xl transition-transform duration-500 group-hover:scale-125"
              ></div>

              <div
                class="absolute -bottom-16 -left-10 size-44 rounded-full bg-accent/15 blur-2xl transition-transform duration-500 group-hover:scale-125"
              ></div>

              <i
                class="ri-article-line absolute right-5 top-4 text-7xl text-base-content/5 transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110"
              ></i>

              <div
                class="absolute inset-0 opacity-[0.04]"
                style="
                  background-image: radial-gradient(
                    currentColor 1px,
                    transparent 1px
                  );
                  background-size: 16px 16px;
                "
              ></div>
            </template>

            <div
              v-if="item.banner"
              class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5"
            ></div>

            <div
              class="absolute inset-x-0 bottom-0 p-4 sm:p-5"
              :class="item.banner ? 'text-white' : 'text-base-content'"
            >
              <div
                v-if="item.tags?.length"
                class="flex max-h-12 flex-wrap gap-1.5 overflow-hidden"
              >
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="badge badge-sm max-w-full"
                  :class="
                    item.banner
                      ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm'
                      : 'badge-primary badge-soft'
                  "
                >
                  <span class="truncate">{{ tag }}</span>
                </span>
              </div>

              <h2
                class="mt-3 line-clamp-2 text-xl leading-snug font-bold font-serif sm:text-2xl text-balance"
                :class="item.banner ? 'drop-shadow-sm' : ''"
              >
                {{ item.title }}
              </h2>
            </div>
          </div>

          <!-- 内容 -->
          <div class="card-body not-prose min-w-0 gap-0 p-5 sm:p-6">
            <p class="line-clamp-3 leading-relaxed text-base-content/65">
              {{ item.summary || "暂无文章摘要" }}
            </p>

            <div
              class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-sm text-base-content/50"
            >
              <time class="flex items-center gap-1.5">
                <i class="ri-calendar-line"></i>
                {{ useDateFormat(item.date, "YYYY/M/D") }}
              </time>

              <span class="flex items-center gap-1.5">
                <i class="ri-time-line"></i>
                {{ estimateReadingTime(item.length) }} 分钟
              </span>

              <span class="flex items-center gap-1.5">
                <i class="ri-file-text-line"></i>
                {{ item.length || 0 }} 字
              </span>

              <span
                class="ml-auto flex items-center gap-1 font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5"
              >
                阅读全文
                <i class="ri-arrow-right-line"></i>
              </span>
            </div>
          </div>
        </article>
      </div>

      <!-- 无匹配结果 -->
      <div
        v-else
        class="rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-20 text-center"
      >
        <i
          class="ri-search-eye-line mb-4 block text-5xl text-base-content/25"
        ></i>

        <h2 class="text-lg font-semibold">未找到匹配的文章</h2>

        <p class="mt-2 text-sm text-base-content/50">
          尝试修改关键词、标签或日期范围
        </p>

        <button
          type="button"
          class="btn btn-primary btn-soft mt-6"
          @click="resetFilter"
        >
          <i class="ri-refresh-line"></i>
          清除全部条件
        </button>
      </div>
    </template>

    <!-- 空状态 -->
    <div
      v-else
      class="my-24 rounded-box border border-dashed border-base-300 px-6 py-20 text-center"
    >
      <i class="ri-article-line mb-4 block text-5xl text-base-content/25"></i>
      <h2 class="text-lg font-semibold">暂无文章</h2>
      <p class="mt-2 text-sm text-base-content/50">文章发布后会显示在这里</p>
    </div>
  </main>

  <ToTop />
</template>

<script setup>
import { computed, ref } from "vue";
import { refDebounced, useDateFormat } from "@vueuse/core";

import ToTop from "@/components/base/ToTop.vue";
import Loading from "@/components/base/Loading.vue";

const props = defineProps({
  articles: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["select"]);

const keyword = ref("");
const selectedTags = ref([]);
const dateFrom = ref("");
const dateTo = ref("");
const sortType = ref("newest");
const showAdvancedSearch = ref(false);

const debouncedKeyword = refDebounced(keyword, 200);

const resolveBannerUrl = (banner) => {
  if (!banner) return "";
  return banner;
};

const estimateReadingTime = (length = 0) => {
  return Math.max(1, Math.ceil(Number(length || 0) / 300));
};

const normalizeTagForFilter = (tag) => {
  return (
    String(tag || "")
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean)[0] || ""
  );
};

const getAliasList = (aliases) => {
  if (Array.isArray(aliases)) {
    return aliases.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof aliases === "string") {
    return aliases
      .split(/[\n，,；;]/)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
};

/**
 * 统一搜索文本：
 * - 忽略大小写
 * - 合并连续空格
 */
const normalizeText = (value) => {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

// 所有标签及其文章数量
const tagCounts = computed(() => {
  const counts = new Map();

  for (const article of props.articles) {
    for (const tag of article.tags || []) {
      const normalizedTag = normalizeTagForFilter(tag);

      if (!normalizedTag) continue;

      counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
    }
  }

  return counts;
});

const allTags = computed(() => {
  return [...tagCounts.value.keys()].sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN"),
  );
});

const advancedFilterCount = computed(() => {
  return (
    selectedTags.value.length +
    Number(Boolean(dateFrom.value)) +
    Number(Boolean(dateTo.value))
  );
});

const hasFilter = computed(() => {
  return (
    normalizeText(debouncedKeyword.value) !== "" ||
    selectedTags.value.length > 0 ||
    dateFrom.value !== "" ||
    dateTo.value !== ""
  );
});

const removeTag = (tag) => {
  selectedTags.value = selectedTags.value.filter((item) => item !== tag);
};

const resetAdvancedFilter = () => {
  selectedTags.value = [];
  dateFrom.value = "";
  dateTo.value = "";
};

const resetFilter = () => {
  keyword.value = "";
  resetAdvancedFilter();
};

/**
 * 多关键词检索：
 * 输入“Vue Markdown”时，文章需要同时包含 Vue 和 Markdown。
 * 检索范围包含标题、摘要、标签与 aliases。
 */
const matchesKeyword = (article, searchText) => {
  if (!searchText) return true;

  const terms = searchText.split(" ").filter(Boolean);

  const searchableTags = (article.tags || []).map((tag) =>
    normalizeTagForFilter(tag),
  );

  const searchableAliases = getAliasList(article.aliases);

  const searchableText = normalizeText(
    [
      article.title,
      article.summary,
      ...searchableTags,
      ...searchableAliases,
    ].join(" "),
  );

  return terms.every((term) => searchableText.includes(term));
};

const matchesTags = (article, tags) => {
  if (!tags.length) return true;

  const articleTags = (article.tags || []).map((tag) =>
    normalizeTagForFilter(tag),
  );

  // AND 逻辑：文章必须包含所有已选标签
  return tags.every((tag) => articleTags.includes(tag));
};

const matchesDate = (article, from, to) => {
  if (!from && !to) return true;

  const articleDate = String(article.date || "").slice(0, 10);

  if (!articleDate) return false;
  if (from && articleDate < from) return false;
  if (to && articleDate > to) return false;

  return true;
};

const getTimestamp = (date) => {
  const timestamp = new Date(date || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const filteredArticles = computed(() => {
  const searchText = normalizeText(debouncedKeyword.value);
  const tags = selectedTags.value;
  const from = dateFrom.value;
  const to = dateTo.value;

  const result = props.articles.filter((article) => {
    return (
      matchesKeyword(article, searchText) &&
      matchesTags(article, tags) &&
      matchesDate(article, from, to)
    );
  });

  return [...result].sort((a, b) => {
    switch (sortType.value) {
      case "oldest":
        return getTimestamp(a.date) - getTimestamp(b.date);

      case "title":
        return String(a.title || "").localeCompare(
          String(b.title || ""),
          "zh-Hans-CN",
        );

      case "newest":
      default:
        return getTimestamp(b.date) - getTimestamp(a.date);
    }
  });
});
</script>
