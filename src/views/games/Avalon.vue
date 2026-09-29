<template>
  <GameRoom game-type="avalon" @room-state="observeAudio" @room-activity="playRoomActivity">
    <template #instructions>
      <h2 class="font-serif text-xl font-bold">{{ t('avalon.howTo') }}</h2>
      <ol class="mt-5 space-y-4 text-sm leading-7 text-base-content/70">
        <li>{{ t('avalon.guideInvite') }}</li>
        <li>{{ t('avalon.guideDiscuss') }}</li>
        <li>{{ t('avalon.guideWin') }}</li>
      </ol>
    </template>
    <template #page-actions>
      <div
        class="tooltip tooltip-bottom"
        :data-tip="t(audioEnabled ? 'avalon.audio.disable' : 'avalon.audio.enable')"
      >
        <button
          type="button"
          class="btn btn-square btn-ghost btn-xs"
          :aria-label="t(audioEnabled ? 'avalon.audio.disable' : 'avalon.audio.enable')"
          :aria-pressed="audioEnabled"
          @click="toggleAudio"
        >
          <i :class="audioEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line'" aria-hidden="true"></i>
        </button>
      </div>
    </template>
    <template #settings="{ room, canAct, run }">
      <AvalonSettings :room="room" :can-act="canAct" :run="run" />
    </template>
    <template #default="{ room, canAct, run }">
      <AvalonTable :room="room" :can-act="canAct" :run="run" :players-target-id="playersTargetId" @request-sidebar-panel="sidebarPanel = $event" />
    </template>
    <template #sidebar="{ room, canAct, run, expandSidebar }">
      <AvalonSidebar :room="room" :can-act="canAct" :run="run" :panel="sidebarPanel" :players-target-id="playersTargetId" @select-panel="sidebarPanel = $event; expandSidebar()" />
    </template>
  </GameRoom>
</template>
<script setup>
import GameRoom from '@/components/games/GameRoom.vue';
import AvalonTable from '@/components/games/avalon/AvalonTable.vue';
import AvalonSidebar from '@/components/games/avalon/AvalonSidebar.vue';
import AvalonSettings from '@/components/games/avalon/AvalonSettings.vue';
import { useAvalonAudio } from '@/composables/useAvalonAudio';
import { useLocale } from '@/i18n';
import { ref, useId } from 'vue';
const { t } = useLocale();
const { enabled: audioEnabled, observe: observeAudio, toggle: toggleAudio, playActivity: playRoomActivity } = useAvalonAudio();
const sidebarPanel = ref('discussion');
const playersTargetId = `avalon-sidebar-players-${useId()}`;
</script>
