<template>
  <div class="min-w-0 space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <section v-for="group in groups" :key="group.side" class="min-w-0">
        <h4 class="mb-2 flex items-baseline justify-between gap-2 font-medium" :class="group.side === 'good' ? 'text-success' : 'text-error'">
          <span>{{ t(`avalon.night.${group.side}`) }}</span>
          <span class="text-xs font-normal text-base-content/60">{{ t('avalon.config.campCount', { n: group.count }) }}</span>
        </h4>
        <ul class="divide-y divide-base-300 text-sm">
          <li v-for="entry in group.roles" :key="entry.role" class="flex items-center justify-between gap-2 py-2">
            <span class="min-w-0">{{ t(`avalon.roles.${entry.role}`) }}</span>
            <span class="badge badge-ghost badge-sm shrink-0 tabular-nums">× {{ entry.count }}</span>
          </li>
        </ul>
      </section>
    </div>
    <p v-if="lancelotsEnabled" class="flex flex-wrap items-center gap-2 text-xs">
      <span class="text-base-content/60">{{ t('avalon.config.lancelots') }}</span>
      <span class="badge badge-ghost badge-sm">{{ t(`avalon.lancelot.modes.${room.lancelotMode ?? room.gameConfig?.lancelotMode ?? 'fixed'}`) }}</span>
    </p>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { useLocale } from '@/i18n';
import { DEFAULT_SPECIAL_ROLES, LANCELOTS, roleAlignment, roleRoster } from '../../../../../shared/games/avalon/index.js';
const props = defineProps({ room: { type: Object, required: true } });
const { t } = useLocale();
const specialRoles = computed(() => props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES);
const roster = computed(() => roleRoster(props.room.participants?.length ?? props.room.players.length, specialRoles.value).roles);
const lancelotsEnabled = computed(() => LANCELOTS.every(role => specialRoles.value.includes(role)));
const groups = computed(() => ['good', 'evil'].map(side => {
  const roles = roster.value.filter(role => roleAlignment(role) === side);
  const counts = new Map();
  for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  return { side, count: roles.length, roles: [...counts].map(([role, count]) => ({ role, count })) };
}));
</script>
