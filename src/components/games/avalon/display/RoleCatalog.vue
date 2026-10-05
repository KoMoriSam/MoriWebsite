<template>
  <div class="min-w-0 space-y-6 overflow-x-clip">
    <section v-for="group in groups" :key="group.side" class="min-w-0 space-y-3">
      <h3 class="font-serif font-semibold" :class="group.side === 'good' ? 'text-success' : 'text-error'">
        {{ t(`avalon.night.${group.side}`) }}
      </h3>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 p-2">
        <article v-for="role in group.roles" :key="role" class="w-full min-w-0 max-w-xs justify-self-center">
          <IdentityCard
            :self="{ role, alignment: group.side, lancelotMode: mode }"
            self-id=""
            :player-name="emptyPlayerName"
            face-up
            preview
            catalog
          />
          <p v-if="LANCELOTS.includes(role)" class="mt-2 flex flex-wrap justify-center gap-1.5">
            <span class="badge badge-ghost badge-xs">{{ t('avalon.catalog.paired') }}</span>
            <span class="badge badge-ghost badge-xs">{{ t(`avalon.lancelot.modes.${mode}`) }}</span>
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
<script setup>
import { useLocale } from '@/i18n';
import { ROLES, LANCELOTS, roleAlignment } from '../../../../../shared/games/avalon/index.js';
import IdentityCard from './IdentityCard.vue';
defineProps({ mode: { type: String, default: 'fixed' } });
const { t } = useLocale();
const groups = ['good', 'evil'].map(side => ({ side, roles: ROLES.filter(role => roleAlignment(role) === side) }));
const emptyPlayerName = () => '';
</script>
