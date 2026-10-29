<template>
  <div ref="root" class="min-w-0">
    <div class="space-y-3">
      <CatalogCard
        v-for="item in visibleItems"
        :key="item.name"
        expandable
        :compact="selectedName !== item.name"
        :group-name="groupName"
        :value="item.name"
        :title="translate(item.titleKey)"
        title-tag="h4"
        :description="translate(item.descriptionKey)"
        :cover="item.cover || ''"
        :icon="item.icon"
        :tags="[...(item.categoryKey ? [translate(item.categoryKey)] : []), ...(item.metadata || []).map(info => translate(info.labelKey))]"
        :action="translate(actionKey)"
        :entry-to="item.to || { name: item.name }"
        cover-sizes="(min-width: 1280px) 560px, (min-width: 768px) 45vw, calc(100vw - 3rem)"
        @select="selectItem(item.name)"
      >
        <template #meta>
          <CatalogMeta v-if="item.minPlayers != null" icon="ri-group-line" class="text-xs">{{ translate('games.playerRange', { min: item.minPlayers, max: item.maxPlayers }) }}</CatalogMeta>
        </template>
      </CatalogCard>
    </div>
    <router-link v-if="items.length > limit" :to="moreTo" class="btn btn-ghost btn-sm mt-3 w-full">{{ translate('home.workshop.viewMore') }}<i class="ri-arrow-right-line" aria-hidden="true"></i></router-link>
  </div>
</template>

<script setup>
import { computed, ref, useId, watch } from 'vue';
import { useLocale } from '@/i18n';
import { useCardTransition } from '@/composables/home/useCardTransition';
import CatalogCard from '@/components/interaction/navigation/CatalogCard.vue';
import CatalogMeta from '@/components/interaction/navigation/CatalogMeta.vue';

const props = defineProps({
  items: { type: Array, required: true },
  actionKey: { type: String, required: true },
  moreTo: { type: [String, Object], required: true },
  defaultOpen: { type: String, default: '' },
  limit: { type: Number, default: 3, validator: value => Number.isInteger(value) && value > 0 },
});
const { t: translate } = useLocale();
const root = ref(null);
const { change } = useCardTransition(root);
const groupName = `home-projects-${useId()}`;
const visibleItems = computed(() => props.items.slice(0, props.limit));
const defaultItem = computed(() => visibleItems.value.find(item => item.name === props.defaultOpen) || visibleItems.value[0]);
const selectedName = ref(defaultItem.value?.name || null);
function selectItem(name) {
  if (name !== selectedName.value) void change(() => { selectedName.value = name; });
}
watch(visibleItems, items => {
  if (!items.some(item => item.name === selectedName.value)) selectedName.value = defaultItem.value?.name || null;
});
</script>
