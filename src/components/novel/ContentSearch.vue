<template>
  <section class="flex min-h-0 flex-col" :aria-label="translate('reader.search.title')">
    <LoginGate v-if="!auth.state.canReadNovel" />
    <template v-else>
    <label class="input flex w-full shrink-0 items-center gap-2">
      <i class="ri-search-line text-base-content/55" aria-hidden="true"></i>
      <input
        ref="searchInputRef"
        v-model="keyword"
        type="search"
        class="grow"
        :placeholder="translate('reader.search.placeholder')"
        autocomplete="off"
        enterkeyhint="search"
      />
      <button
        v-if="keyword"
        type="button"
        class="btn btn-circle btn-ghost btn-xs"
        :aria-label="translate('reader.search.clear')"
        @click="keyword = ''"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </label>

    <ScrollableContainer class="mt-3">
      <div
        class="min-h-24 overflow-y-auto overscroll-contain"
        :class="{ 'max-h-[min(56dvh,30rem)]': results.length }"
      >
        <div
          v-if="isLoading"
          class="flex min-h-28 items-center justify-center gap-2 text-sm text-base-content/60"
          role="status"
        >
          <span class="loading loading-spinner loading-sm"></span>
          <span>{{ translate('reader.search.loading') }}</span>
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
          {{ translate('reader.search.hint') }}
        </p>

        <p
          v-else-if="!results.length"
          class="py-8 text-center text-sm text-base-content/55"
        >
          {{ translate('reader.search.noMatches') }}
        </p>

        <ul v-else class="menu w-full gap-1 p-0" :aria-label="translate('reader.search.results')">
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
    </ScrollableContainer>
    </template>
  </section>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { useLocale } from '@/i18n';
const { t: translate, text: localizeText, message: localeMessage } = useLocale();

import LoginGate from '@/components/auth/LoginGate.vue';
import { useMoriAuth } from '@/composables/auth/useMoriAuth';
const auth = useMoriAuth();
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { loadNovelPagefind } from "@/services/novel-release";
import { searchPagefindBundle, segmentPagefindQuery } from "@/services/search-access";

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
const results = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const normalizedKeyword = computed(() => keyword.value.trim());
let request = 0;

watch(
  () => [props.active, normalizedKeyword.value, auth.state.revision],
  ([active, query], _prior, onCleanup) => {
    const id = ++request;
    results.value = [];
    errorMessage.value = "";
    isLoading.value = false;
    if (!active || !auth.state.canReadNovel || !query) return;
    const current = () => request === id && auth.state.canReadNovel;
    isLoading.value = true;
    const timer = setTimeout(async () => {
      try {
        const engine = await loadNovelPagefind();
        const hits = await searchPagefindBundle(engine, segmentPagefindQuery(query), { type: "novel" }, current);
        const data = await Promise.all(hits.slice(0, 40).map((hit) => hit.data()));
        if (current()) results.value = data.map((hit) => ({
          url: hit.url,
          title: hit.meta?.title || hit.url,
          excerpt: /[\p{Script=Han}]/u.test(query) ? hit.meta?.summary : hit.plain_excerpt,
        }));
      } catch {
        if (current()) errorMessage.value = localeMessage("reader.search.loadFailed");
      } finally {
        if (current()) isLoading.value = false;
      }
    }, 160);
    onCleanup(() => {
      ++request;
      clearTimeout(timer);
    });
  },
  { flush: "sync" },
);

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
