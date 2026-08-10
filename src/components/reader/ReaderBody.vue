<template>
  <div :class="['min-w-0 w-full max-w-full', containerClass]">
    <slot name="before" />

    <div v-if="showToc" class="sticky top-2 z-10 mb-4 xl:hidden">
      <slot name="mobile-toc" />
    </div>

    <div
      :class="[
        'grid min-w-0 w-full max-w-full grid-cols-1 items-start',
        gridClass,
      ]"
    >
      <aside
        v-if="showToc"
        :class="[
          'hidden min-w-0 w-full max-w-full xl:sticky xl:block xl:self-start',
          tocClass,
        ]"
        :style="{
          top: stickyTop,
          height: `calc(90dvh - ${stickyTop})`,
        }"
      >
        <slot name="toc" />
      </aside>

      <section
        :data-reader-content="readerId"
        :class="[
          'min-w-0 w-full max-w-full',
          showAside &&
            'border-b border-base-300 pb-8 xl:border-r xl:border-b-0 xl:pr-8 xl:pb-0',
          showToc && 'xl:border-l xl:border-base-300 xl:pl-8',
          contentClass,
        ]"
      >
        <slot />
      </section>

      <aside
        v-if="showAside"
        ref="asideElement"
        :class="[
          'lg:sticky lg:self-start',
          'max-h-[unset] lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto',
          'scrollbar-none',
          asideClass,
        ]"
        :style="{
          top: stickyTop,
          maskImage: asideMaskImage,
          WebkitMaskImage: asideMaskImage,
        }"
      >
        <slot name="aside" />
      </aside>
    </div>

    <slot name="after" />
  </div>
</template>

<script setup>
import { ref } from "vue";

import { useScrollMask } from "@/composables/useScrollMask";

defineProps({
  containerClass: { type: [String, Array, Object], default: "" },
  gridClass: { type: [String, Array, Object], default: "" },
  contentClass: { type: [String, Array, Object], default: "" },
  tocClass: { type: [String, Array, Object], default: "" },
  asideClass: { type: [String, Array, Object], default: "" },
  stickyTop: { type: String, default: "12rem" },
  showToc: { type: Boolean, default: false },
  showAside: { type: Boolean, default: false },
  readerId: { type: String, required: true },
});

const asideElement = ref(null);
const { maskImage: asideMaskImage } = useScrollMask(asideElement);
</script>
