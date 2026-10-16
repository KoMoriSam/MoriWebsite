<template>
  <span class="min-w-0">
    <span class="block text-sm font-medium">
      <slot name="glyph" />
      {{ translate(messageKey) }}
    </span>
    <span
      v-if="locale !== 'si' && translate(messageKey) !== sinhala"
      class="block text-xs text-base-content/55"
      lang="si"
    >{{ sinhala }}</span>
  </span>
</template>

<script setup>
import { useLocale } from "@/i18n";

defineProps({
  messageKey: { type: String, required: true },
  sinhala: { type: String, required: true },
});

const { t: translate, locale } = useLocale();
</script>
