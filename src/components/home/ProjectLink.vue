<template>
  <CatalogCard
    :to="to"
    :href="href"
    compact
    :title="title"
    title-tag="h4"
    :description="description"
    :icon="icon"
  >
    <template #cover>
      <span class="grid size-full place-items-center text-3xl text-primary"><i :class="icon" aria-hidden="true"></i></span>
    </template>
    <template #meta><CatalogMeta v-if="meta" :icon="icon">{{ meta }}</CatalogMeta></template>
  </CatalogCard>
</template>

<script setup>
import CatalogCard from '@/components/interaction/navigation/CatalogCard.vue';
import CatalogMeta from '@/components/interaction/navigation/CatalogMeta.vue';
defineProps({
  to: { type: [String, Object], default: null },
  href: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  meta: { type: String, default: '' },
});
</script>
