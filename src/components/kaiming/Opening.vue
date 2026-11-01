<template>
  <div class="w-full min-w-0">
    <div class="min-w-0 max-w-2xl">
      <p
        class="mb-3 font-sans text-xs font-semibold tracking-widest text-base-content/55 uppercase"
        lang="en"
      >
        Chinese typography
      </p>
      <h1
        id="kaiming-title"
        class="font-serif text-[clamp(2.75rem,5vw,4rem)] leading-tight font-black tracking-tight text-balance"
      >
        {{ translate("kaiming.title") }}
      </h1>
      <p class="mt-5 max-w-xl leading-7 text-balance text-base-content/70">
        {{ translate("kaiming.description") }}
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-2 md:mt-8">
        <a
          href="#kaiming-specimen"
          class="btn btn-primary"
          @click.prevent="$emit('try')"
        >
          {{ translate("kaiming.specimen") }}
          <i class="ri-quill-pen-line" aria-hidden="true"></i>
        </a>
        <a
          class="btn"
          href="https://github.com/KoMoriSam/Kaiming"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ translate("kaiming.viewSource") }}
          <i class="ri-github-fill" aria-hidden="true"></i>
        </a>
        <a
          href="#usage-title"
          class="btn btn-ghost"
          @click.prevent="$emit('usage')"
        >
          {{ translate("kaiming.usage") }}
          <i
            class="ri-arrow-down-s-line animate-arrow-bounce motion-reduce:animate-none translate-y-0.25"
            aria-hidden="true"
          ></i>
        </a>
      </div>
      <div
        class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-base-content/55 md:mt-8"
        :aria-label="translate('kaiming.specifications')"
      >
        <CatalogMeta icon="ri-font-size-2">wght 100–900</CatalogMeta>
        <CatalogMeta icon="ri-font-sans-serif">Sans / Serif</CatalogMeta>
        <CatalogMeta icon="ri-font-family">WOFF2 Variable</CatalogMeta>
        <CatalogMeta icon="ri-certificate-2-line">SIL OFL 1.1</CatalogMeta>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";

defineEmits(["try", "usage"]);
const { t: translate } = useLocale();
</script>
