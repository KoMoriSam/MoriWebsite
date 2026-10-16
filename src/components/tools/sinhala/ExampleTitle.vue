<template>
  <span class="min-w-0 wrap-anywhere">
    {{ translate(titleKey) }}
    <span
      v-if="termKey && locale !== 'si'"
      class="ms-1 text-sm font-normal text-base-content/55"
      lang="si"
      >({{ translate(termKey) }})</span
    >
  </span>
</template>

<script setup>
import { useLocale } from "@/i18n";

defineProps({
  titleKey: { type: String, required: true },
  termKey: { type: String, default: "" },
});

const { t: translate, locale } = useLocale();
</script>
