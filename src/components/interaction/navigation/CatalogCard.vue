<template>
  <RouterLink
    :to="to"
    class="group card card-border min-w-0 cursor-pointer overflow-hidden bg-base-100 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
  >
    <div
      class="relative flex min-h-48 shrink-0 items-end overflow-hidden bg-base-200 sm:min-h-52"
      :aria-busy="hasCover && !isCoverLoaded"
    >
      <template v-if="hasCover">
        <div
          class="skeleton absolute inset-0 rounded-none"
          aria-hidden="true"
        ></div>
        <img
          v-fade-in
          :key="cover"
          :ref="syncCoverImage"
          v-bind="coverAttrs"
          :data-cover-src="cover"
          :alt="title"
          loading="lazy"
          decoding="async"
          draggable="false"
          class="absolute inset-0 size-full object-cover object-center transition-[opacity,transform,scale] duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
          @load="handleCoverLoad"
          @error="handleCoverError"
        />
        <div
          class="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/5 transition-opacity duration-500 motion-reduce:transition-none"
          :class="isCoverLoaded ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        ></div>
      </template>
      <template v-else>
        <div
          class="absolute -right-10 -top-14 size-40 rounded-full bg-primary/10 blur-2xl transition-transform duration-500 group-hover:scale-125 motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        ></div>
        <div
          class="absolute -bottom-16 -left-10 size-44 rounded-full bg-accent/15 blur-2xl transition-transform duration-500 group-hover:scale-125 motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        ></div>
        <i
          :class="icon"
          class="absolute right-5 top-4 text-7xl text-base-content/5 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        ></i>
        <div
          class="catalog-cover-pattern absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
        ></div>
      </template>

      <div
        class="relative z-10 min-w-0 w-full p-4 pt-24 transition-colors duration-300 sm:p-5 sm:pt-28 motion-reduce:transition-none"
        :class="hasCover && isCoverLoaded ? 'text-white' : 'text-base-content'"
      >
        <div v-if="$slots.tags" class="flex flex-wrap gap-1.5">
          <slot name="tags" :cover-loaded="hasCover && isCoverLoaded"></slot>
        </div>
        <h2
          class="mt-3 wrap-break-word text-balance font-serif text-xl leading-snug font-bold sm:text-2xl"
          :class="hasCover && isCoverLoaded ? 'drop-shadow-sm' : ''"
        >
          {{ title }}
        </h2>
      </div>
    </div>

    <div class="card-body min-w-0 gap-0 p-5 sm:p-6">
      <p
        class="wrap-break-word text-pretty leading-relaxed text-base-content/65"
      >
        {{ description }}
      </p>
      <div
        class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-sm text-base-content/50"
      >
        <slot name="meta"></slot>
        <span
          class="ml-auto flex max-w-full items-center gap-1 font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <span class="min-w-0 wrap-break-word">{{ action }}</span>
          <i class="ri-arrow-right-line shrink-0" aria-hidden="true"></i>
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  getImageAttrs,
  restoreOriginalImage,
} from "@/utils/images/responsive-images";

const props = defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  action: { type: String, required: true },
  cover: { type: String, default: "" },
});

const coverLoaded = ref(false);
const coverFailed = ref(false);
const hasCover = computed(() => Boolean(props.cover) && !coverFailed.value);
const isCoverLoaded = computed(() => import.meta.env.SSR || coverLoaded.value);
const coverAttrs = computed(() => {
  const attrs = getImageAttrs(
    props.cover,
    "(min-width: 1280px) 390px, (min-width: 768px) calc(50vw - 2.625rem), calc(100vw - 3rem)",
  );
  delete attrs.onError;
  return attrs;
});

watch(
  () => props.cover,
  () => {
    coverLoaded.value = false;
    coverFailed.value = false;
  },
  { flush: "sync" },
);

function handleCoverLoad(event) {
  if (event.currentTarget.getAttribute("data-cover-src") !== props.cover)
    return;
  coverLoaded.value = true;
  coverFailed.value = false;
}

function handleCoverError(event) {
  const image = event.currentTarget;
  if (image.getAttribute("data-cover-src") !== props.cover) return;
  const original = image.getAttribute("data-original-src");
  if (original && image.getAttribute("src") !== original) {
    restoreOriginalImage(event);
    return;
  }
  coverLoaded.value = false;
  coverFailed.value = true;
}

function syncCoverImage(image) {
  if (!image?.complete) return;
  const event = { currentTarget: image };
  if (image.naturalWidth > 0) handleCoverLoad(event);
  else handleCoverError(event);
}
</script>

<style scoped>
.catalog-cover-pattern {
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
