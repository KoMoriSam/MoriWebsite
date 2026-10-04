<template>
  <Room game-type="fogport">
    <template #page-notice>
      <p class="flex items-start gap-2 text-xs leading-5 text-base-content/75" role="status">
        <span class="badge badge-warning badge-soft badge-sm shrink-0">{{ t("fogport.testStatus") }}</span>
        <span>{{ t("fogport.testNotice") }}</span>
      </p>
    </template>
    <template #page-actions="{ room }"
      ><ReferenceDialog v-if="room.status !== 'lobby'" mobile-only
    /></template>
    <template #instructions
      ><h2 class="font-serif text-xl font-bold">{{ t("fogport.howTo") }}</h2>
      <p class="mt-4 text-sm leading-7 text-base-content/70">
        {{ t("fogport.guide") }}
      </p></template
    >
    <template #lobby-guide
      ><div class="divider"></div>
      <PlayGuide />
      <div class="divider"></div
    ></template>
    <template #settings="{ room, canAct, run }">
      <section class="card">
        <div class="card-body gap-3 p-0">
          <h2 class="card-title font-serif">{{ t("fogport.mode") }}</h2>
          <select
            class="select w-full"
            :aria-label="t('fogport.mode')"
            :value="room.gameConfig.mode"
            :disabled="!canAct || room.hostId !== room.selfId"
            @change="
              run('configure', { config: { mode: $event.target.value } })
            "
          >
            <option value="full">{{ t("fogport.full") }}</option>
            <option value="introductory">
              {{ t("fogport.introductory") }}
            </option>
          </select>
          <p class="text-xs text-base-content/60">
            {{ t("fogport.modeHint") }}
          </p>
        </div>
      </section>
    </template>
    <template #default="{ room, canAct, run, error }"
      ><PlayTable
        ref="playTable"
        :room="room"
        :can-act="canAct"
        :run="run"
        :error="error"
        :inventory-target-id="inventoryTargetId"
        @request-sidebar-panel="sidebarPanel = $event"
    /></template>
    <template #sidebar="{ room, canAct, expandSidebar }"
      ><Sidebar
        :room="room"
        :can-act="canAct"
        :panel="sidebarPanel"
        :inventory-target-id="inventoryTargetId"
        @select-panel="
          sidebarPanel = $event;
          playTable?.selectPanel($event);
          expandSidebar();
        "
    /></template>
  </Room>
</template>
<script setup>
import Room from "@/components/games/Room.vue";
import PlayTable from "@/components/games/fogport/layout/PlayTable.vue";
import ReferenceDialog from "@/components/games/fogport/display/ReferenceDialog.vue";
import Sidebar from "@/components/games/fogport/layout/Sidebar.vue";
import PlayGuide from "@/components/games/fogport/display/PlayGuide.vue";
import { ref, useId } from "vue";
import { useLocale } from "@/i18n";
const { t } = useLocale();
const playTable = ref(null),
  sidebarPanel = ref("players");
const inventoryTargetId = `fogport-inventory-${useId()}`;
</script>
