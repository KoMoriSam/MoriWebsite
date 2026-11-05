<template>
  <CatalogCard
    ref="card"
    :href="href"
    :title="label || repository"
    :cover="preview?.coverUrl || ''"
    icon="ri-github-fill"
    title-tag="div"
    class="not-prose @container/github-card font-sans"
    compact
    contain
  >
    <template #title>
      <span class="flex min-w-0 items-start gap-1.5">
        <span
          class="avatar mt-0.5 shrink-0"
          :aria-busy="avatarLoading"
          aria-hidden="true"
        >
          <span class="relative size-5 overflow-hidden rounded-full">
            <span
              v-if="avatarLoading"
              class="skeleton absolute inset-0 rounded-full"
            ></span>
            <img
              v-if="ownerAvatarUrl && !imageError"
              v-fade-in
              :key="ownerAvatarUrl"
              :ref="syncAvatarImage"
              :src="ownerAvatarUrl"
              alt=""
              width="20"
              height="20"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              class="absolute inset-0 size-full object-cover"
              @load="syncAvatarImage($event.currentTarget)"
              @error="syncAvatarImage($event.currentTarget)"
            />
            <i
              v-else-if="!avatarLoading"
              class="ri-user-line absolute inset-0 grid place-items-center text-xs text-base-content/40"
            ></i>
          </span>
        </span>
        <span class="min-w-0 line-clamp-2">{{ label || repository }}</span>
      </span>
    </template>
    <template #description>
      <span class="block h-10" :aria-busy="!previewSettled">
        <span
          v-if="!previewSettled"
          class="grid h-full content-center gap-1.5"
          aria-hidden="true"
        >
          <span
            class="skeleton block h-3 w-full motion-reduce:animate-none"
          ></span>
          <span
            class="skeleton block h-3 w-4/5 motion-reduce:animate-none"
          ></span>
        </span>
        <span v-else class="line-clamp-2">{{
          preview?.description || ""
        }}</span>
      </span>
    </template>
    <template #meta>
      <span
        class="grid h-8.5 w-full min-w-0 grid-cols-2 gap-x-1.5 gap-y-0.5 @min-[30rem]/github-card:h-4 @min-[30rem]/github-card:grid-cols-[minmax(0,1fr)_auto_auto]"
        :aria-busy="!previewSettled"
      >
        <CatalogMeta
          icon="ri-code-s-slash-line"
          :title="preview?.language || t('common.language')"
          class="col-span-2 h-4 @min-[30rem]/github-card:col-span-1 [&>span]:truncate"
        >
          <span
            v-if="!previewSettled"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>
          <template v-else>{{ preview?.language || "—" }}</template>
        </CatalogMeta>
        <CatalogMeta
          icon="ri-star-line"
          :title="t('markdown.repository.stars')"
          class="h-4 tabular-nums [&>span]:truncate"
        >
          <span
            v-if="!previewSettled"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>
          <template v-else>{{
            preview?.stars != null
              ? compactNumberFormatter.format(preview.stars)
              : "—"
          }}</template>
        </CatalogMeta>
        <CatalogMeta
          icon="ri-git-fork-line"
          :title="t('markdown.repository.forks')"
          class="h-4 tabular-nums [&>span]:truncate"
        >
          <span
            v-if="!previewSettled"
            class="loading loading-dots loading-xs"
            aria-hidden="true"
          ></span>
          <template v-else>{{
            preview?.forks != null
              ? compactNumberFormatter.format(preview.forks)
              : "—"
          }}</template>
        </CatalogMeta>
      </span>
    </template>
  </CatalogCard>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useElementVisibility } from "@vueuse/core";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";
import { useLocale } from "@/i18n";
import { fetchGithubRepository } from "@/services/api-github";
import { useImageLoad } from "@/composables/useImageLoad";

const props = defineProps({
  href: { type: String, required: true },
  repository: { type: String, required: true },
  label: { type: String, default: "" },
});

const { t, locale } = useLocale();
const compactNumberFormatter = computed(() => new Intl.NumberFormat(
  locale.value === "si" ? "en" : locale.value,
  { notation: "compact" },
));
const card = ref(null);
const preview = ref(null);
const previewSettled = ref(false);
const { imageLoaded, imageError, handleImageLoad, handleImageError } =
  useImageLoad();
const visible = useElementVisibility(card);
const ownerAvatarUrl = computed(() => preview.value?.ownerAvatarUrl || "");
const avatarLoading = computed(
  () =>
    !previewSettled.value ||
    Boolean(ownerAvatarUrl.value && !imageLoaded.value && !imageError.value),
);

watch(
  ownerAvatarUrl,
  () => {
    imageLoaded.value = false;
    imageError.value = false;
  },
  { flush: "sync" },
);

function syncAvatarImage(image) {
  if (!image?.complete || image.getAttribute("src") !== ownerAvatarUrl.value)
    return;
  if (image.naturalWidth > 0) handleImageLoad();
  else handleImageError();
}

watch(
  [visible, () => props.repository],
  async ([isVisible, repository], [, previousRepository], onCleanup) => {
    if (repository !== previousRepository) {
      preview.value = null;
      previewSettled.value = false;
    }
    if (!isVisible || preview.value) return;

    previewSettled.value = false;
    let active = true;
    onCleanup(() => {
      active = false;
    });
    const data = await fetchGithubRepository(repository);
    if (active) {
      preview.value = data;
      previewSettled.value = true;
    }
  },
);
</script>
