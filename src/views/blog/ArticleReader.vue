<template>
  <ReadingLayout ref="readerRef" toc :aside="showReaderAside">
    <!-- 文章内容 -->
    <Renderer
      v-if="article && (loading || content)"
      :ref="scrollRef"
      :content="content"
      :lang="article.lang || article.sourceLocale || 'zh-CN'"
      :is-loading="loading"
      :show-loading="false"
      :header-data="headerData"
      :style-configs="styleConfigs"
      @render-ready="emit('ready', articleId)"
      @pointerdown.capture="handleArticlePointerDown"
      @pointermove.capture="handleArticlePointerMove"
      @pointerup.capture="handleArticlePointerUp"
      @pointercancel.capture="handleArticlePointerCancel"
      @contextmenu.capture="handleArticleContextMenu"
    >
      <template #before>
        <span
          :id="`article-title-${articleId}`"
          data-reader-top-anchor
          aria-hidden="true"
          class="pointer-events-none absolute top-0 left-0 size-0"
        ></span>
        <header
          id="blog-reading-start"
          class="not-prose font-sans relative mb-8 min-h-72 overflow-hidden rounded-lg bg-base-200 shadow-lg sm:min-h-80"
        >
          <template v-if="bannerUrl && !bannerFailed">
            <div
              v-if="!bannerLoaded"
              class="skeleton absolute inset-0 rounded-none"
            ></div>

            <img
              v-fade-in
              :key="bannerUrl"
              :ref="setBannerImageRef"
              v-bind="
                getImageAttrs(
                  bannerUrl,
                  '(min-width: 1024px) 960px, calc(100vw - 2rem)',
                )
              "
              :alt="article.title"
              loading="eager"
              decoding="async"
              draggable="false"
              class="absolute inset-0 size-full object-cover object-center transition-opacity duration-700"
              @load="handleBannerLoad"
              @error="handleBannerError"
            />

            <div
              class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 transition-opacity duration-700"
              :class="bannerLoaded ? 'opacity-100' : 'opacity-0'"
            ></div>
          </template>

          <div
            v-else
            class="absolute inset-0 bg-gradient-to-br from-accent/25 to-primary/20"
          >
            <div
              class="absolute -top-20 -right-16 size-64 rounded-full bg-primary/15 blur-3xl"
            ></div>

            <div
              class="absolute -bottom-24 -left-16 size-72 rounded-full bg-accent/20 blur-3xl"
            ></div>

            <i
              class="ri-article-line absolute top-6 right-6 text-8xl text-base-content/5 sm:top-8 sm:right-8 sm:text-9xl"
            ></i>

            <div
              class="absolute inset-0 opacity-[0.04]"
              style="
                background-image: radial-gradient(
                  currentColor 1px,
                  transparent 1px
                );
                background-size: 18px 18px;
              "
            ></div>
          </div>

          <div
            class="relative flex min-h-72 flex-col p-5 sm:min-h-80 sm:p-8"
            :class="hasVisibleBanner ? 'text-white' : 'text-base-content'"
          >
            <div class="mb-6 flex items-start justify-between gap-3">
              <div
                class="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-2"
              >
                <nav
                  class="tooltip tooltip-right"
                  :data-tip="translate('blog.article.back')"
                >
                  <RouterLink
                    class="btn btn-sm btn-circle shrink-0"
                    :aria-label="translate('blog.article.back')"
                    :class="
                      hasVisibleBanner
                        ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                        : 'btn-primary btn-soft'
                    "
                    :to="listRoute"
                  >
                    <i class="ri-arrow-left-line"></i>
                  </RouterLink>
                </nav>

                <span
                  v-for="tag in article.tags"
                  :key="tag"
                  data-pagefind-body
                  data-pagefind-filter="tag"
                  class="badge h-auto min-h-5 max-w-full whitespace-normal break-words text-left max-lg:badge-sm"
                  :class="
                    hasVisibleBanner
                      ? 'border-white/20 bg-white/15 text-white backdrop-blur-sm'
                      : 'badge-primary badge-soft'
                  "
                >
                  {{ tag }}
                </span>
              </div>
              <label v-if="articleLocales.length > 1" class="shrink-0">
                <span class="sr-only">{{
                  translate("blog.article.language")
                }}</span>
                <select
                  class="select select-sm w-auto max-w-36 shadow-sm backdrop-blur-sm [appearance:base-select] [&::picker(select)]:[appearance:base-select] [&::picker(select)]:mt-1 [&::picker(select)]:rounded-lg [&::picker(select)]:border [&::picker(select)]:shadow-lg [&::picker(select)]:backdrop-blur-sm [&::picker(select)]:p-1 [&_option]:rounded-md"
                  :class="
                    hasVisibleBanner
                      ? `border-white/20 bg-white/15 text-white
         [&::picker(select)]:border-white/20
         [&::picker(select)]:bg-white/15
         [&::picker(select)]:text-white`
                      : `bg-base-100/90 text-base-content
         [&::picker(select)]:border-base-300
         [&::picker(select)]:bg-base-100/90
         [&::picker(select)]:text-base-content`
                  "
                  :value="article.lang"
                  :disabled="loading"
                  @change="emit('language', $event.target.value)"
                >
                  <option
                    v-for="lang in articleLocales"
                    :key="lang"
                    :value="lang"
                    :lang="lang"
                    class="[&::checkmark]:font-mono"
                  >
                    {{ languageNames[lang] }}
                  </option>
                </select>
              </label>
            </div>

            <div class="mt-auto">
              <h1
                :data-reader-heading-id="`article-title-${articleId}`"
                data-pagefind-body
                data-pagefind-meta="localizeText(title)"
                data-pagefind-weight="10"
                class="max-w-4xl text-balance font-serif text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-5xl"
                :class="hasVisibleBanner ? 'drop-shadow-sm' : ''"
              >
                {{ article?.title }}
              </h1>

              <p
                v-if="article?.summary"
                data-pagefind-body
                data-pagefind-meta="summary"
                data-pagefind-weight="2"
                class="sr-only"
              >
                {{ article.summary }}
              </p>

              <span
                v-if="articleTagsText"
                data-pagefind-meta="tags"
                class="sr-only"
              >
                {{ articleTagsText }}
              </span>

              <span
                v-if="publicationYear"
                data-pagefind-filter="year"
                class="sr-only"
              >
                {{ publicationYear }}
              </span>

              <time
                v-if="publicationDate"
                :datetime="publicationDate"
                data-pagefind-meta="date"
                data-pagefind-sort="date"
                class="sr-only"
              >
                {{ formatLocalizedDate(publicationDate) }}
              </time>

              <p
                v-if="aliasList.length"
                class="mt-3 flex max-w-3xl flex-wrap text-sm leading-relaxed sm:text-base"
              >
                <span
                  v-for="alias in aliasList"
                  :key="alias"
                  :title="alias"
                  class="badge scrollbar-none mr-2 mb-2 inline-flex max-w-full items-center justify-start overflow-x-auto px-2 text-left font-bold whitespace-nowrap"
                  :class="
                    hasVisibleBanner
                      ? 'border-white/15 bg-white/10 text-white/85'
                      : 'border-base-300 bg-base-100 text-base-content/75'
                  "
                >
                  <span class="min-w-max">{{ alias }}</span>
                </span>
              </p>

              <div
                class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
                :class="
                  hasVisibleBanner ? 'text-white/70' : 'text-base-content/55'
                "
              >
                <time
                  v-if="article?.date"
                  class="inline-flex items-center gap-1"
                >
                  <i class="ri-calendar-line"></i>
                  {{ formatLocalizedDate(article.date) }}
                </time>

                <span
                  v-if="article?.length"
                  class="inline-flex items-center gap-1"
                >
                  <i class="ri-font-size-2" aria-hidden="true"></i>
                  {{
                    translate(
                      "common.counts.aboutCharacters",
                      { count: formatNumber(article.length) },
                      article.length,
                    )
                  }}
                </span>

                <span
                  v-if="article?.length"
                  class="inline-flex items-center gap-1"
                >
                  <i class="ri-time-line"></i>
                  {{
                    translate(
                      "common.counts.readingTime",
                      { count: estimateReadingTime(article.length) },
                      estimateReadingTime(article.length),
                    )
                  }}
                </span>

                <span
                  v-if="analyticsAvailable"
                  class="inline-flex items-center gap-1"
                >
                  <i class="ri-eye-line" aria-hidden="true"></i>

                  <I18nT
                    keypath="common.counts.reads"
                    :plural="Number.isFinite(articleReads) ? articleReads : 2"
                    tag="span"
                    scope="global"
                  >
                    <template #count>
                      <template v-if="Number.isFinite(articleReads)">
                        {{ formatReadCount(articleReads) }}
                      </template>
                      <span
                        v-else-if="articleReadStatus !== 'error'"
                        class="loading loading-dots w-[1ch] align-middle"
                        :aria-label="translate('blog.article.loadingReads')"
                      ></span>
                      <template v-else>–</template>
                    </template>
                  </I18nT>
                </span>

                <span
                  v-if="commentCountsAvailable"
                  class="inline-flex items-center gap-1"
                >
                  <i class="ri-chat-3-line" aria-hidden="true"></i>

                  <I18nT
                    keypath="common.counts.comments"
                    :plural="Number.isFinite(articleComments) ? articleComments : 2"
                    tag="span"
                    scope="global"
                  >
                    <template #count>
                      <template v-if="Number.isFinite(articleComments)">
                        {{ formatReadCount(articleComments) }}
                      </template>
                      <span
                        v-else-if="articleCommentStatus !== 'error'"
                        class="loading loading-dots w-[1ch] align-middle"
                        :aria-label="translate('blog.article.loadingComments')"
                      ></span>
                      <template v-else>–</template>
                    </template>
                  </I18nT>
                </span>
              </div>
            </div>
          </div>
        </header>
        <p
          v-if="missingTranslation"
          role="status"
          class="alert alert-soft not-prose mb-4 font-sans text-sm"
        >
          <i class="ri-information-line" aria-hidden="true"></i>
          <span>{{
            translate("blog.article.fallbackNotice", {
              requestedLanguage: localizedLanguageNames[uiLocale],
              currentLanguage:
                localizedLanguageNames[
                  article.lang || article.sourceLocale || "zh-CN"
                ],
            })
          }}</span>
        </p>
        <div
          v-if="article.machineTranslated === true"
          class="not-prose mb-6 font-sans"
        >
          <p role="note" class="alert alert-soft text-sm">
            <i class="ri-translate-2" aria-hidden="true"></i>
            <I18nT
              keypath="blog.article.machineNotice"
              tag="span"
              scope="global"
            >
              <template #original>
                <RouterLink
                  :to="getArticlePath(article, getSourceLocale(article))"
                  class="link link-primary link-hover"
                >
                  {{ translate("blog.article.original") }}
                </RouterLink>
              </template>
            </I18nT>
          </p>
        </div>
      </template>

      <template #loading>
        <LoadingPlaceholder :page="false" :show-header="false" />
      </template>

      <template #after>
        <ContentRights
          kind="blog"
          :license="article.license"
          :title="article.title"
          :url="`https://komori.cc${getArticleRoute(article)}`"
          author="KoMoriSam (Wishwa Luo)"
          :published-at="publicationDate"
          class="not-prose mt-8"
        />
        <ModificationAge
          v-if="!loading"
          :modified-at="article.modified || article.modifiedDate"
          :notice-after-days="timelinessNoticeAfterDays"
        />
        <div class="divider" aria-hidden="true"></div>
        <nav
          v-if="previousArticle || nextArticle"
          class="not-prose font-sans flex min-w-0 flex-col items-start gap-2 md:flex-row md:items-stretch md:justify-between"
          :aria-label="translate('blog.article.navigation')"
        >
          <RouterLink
            v-if="previousArticle"
            :to="getArticleRoute(previousArticle)"
            class="btn btn-sm h-fit min-w-0 max-w-full justify-start gap-2 py-1 md:btn-md md:max-w-[calc(50%-0.25rem)] lg:gap-3"
            :aria-label="
              translate('blog.article.previousTitle', {
                p0: previousArticle.title,
              })
            "
            @click="handleArticleNavigation(previousArticle, $event)"
          >
            <i class="ri-arrow-left-s-line shrink-0 text-lg md:text-xl"></i>

            <div
              class="flex min-w-0 flex-1 flex-col items-start gap-0.5 leading-[1.1]"
            >
              <span
                class="text-base-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
              >
                {{ translate("blog.article.previous") }}
              </span>

              <span class="max-w-full truncate text-left">
                {{ previousArticle.title }}
              </span>

              <time
                v-if="getArticleDate(previousArticle)"
                :datetime="getArticleDate(previousArticle)"
                class="text-base-content/50 text-[0.5625rem] font-semibold tracking-wide"
              >
                {{ translate("blog.article.published") }}
                {{ formatArticleDate(previousArticle) }}
              </time>
            </div>
          </RouterLink>

          <RouterLink
            v-if="nextArticle"
            :to="getArticleRoute(nextArticle)"
            class="btn btn-neutral btn-sm h-fit min-w-0 max-w-full self-end justify-end gap-2 py-1 md:btn-md md:ml-auto md:max-w-[calc(50%-0.25rem)] md:self-auto lg:gap-3"
            :aria-label="
              translate('blog.article.nextTitle', {
                p0: nextArticle.title,
              })
            "
            @click="handleArticleNavigation(nextArticle, $event)"
          >
            <div
              class="flex min-w-0 flex-1 flex-col items-end gap-0.5 leading-[1.1]"
            >
              <span
                class="text-neutral-content/50 hidden text-[0.5625rem] font-semibold tracking-wide md:block"
              >
                {{ translate("blog.article.next") }}
              </span>

              <span class="max-w-full truncate text-right">
                {{ nextArticle.title }}
              </span>

              <time
                v-if="getArticleDate(nextArticle)"
                :datetime="getArticleDate(nextArticle)"
                class="text-neutral-content/50 text-[0.5625rem] font-semibold tracking-wide"
              >
                {{ translate("blog.article.published") }}
                {{ formatArticleDate(nextArticle) }}
              </time>
            </div>

            <i class="ri-arrow-right-s-line shrink-0 text-lg md:text-xl"></i>
          </RouterLink>
        </nav>
        <RelatedArticles
          v-if="!loading"
          :article="article"
          :articles="sourceArticles"
          :content="content"
          @navigate="handleArticleNavigation"
        />
      </template>
    </Renderer>

    <LoadingPlaceholder v-else-if="loading" :page="false" :article="article" />

    <!-- 错误状态 -->
    <div v-else-if="error" class="alert alert-error my-16">
      <i class="ri-error-warning-line text-3xl"></i>

      <div>
        <h2 class="font-bold">
          {{ translate("blog.article.loadFailed") }}
        </h2>
        <p class="text-sm">{{ error }}</p>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="my-32 text-center text-base-content/50">
      <i class="ri-file-unknow-line mb-4 block text-5xl"></i>
      <p>
        {{ translate("blog.article.loadFailedHint") }}
      </p>
    </div>

    <ContextMenu
      v-if="articleTextContextMounted"
      v-model="articleTextContextOpen"
      :context="articleTextContext"
      :share-meta="articleShareMeta"
      @search="openArticleContextSearch"
    />

    <template #floating>
      <aside class="max-lg:dock shadow-sm">
        <FloatingActionButton :actions="fabActions" main-icon="ri-menu-line" />
      </aside>
    </template>

    <template #format-setting>
      <FormatSetting />
    </template>

    <template #aside v-if="loading || (content && article?.id != null)">
      <CommentsPlaceholder v-if="loading" />
      <Thread
        v-else
        :key="article.id"
        scope="article"
        :target="String(article.id)"
      />
    </template>
  </ReadingLayout>
</template>

<script setup>
import { provideMarkdownAvatars } from "@/composables/markdown/useMarkdownAvatars";
import ContentRights from "@/components/reader/display/ContentRights.vue";
import RelatedArticles from "@/components/blog/RelatedArticles.vue";
import ModificationAge from "@/components/blog/ModificationAge.vue";
provideMarkdownAvatars(import.meta.env.VITE_BLOG_RAW);
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
const {
  t: translate,
  text: localizeText,
  locale: uiLocale,
  localeRestored,
  number: formatNumber,
  date: formatLocalizedDate,
} = useLocale();

import { computed, defineAsyncComponent, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { Translation as I18nT } from "vue-i18n";
import Thread from "@/components/comments/Thread.vue";
import { useRoute, useRouter } from "vue-router";

import { useReaderStore } from "@/stores/readerStore";
import { useCommentCountsStore } from "@/stores/commentCountsStore";
import { useScrollTo } from "@/composables/useScrollTo";
import { useReaderTextContext } from "@/composables/reader/useReaderTextContext";
import { useContentReadTracking } from "@/composables/reader/useContentReadTracking";
import { normalizeArticleDate } from "@/composables/blog/useArticleFilter";
import { sortArticleNavigation } from "@/utils/blog/article-navigation";
import { getArticleTimelinessDays } from "@/utils/blog/article-timeliness";
import {
  getArticleLocales,
  getArticlePath,
  getSourceLocale,
} from "@/utils/blog/article-versions";

import FloatingActionButton from "@/components/interaction/controls/FloatingActionButton.vue";
import ReadingLayout from "@/components/reader/layout/ReadingLayout.vue";
import LoadingPlaceholder from "@/components/reader/feedback/LoadingPlaceholder.vue";
import CommentsPlaceholder from "@/components/reader/feedback/CommentsPlaceholder.vue";
import FormatSetting from "@/components/reader/interaction/FormatSetting.vue";
import Renderer from "@/components/markdown/Renderer.vue";

const ContextMenu = defineAsyncComponent(
  () => import("@/components/reader/interaction/ContextMenu.vue"),
);

const readerRef = ref(null);

const props = defineProps({
  article: {
    type: Object,
    default: null,
  },
  articles: {
    type: Array,
    default: () => [],
  },
  sourceArticles: {
    type: Array,
    default: () => [],
  },
  content: {
    type: String,
    default: "",
  },
  listRoute: {
    type: String,
    default: "/blog",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["back", "refresh", "navigate", "ready", "language"]);
const articleLocales = computed(() => getArticleLocales(props.article));
const missingTranslation = computed(
  () =>
    localeRestored.value &&
    props.article &&
    !articleLocales.value.includes(uiLocale.value),
);
const languageNames = { "zh-CN": "中文（简体）", en: "English", si: "සිංහල" };
const localizedLanguageNames = computed(() => ({
  "zh-CN": translate("blog.article.languages.zh-CN"),
  en: translate("blog.article.languages.en"),
  fr: translate("blog.article.languages.fr"),
  si: translate("blog.article.languages.si"),
}));

const articleId = computed(() => String(props.article?.id || "").trim());
const timelinessNoticeAfterDays = computed(() => {
  const source = props.sourceArticles.find((article) => String(article.id) === articleId.value);
  return getArticleTimelinessDays(source || props.article || {});
});
const commentCountsStore = useCommentCountsStore();
const { commentCountsAvailable } = storeToRefs(commentCountsStore);
const articleComments = computed(() =>
  commentCountsStore.getContentCommentTotal("article", articleId.value),
);
const articleCommentStatus = computed(() =>
  commentCountsStore.getContentCommentStatus("article", articleId.value),
);
const articleReady = computed(
  () =>
    Boolean(articleId.value) &&
    Boolean(props.content) &&
    !props.loading &&
    !props.error,
);
const {
  analyticsAvailable,
  contentReads: articleReads,
  contentReadStatus: articleReadStatus,
} = useContentReadTracking({
  contentType: "article",
  contentId: articleId,
  ready: articleReady,
});
const readCountFormatter = { format: (value) => formatNumber(value) };
const formatReadCount = (value) => readCountFormatter.format(Number(value));

watch(
  articleId,
  (contentId) => {
    if (!contentId) return;
    void commentCountsStore.loadContentCommentTotals("article", [
      { contentId, discussionTerm: contentId },
    ]);
  },
  { immediate: true },
);

const route = useRoute();
const router = useRouter();

const readerStore = useReaderStore();
const { styleConfigs } = storeToRefs(readerStore);


const { scrollRef, scrollToTop, scrollToBottom } = useScrollTo();
const articleTextContextMounted = ref(false);
const articleTextContextOpen = ref(false);
const articleTextContext = ref({});
const openArticleContextMenu = (context) => {
  if (!context) {
    articleTextContextOpen.value = false;
    articleTextContext.value = {};
    return;
  }

  articleTextContextMounted.value = true;
  articleTextContext.value = context;
  articleTextContextOpen.value = true;
};
const {
  handleContextMenu: handleArticleContextMenu,
  handlePointerCancel: handleArticlePointerCancel,
  handlePointerDown: handleArticlePointerDown,
  handlePointerMove: handleArticlePointerMove,
  handlePointerUp: handleArticlePointerUp,
} = useReaderTextContext({
  getRoot: () => scrollRef.value,
  emit: (_eventName, context) => openArticleContextMenu(context),
});
const openArticleContextSearch = (keyword) => {
  void router.replace({
    query: {
      ...route.query,
      search: "1",
      q: String(keyword || "").trim() || undefined,
    },
  });
};

const showReaderAside = computed(
  () =>
    props.loading ||
    (Boolean(props.content) && props.article?.id != null),
);

const bannerUrl = computed(() => String(props.article?.banner || "").trim());
const bannerImageRef = ref(null);
// Keep the prerendered overlay visible during hydration, including cached images.
const bannerLoaded = ref(true);
const bannerFailed = ref(false);
const hasVisibleBanner = computed(
  () => Boolean(bannerUrl.value) && !bannerFailed.value,
);

function handleBannerLoad() {
  bannerFailed.value = false;
  bannerLoaded.value = true;
}

function handleBannerError() {
  bannerFailed.value = true;
  bannerLoaded.value = false;
}

function syncBannerImageState() {
  if (!bannerImageRef.value) return;

  const image = bannerImageRef.value;

  if (!image?.complete) return;

  if (image.naturalWidth > 0) {
    handleBannerLoad();
  } else {
    handleBannerError();
  }
}

// 函数式 ref：图片绑定到 DOM 时立即同步加载状态，
// 覆盖预渲染/缓存图片不再触发 load 事件的情况
function setBannerImageRef(element) {
  bannerImageRef.value = element;
  syncBannerImageState();
}

watch(
  bannerUrl,
  async () => {
    bannerLoaded.value = false;
    bannerFailed.value = false;

    await nextTick();
    syncBannerImageState();
  },
  { flush: "post" },
);

const estimateReadingTime = (length) => {
  const characterCount = Number(length);

  if (!Number.isFinite(characterCount) || characterCount <= 0) {
    return 1;
  }

  // 中文文章按照每分钟约 400 字估算
  return Math.max(1, Math.ceil(characterCount / 400));
};

const aliasList = computed(() => {
  const aliases = props.article?.aliases;

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
});

const articleShareMeta = computed(() => {
  const date = normalizeArticleDate(props.article?.date);
  const length = Number(props.article?.length);
  const tags = Array.isArray(props.article?.tags)
    ? props.article.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  const tagsText = tags.join(" · ");
  const displayDate = date ? formatLocalizedDate(props.article?.date) : "";
  const lengthText =
    Number.isFinite(length) && length > 0
      ? translate(
          "common.counts.characters",
          { count: formatNumber(length) },
          length,
        )
      : "";
  const readingTimeText = lengthText
    ? translate(
        "common.counts.readingTime",
        { count: estimateReadingTime(length) },
        estimateReadingTime(length),
      )
    : "";
  const aliasesText = aliasList.value.join(" ");
  const renderedMetadata = [displayDate, lengthText, readingTimeText].filter(
    Boolean,
  );
  const publicationInfo = date
    ? translate("blog.article.publishDate", { p0: displayDate })
    : "";
  const contentInfo = [
    Number.isFinite(length) && length > 0
      ? translate(
          "common.counts.aboutCharacters",
          { count: formatNumber(length) },
          length,
        )
      : "",
    tagsText ? tagsText : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const engagementItems = [
    analyticsAvailable.value && Number.isFinite(articleReads.value)
      ? translate(
          "common.counts.reads",
          { count: formatReadCount(articleReads.value) },
          articleReads.value,
        )
      : "",
    commentCountsAvailable.value && Number.isFinite(articleComments.value)
      ? translate(
          "common.counts.comments",
          { count: formatReadCount(articleComments.value) },
          articleComments.value,
        )
      : "",
  ].filter(Boolean);
  const engagementInfo = engagementItems.join(" · ");
  const detailLines = [publicationInfo, contentInfo, engagementInfo].filter(
    Boolean,
  );

  return {
    get sourceLabel() {
      return translate("blog.article.blog");
    },
    title: props.article?.title || "",
    detail: detailLines.join(" · "),
    detailLines,
    detailLineLimit: 3,
    excludeFromContent: [
      ...aliasList.value,
      aliasesText,
      ...tags,
      tags.join(" "),
      ...renderedMetadata,
      renderedMetadata.join(" "),
      publicationInfo,
      contentInfo,
      ...engagementItems,
      engagementInfo,
    ].filter(Boolean),
    path: route.path,
  };
});

const articleTagsText = computed(() => {
  const tags = Array.isArray(props.article?.tags) ? props.article.tags : [];

  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .join(" · ");
});

const publicationDate = computed(() => {
  return normalizeArticleDate(props.article?.date);
});

const publicationYear = computed(() => {
  return publicationDate.value.slice(0, 4);
});

const getArticleDate = (article) => normalizeArticleDate(article?.date);

const chronologicalArticles = computed(() =>
  sortArticleNavigation(
    Array.isArray(props.articles) ? props.articles : [],
    normalizeArticleDate,
  ),
);

const currentArticleIndex = computed(() => {
  const currentId = String(props.article?.id ?? "");
  if (!currentId) return -1;

  return chronologicalArticles.value.findIndex(
    (article) => String(article.id) === currentId,
  );
});

const previousArticle = computed(() => {
  if (currentArticleIndex.value <= 0) return null;
  return chronologicalArticles.value[currentArticleIndex.value - 1] || null;
});

const nextArticle = computed(() => {
  const nextIndex = currentArticleIndex.value + 1;
  if (currentArticleIndex.value < 0) return null;
  return chronologicalArticles.value[nextIndex] || null;
});

const getArticleRoute = (article) => {
  const generatedPath = String(article?.routePath || "").trim();
  if (generatedPath) return generatedPath;

  const articleId = String(article?.id || "").trim();
  return articleId
    ? getArticlePath(article, article.lang || article.sourceLocale || "zh-CN")
    : "/blog";
};

const formatArticleDate = (article) => {
  return formatLocalizedDate(getArticleDate(article));
};

const handleArticleNavigation = (article, event) => {
  if (
    event?.button !== 0 ||
    event?.metaKey ||
    event?.ctrlKey ||
    event?.shiftKey ||
    event?.altKey
  ) {
    return;
  }

  const articleId = String(article?.id || "").trim();
  if (articleId) emit("navigate", articleId);
};

const handleRefresh = () => {
  emit("refresh");
};

const handleBack = () => {
  emit("back");
};

// 从 article 构建 headerData，传给 Markdown 组件
const headerData = computed(() => {
  if (!props.article) return null;

  return {
    title: props.article.title || "",
    uuid: props.article.id || "",
    page: 1,
    sourceType: "article",
    meta: props.article.tags || [],
    stats: [
      {
        icon: "ri-calendar-line",
        text: props.article.date || "",
      },
    ],
  };
});

const fabActions = computed(() => {
  const actions = [
    {
      key: "bottom",
      get label() {
        return translate("blog.article.toBottom");
      },
      icon: "ri-skip-down-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToBottom,
    },
    {
      key: "top",
      get label() {
        return translate("blog.article.toTop");
      },
      icon: "ri-skip-up-line",
      buttonClass: "btn-info btn-soft",
      onClick: scrollToTop,
    },
    {
      key: "settings",
      get label() {
        return translate("reader.format.title");
      },
      icon: "ri-settings-3-line",
      buttonClass: "btn-primary btn-soft",
      onClick: () => readerRef.value?.openFormatSetting(),
    },
    {
      key: "refresh",
      get label() {
        return translate("blog.article.refresh");
      },
      icon: props.loading ? "ri-loader-4-line animate-spin" : "ri-refresh-line",
      buttonClass: "btn-success btn-soft",
      onClick: handleRefresh,
    },
    {
      key: "back",
      get label() {
        return translate("blog.article.back");
      },
      icon: "ri-arrow-go-back-line",
      buttonClass: "btn-secondary btn-soft",
      onClick: handleBack,
    },
  ];

  return actions;
});
</script>
