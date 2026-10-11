<template>
  <ContentPage :title="t('games.title')" :description="t('games.description')">
    <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6" :aria-label="t('games.available')">
      <CatalogCard
        v-for="game in GAMES"
        :key="game.id"
        :to="{ name: game.name }"
        :title="t(game.titleKey)"
        :description="t(game.descriptionKey)"
        :icon="game.icon"
        :cover="game.cover"
        :action="t('games.play')"
      >
        <template #tags="{ coverLoaded }">
          <span
            v-for="info in game.metadata"
            :key="info.labelKey"
            class="badge badge-sm h-auto min-h-5 max-w-full py-0.5 transition-colors duration-300 motion-reduce:transition-none"
            :class="coverLoaded ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm' : 'badge-primary badge-soft'"
          >
            <i :class="info.icon" class="shrink-0" aria-hidden="true"></i>
            <span class="min-w-0 break-words">{{ t(info.labelKey) }}</span>
          </span>
        </template>
        <template #meta>
          <span class="flex min-w-0 max-w-full items-center gap-1.5">
            <i class="ri-group-line shrink-0" aria-hidden="true"></i>
            <span class="min-w-0 break-words">{{ t('games.playerRange', { min: game.minPlayers, max: game.maxPlayers }) }}</span>
          </span>
        </template>
      </CatalogCard>
    </section>
  </ContentPage>
</template>
<script setup>
import ContentPage from '@/components/layout/ContentPage.vue';
import CatalogCard from '@/components/interaction/navigation/CatalogCard.vue';
import { GAMES } from '@/games/catalog';
import { useLocale } from '@/i18n';
const { t } = useLocale();
</script>
