<template>
  <ContentPage eyebrow="Writing & Notes" :title="translate('blog.list.title')">
    <template #meta>
      <span class="inline-flex items-center gap-1">
        <i class="ri-stack-line"></i>
        {{
          translate(
            "common.counts.articles",
            { count: articles.length },
            articles.length,
          )
        }}
      </span>
      <client-only>
        <span
          v-if="analyticsAvailable && articleReadsStatus !== 'error'"
          class="inline-flex items-center gap-1"
        >
          <i class="ri-eye-line" aria-hidden="true"></i>
          <template v-if="Number.isFinite(articleTotalReads)">
            {{
              translate(
                "common.counts.reads",
                { count: formatReadCount(articleTotalReads) },
                articleTotalReads,
              )
            }}
          </template>
          <span
            v-else
            class="loading loading-dots loading-xs"
            :aria-label="translate('blog.list.loadingReads')"
          ></span>
        </span>
      </client-only>
      <client-only>
        <span
          v-if="commentCountsAvailable && articleCommentsStatus !== 'error'"
          class="inline-flex items-center gap-1"
        >
          <i class="ri-chat-3-line" aria-hidden="true"></i>
          <template v-if="Number.isFinite(articleTotalComments)">
            {{
              translate(
                "common.counts.comments",
                { count: formatReadCount(articleTotalComments) },
                articleTotalComments,
              )
            }}
          </template>
          <span
            v-else
            class="loading loading-dots loading-xs"
            :aria-label="translate('blog.list.loadingComments')"
          ></span>
        </span>
      </client-only>
    </template>

    <template v-if="loading || articles.length">
      <!-- 检索区域 -->
      <section class="my-6" :aria-label="translate('blog.list.searchLabel')">
        <div ref="searchBox" class="relative min-w-0">
          <div class="flex gap-2">
            <div
              class="input input-bordered flex h-auto min-h-12 w-full min-w-0 flex-wrap items-center gap-2 py-2 transition-shadow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-base-content/20"
            >
              <label for="article-search" class="sr-only">{{
                translate("blog.list.searchPlaceholder")
              }}</label>
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
                  :aria-label="translate('blog.list.removeTag', { p0: tag })"
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
                  :aria-label="
                    translate('common.search.removeYear', { p0: year })
                  "
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
                :placeholder="translate('blog.list.searchPlaceholder')"
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
                :aria-label="translate('common.search.clearFilters')"
                @click="resetFilter"
              >
                <i class="ri-delete-bin-line" aria-hidden="true"></i>
              </button>
            </div>
            <div
              class="max-sm:tooltip tooltip-end"
              :data-tip="translate('home.rss')"
            >
              <a
                id="rss-feed"
                class="btn btn-primary btn-soft shrink-0 h-auto min-h-12"
                href="/rss.xml"
                type="application/rss+xml"
              >
                <i class="ri-rss-fill" aria-hidden="true"></i>
                <span class="hidden sm:block whitespace-nowrap">{{
                  translate("home.rss")
                }}</span>
              </a>
            </div>
          </div>
          <div
            v-if="isFilterMenuOpen"
            id="article-filter-suggestions"
            class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
            role="listbox"
            :aria-label="
              activeFilterQuery.type === 'tag'
                ? translate('common.search.tagSuggestions')
                : translate('common.search.yearSuggestions')
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
                  activeFilterQuery.type === "tag"
                    ? translate("blog.list.chooseTags")
                    : translate("common.search.chooseYear")
                }}
              </span>
              <span class="hidden sm:inline">
                <kbd class="kbd kbd-xs">↑</kbd><kbd class="kbd kbd-xs">↓</kbd>
                {{ translate("common.search.selectHint") }}
                <kbd class="kbd kbd-xs">Enter</kbd>
                {{ translate("common.search.confirmHint") }}
                <kbd class="kbd kbd-xs">Esc</kbd>
                {{ translate("common.modal.close") }}
              </span>
            </div>

            <ScrollableContainer v-if="filteredFilterOptions.length">
              <ul
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
                      {{
                        translate(
                          "common.counts.articles",
                          { count: group.count },
                          group.count,
                        )
                      }}
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
                            ? translate('blog.list.tag', {
                                p0: option.fullLabel,
                              })
                            : translate('common.search.year', {
                                p0: option.label,
                              })
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
                          {{
                            translate(
                              "common.counts.articles",
                              { count: option.count },
                              option.count,
                            )
                          }}
                        </span>
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            </ScrollableContainer>

            <p
              v-else
              class="px-4 py-8 text-center text-sm text-base-content/50"
            >
              {{
                activeFilterQuery.query
                  ? translate("common.search.noOptions", {
                      p0: activeFilterQuery.query,
                    })
                  : translate("common.search.noFilters")
              }}
            </p>
          </div>
        </div>

        <p class="mt-2 px-1 text-xs text-base-content/45">
          {{ translate("common.search.enter") }} <kbd class="kbd kbd-xs">#</kbd>
          {{ translate("blog.list.tagHint") }}
          <kbd class="kbd kbd-xs">/</kbd>
          {{ translate("common.search.yearHint") }}
        </p>
      </section>

      <!-- 结果信息 -->
      <div
        class="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-base-content/70"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <!-- 左侧：一句话概括全部关键信息 -->
        <p class="flex flex-wrap items-center gap-x-1 gap-y-0">
          <I18nT
            :keypath="
              hasFilter ? 'blog.list.filteredSummary' : 'blog.list.summary'
            "
            :plural="filteredArticles.length"
            tag="span"
            scope="global"
          >
            <template #count
              ><strong class="font-semibold text-base-content">{{
                formatNumber(filteredArticles.length)
              }}</strong></template
            >
            <template #start
              ><span class="text-base-content/50">{{
                formatNumber(pageStart)
              }}</span></template
            >
            <template #end
              ><span class="text-base-content/50">{{
                formatNumber(pageEnd)
              }}</span></template
            >
          </I18nT>
          <I18nT
            v-if="keyword.trim()"
            keypath="blog.list.keywordSummary"
            tag="span"
            scope="global"
            class="ml-2"
          >
            <template #keyword
              ><span class="badge badge-primary badge-soft badge-xs">{{
                keyword.trim()
              }}</span></template
            >
          </I18nT>
        </p>

        <p class="text-xs text-base-content/50">
          <template v-if="filteredArticles.length">
            {{
              translate("common.pagination.position", {
                p0: formatNumber(currentPage),
                p1: formatNumber(totalPages),
              })
            }}
          </template>
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
          :aria-label="translate('blog.list.loading')"
        >
          <span class="sr-only">{{ translate("blog.list.loading") }}</span>

          <div
            class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6"
            aria-hidden="true"
          >
            <article
              v-for="index in BLOG_PAGE_SIZE"
              :key="index"
              class="catalog-compact-preview card card-border relative min-w-0 overflow-hidden bg-base-100 max-md:min-h-24 max-md:pl-(--preview-width)"
            >
              <div
                class="skeleton rounded-none max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:w-(--preview-width) md:h-52 md:w-full"
              ></div>

              <div class="card-body min-w-0 gap-0 p-3 md:p-6">
                <div class="skeleton mt-2 h-4 w-full"></div>
                <div class="skeleton mt-2 h-4 w-11/12"></div>
                <div class="skeleton mt-2 h-4 w-3/5"></div>

                <div class="mt-3 flex flex-wrap items-center gap-3 sm:mt-6">
                  <div class="skeleton h-4 w-20"></div>
                  <div class="skeleton h-4 w-16"></div>
                  <div class="skeleton ml-auto h-4 w-20"></div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 文章列表 -->
        <template v-else-if="filteredArticles.length">
          <div
            class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            <CatalogCard
              v-for="item in paginatedArticles"
              :key="getArticleKey(item)"
              class="md:[&>.card-body]:flex-1"
              :to="getArticleRoute(item)"
              :title="item.title"
              :cover="item.banner || ''"
              :action="translate('blog.list.readMore')"
              action-class="max-md:[&>span]:sr-only"
              cover-class="h-52 min-h-52 flex-none"
              compact-on-mobile
            >
              <template v-if="item.tags?.length" #tags="{ coverLoaded }">
                <CatalogBadge
                  v-for="tag in item.tags"
                  :key="tag"
                  :overlay="coverLoaded"
                >
                  <template
                    v-for="(part, partIndex) in highlightParts(formatTag(tag))"
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
                </CatalogBadge>
              </template>

              <template #title>
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
              </template>

              <template #description>
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
              </template>

              <template #meta>
                <time
                  class="flex min-w-0 items-center gap-1 md:gap-1.5"
                  :title="formatLocalizedDate(item.date)"
                >
                  <i
                    class="ri-calendar-line hidden md:inline-block"
                    aria-hidden="true"
                  ></i>
                  <span class="whitespace-nowrap md:hidden">{{
                    formatLocalizedDate(item.date, { dateStyle: "short" })
                  }}</span>
                  <span class="hidden md:inline">{{
                    formatLocalizedDate(item.date)
                  }}</span>
                </time>

                <span
                  class="flex shrink-0 items-center gap-1 whitespace-nowrap md:gap-1.5"
                >
                  <i
                    class="ri-t-box-line hidden md:inline-block"
                    aria-hidden="true"
                  ></i>
                  <span aria-hidden="true" class="md:hidden">{{
                    translate(
                      "common.counts.characters",
                      { count: formatCompactCount(item.length || 0) },
                      item.length || 0,
                    )
                  }}</span>
                  <span class="max-md:sr-only">{{
                    translate(
                      "common.counts.characters",
                      { count: formatNumber(item.length || 0) },
                      item.length || 0,
                    )
                  }}</span>
                </span>

                <span
                  class="flex shrink-0 items-center gap-1 whitespace-nowrap md:gap-1.5"
                >
                  <i
                    class="ri-time-line hidden md:inline-block"
                    aria-hidden="true"
                  ></i>
                  <span aria-hidden="true" class="md:hidden">{{
                    formatCompactReadingTime(estimateReadingTime(item.length))
                  }}</span>
                  <span class="max-md:sr-only">{{
                    translate(
                      "common.counts.minutes",
                      { count: estimateReadingTime(item.length) },
                      estimateReadingTime(item.length),
                    )
                  }}</span>
                </span>

                <client-only>
                  <span
                    v-if="
                      analyticsAvailable &&
                      getArticleReadStatus(item) !== 'error'
                    "
                    class="flex min-w-0 items-center gap-1 md:gap-1.5"
                  >
                    <i
                      class="ri-eye-line hidden md:inline-block"
                      aria-hidden="true"
                    ></i>
                    <template v-if="Number.isFinite(getArticleReads(item))">
                      <span
                        aria-hidden="true"
                        class="whitespace-nowrap md:hidden"
                        >{{
                          translate(
                            "common.counts.compactReads",
                            {
                              count: formatCompactCount(getArticleReads(item)),
                            },
                            getArticleReads(item),
                          )
                        }}</span
                      >
                      <span class="max-md:sr-only">{{
                        translate(
                          "common.counts.reads",
                          { count: formatReadCount(getArticleReads(item)) },
                          getArticleReads(item),
                        )
                      }}</span>
                    </template>
                    <span
                      v-else
                      class="loading loading-dots loading-xs max-md:hidden"
                      :aria-label="
                        translate('reader.chapters.loadingReads', {
                          p0: item.title,
                        })
                      "
                    ></span>
                  </span>
                </client-only>

                <client-only>
                  <span
                    v-if="
                      commentCountsAvailable &&
                      getArticleCommentStatus(item) !== 'error'
                    "
                    class="flex min-w-0 items-center gap-1 md:gap-1.5"
                  >
                    <i
                      class="ri-chat-3-line hidden md:inline-block"
                      aria-hidden="true"
                    ></i>
                    <template v-if="Number.isFinite(getArticleComments(item))">
                      <span
                        aria-hidden="true"
                        class="whitespace-nowrap md:hidden"
                        >{{
                          translate(
                            "common.counts.compactComments",
                            {
                              count: formatCompactCount(
                                getArticleComments(item),
                              ),
                            },
                            getArticleComments(item),
                          )
                        }}</span
                      >
                      <span class="max-md:sr-only">{{
                        translate(
                          "common.counts.comments",
                          { count: formatReadCount(getArticleComments(item)) },
                          getArticleComments(item),
                        )
                      }}</span>
                    </template>
                    <span
                      v-else
                      class="loading loading-dots loading-xs max-md:hidden"
                      :aria-label="
                        translate('reader.chapters.loadingComments', {
                          p0: item.title,
                        })
                      "
                    ></span>
                  </span>
                </client-only>

                <span
                  v-for="meta in getAdditionalMetadata(item)"
                  :key="`${item.id}-${meta.key}`"
                  class="hidden min-w-0 max-w-full items-center gap-1.5 md:flex"
                  :title="`${meta.label}：${meta.value}`"
                >
                  <i class="shrink-0" :class="meta.icon"></i>
                  <span class="shrink-0">{{ meta.label }}</span>
                  <span class="max-w-48 truncate">{{ meta.value }}</span>
                </span>
              </template>
            </CatalogCard>
          </div>

          <Pagination
            v-if="totalPages > 1"
            :aria-label="translate('blog.list.pagination')"
            :current-page="currentPage"
            :total-pages="totalPages"
            :get-page-route="getPageRoute"
            @change="handlePageChange"
          />
        </template>

        <!-- 无匹配结果 -->
        <div
          v-else
          class="rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-20 text-center"
        >
          <i
            class="ri-search-eye-line mb-4 block text-5xl text-base-content/25"
          ></i>

          <h2 class="text-lg font-semibold">
            {{ translate("blog.list.noMatches") }}
          </h2>

          <p class="mt-2 text-sm text-base-content/50">
            {{ translate("blog.list.noMatchesHint") }}
          </p>

          <button
            type="button"
            class="btn btn-primary btn-soft mt-6"
            @click="resetFilter"
          >
            <i class="ri-refresh-line"></i>
            {{ translate("blog.list.clearFilters") }}
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
      <h2 class="text-lg font-semibold">
        {{ translate("blog.list.empty") }}
      </h2>
      <p class="mt-2 text-sm text-base-content/50">
        {{ translate("blog.list.emptyHint") }}
      </p>
    </div>
  </ContentPage>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import CatalogBadge from "@/components/interaction/navigation/CatalogBadge.vue";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";
import { getNavbarScrollOffset } from "@/utils/layout/navbar";
import { getArticlePath } from "@/utils/blog/article-versions";
import { useLocale } from "@/i18n";
const {
  t: translate,
  locale: uiLocale,
  number: formatNumber,
  date: formatLocalizedDate,
} = useLocale();

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import { Translation as I18nT } from "vue-i18n";

import ContentPage from "@/components/layout/ContentPage.vue";
import Pagination from "@/components/interaction/navigation/Pagination.vue";
import { BLOG_PAGE_SIZE } from "@/constants/blog-pagination";
import {
  formatArticleTag,
  normalizeArticleTag,
  splitArticleHighlight,
  useArticleFilter,
} from "@/composables/blog/useArticleFilter";
import { createSearchExcerpt } from "@/services/search-content";
import { useAnalyticsStore } from "@/stores/analyticsStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";

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
  paginatedArticles,
  currentPage,
  totalPages,
  getPageRoute,
  setCurrentPage,
  removeTag,
  removeYear,
  clearKeyword,
  resetFilter: clearFilter,
} = useArticleFilter(toRef(props, "articles"), {
  pageSize: BLOG_PAGE_SIZE,
  loading: toRef(props, "loading"),
});

const analyticsStore = useAnalyticsStore();
const commentCountsStore = useCommentCountsStore();
const { analyticsAvailable } = storeToRefs(analyticsStore);
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const readCountFormatter = { format: (value) => formatNumber(value) };
const formatReadCount = (value) => readCountFormatter.format(Number(value));
const formatCompactCount = (value) =>
  uiLocale.value === "si"
    ? formatNumber(value)
    : formatNumber(value, { notation: "compact", maximumFractionDigits: 1 });
const formatCompactReadingTime = (count) =>
  uiLocale.value === "en" || uiLocale.value === "fr"
    ? formatNumber(count, {
        style: "unit",
        unit: "minute",
        unitDisplay: "short",
      })
    : translate("common.counts.minutes", { count }, count);
const articleTotalReads = computed(() =>
  analyticsStore.getContentTypeReads("article"),
);
const articleReadsStatus = computed(() =>
  analyticsStore.getContentTypeStatus("article"),
);
const getArticleAnalyticsId = (article) => String(article?.id ?? "").trim();
const getArticleReads = (article) =>
  analyticsStore.getContentReads("article", getArticleAnalyticsId(article));
const getArticleReadStatus = (article) =>
  analyticsStore.getContentStatus("article", getArticleAnalyticsId(article));
const articleCommentContents = computed(() =>
  props.articles
    .map((article) => {
      const contentId = getArticleAnalyticsId(article);
      return { contentId, discussionTerm: contentId };
    })
    .filter(({ contentId }) => Boolean(contentId)),
);
const articleCommentIds = computed(() =>
  articleCommentContents.value.map(({ contentId }) => contentId),
);
const articleTotalComments = computed(() =>
  commentCountsStore.getContentCollectionTotal(
    "article",
    articleCommentIds.value,
  ),
);
const articleCommentsStatus = computed(() =>
  commentCountsStore.getContentCollectionStatus(
    "article",
    articleCommentIds.value,
  ),
);
const getArticleComments = (article) =>
  commentCountsStore.getContentCommentTotal(
    "article",
    getArticleAnalyticsId(article),
  );
const getArticleCommentStatus = (article) =>
  commentCountsStore.getContentCommentStatus(
    "article",
    getArticleAnalyticsId(article),
  );

watch(
  () => paginatedArticles.value.map(getArticleAnalyticsId).filter(Boolean),
  (contentIds) => {
    void analyticsStore.loadContentStats("article", contentIds);
  },
  { immediate: true },
);

watch(
  articleCommentContents,
  (contents) => {
    void commentCountsStore.loadContentCommentTotals("article", contents);
  },
  { immediate: true },
);

const pageStart = computed(() => {
  if (!filteredArticles.value.length) return 0;
  return (currentPage.value - 1) * BLOG_PAGE_SIZE + 1;
});

const pageEnd = computed(() => {
  return Math.min(
    currentPage.value * BLOG_PAGE_SIZE,
    filteredArticles.value.length,
  );
});

const handlePageChange = async (page) => {
  await setCurrentPage(page);
  await nextTick();

  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    const results = document.getElementById("article-results");
    if (!results) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const top = Math.max(
      0,
      window.scrollY +
        results.getBoundingClientRect().top -
        getNavbarScrollOffset(),
    );

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
};

const formatTag = formatArticleTag;
const highlightParts = (value) => {
  return splitArticleHighlight(value, keyword.value);
};
const getResultSummary = (article) => {
  return (
    createSearchExcerpt(article?.content, keyword.value, article?.summary) ||
    translate("blog.list.noSummary")
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
  return articleId
    ? getArticlePath(article, article.lang || article.sourceLocale || "zh-CN")
    : "/blog";
};
</script>
