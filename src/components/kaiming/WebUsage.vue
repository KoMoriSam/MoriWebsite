<template>
  <div
    class="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] lg:gap-10"
  >
    <div class="min-w-0">
      <p
        class="mb-4 max-w-2xl text-sm leading-6 text-pretty text-base-content/65"
      >
        {{ translate("kaiming.importHint") }}
      </p>
      <CodeBlock :code="code" language="css" />
    </div>
    <aside class="min-w-0 py-2" aria-labelledby="kaiming-downloads-title">
      <h3 id="kaiming-downloads-title" class="font-serif text-xl font-bold">
        {{ translate("kaiming.downloads") }}
      </h3>
      <p class="mt-2 text-sm leading-6 text-pretty text-base-content/65">
        {{ translate("kaiming.downloadsHint") }}
      </p>
      <div class="mt-5 grid gap-2">
        <a
          v-for="(download, index) in downloads"
          :key="download.href"
          class="btn h-auto min-h-11 justify-between py-3"
          :class="index === 0 ? 'btn-primary' : 'btn-ghost'"
          :href="download.href"
          :target="download.external ? '_blank' : undefined"
          :rel="download.external ? 'noopener noreferrer' : undefined"
        >
          <span class="inline-flex min-w-0 items-center gap-2 text-left">
            <i :class="download.icon" class="shrink-0" aria-hidden="true"></i>
            {{ download.label }}
          </span>
          <span class="shrink-0 font-mono text-xs font-normal opacity-60">{{
            download.meta
          }}</span>
        </a>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
import CodeBlock from "@/components/markdown/code/CodeBlock.vue";

defineProps({
  code: { type: String, required: true },
  downloads: { type: Array, required: true },
});
const { t: translate } = useLocale();
</script>
