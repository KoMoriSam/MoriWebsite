<template>
  <ContentPage eyebrow="Posts &amp; Articles" title="文章列表">
    <template #badges>
      <span class="badge badge-dash badge-lg font-semibold">
        共 {{ articles.length }} 篇文章
      </span>
      <client-only>
        <span v-if="hasFilter" class="badge badge-primary badge-soft badge-lg">
          找到 {{ filteredArticles.length }} 篇
        </span>
      </client-only>
    </template>

    <template v-if="loading || articles.length">
      <!-- 检索区域 -->
      <section class="my-6" aria-label="文章检索">
        <div ref="searchBox" class="relative min-w-0">
          <div
            class="input input-bordered flex h-auto min-h-12 w-full min-w-0 flex-wrap items-center gap-2 py-2 transition-shadow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-base-content/20"
          >
            <label for="article-search" class="sr-only">搜索文章</label>
            <i
              class="ri-search-line shrink-0 text-base-content/45"
              aria-hidden="true"
            ></i>

            <div
              v-if="advancedFilterCount"
              class="flex max-w-full flex-wrap items-center gap-1.5"
            >
              <button
                v-for="tag in selectedTags"
                :key="`tag-${tag}`"
                type="button"
                class="badge badge-primary badge-soft h-7 max-w-full gap-1 pl-2.5 pr-1.5"
                :aria-label="`移除标签 ${tag}`"
                @click="removeTag(tag)"
              >
                <span class="truncate">{{ formatTag(tag) }}</span>
                <i class="ri-close-line shrink-0" aria-hidden="true"></i>
              </button>

              <button
                v-for="year in selectedYears"
                :key="`year-${year}`"
                type="button"
                class="badge badge-secondary badge-soft h-7 gap-1 pl-2.5 pr-1.5"
                :aria-label="`移除年份 ${year}`"
                @click="removeYear(year)"
              >
                {{ year }}
                <i class="ri-close-line" aria-hidden="true"></i>
              </button>
            </div>

            <input
              id="article-search"
              ref="searchInput"
              v-model="searchText"
              type="search"
              role="combobox"
              class="min-w-32 flex-1"
              placeholder="搜索文章"
              autocomplete="off"
              spellcheck="false"
              aria-autocomplete="list"
              :aria-expanded="isFilterMenuOpen"
              :aria-controls="
                isFilterMenuOpen
                  ? 'article-filter-suggestions'
                  : 'article-results'
              "
              :aria-activedescendant="
                activeFilterIndex >= 0 && filteredFilterOptions.length
                  ? `article-filter-option-${activeFilterIndex}`
                  : null
              "
              @input="handleSearchInput"
              @focus="updateFilterQuery"
              @click="updateFilterQuery"
              @keydown.down="handleFilterArrow($event, 1)"
              @keydown.up="handleFilterArrow($event, -1)"
              @keydown.enter="handleFilterEnter"
              @keydown.tab="handleFilterTab"
              @keydown.backspace="handleSearchBackspace"
              @keydown.esc.prevent="handleSearchEscape"
              @compositionstart="isComposing = true"
              @compositionend="handleCompositionEnd"
            />

            <button
              v-if="advancedFilterCount"
              type="button"
              class="btn btn-circle btn-ghost btn-xs shrink-0"
              aria-label="清除全部搜索条件"
              @click="resetFilter"
            >
              <i class="ri-delete-bin-line" aria-hidden="true"></i>
            </button>
          </div>

          <div
            v-if="isFilterMenuOpen"
            id="article-filter-suggestions"
            class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
            role="listbox"
            :aria-label="
              activeFilterQuery.type === 'tag' ? '标签筛选建议' : '年份筛选建议'
            "
          >
            <div
              class="flex items-center justify-between gap-3 border-b border-base-300 bg-base-200/45 px-3 py-2 text-xs text-base-content/55"
            >
              <span class="flex items-center gap-1.5">
                <i
                  :class="
                    activeFilterQuery.type === 'tag'
                      ? 'ri-price-tag-3-line'
                      : 'ri-calendar-line'
                  "
                  aria-hidden="true"
                ></i>
                {{
                  activeFilterQuery.type === "tag" ? "选择标签" : "选择发布年份"
                }}
              </span>
              <span class="hidden sm:inline">
                <kbd class="kbd kbd-xs">↑</kbd
                ><kbd class="kbd kbd-xs">↓</kbd> 选择 ·
                <kbd class="kbd kbd-xs">Enter</kbd> 确认 ·
                <kbd class="kbd kbd-xs">Esc</kbd> 关闭
              </span>
            </div>

            <ul
              v-if="filteredFilterOptions.length"
              class="max-h-72 space-y-1 overflow-y-auto overscroll-contain p-1.5"
            >
              <li
                v-for="group in filterOptionGroups"
                :key="group.key"
                role="presentation"
              >
                <div
                  v-if="group.label"
                  class="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold text-base-content/45"
                >
                  <i class="ri-folder-3-line" aria-hidden="true"></i>
                  <span class="min-w-0 flex-1 truncate">
                    {{ group.label }}
                  </span>
                  <span class="shrink-0 font-normal text-base-content/40">
                    {{ group.count }} 篇
                  </span>
                </div>

                <ul
                  class="space-y-0.5"
                  :role="group.label ? 'group' : 'presentation'"
                  :aria-label="group.label || null"
                >
                  <li
                    v-for="option in group.options"
                    :key="`${option.type}-${option.value}`"
                    role="presentation"
                  >
                    <button
                      :id="`article-filter-option-${option.index}`"
                      type="button"
                      role="option"
                      :aria-label="
                        option.type === 'tag'
                          ? `标签 ${option.fullLabel}`
                          : `年份 ${option.label}`
                      "
                      :aria-selected="activeFilterIndex === option.index"
                      class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                      :class="[
                        activeFilterIndex === option.index
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-base-200',
                        group.label ? 'pl-5' : '',
                      ]"
                      @mouseenter="activeFilterIndex = option.index"
                      @mousedown.prevent="selectFilterOption(option)"
                    >
                      <span
                        class="flex size-7 shrink-0 items-center justify-center text-sm text-base-content/40"
                        :class="
                          group.label
                            ? ''
                            : 'rounded-md bg-base-200 font-mono text-base-content/55'
                        "
                        aria-hidden="true"
                      >
                        <i
                          v-if="group.label"
                          class="ri-corner-down-right-line"
                        ></i>
                        <template v-else>{{ option.prefix }}</template>
                      </span>
                      <span class="min-w-0 flex-1 truncate font-medium">
                        {{ option.label }}
                      </span>
                      <span class="text-xs text-base-content/40">
                        {{ option.count }} 篇
                      </span>
                    </button>
                  </li>
                </ul>
              </li>
            </ul>

            <p
              v-else
              class="px-4 py-8 text-center text-sm text-base-content/50"
            >
              {{
                activeFilterQuery.query
                  ? `没有匹配“${activeFilterQuery.query}”的选项`
                  : "没有更多可选条件"
              }}
            </p>
          </div>
        </div>

        <p class="mt-2 px-1 text-xs text-base-content/45">
          输入 <kbd class="kbd kbd-xs">#</kbd> 筛选标签，输入
          <kbd class="kbd kbd-xs">/</kbd> 筛选年份，可组合多个条件。
        </p>
      </section>

      <!-- 结果信息 -->
      <div
        class="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-base-content/55"
        role="status"
        aria-live="polite"
        aria-atomic="true"
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

        <p v-if="keyword.trim()">
          搜索：
          <span class="font-medium text-base-content">
            “{{ keyword.trim() }}”
          </span>
        </p>
      </div>

      <div id="article-results" :aria-busy="loading">
        <!-- 加载状态仅替换文章结果区域 -->
        <section
          v-if="loading"
          class="min-w-0"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="文章列表加载中"
        >
          <span class="sr-only">文章列表加载中</span>

          <div
            class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6"
            aria-hidden="true"
          >
            <article
              v-for="index in 4"
              :key="index"
              class="card card-border min-w-0 overflow-hidden bg-base-100"
            >
              <div class="skeleton h-48 w-full rounded-none sm:h-52"></div>

              <div class="card-body min-w-0 gap-0 p-5 sm:p-6">
                <!-- <div class="flex gap-2">
                  <div class="skeleton h-5 w-16"></div>
                  <div class="skeleton h-5 w-20"></div>
                </div>

                <div class="skeleton mt-4 h-7 w-4/5"></div> -->
                <div class="skeleton mt-2 h-4 w-full"></div>
                <div class="skeleton mt-2 h-4 w-11/12"></div>
                <div class="skeleton mt-2 h-4 w-3/5"></div>

                <div class="mt-6 flex items-center gap-3">
                  <div class="skeleton h-4 w-20"></div>
                  <div class="skeleton h-4 w-16"></div>
                  <div class="skeleton ml-auto h-4 w-20"></div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 文章列表 -->
        <div
          v-else-if="filteredArticles.length"
          class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:gap-6"
        >
          <RouterLink
            v-for="item in filteredArticles"
            :key="getArticleKey(item)"
            :to="getArticleRoute(item)"
            class="group card card-border min-w-0 cursor-pointer overflow-hidden bg-base-100 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <!-- 封面 -->
            <div
              class="relative h-48 shrink-0 overflow-hidden bg-base-200 sm:h-52"
              :aria-busy="hasBanner(item) && !isBannerLoaded(item)"
            >
              <!-- 有封面图片 -->
              <template v-if="hasBanner(item)">
                <!-- daisyUI 骨架背景始终放在图片下方 -->
                <div
                  class="skeleton absolute inset-0 rounded-none"
                  aria-hidden="true"
                ></div>

                <!-- 使用 img 才能准确监听加载状态 -->
                <img
                  v-fade-in
                  :key="getBannerKey(item)"
                  :ref="(element) => setBannerImageRef(item, element)"
                  :src="resolveBannerUrl(item.banner)"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  class="absolute inset-0 size-full object-cover object-center transition-[opacity,transform,scale] duration-500 ease-out motion-reduce:transition-none group-hover:scale-105"
                  @load="handleBannerLoad(item)"
                  @error="handleBannerError(item)"
                />

                <!-- 图片加载完成后再显示遮罩 -->
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5 transition-opacity duration-500"
                  :class="isBannerLoaded(item) ? 'opacity-100' : 'opacity-0'"
                ></div>
              </template>

              <!-- 无封面或封面加载失败 -->
              <template v-else>
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

              <!-- 文章信息 -->
              <div
                class="absolute inset-x-0 bottom-0 z-10 p-4 transition-colors duration-300 sm:p-5"
                :class="
                  hasBanner(item) && isBannerLoaded(item)
                    ? 'text-white'
                    : 'text-base-content'
                "
              >
                <div
                  v-if="item.tags?.length"
                  class="flex max-h-12 flex-wrap gap-1.5 overflow-hidden"
                >
                  <span
                    v-for="tag in item.tags"
                    :key="tag"
                    class="badge badge-sm max-w-full transition-colors duration-300"
                    :class="
                      hasBanner(item) && isBannerLoaded(item)
                        ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm'
                        : 'badge-primary badge-soft'
                    "
                  >
                    <span class="truncate">
                      <template
                        v-for="(part, partIndex) in highlightParts(
                          formatTag(tag),
                        )"
                        :key="`${part.text}-${partIndex}`"
                      >
                        <mark
                          v-if="part.match"
                          class="rounded-sm bg-primary/75 px-0.5 text-primary-content"
                        >
                          {{ part.text }}
                        </mark>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </span>
                  </span>
                </div>

                <h2
                  class="mt-3 line-clamp-2 text-balance font-serif text-xl leading-snug font-bold sm:text-2xl"
                  :class="
                    hasBanner(item) && isBannerLoaded(item)
                      ? 'drop-shadow-sm'
                      : ''
                  "
                >
                  <template
                    v-for="(part, partIndex) in highlightParts(item.title)"
                    :key="`${part.text}-${partIndex}`"
                  >
                    <mark
                      v-if="part.match"
                      class="rounded-sm bg-primary/80 px-0.5 text-primary-content"
                    >
                      {{ part.text }}
                    </mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </h2>
              </div>
            </div>

            <!-- 内容 -->
            <div class="card-body not-prose min-w-0 gap-0 p-5 sm:p-6">
              <p class="line-clamp-3 leading-relaxed text-base-content/65">
                <template
                  v-for="(part, partIndex) in highlightParts(
                    getResultSummary(item),
                  )"
                  :key="`${part.text}-${partIndex}`"
                >
                  <mark
                    v-if="part.match"
                    class="rounded-sm bg-primary/65 px-0.5 text-primary-content"
                  >
                    {{ part.text }}
                  </mark>
                  <template v-else>{{ part.text }}</template>
                </template>
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
                  v-for="meta in getAdditionalMetadata(item)"
                  :key="`${item.id}-${meta.key}`"
                  class="flex min-w-0 max-w-full items-center gap-1.5"
                  :title="`${meta.label}：${meta.value}`"
                >
                  <i class="shrink-0" :class="meta.icon"></i>
                  <span class="shrink-0">{{ meta.label }}</span>
                  <span class="max-w-48 truncate">{{ meta.value }}</span>
                </span>

                <span
                  class="ml-auto flex items-center gap-1 font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  阅读全文
                  <i class="ri-arrow-right-line"></i>
                </span>
              </div>
            </div>
          </RouterLink>
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
            尝试修改关键词、标签或年份
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
  </ContentPage>

  <FootBar />
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  toRef,
  watch,
} from "vue";
import { useDateFormat } from "@vueuse/core";

import FootBar from "@/components/layout/FootBar.vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import {
  formatArticleTag,
  normalizeArticleTag,
  splitArticleHighlight,
  useArticleFilter,
} from "@/composables/useArticleFilter";
import { createSearchExcerpt } from "@/services/search-content";

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

const {
  keyword,
  selectedTags,
  selectedYears,
  tagCounts,
  allTags,
  yearCounts,
  allYears,
  advancedFilterCount,
  hasFilter,
  filteredArticles,
  removeTag,
  removeYear,
  clearKeyword,
  resetFilter: clearFilter,
} = useArticleFilter(toRef(props, "articles"));

const formatTag = formatArticleTag;
const highlightParts = (value) => {
  return splitArticleHighlight(value, keyword.value);
};
const getResultSummary = (article) => {
  return (
    createSearchExcerpt(article?.content, keyword.value, article?.summary) ||
    "暂无文章摘要"
  );
};
const getAdditionalMetadata = (article) => {
  return (Array.isArray(article?.metadata) ? article.metadata : []).filter(
    (item) => !["date", "length"].includes(item.key),
  );
};

const searchBox = ref(null);
const searchInput = ref(null);
const searchText = ref(keyword.value);
const activeFilterQuery = ref(null);
const activeFilterIndex = ref(0);
const isComposing = ref(false);

const isFilterMenuOpen = computed(() => activeFilterQuery.value !== null);

const tagGroupCounts = computed(() => {
  const counts = new Map();
  const articles = Array.isArray(props.articles) ? props.articles : [];

  for (const article of articles) {
    const tags = Array.isArray(article?.tags)
      ? article.tags
      : article?.tags
        ? [article.tags]
        : [];
    const articleGroups = new Set();

    for (const tag of tags) {
      const segments = normalizeArticleTag(tag).split("/").filter(Boolean);

      for (let depth = 1; depth < segments.length; depth += 1) {
        articleGroups.add(segments.slice(0, depth).join("/"));
      }
    }

    for (const groupKey of articleGroups) {
      counts.set(groupKey, (counts.get(groupKey) || 0) + 1);
    }
  }

  return counts;
});

const filteredFilterOptions = computed(() => {
  const filterQuery = activeFilterQuery.value;

  if (!filterQuery) return [];

  const normalizedQuery = filterQuery.query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim();

  if (filterQuery.type === "tag") {
    const selected = new Set(selectedTags.value);

    return allTags.value
      .filter((tag) => !selected.has(tag))
      .filter((tag) => {
        if (!normalizedQuery) return true;

        return formatTag(tag)
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .map((tag, index) => {
        const segments = tag
          .split("/")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const groupKey =
          segments.length > 1 ? segments.slice(0, -1).join("/") : "";
        const fullLabel = formatTag(tag);

        return {
          type: "tag",
          value: tag,
          label: segments.at(-1) || fullLabel,
          fullLabel,
          groupKey,
          groupLabel: groupKey ? formatTag(groupKey) : "",
          prefix: "#",
          count: tagCounts.value.get(tag) || 0,
          index,
        };
      });
  }

  const selected = new Set(selectedYears.value);

  return allYears.value
    .filter((year) => !selected.has(year))
    .filter((year) => !normalizedQuery || year.includes(normalizedQuery))
    .map((year, index) => ({
      type: "year",
      value: year,
      label: year,
      fullLabel: year,
      groupKey: "",
      groupLabel: "",
      prefix: "/",
      count: yearCounts.value.get(year) || 0,
      index,
    }));
});

const filterOptionGroups = computed(() => {
  const groups = [];
  const groupMap = new Map();

  for (const option of filteredFilterOptions.value) {
    const key = `${option.type}:${option.groupKey}`;
    let group = groupMap.get(key);

    if (!group) {
      group = {
        key,
        label: option.groupLabel,
        count: option.groupKey
          ? tagGroupCounts.value.get(option.groupKey) || 0
          : 0,
        options: [],
      };
      groupMap.set(key, group);
      groups.push(group);
    }

    group.options.push(option);
  }

  return groups;
});

const getFilterQuery = (value, caretPosition = String(value || "").length) => {
  const text = String(value || "");
  const caret = Math.max(
    0,
    Math.min(caretPosition ?? text.length, text.length),
  );
  const beforeCaret = text.slice(0, caret);
  const match = beforeCaret.match(/(^|\s)([#\/])([^\s#\/]*)$/u);

  if (!match) return null;

  const leadingWhitespace = match[1];
  const trigger = match[2];

  return {
    type: trigger === "#" ? "tag" : "year",
    trigger,
    query: match[3],
    start: (match.index ?? 0) + leadingWhitespace.length,
    end: caret,
  };
};

const getPlainSearchText = (value, filterQuery) => {
  const text = String(value || "");

  if (!filterQuery) return text.trim().replace(/\s+/g, " ");

  return `${text.slice(0, filterQuery.start)}${text.slice(filterQuery.end)}`
    .trim()
    .replace(/\s+/g, " ");
};

const syncKeywordFromSearch = () => {
  const nextKeyword = getPlainSearchText(
    searchText.value,
    activeFilterQuery.value,
  );

  if (keyword.value !== nextKeyword) keyword.value = nextKeyword;
};

const updateFilterQuery = (target = searchInput.value) => {
  const caretPosition = target?.selectionStart ?? searchText.value.length;
  const nextQuery = getFilterQuery(searchText.value, caretPosition);
  const queryChanged =
    nextQuery?.type !== activeFilterQuery.value?.type ||
    nextQuery?.query !== activeFilterQuery.value?.query ||
    nextQuery?.start !== activeFilterQuery.value?.start;

  activeFilterQuery.value = nextQuery;

  if (queryChanged) activeFilterIndex.value = 0;
};

const handleSearchInput = (event) => {
  if (isComposing.value) return;

  updateFilterQuery(event.currentTarget);
  syncKeywordFromSearch();
};

const handleCompositionEnd = (event) => {
  isComposing.value = false;
  updateFilterQuery(event.currentTarget);
  syncKeywordFromSearch();
};

const closeFilterMenu = () => {
  activeFilterQuery.value = null;
  activeFilterIndex.value = 0;
};

const moveActiveFilter = (direction) => {
  const optionCount = filteredFilterOptions.value.length;

  if (!isFilterMenuOpen.value || !optionCount) return;

  activeFilterIndex.value =
    (activeFilterIndex.value + direction + optionCount) % optionCount;
};

const handleFilterArrow = (event, direction) => {
  if (!isFilterMenuOpen.value) return;

  event.preventDefault();
  moveActiveFilter(direction);
};

const selectFilterOption = async (option) => {
  const filterQuery = activeFilterQuery.value;

  if (!filterQuery) return;

  if (option.type === "tag" && !selectedTags.value.includes(option.value)) {
    selectedTags.value = [...selectedTags.value, option.value];
  }

  if (option.type === "year" && !selectedYears.value.includes(option.value)) {
    selectedYears.value = [...selectedYears.value, option.value];
  }

  const textBeforeQuery = searchText.value.slice(0, filterQuery.start);
  const textAfterQuery = searchText.value.slice(filterQuery.end);
  searchText.value = `${textBeforeQuery}${textAfterQuery}`.replace(
    /\s{2,}/g,
    " ",
  );
  const nextCaretPosition = Math.min(
    filterQuery.start,
    searchText.value.length,
  );

  closeFilterMenu();
  syncKeywordFromSearch();

  await nextTick();
  searchInput.value?.focus();
  searchInput.value?.setSelectionRange(nextCaretPosition, nextCaretPosition);
};

const selectActiveFilter = () => {
  const option = filteredFilterOptions.value[activeFilterIndex.value];

  if (!option) return false;

  selectFilterOption(option);
  return true;
};

const handleFilterEnter = (event) => {
  if (isFilterMenuOpen.value && selectActiveFilter()) {
    event.preventDefault();
  }
};

const handleFilterTab = (event) => {
  if (isFilterMenuOpen.value && selectActiveFilter()) {
    event.preventDefault();
  }
};

const handleSearchBackspace = (event) => {
  if (isComposing.value) return;

  const target = event.currentTarget;
  const caretAtStart = target.selectionStart === 0 && target.selectionEnd === 0;

  if (!caretAtStart) return;

  const lastYear = selectedYears.value.at(-1);
  const lastTag = selectedTags.value.at(-1);

  if (lastYear) {
    removeYear(lastYear);
  } else if (lastTag) {
    removeTag(lastTag);
  } else {
    return;
  }

  event.preventDefault();
  closeFilterMenu();
};

const handleSearchEscape = () => {
  if (isFilterMenuOpen.value) {
    closeFilterMenu();
    return;
  }

  if (searchText.value) {
    searchText.value = "";
    clearKeyword();
  }
};

watch(filteredFilterOptions, (options) => {
  if (!options.length) {
    activeFilterIndex.value = -1;
    return;
  }

  if (
    activeFilterIndex.value < 0 ||
    activeFilterIndex.value >= options.length
  ) {
    activeFilterIndex.value = 0;
  }
});

watch(keyword, (nextKeyword) => {
  const currentPlainText = getPlainSearchText(
    searchText.value,
    activeFilterQuery.value,
  );

  if (currentPlainText !== nextKeyword) {
    searchText.value = nextKeyword;
    closeFilterMenu();
  }
});

const handleOutsidePointerDown = (event) => {
  if (!searchBox.value?.contains(event.target)) closeFilterMenu();
};

onMounted(() => {
  document.addEventListener("pointerdown", handleOutsidePointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointerDown);
});

const resolveBannerUrl = (banner) => {
  if (!banner) return "";
  return banner;
};

const loadedBanners = reactive(new Set());
const failedBanners = reactive(new Set());
const bannerImages = new Map();

function getBannerKey(item) {
  // URL 变化时必须使用新的加载状态，不能沿用旧地址的失败记录。
  return String(item.banner ?? item.id ?? item.slug ?? item.path ?? "");
}

function hasBanner(item) {
  if (!item.banner) return false;

  return !failedBanners.has(getBannerKey(item));
}

function isBannerLoaded(item) {
  return loadedBanners.has(getBannerKey(item));
}

function handleBannerLoad(item) {
  const key = getBannerKey(item);

  failedBanners.delete(key);
  loadedBanners.add(key);
}

function handleBannerError(item) {
  const key = getBannerKey(item);

  loadedBanners.delete(key);
  failedBanners.add(key);
}

function syncBannerImageState(item, image) {
  if (!image?.complete) return;

  if (image.naturalWidth > 0) {
    handleBannerLoad(item);
  } else {
    handleBannerError(item);
  }
}

function setBannerImageRef(item, element) {
  const key = getBannerKey(item);

  if (!element) {
    bannerImages.delete(key);
    return;
  }

  bannerImages.set(key, element);

  // SSG 页面 hydration 前图片可能已经完成加载，此时不会再次触发 load。
  syncBannerImageState(item, element);
}

const estimateReadingTime = (length = 0) => {
  return Math.max(1, Math.ceil(Number(length || 0) / 300));
};

const resetFilter = () => {
  clearFilter();
  searchText.value = "";
  closeFilterMenu();
};

const getArticleKey = (article) => {
  return String(
    article.id ?? article.slug ?? article.path ?? article.title ?? "",
  );
};

const getArticleRoute = (article) => {
  const generatedPath = String(article?.routePath || "").trim();

  if (generatedPath) return generatedPath;

  const articleId = String(article?.id || "").trim();
  return articleId ? `/blog/${encodeURIComponent(articleId)}` : "/blog";
};
</script>
