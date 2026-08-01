<template>
  <button
    ref="triggerButton"
    type="button"
    class="btn btn-ghost max-md:btn-square"
    aria-label="打开全局内容搜索"
    aria-keyshortcuts="Control+K Meta+K"
    @click="openSearch"
  >
    <i class="ri-search-line text-lg" aria-hidden="true"></i>
    <span class="hidden xl:inline">搜索</span>
    <kbd class="kbd kbd-sm hidden xl:inline-flex"> {{ shortcutLabel }} K </kbd>
  </button>

  <Teleport to="body">
    <Transition name="global-search">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center bg-neutral/45 px-3 pt-[8vh] backdrop-blur-sm sm:px-6 sm:pt-[10vh]"
        role="presentation"
        @mousedown.self="closeSearch"
      >
        <section
          ref="dialogPanel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-search-title"
          class="flex max-h-[82vh] w-full max-w-3xl flex-col rounded-box border border-base-300 bg-base-100 shadow-2xl"
          @keydown="handleDialogKeydown"
        >
          <h2 id="global-search-title" class="sr-only">全局内容搜索</h2>

          <div class="border-base-300 pt-1 p-2 sm:pt-2 sm:p-4">
            <div ref="searchBox" class="relative">
              <div
                class="input input-lg flex h-auto min-h-12 w-full min-w-0 flex-wrap items-center gap-2 border-0 bg-transparent px-1 shadow-none focus-within:outline-0 sm:gap-3"
              >
                <i
                  class="ri-search-line shrink-0 text-xl text-base-content/45"
                  aria-hidden="true"
                ></i>

                <div
                  v-if="hasFilters"
                  class="flex max-w-full flex-wrap items-center gap-1.5"
                >
                  <button
                    v-for="type in selectedTypes"
                    :key="`type-${type}`"
                    type="button"
                    class="badge badge-info pl-2.5 pr-1.5"
                    :aria-label="`移除类型 ${getTypeLabel(type)}`"
                    @click="removeSelectedType(type)"
                  >
                    <span class="truncate">{{ getTypeLabel(type) }}</span>
                    <i class="ri-close-line shrink-0" aria-hidden="true"></i>
                  </button>

                  <button
                    v-for="tag in selectedTags"
                    :key="`tag-${tag}`"
                    type="button"
                    class="badge badge-primary badge-soft pl-2.5 pr-1.5"
                    :aria-label="`移除筛选 ${getSelectedTagLabel(tag)}`"
                    @click="removeSelectedTag(tag)"
                  >
                    <span class="truncate">{{ getSelectedTagLabel(tag) }}</span>
                    <i class="ri-close-line shrink-0" aria-hidden="true"></i>
                  </button>

                  <button
                    v-for="year in selectedYears"
                    :key="`year-${year}`"
                    type="button"
                    class="badge badge-secondary badge-soft pl-2.5 pr-1.5"
                    :aria-label="`移除年份 ${year}`"
                    @click="removeSelectedYear(year)"
                  >
                    {{ year }}
                    <i class="ri-close-line" aria-hidden="true"></i>
                  </button>
                </div>

                <label for="global-article-search" class="sr-only">
                  搜索正文，输入 @ 符号筛选内容类型，输入 # 号筛选内容分类，输入
                  / 符号筛选年份
                </label>
                <input
                  id="global-article-search"
                  ref="searchInput"
                  v-model="searchText"
                  type="search"
                  role="combobox"
                  class="min-w-32 flex-1 text-base sm:text-lg"
                  placeholder="全站内容搜索"
                  autocomplete="off"
                  spellcheck="false"
                  aria-autocomplete="list"
                  :aria-expanded="isFilterMenuOpen"
                  :aria-controls="
                    isFilterMenuOpen
                      ? 'global-filter-suggestions'
                      : 'global-search-results'
                  "
                  :aria-activedescendant="
                    isFilterMenuOpen &&
                    activeFilterIndex >= 0 &&
                    filteredFilterOptions.length
                      ? `global-filter-option-${activeFilterIndex}`
                      : activeIndex >= 0
                        ? `global-search-result-${activeIndex}`
                        : null
                  "
                  @input="handleSearchInput"
                  @focus="updateFilterQuery"
                  @click="updateFilterQuery"
                  @keydown.down="handleSearchArrow($event, 1)"
                  @keydown.up="handleSearchArrow($event, -1)"
                  @keydown.enter="handleSearchEnter"
                  @keydown.tab="handleSearchTab"
                  @keydown.backspace="handleSearchBackspace"
                  @keydown.esc="handleSearchEscape"
                  @compositionstart="isComposing = true"
                  @compositionend="handleCompositionEnd"
                />

                <button
                  v-if="searchText || hasFilters"
                  type="button"
                  class="btn btn-circle btn-ghost btn-sm shrink-0"
                  aria-label="清除全部搜索条件"
                  @click="resetSearch"
                >
                  <i class="ri-delete-bin-line" aria-hidden="true"></i>
                </button>

                <kbd class="kbd kbd-sm hidden sm:inline-flex">Esc</kbd>
              </div>

              <div
                v-if="isFilterMenuOpen"
                id="global-filter-suggestions"
                class="absolute inset-x-0 top-full z-40 flex max-h-[calc(82vh-6rem)] flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
                role="listbox"
                :aria-label="
                  activeFilterQuery.type === 'tag'
                    ? '标签筛选建议'
                    : activeFilterQuery.type === 'year'
                      ? '年份筛选建议'
                      : '内容类型筛选建议'
                "
              >
                <div
                  class="flex shrink-0 items-center justify-between gap-3 border-b border-base-300 bg-base-200/45 px-3 py-2 text-xs text-base-content/55"
                >
                  <span class="flex items-center gap-1.5">
                    <i
                      :class="
                        activeFilterQuery.type === 'tag'
                          ? 'ri-price-tag-3-line'
                          : activeFilterQuery.type === 'year'
                            ? 'ri-calendar-line'
                            : 'ri-layout-grid-line'
                      "
                      aria-hidden="true"
                    ></i>
                    {{
                      activeFilterQuery.type === "tag"
                        ? "选择内容分类"
                        : activeFilterQuery.type === "year"
                          ? "选择发布年份"
                          : "选择内容类型"
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
                  class="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-1.5"
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
                        {{ group.count }} 项
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
                          :id="`global-filter-option-${option.index}`"
                          type="button"
                          role="option"
                          :aria-label="
                            option.type === 'tag'
                              ? `${option.typeLabel} ${option.fullLabel}`
                              : option.type === 'year'
                                ? `年份 ${option.label}`
                                : `内容类型 ${option.label}`
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
                            {{ option.count }}
                            {{ option.type === "type" ? "项" : "篇" }}
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

            <p class="my-1 px-1 text-xs text-base-content/40">
              输入 <kbd class="kbd kbd-xs">@</kbd> 筛选类型，
              <kbd class="kbd kbd-xs">#</kbd> 筛选标签、小说卷或更新类型，
              <kbd class="kbd kbd-xs">/</kbd> 筛选年份，可组合多个条件。
            </p>
          </div>

          <div
            id="global-search-results"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <template v-if="hasSearchCriteria">
              <div
                v-if="isLoading"
                class="space-y-3 p-4 sm:p-5"
                aria-label="正在搜索"
              >
                <div
                  v-for="index in 4"
                  :key="index"
                  class="flex gap-3 rounded-box border border-base-300 p-4"
                >
                  <div class="skeleton mt-1 size-8 shrink-0 rounded-full"></div>
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="skeleton h-5 w-2/5"></div>
                    <div class="skeleton h-4 w-full"></div>
                  </div>
                </div>
              </div>

              <div
                v-else-if="errorMessage"
                class="px-6 py-14 text-center"
                role="alert"
              >
                <i
                  class="ri-error-warning-line mb-3 block text-4xl text-error/65"
                  aria-hidden="true"
                ></i>
                <p class="font-medium">搜索索引暂时不可用</p>
                <p class="mt-1 text-sm text-base-content/50">
                  {{ errorMessage }}
                </p>
                <button
                  type="button"
                  class="btn btn-outline btn-sm mt-5"
                  @click="initializeSearch(true)"
                >
                  重试
                </button>
              </div>

              <ul
                v-else-if="results.length"
                class="menu w-full gap-1 p-2 sm:p-3"
                role="listbox"
                aria-label="全局搜索结果"
              >
                <li v-for="(result, index) in results" :key="result.url">
                  <button
                    :id="`global-search-result-${index}`"
                    type="button"
                    role="option"
                    :aria-selected="activeIndex === index"
                    class="group block w-full rounded-box px-3 py-3 text-left sm:px-4"
                    :class="{ 'bg-primary/10': activeIndex === index }"
                    @mouseenter="activeIndex = index"
                    @focus="activeIndex = index"
                    @click="openResult(result)"
                  >
                    <span class="flex min-w-0 items-start gap-3">
                      <span
                        class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                      >
                        <i :class="result.typeIcon" aria-hidden="true"></i>
                      </span>

                      <span class="min-w-0 flex-1">
                        <span
                          class="block text-balance font-serif text-base font-bold leading-snug sm:text-lg"
                        >
                          <template
                            v-for="(part, partIndex) in highlightParts(
                              result.title,
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

                        <span
                          v-if="shouldShowResultSummary(result)"
                          class="mt-1 line-clamp-2 text-pretty text-sm leading-relaxed text-base-content/60"
                        >
                          <template
                            v-for="(part, partIndex) in highlightParts(
                              getResultSummary(result),
                            )"
                            :key="`${part.text}-${partIndex}`"
                          >
                            <mark
                              v-if="part.match"
                              class="rounded-sm bg-primary/60 px-0.5 text-primary-content"
                            >
                              {{ part.text }}
                            </mark>
                            <template v-else>{{ part.text }}</template>
                          </template>
                        </span>

                        <span
                          class="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/45"
                        >
                          <time
                            v-if="
                              result.date &&
                              !result.metadata?.length &&
                              !shouldMoveChangelogDateToSummary(result)
                            "
                          >
                            {{ result.date }}
                          </time>
                          <span
                            v-for="tag in result.tags"
                            :key="`${result.url}-${tag}`"
                            class="badge badge-ghost badge-xs truncate"
                          >
                            #<template
                              v-for="(part, partIndex) in highlightParts(
                                formatTag(tag),
                              )"
                              :key="`${part.text}-${partIndex}`"
                            >
                              <mark
                                v-if="part.match"
                                class="rounded-sm bg-primary/60 px-0.5 text-primary-content"
                              >
                                {{ part.text }}
                              </mark>
                              <template v-else>{{ part.text }}</template>
                            </template>
                          </span>
                          <span
                            v-for="meta in result.metadata"
                            :key="`${result.url}-${meta.key}`"
                            class="inline-flex min-w-0 max-w-full items-center gap-1"
                            :title="`${meta.label}：${meta.value}`"
                          >
                            <i
                              class="shrink-0"
                              :class="meta.icon"
                              aria-hidden="true"
                            ></i>
                            <span class="shrink-0">{{ meta.label }}</span>
                            <span class="max-w-48 truncate">
                              {{ meta.value }}
                            </span>
                          </span>
                        </span>
                      </span>

                      <i
                        class="ri-arrow-right-line mt-2 shrink-0 text-base-content/25 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </button>
                </li>
              </ul>

              <div v-else class="px-6 py-16 text-center" role="status">
                <i
                  class="ri-search-eye-line mb-3 block text-4xl text-base-content/20"
                  aria-hidden="true"
                ></i>
                <p class="font-medium">没有找到匹配的内容</p>
                <p class="mt-1 text-sm text-base-content/45">
                  试试更短的关键词，或清除部分筛选条件
                </p>
              </div>
            </template>
          </div>

          <footer
            v-if="hasSearchCriteria"
            class="flex items-center justify-between gap-3 border-t border-base-300 bg-base-200/45 px-4 py-2 text-xs text-base-content/45"
          >
            <span>{{ results.length }} 项结果</span>
            <span class="hidden items-center gap-3 sm:flex">
              <span
                ><kbd class="kbd kbd-xs">↑</kbd>
                <kbd class="kbd kbd-xs">↓</kbd> 选择</span
              >
              <span><kbd class="kbd kbd-xs">Enter</kbd> 打开</span>
            </span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  formatArticleTag,
  getArticleSearchScore,
  normalizeArticleTag,
  splitArticleHighlight,
} from "@/composables/useArticleFilter";
import {
  CONTENT_TYPES,
  createSearchExcerpt,
  fetchGlobalSearchIndex,
} from "@/services/search-content";

const route = useRoute();
const router = useRouter();

const triggerButton = ref(null);
const dialogPanel = ref(null);
const searchBox = ref(null);
const searchInput = ref(null);
const isOpen = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const keyword = ref("");
const searchText = ref("");
const selectedTypes = ref([]);
const selectedTags = ref([]);
const selectedYears = ref([]);
const availableTypes = ref(
  CONTENT_TYPES.map((type) => ({ ...type, count: 0 })),
);
const availableTags = ref([]);
const availableYears = ref([]);
const availableTagGroupCounts = ref(new Map());
const results = ref([]);
const activeIndex = ref(-1);
const activeFilterQuery = ref(null);
const activeFilterIndex = ref(0);
const isComposing = ref(false);

let searchEntries = [];
let pagefindEngine = null;
let engineType = "";
let searchTimer;
let urlSyncTimer;
let searchRequestId = 0;
let syncingFromRoute = false;
let previousBodyOverflow = "";

const shortcutLabel = ref("Ctrl");

const hasFilters = computed(() => {
  return (
    selectedTypes.value.length > 0 ||
    selectedTags.value.length > 0 ||
    selectedYears.value.length > 0
  );
});

const hasSearchCriteria = computed(() => {
  return Boolean(keyword.value.trim()) || hasFilters.value;
});

const formatTag = formatArticleTag;
const getTypeLabel = (type) => {
  return (
    CONTENT_TYPES.find((option) => option.value === type)?.label ||
    String(type || "")
  );
};
const getAvailableTag = (value) => {
  return availableTags.value.find((tag) => tag.value === value);
};
const serializeSelectedTags = () => {
  return [
    ...new Set(
      selectedTags.value
        .map((value) => {
          const tag = getAvailableTag(value);
          return tag?.rawValue || String(value).replace(/^[^:]+:/, "");
        })
        .filter(Boolean),
    ),
  ];
};
const getSelectedTagLabel = (value) => {
  const tag = getAvailableTag(value);

  if (!tag) return formatTag(String(value).replace(/^[^:]+:/, ""));

  const shouldShowType =
    selectedTypes.value.length !== 1 ||
    selectedTypes.value[0] !== tag.contentType;

  return shouldShowType
    ? `${getTypeLabel(tag.contentType)} · ${tag.label}`
    : tag.label;
};
const highlightParts = (value) => {
  return splitArticleHighlight(value, keyword.value);
};
const isTagOnlySearch = computed(() => {
  return (
    !keyword.value.trim() &&
    selectedTags.value.length > 0 &&
    selectedYears.value.length === 0
  );
});
const shouldMoveChangelogDateToSummary = (result) => {
  return (
    result?.type === "changelog" &&
    Boolean(result.date) &&
    isTagOnlySearch.value
  );
};
const getResultSummary = (result) => {
  return shouldMoveChangelogDateToSummary(result)
    ? result.date
    : result?.summary || "";
};
const shouldShowResultSummary = (result) => {
  if (shouldMoveChangelogDateToSummary(result)) return true;
  if (!result?.summary) return false;
  if (keyword.value.trim()) return true;
  return !["novel", "changelog"].includes(result.type);
};

const isFilterMenuOpen = computed(() => activeFilterQuery.value !== null);

const filteredFilterOptions = computed(() => {
  const filterQuery = activeFilterQuery.value;

  if (!filterQuery) return [];

  const normalizedQuery = filterQuery.query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim();

  if (filterQuery.type === "type") {
    const selected = new Set(selectedTypes.value);

    return availableTypes.value
      .filter((type) => type.count > 0 && !selected.has(type.value))
      .filter(
        (type) =>
          !normalizedQuery ||
          type.label
            .normalize("NFKC")
            .toLocaleLowerCase()
            .includes(normalizedQuery) ||
          type.value.includes(normalizedQuery),
      )
      .map((type, index) => ({
        type: "type",
        value: type.value,
        label: type.label,
        fullLabel: type.label,
        groupKey: "",
        groupLabel: "",
        prefix: "@",
        count: type.count,
        index,
      }));
  }

  if (filterQuery.type === "tag") {
    const selected = new Set(selectedTags.value);
    const selectedTypeSet = new Set(selectedTypes.value);
    const hasSingleType = selectedTypeSet.size === 1;

    return availableTags.value
      .filter((tag) => !selected.has(tag.value))
      .filter(
        (tag) =>
          selectedTypeSet.size === 0 || selectedTypeSet.has(tag.contentType),
      )
      .filter((tag) => {
        if (!normalizedQuery) return true;

        return `${tag.label} ${tag.rawValue}`
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .map((tag, index) => {
        const typeLabel = getTypeLabel(tag.contentType);
        const tagSegments = tag.rawValue.split("/").filter(Boolean);
        const optionLabel =
          tag.contentType === "blog"
            ? tagSegments.at(-1) || tag.label
            : tag.label;
        const groupLabelByType = {
          blog: "博客标签",
          novel: "小说卷",
          changelog: "更新类型",
          licenses: "许可证类型",
        };
        const nestedGroupLabel =
          tag.contentType === "blog" && tag.groupPath
            ? formatTag(tag.groupPath)
            : groupLabelByType[tag.contentType];
        const groupLabel =
          hasSingleType || !nestedGroupLabel
            ? nestedGroupLabel
            : `${typeLabel} · ${nestedGroupLabel}`;

        return {
          type: "tag",
          value: tag.value,
          label: optionLabel,
          fullLabel: tag.label,
          contentType: tag.contentType,
          typeLabel,
          groupKey: tag.groupKey,
          groupLabel,
          prefix: "#",
          count: tag.count,
          index,
        };
      });
  }

  const selected = new Set(selectedYears.value);

  return availableYears.value
    .filter((year) => !selected.has(year.value))
    .filter((year) => !normalizedQuery || year.value.includes(normalizedQuery))
    .map((year, index) => ({
      type: "year",
      value: year.value,
      label: year.value,
      fullLabel: year.value,
      groupKey: "",
      groupLabel: "",
      prefix: "/",
      count: year.count,
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
          ? availableTagGroupCounts.value.get(option.groupKey) || 0
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

const queryList = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(values.map((item) => String(item).trim()).filter(Boolean)),
  ];
};

const queryText = (value) => {
  return Array.isArray(value)
    ? String(value[0] || "").trim()
    : String(value || "").trim();
};

const sameList = (left, right) => {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
};

const buildTagGroupCounts = (entries) => {
  const counts = new Map();

  for (const entry of entries) {
    const entryGroups = new Set();

    for (const tag of Array.isArray(entry.filterTags) ? entry.filterTags : []) {
      entryGroups.add(`${tag.contentType}:__root`);

      if (tag.contentType !== "blog") continue;

      const segments = normalizeArticleTag(tag.value)
        .split("/")
        .filter(Boolean);

      for (let depth = 1; depth < segments.length; depth += 1) {
        entryGroups.add(`blog:${segments.slice(0, depth).join("/")}`);
      }
    }

    for (const groupKey of entryGroups) {
      counts.set(groupKey, (counts.get(groupKey) || 0) + 1);
    }
  }

  return counts;
};

const reconcileSelectedTags = () => {
  if (!availableTags.value.length || !selectedTags.value.length) return;

  const validTags = new Set(availableTags.value.map((tag) => tag.value));
  const selectedTypeSet = new Set(selectedTypes.value);
  const nextTags = selectedTags.value
    .flatMap((value) => {
      if (validTags.has(value)) return [value];

      const candidates = availableTags.value.filter(
        (tag) =>
          tag.rawValue === value &&
          (selectedTypeSet.size === 0 || selectedTypeSet.has(tag.contentType)),
      );

      if (candidates.length === 1) return [candidates[0].value];
      if (selectedTypeSet.size > 0) {
        return candidates.map((candidate) => candidate.value);
      }
      return [];
    })
    .filter(Boolean);
  const uniqueTags = [...new Set(nextTags)];

  if (!sameList(selectedTags.value, uniqueTags)) {
    selectedTags.value = uniqueTags;
  }
};

const sortSearchResults = (items) => {
  const query = keyword.value;
  const isNovelOnly =
    selectedTypes.value.length === 1 && selectedTypes.value[0] === "novel";

  return items
    .map((item, index) => {
      const hasPagefindScore = Number.isFinite(item.pagefindScore);
      const rawScore = hasPagefindScore
        ? item.pagefindScore
        : getArticleSearchScore(item, query);

      return {
        ...item,
        summary: hasPagefindScore
          ? item.summary
          : createSearchExcerpt(item.content, query, item.summary),
        originalIndex: index,
        searchScore: Number.isFinite(rawScore) ? rawScore : 0,
      };
    })
    .sort((a, b) => {
      if (!query.trim() && isNovelOnly) {
        return a.catalogOrder - b.catalogOrder;
      }

      return (
        b.searchScore - a.searchScore ||
        (isNovelOnly ? a.catalogOrder - b.catalogOrder : 0) ||
        String(b.date).localeCompare(String(a.date)) ||
        a.originalIndex - b.originalIndex
      );
    });
};

const parsePagefindMetadata = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(String(value || ""));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const normalizePagefindExcerpt = (value) =>
  String(value || "")
    .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, "$1")
    .replace(/\s+([，。！？；：、）】》])/gu, "$1")
    .replace(/([（【《])\s+/gu, "$1");

const loadPagefindEngine = async () => {
  if (typeof window === "undefined") return null;

  const baseUrl = String(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const module = await import(
    /* @vite-ignore */ `${baseUrl}pagefind/pagefind.js`
  );

  await module.options({ excerptLength: 42 });
  await module.init();
  return module;
};

const mapPagefindResult = async (result) => {
  const data = await result.data();
  const meta = data?.meta || {};
  const type = String(meta.type || data?.filters?.type?.[0] || "blog");
  const typeDefinition =
    CONTENT_TYPES.find((definition) => definition.value === type) ||
    CONTENT_TYPES[0];
  const catalogOrder = Number(meta.catalogOrder);

  const excerpt = normalizePagefindExcerpt(data?.plain_excerpt);
  const summary = /[\p{Script=Han}]/u.test(keyword.value)
    ? String(meta.summary || excerpt)
    : excerpt || String(meta.summary || "");

  return {
    url: String(data?.url || result.url || "/"),
    title: String(meta.title || "未命名内容"),
    summary,
    content: excerpt,
    tags: parsePagefindMetadata(meta.tags),
    filterTags: [],
    metadata: parsePagefindMetadata(meta.metadata),
    metadataText: "",
    date: String(meta.date || ""),
    year: String(meta.year || ""),
    catalogOrder: Number.isFinite(catalogOrder) ? catalogOrder : 0,
    type,
    typeLabel: String(meta.typeLabel || typeDefinition.label),
    typeIcon: String(meta.typeIcon || typeDefinition.icon),
    pagefindScore: Number.isFinite(result.score) ? result.score : 0,
  };
};

const searchPagefindIndex = async () => {
  const query = keyword.value.trim();

  // 没有关键词时只是浏览筛选结果，不需要启动全文检索。
  if (!query) return searchIndex();

  const filters = {};
  if (selectedTypes.value.length) filters.type = [...selectedTypes.value];
  if (selectedTags.value.length) filters.tag = [...selectedTags.value];
  if (selectedYears.value.length) filters.year = [...selectedYears.value];

  const encodeCjkToken = (value) =>
    `z${Array.from(value, (character) =>
      character.codePointAt(0).toString(16).padStart(6, "0"),
    ).join("")}`;
  const segmentedQuery = query
    .replace(/[\p{Script=Han}]+/gu, (run) => {
      const characters = Array.from(run);
      if (characters.length === 1) return encodeCjkToken(run);

      return Array.from({ length: characters.length - 1 }, (_, index) =>
        encodeCjkToken(characters.slice(index, index + 2).join("")),
      ).join(" ");
    })
    .replace(/\s+/g, " ")
    .trim();
  const response = await pagefindEngine.search(segmentedQuery, { filters });
  if (!response?.results?.length) return [];

  const mappedResults = await Promise.all(
    response.results.map(mapPagefindResult),
  );
  const seenReaderPages = new Set();

  return mappedResults.filter((result) => {
    if (!["blog", "novel"].includes(result.type)) return true;

    const resolved = router.resolve(result.url || "/");
    const readerKey = `${result.type}:${resolved.path}`;
    if (seenReaderPages.has(readerKey)) return false;

    seenReaderPages.add(readerKey);
    return true;
  });
};

const loadSearchEngine = async () => {
  const [entriesResult, pagefindResult] = await Promise.allSettled([
    fetchGlobalSearchIndex(),
    loadPagefindEngine(),
  ]);

  searchEntries =
    entriesResult.status === "fulfilled" ? entriesResult.value : [];
  pagefindEngine =
    pagefindResult.status === "fulfilled" ? pagefindResult.value : null;

  if (!searchEntries.length && !pagefindEngine) {
    throw entriesResult.reason || pagefindResult.reason || new Error("没有可用的搜索索引");
  }

  const tagDefinitions = new Map();
  const tagCounts = new Map();
  const yearCounts = new Map();
  const typeCounts = new Map();

  for (const entry of searchEntries) {
    typeCounts.set(entry.type, (typeCounts.get(entry.type) || 0) + 1);
    const seenTags = new Set();

    for (const tag of Array.isArray(entry.filterTags) ? entry.filterTags : []) {
      if (!tag?.key || seenTags.has(tag.key)) continue;

      seenTags.add(tag.key);
      tagDefinitions.set(tag.key, tag);
      tagCounts.set(tag.key, (tagCounts.get(tag.key) || 0) + 1);
    }

    const year = String(entry.year || "").trim();
    if (year) yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
  }

  availableTypes.value = CONTENT_TYPES.map((type) => ({
    ...type,
    count: typeCounts.get(type.value) || 0,
  }));
  availableTags.value = [...tagDefinitions.entries()]
    .map(([value, tag]) => ({
      value,
      rawValue: tag.value,
      label: tag.label,
      contentType: tag.contentType,
      groupPath: tag.groupPath,
      groupKey: `${tag.contentType}:${tag.groupPath || "__root"}`,
      order: Number.isFinite(tag.order) ? tag.order : Number.MAX_SAFE_INTEGER,
      count: tagCounts.get(value) || 0,
    }))
    .sort(
      (a, b) =>
        CONTENT_TYPES.findIndex((type) => type.value === a.contentType) -
          CONTENT_TYPES.findIndex((type) => type.value === b.contentType) ||
        (a.contentType === "novel" ? a.order - b.order : 0) ||
        a.label.localeCompare(b.label, "zh-Hans-CN"),
    );
  availableYears.value = [...yearCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.value.localeCompare(a.value));
  availableTagGroupCounts.value = buildTagGroupCounts(searchEntries);
  reconcileSelectedTags();
  engineType = pagefindEngine ? "pagefind" : "local";
};

const initializeSearch = async (force = false) => {
  if (engineType && !force) return;

  errorMessage.value = "";
  engineType = "";

  try {
    await loadSearchEngine();
  } catch (error) {
    console.error("初始化全局搜索失败:", error);
    errorMessage.value = "请刷新页面后再试。";
    return;
  }

  await runSearch();
};

const searchIndex = () => {
  const typeSet = new Set(selectedTypes.value);
  const tagSet = new Set(selectedTags.value);
  const yearSet = new Set(selectedYears.value);
  const query = keyword.value.trim();

  return searchEntries.flatMap((entry) => {
    const matchesType = typeSet.size === 0 || typeSet.has(entry.type);
    const entryTagSet = new Set(
      (Array.isArray(entry.filterTags) ? entry.filterTags : []).map(
        (tag) => tag.key,
      ),
    );
    const matchesTag =
      tagSet.size === 0 || [...tagSet].some((tag) => entryTagSet.has(tag));
    const matchesYear = yearSet.size === 0 || yearSet.has(entry.year);

    if (!matchesType || !matchesTag || !matchesYear) return [];
    if (!query) return [entry];

    const blockMatches = (Array.isArray(entry.searchBlocks)
      ? entry.searchBlocks
      : []
    )
      .map((block, index) => {
        const candidate = {
          ...entry,
          ...block,
          metadataText: entry.metadataText,
        };

        return {
          candidate,
          index,
          score: getArticleSearchScore(candidate, query),
        };
      })
      .filter((match) => match.score !== Number.NEGATIVE_INFINITY)
      .sort((a, b) => b.score - a.score || a.index - b.index);

    if (blockMatches.length) return [blockMatches[0].candidate];

    const score = getArticleSearchScore(entry, query);
    return score === Number.NEGATIVE_INFINITY ? [] : [entry];
  });
};

async function runSearch() {
  if (!isOpen.value || !engineType) return;

  const requestId = ++searchRequestId;

  if (!hasSearchCriteria.value) {
    isLoading.value = false;
    errorMessage.value = "";
    results.value = [];
    activeIndex.value = -1;
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const matches =
      engineType === "pagefind" ? await searchPagefindIndex() : searchIndex();

    if (requestId !== searchRequestId) return;

    results.value = sortSearchResults(matches);
    activeIndex.value = results.value.length ? 0 : -1;
  } catch (error) {
    if (requestId !== searchRequestId) return;

    console.error("全局搜索失败:", error);
    errorMessage.value = "无法读取搜索结果，请稍后重试。";
    results.value = [];
    activeIndex.value = -1;
  } finally {
    if (requestId === searchRequestId) isLoading.value = false;
  }
}

const scheduleSearch = () => {
  if (!isOpen.value || !engineType) return;

  window.clearTimeout(searchTimer);

  if (!hasSearchCriteria.value) {
    runSearch();
    return;
  }

  searchTimer = window.setTimeout(runSearch, 140);
};

const syncUrlState = () => {
  if (syncingFromRoute || typeof window === "undefined") return;

  window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(() => {
    const query = Object.fromEntries(
      Object.entries(route.query).filter(
        ([key]) => !["q", "type", "tag", "year"].includes(key),
      ),
    );
    const serializedTags = serializeSelectedTags();

    if (selectedTypes.value.length) query.type = [...selectedTypes.value];
    if (serializedTags.length) query.tag = serializedTags;
    if (selectedYears.value.length) query.year = [...selectedYears.value];
    if (keyword.value.trim()) query.q = keyword.value.trim();

    router.replace({ query });
  }, 120);
};

const applyRouteState = () => {
  const nextKeyword = queryText(route.query.q);
  const validTypeSet = new Set(CONTENT_TYPES.map((type) => type.value));
  const nextTypes = queryList(route.query.type).filter((type) =>
    validTypeSet.has(type),
  );
  const nextTags = queryList(route.query.tag);
  const nextYears = queryList(route.query.year);
  const currentPlainText = getPlainSearchText(
    searchText.value,
    activeFilterQuery.value,
  );

  syncingFromRoute = true;

  if (keyword.value !== nextKeyword) keyword.value = nextKeyword;
  if (currentPlainText !== nextKeyword) {
    searchText.value = nextKeyword;
    closeFilterMenu();
  }
  if (!sameList(selectedTypes.value, nextTypes)) {
    selectedTypes.value = nextTypes;
  }
  if (!sameList(selectedTags.value, nextTags)) selectedTags.value = nextTags;
  if (!sameList(selectedYears.value, nextYears)) {
    selectedYears.value = nextYears;
  }

  reconcileSelectedTags();
  syncingFromRoute = false;
};

const getFilterQuery = (value, caretPosition = String(value || "").length) => {
  const text = String(value || "");
  const caret = Math.max(
    0,
    Math.min(caretPosition ?? text.length, text.length),
  );
  const beforeCaret = text.slice(0, caret);
  const match = beforeCaret.match(/(^|\s)([@#\/])([^\s@#\/]*)$/u);

  if (!match) return null;

  const leadingWhitespace = match[1];
  const trigger = match[2];

  return {
    type: trigger === "@" ? "type" : trigger === "#" ? "tag" : "year",
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

const selectFilterOption = async (option) => {
  const filterQuery = activeFilterQuery.value;

  if (!filterQuery) return;

  if (option.type === "type" && !selectedTypes.value.includes(option.value)) {
    selectedTypes.value = [...selectedTypes.value, option.value];
  }

  if (option.type === "tag" && !selectedTags.value.includes(option.value)) {
    selectedTags.value = [...selectedTags.value, option.value];

    if (
      selectedTypes.value.length === 0 &&
      option.contentType &&
      !selectedTypes.value.includes(option.contentType)
    ) {
      selectedTypes.value = [option.contentType];
    }
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

const handleSearchArrow = (event, direction) => {
  event.preventDefault();

  if (isFilterMenuOpen.value) {
    moveActiveFilter(direction);
  } else {
    moveActiveResult(direction);
  }
};

const handleSearchEnter = (event) => {
  event.preventDefault();

  if (isFilterMenuOpen.value) {
    selectActiveFilter();
  } else {
    openActiveResult();
  }
};

const handleSearchTab = (event) => {
  if (!isFilterMenuOpen.value || !selectActiveFilter()) return;

  event.preventDefault();
  event.stopPropagation();
};

const handleSearchBackspace = (event) => {
  if (isComposing.value) return;

  const target = event.currentTarget;
  const caretAtStart = target.selectionStart === 0 && target.selectionEnd === 0;

  if (!caretAtStart) return;

  const lastYear = selectedYears.value.at(-1);
  const lastTag = selectedTags.value.at(-1);
  const lastType = selectedTypes.value.at(-1);

  if (lastYear) {
    removeSelectedYear(lastYear);
  } else if (lastTag) {
    removeSelectedTag(lastTag);
  } else if (lastType) {
    removeSelectedType(lastType);
  } else {
    return;
  }

  event.preventDefault();
  closeFilterMenu();
};

const handleSearchEscape = (event) => {
  if (!isFilterMenuOpen.value) return;

  event.preventDefault();
  event.stopPropagation();
  closeFilterMenu();
};

const setBodyScrollLocked = (locked) => {
  if (typeof document === "undefined") return;

  if (locked) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = previousBodyOverflow;
  }
};

const openSearch = async () => {
  if (isOpen.value) return;

  isOpen.value = true;
  setBodyScrollLocked(true);

  const query = { ...route.query, search: "1" };
  router.replace({ query });

  await nextTick();
  searchInput.value?.focus();
  searchInput.value?.select();
  await initializeSearch();
};

const closeSearch = ({ restoreFocus = true } = {}) => {
  if (!isOpen.value) return;

  isOpen.value = false;
  closeFilterMenu();
  setBodyScrollLocked(false);

  const query = { ...route.query };
  delete query.search;
  router.replace({ query });

  if (restoreFocus) {
    nextTick(() => triggerButton.value?.focus());
  }
};

const removeSelectedTag = (tag) => {
  selectedTags.value = selectedTags.value.filter((item) => item !== tag);
};

const removeSelectedType = (type) => {
  selectedTypes.value = selectedTypes.value.filter((item) => item !== type);
  selectedTags.value = selectedTags.value.filter(
    (tag) => getAvailableTag(tag)?.contentType !== type,
  );
};

const removeSelectedYear = (year) => {
  selectedYears.value = selectedYears.value.filter((item) => item !== year);
};

const clearFilters = () => {
  selectedTypes.value = [];
  selectedTags.value = [];
  selectedYears.value = [];
};

const resetSearch = () => {
  keyword.value = "";
  searchText.value = "";
  clearFilters();
  closeFilterMenu();
  nextTick(() => searchInput.value?.focus());
};

const moveActiveResult = (direction) => {
  if (!results.value.length) return;

  const nextIndex =
    (activeIndex.value + direction + results.value.length) %
    results.value.length;
  activeIndex.value = nextIndex;
};

const openActiveResult = () => {
  const result = results.value[activeIndex.value];
  if (result) openResult(result);
};

const openResult = (result) => {
  const destination = router.resolve(String(result.url || "/"));
  const query = { ...destination.query };
  const serializedTags = serializeSelectedTags();

  if (selectedTypes.value.length) query.type = [...selectedTypes.value];
  if (serializedTags.length) query.tag = serializedTags;
  if (selectedYears.value.length) query.year = [...selectedYears.value];
  if (keyword.value.trim()) query.q = keyword.value.trim();

  isOpen.value = false;
  closeFilterMenu();
  setBodyScrollLocked(false);
  router
    .push({
      path: destination.path || "/",
      query,
      hash: destination.hash,
    })
    .then(() => {
      document.dispatchEvent(new CustomEvent("global-search-result-opened"));
    });
};

const handleGlobalKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    isOpen.value ? searchInput.value?.focus() : openSearch();
  }
};

const handleDialogKeydown = (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeSearch();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = [
    ...dialogPanel.value.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const handleOutsidePointerDown = (event) => {
  if (!searchBox.value?.contains(event.target)) closeFilterMenu();
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

watch(
  () => [
    route.query.search,
    route.query.q,
    route.query.type,
    route.query.tag,
    route.query.year,
  ],
  async () => {
    applyRouteState();

    const shouldOpen = route.query.search === "1";
    if (shouldOpen && !isOpen.value) {
      isOpen.value = true;
      setBodyScrollLocked(true);
      await nextTick();
      searchInput.value?.focus();
      await initializeSearch();
    } else if (!shouldOpen && isOpen.value) {
      isOpen.value = false;
      closeFilterMenu();
      setBodyScrollLocked(false);
    }
  },
);

watch(
  [keyword, selectedTypes, selectedTags, selectedYears],
  () => {
    syncUrlState();
    scheduleSearch();
  },
  { deep: true },
);

onMounted(async () => {
  shortcutLabel.value = /Mac|iPhone|iPad/i.test(navigator.platform)
    ? "⌘"
    : "Ctrl";
  applyRouteState();
  window.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("pointerdown", handleOutsidePointerDown);

  if (route.query.search === "1") {
    isOpen.value = true;
    setBodyScrollLocked(true);
    await nextTick();
    searchInput.value?.focus();
    await initializeSearch();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  document.removeEventListener("pointerdown", handleOutsidePointerDown);
  window.clearTimeout(searchTimer);
  window.clearTimeout(urlSyncTimer);
  setBodyScrollLocked(false);
});
</script>

<style scoped>
.global-search-enter-active,
.global-search-leave-active {
  transition:
    opacity 180ms ease,
    backdrop-filter 180ms ease;
}

.global-search-enter-active > section,
.global-search-leave-active > section {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.global-search-enter-from,
.global-search-leave-to {
  opacity: 0;
}

.global-search-enter-from > section,
.global-search-leave-to > section {
  opacity: 0;
  transform: translateY(-0.75rem) scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .global-search-enter-active,
  .global-search-leave-active,
  .global-search-enter-active > section,
  .global-search-leave-active > section {
    transition: none;
  }
}
</style>
