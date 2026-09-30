<template>
  <section class="flex min-h-0 flex-col" :aria-label="translate('reader.novelContentSearch.searchTheNovel')">
    <LoginGate v-if="!auth.authenticated.value" />
    <template v-else>
    <label class="input flex w-full shrink-0 items-center gap-2">
      <i class="ri-search-line text-base-content/55" aria-hidden="true"></i>
      <input
        ref="searchInputRef"
        v-model="keyword"
        type="search"
        class="grow"
        :placeholder="translate('reader.novelContentSearch.searchChapterTitlesOrText')"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button
        v-if="keyword"
        type="button"
        class="btn btn-circle btn-ghost btn-xs"
        :aria-label="translate('reader.novelContentSearch.clearSearch')"
        @click="keyword = ''"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </label>

    <div
      class="mt-3 min-h-24 overflow-y-auto overscroll-contain"
      :class="{ 'max-h-[min(56dvh,30rem)]': results.length }"
    >
      <div
        v-if="isLoading"
        class="flex min-h-28 items-center justify-center gap-2 text-sm text-base-content/60"
        role="status"
      >
        <span class="loading loading-spinner loading-sm"></span>
        <span>{{ translate('reader.novelContentSearch.loadingTheNovelIndex') }}</span>
      </div>

      <div
        v-else-if="errorMessage"
        class="alert alert-error alert-soft text-sm"
        role="alert"
      >
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>{{ localizeText(errorMessage) }}</span>
      </div>

      <p
        v-else-if="!normalizedKeyword"
        class="py-8 text-center text-sm text-base-content/55"
      >
        {{ translate('reader.novelContentSearch.enterKeywordsToSearchChapterTitlesAndText') }}
      </p>

      <p
        v-else-if="!results.length"
        class="py-8 text-center text-sm text-base-content/55"
      >
        {{ translate('reader.novelContentSearch.noMatchingNovelContentFound') }}
      </p>

      <ul v-else class="menu w-full gap-1 p-0" :aria-label="translate('reader.novelContentSearch.novelSearchResults')">
        <li v-for="result in results" :key="result.url">
          <button
            type="button"
            class="block w-full px-3 py-2.5 text-left"
            @click="openResult(result)"
          >
            <span class="flex min-w-0 items-center gap-2">
              <i
                class="ri-book-open-line shrink-0 text-base-content/50"
                aria-hidden="true"
              ></i>
              <span class="min-w-0 flex-1 truncate font-medium">
                {{ result.title }}
              </span>
            </span>
            <span
              v-if="result.excerpt"
              class="mt-1 line-clamp-2 block text-xs leading-relaxed text-base-content/60"
            >
              {{ result.excerpt }}
            </span>
          </button>
        </li>
      </ul>
    </div>
    </template>
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, text: localizeText, message: localeMessage } = useLocale();

import LoginGate from '@/components/auth/LoginGate.vue';
import { useGithubSession } from '@/composables/auth/useGithubSession';
const auth = useGithubSession();
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { getArticleSearchScore } from "@/composables/blog/useArticleFilter";
import {
  createSearchExcerpt,
  fetchNovelSearchIndex,
} from "@/services/search-content";

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  initialKeyword: {
    type: String,
    default: "",
  },
  beforeNavigate: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(["select"]);
const router = useRouter();
const searchInputRef = ref(null);
const keyword = ref("");
const entries = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
let initialized = false;
let request = 0;
watch(() => [auth.state.authenticated, auth.state.revision], () => {
  request++; initialized = false; entries.value = []; keyword.value = ''; errorMessage.value = ''; isLoading.value = false;
  if (auth.state.authenticated && props.active) void initialize();
}, { flush: 'sync' });

const normalizedKeyword = computed(() => keyword.value.trim());

const results = computed(() => {
  const query = normalizedKeyword.value;
  if (!auth.state.authenticated || !query) return [];

  return entries.value
    .flatMap((entry) => {
      const blockMatches = (
        Array.isArray(entry.searchBlocks) ? entry.searchBlocks : []
      )
        .map((block, index) => {
          const candidate = { ...entry, ...block };
          return {
            candidate,
            index,
            score: getArticleSearchScore(candidate, query),
          };
        })
        .filter((match) => match.score !== Number.NEGATIVE_INFINITY)
        .sort((a, b) => b.score - a.score || a.index - b.index);

      const bestMatch = blockMatches[0];
      const score = bestMatch
        ? bestMatch.score
        : getArticleSearchScore(entry, query);
      if (score === Number.NEGATIVE_INFINITY) return [];

      const result = bestMatch?.candidate || entry;
      return [
        {
          ...result,
          score,
          excerpt: createSearchExcerpt(
            result.content,
            query,
            result.summary,
          ),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(a.catalogOrder || 0) - Number(b.catalogOrder || 0),
    )
    .slice(0, 40);
});

const initialize = async () => {
  if (!auth.state.authenticated || initialized || isLoading.value) return;
  const id = ++request;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const value = await fetchNovelSearchIndex();
    if (id !== request || !auth.state.authenticated) return;
    entries.value = value;
    initialized = true;
  } catch (error) {
    if (id !== request) return;
    console.error("初始化小说搜索失败:", error);
    errorMessage.value = localeMessage('reader.novelContentSearch.novelContentIsUnavailablePleaseTryAgainLater');
  } finally {
    if (id === request) isLoading.value = false;
  }
};

const openResult = async (result) => {
  const navigationOptions = (await props.beforeNavigate?.()) || {};
  emit("select");
  const navigate = navigationOptions.replaceDialogHistory
    ? router.replace
    : router.push;
  await navigate.call(router, String(result.url || "/novel"));
};

watch(
  () => props.active,
  async (active) => {
    if (!active) return;
    if (props.initialKeyword) keyword.value = props.initialKeyword.trim();
    await initialize();
    await nextTick();
    searchInputRef.value?.focus();
  },
  { immediate: true },
);

watch(
  () => props.initialKeyword,
  (value) => {
    if (value) keyword.value = String(value).trim();
  },
  { immediate: true },
);
</script>
