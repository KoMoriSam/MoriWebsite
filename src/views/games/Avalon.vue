<template>
  <GameRoom game-type="avalon">
    <template #instructions>
      <h2 class="font-serif text-xl font-bold">{{ t('avalon.howTo') }}</h2>
      <ol class="mt-5 space-y-4 text-sm leading-7 text-base-content/70">
        <li>{{ t('avalon.guideInvite') }}</li>
        <li>{{ t('avalon.guideDiscuss') }}</li>
        <li>{{ t('avalon.guideWin') }}</li>
      </ol>
    </template>
    <template #settings="{ room, canAct, run }">
      <AvalonSettings :room="room" :can-act="canAct" :run="run" />
    </template>
    <template #default="{ room, canAct, run }">
      <AvalonTable :room="room" :can-act="canAct" :run="run" />
    </template>
  </GameRoom>
</template>
<script setup>
import GameRoom from '@/components/games/GameRoom.vue';
import AvalonTable from '@/components/games/avalon/AvalonTable.vue';
import AvalonSettings from '@/components/games/avalon/AvalonSettings.vue';
import { useLocale } from '@/i18n';
const { t } = useLocale();
</script>
