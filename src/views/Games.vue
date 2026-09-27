<template>
  <ContentPage :title="t('games.title')" :description="t('games.description')">
    <section class="grid gap-4 md:grid-cols-2" :aria-label="t('games.available')">
      <router-link v-for="game in GAMES" :key="game.id" :to="{ name: game.name }" class="card card-border group bg-base-100 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-base-content/30 hover:bg-base-200/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none">
        <div class="card-body gap-4">
          <div class="flex items-start justify-between gap-4">
            <span class="flex size-11 shrink-0 items-center justify-center rounded-box bg-base-200 text-xl" aria-hidden="true"><i :class="game.icon"></i></span>
            <i class="ri-arrow-right-up-line text-xl text-base-content/40" aria-hidden="true"></i>
          </div>
          <div>
            <h2 class="card-title font-serif font-bold">{{ t(game.titleKey) }}</h2>
            <p class="mt-2 text-pretty text-sm leading-6 text-base-content/65">{{ t(game.descriptionKey) }}</p>
          </div>
          <div class="card-actions mt-auto items-center justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-outline badge-sm">
                <i class="ri-group-line" aria-hidden="true"></i>
                {{ t('games.playerRange', { min: game.minPlayers, max: game.maxPlayers }) }}
              </span>
              <span v-for="info in game.metadata" :key="info.labelKey" class="badge badge-outline badge-sm">
                <i :class="info.icon" aria-hidden="true"></i>
                {{ t(info.labelKey) }}
              </span>
            </div>
            <span class="shrink-0 text-sm font-medium">{{ t('games.play') }}</span>
          </div>
        </div>
      </router-link>
    </section>
  </ContentPage>
</template>
<script setup>
import ContentPage from '@/components/layout/ContentPage.vue';
import { GAMES } from '@/games/catalog';
import { useLocale } from '@/i18n';
const { t } = useLocale();
</script>
