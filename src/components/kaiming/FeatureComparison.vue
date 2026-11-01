<template>
  <div>
    <template v-for="feature in features" :key="feature.index">
      <article
        class="grid min-w-0 items-center gap-5 py-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-10"
      >
        <div class="min-w-0">
          <p class="mb-2 font-mono text-xs text-primary">{{ feature.index }}</p>
          <h3 class="font-serif text-xl font-bold text-balance">
            {{ feature.title }}
          </h3>
          <p
            class="mt-2 max-w-lg text-sm leading-6 text-pretty text-base-content/65"
          >
            {{ feature.description }}
          </p>
        </div>
        <div class="card card-border min-w-0 bg-base-100">
          <div
            class="card-body grid min-w-0 gap-5 p-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:p-6"
          >
            <div class="min-w-0">
              <p class="mb-4 text-xs text-base-content/55">
                {{ translate("kaiming.defaultPunctuation") }}
              </p>
              <p
                class="text-[clamp(1.25rem,2.8vw,2.25rem)] leading-relaxed whitespace-nowrap [hanging-punctuation:none] [text-spacing-trim:space-all]"
                :style="baseStyle"
                lang="zh-CN"
              >
                {{ feature.sample }}
              </p>
            </div>
            <div
              class="divider divider-vertical sm:divider-horizontal m-0"
              aria-hidden="true"
            ></div>
            <div class="min-w-0">
              <p class="mb-4 text-xs text-primary">
                {{ translate("kaiming.title") }}
              </p>
              <p
                class="text-[clamp(1.25rem,2.8vw,2.25rem)] leading-relaxed whitespace-nowrap text-primary [hanging-punctuation:none] [text-spacing-trim:space-all]"
                :style="demoStyle"
                lang="zh-CN"
              >
                {{ feature.sample }}
              </p>
            </div>
          </div>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";

defineProps({
  features: { type: Array, required: true },
  demoStyle: { type: Object, required: true },
  baseStyle: { type: Object, required: true },
});
const { t: translate } = useLocale();
</script>
