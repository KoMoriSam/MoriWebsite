<template>
  <section class="flex min-h-0 flex-col" aria-label="搜索小说内容">
    <label class="input flex w-full shrink-0 items-center gap-2">
      <i class="ri-search-line text-base-content/55" aria-hidden="true"></i>
      <input
        ref="searchInputRef"
        v-model="keyword"
        type="search"
        class="grow"
        placeholder="搜索章节标题或正文"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button
        v-if="keyword"
        type="button"
        class="btn btn-circle btn-ghost btn-xs"
        aria-label="清空搜索"
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
        <span>正在读取小说索引…</span>
      </div>

      <div
        v-else-if="errorMessage"
        class="alert alert-error alert-soft text-sm"
        role="alert"
      >
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        <span>{{ errorMessage }}</span>
      </div>

      <p
        v-else-if="!normalizedKeyword"
        class="py-8 text-center text-sm text-base-content/55"
      >
        输入关键词，搜索小说章节标题与正文内容
      </p>

      <p
        v-else-if="!results.length"
        class="py-8 text-center text-sm text-base-content/55"
      >
        没有找到相关小说内容
      </p>

      <ul v-else class="menu w-full gap-1 p-0" aria-label="小说搜索结果">
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
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { getArticleSearchScore } from "@/composables/useArticleFilter";
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

const normalizedKeyword = computed(() => keyword.value.trim());

const results = computed(() => {
  const query = normalizedKeyword.value;
  if (!query) return [];

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
  if (initialized || isLoading.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    entries.value = await fetchNovelSearchIndex();
    initialized = true;
  } catch (error) {
    console.error("初始化小说搜索失败:", error);
    errorMessage.value = "暂时无法读取小说内容，请稍后再试。";
  } finally {
    isLoading.value = false;
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
