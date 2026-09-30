<template>
  <Room game-type="avalon" @room-state="observeAudio" @room-activity="playRoomActivity">
    <template #instructions>
      <h2 class="font-serif text-xl font-bold">{{ t('avalon.howTo') }}</h2>
      <ol class="mt-5 space-y-4 text-sm leading-7 text-base-content/70">
        <li>{{ t('avalon.guideInvite') }}</li>
        <li>{{ t('avalon.guideDiscuss') }}</li>
        <li>{{ t('avalon.guideWin') }}</li>
      </ol>
    </template>
    <template #page-actions="{ room }">
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
      <ReferenceDialog v-if="room.status !== 'lobby'" :room="room" />
    </template>
    <template #settings="{ room, canAct, run }">
      <Settings :room="room" :can-act="canAct" :run="run" />
    </template>
    <template #default="{ room, canAct, run }">
      <RoundTable ref="roundTable" :room="room" :can-act="canAct" :run="run" :players-target-id="playersTargetId" @request-sidebar-panel="sidebarPanel = $event" />
    </template>
    <template #sidebar="{ room, canAct, run, expandSidebar }">
      <Sidebar :room="room" :can-act="canAct" :run="run" :panel="sidebarPanel" :players-target-id="playersTargetId" @select-panel="sidebarPanel = $event; expandSidebar()" @end-discussion="roundTable?.endCurrentDiscussion()" />
    </template>
  </Room>
</template>
<script setup>
import Room from '@/components/games/Room.vue';
import RoundTable from '@/components/games/avalon/layout/RoundTable.vue';
import Sidebar from '@/components/games/avalon/layout/Sidebar.vue';
import Settings from '@/components/games/avalon/interaction/Settings.vue';
import ReferenceDialog from '@/components/games/avalon/display/ReferenceDialog.vue';
import { useAvalonAudio } from '@/composables/games/avalon/useAvalonAudio';
import { useLocale } from '@/i18n';
import { ref, useId } from 'vue';
const { t } = useLocale();
const { enabled: audioEnabled, observe: observeAudio, toggle: toggleAudio, playActivity: playRoomActivity } = useAvalonAudio();
const sidebarPanel = ref('discussion');
const roundTable = ref(null);
const playersTargetId = `avalon-sidebar-players-${useId()}`;
</script>
