<template>
  <li
    class="min-w-0 border-l-2 border-base-300 pl-3 text-sm"
    :class="
      tone === 'success'
        ? 'border-success'
        : tone === 'error'
          ? 'border-error'
          : ''
    "
  >
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <i :class="icon" class="text-base-content/60" aria-hidden="true"></i>
      <strong class="font-medium">{{ title }}</strong>
      <slot name="heading"></slot>
      <span class="ml-auto font-mono text-xs text-base-content/40"
        ><span v-if="sequence !== undefined">#{{ sequence }}</span
        ><time v-if="at" :datetime="new Date(at).toISOString()" class="ml-2">{{
          date(at, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        }}</time></span
      >
    </div>
    <div class="mt-1 space-y-1 text-xs leading-5"><slot></slot></div>
  </li>
</template>
<script setup>
import { useLocale } from "@/i18n";
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: "ri-history-line" },
  tone: { type: String, default: "" },
  sequence: [String, Number],
  at: Number,
});
const { date } = useLocale();
</script>
