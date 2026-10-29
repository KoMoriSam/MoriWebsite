<template>
  <header class="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-6">
    <hgroup class="min-w-0 max-w-2xl">
      <p class="mb-2 text-xs font-semibold tracking-wide text-primary">{{ eyebrow }}</p>
      <h2 :id="titleId" class="font-serif text-2xl leading-tight font-bold tracking-tight text-balance md:text-3xl">
        {{ title }}
      </h2>
      <p class="mt-2 max-w-xl text-sm text-pretty leading-6 text-base-content/65">{{ description }}</p>
    </hgroup>
    <div v-if="$slots.actions" class="flex max-w-full shrink-0 flex-wrap items-center gap-2">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<script setup>
defineProps({
  titleId: { type: String, required: true },
  title: { type: String, required: true },
  eyebrow: { type: String, required: true },
  description: { type: String, required: true },
});
</script>
