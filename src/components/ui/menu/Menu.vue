<template>
  <ul class="menu">
    <li class="menu-title flex flex-row justify-between">
      {{ localizeText(title) }}
      <slot name="description"></slot>
    </li>
    <slot></slot>
  </ul>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { text: localizeText } = useLocale();
const props = defineProps({ title: String });
</script>
