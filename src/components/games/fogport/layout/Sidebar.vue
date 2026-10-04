<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col">
    <SidebarNavigation
      :items="items"
      :panel="panel"
      :panel-id="panelId"
      :label="t('fogport.visual.views')"
      @select-panel="emit('select-panel', $event)"
    />
    <section
      v-show="panel === 'players'"
      :id="`${panelId}-players`"
      role="region"
      :aria-labelledby="`${panelId}-menu-players`"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin lg:is-drawer-close:hidden"
    >
      <PlayerList :game="room.game" :players="room.players" />
    </section>
    <section
      v-show="panel === 'market'"
      :id="`${panelId}-market`"
      role="region"
      :aria-labelledby="`${panelId}-menu-market`"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin lg:is-drawer-close:hidden"
    >
      <Market :game="room.game" />
    </section>
    <section
      v-show="midDesktop && panel === 'hand'"
      :id="`${panelId}-hand`"
      class="min-h-0 flex-1 lg:is-drawer-close:hidden"
      :aria-labelledby="`${panelId}-menu-hand`"
    >
      <div :id="inventoryTargetId" class="flex h-full min-h-0 flex-col"></div>
    </section>
    <section
      v-show="panel === 'history'"
      :id="`${panelId}-history`"
      role="region"
      :aria-labelledby="`${panelId}-menu-history`"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin lg:is-drawer-close:hidden"
    >
      <History in-context :game="room.game" />
    </section>
    <section
      v-show="panel === 'reference'"
      :id="`${panelId}-reference`"
      role="region"
      :aria-labelledby="`${panelId}-menu-reference`"
      class="min-h-0 flex-1 lg:is-drawer-close:hidden"
    >
      <Rulebook in-sidebar class="h-full" />
    </section>
  </div>
</template>
<script setup>
import { computed, useId, watch } from "vue";
import SidebarNavigation from "../../layout/SidebarNavigation.vue";
import PlayerList from "../display/PlayerList.vue";
import Market from "../display/Market.vue";
import History from "../display/History.vue";
import Rulebook from "../display/Rulebook.vue";
import { useMediaQuery } from "@vueuse/core";
import { useLocale } from "@/i18n";
const props = defineProps({
  room: { type: Object, required: true },
  inventoryTargetId: { type: String, required: true },
  canAct: Boolean,
  panel: { type: String, default: "players" },
});
const emit = defineEmits(["select-panel"]);
const { t } = useLocale();
const panelId = `fogport-sidebar-${useId()}`;
const baseItems = [
  { id: "players", icon: "ri-group-line", label: "fogport.players" },
  { id: "market", icon: "ri-exchange-line", label: "fogport.market" },
  { id: "history", icon: "ri-history-line", label: "fogport.history" },
  {
    id: "reference",
    icon: "ri-book-2-line",
    label: "fogport.visual.reference",
  },
];
const midDesktop = useMediaQuery("(min-width: 1024px) and (max-width: 1535px)");
const items = computed(() =>
  midDesktop.value
    ? [
        { id: "hand", icon: "ri-stack-line", label: "fogport.hand" },
        ...baseItems,
      ]
    : baseItems,
);
watch(midDesktop, (value) => {
  if (!value && props.panel === "hand") emit("select-panel", "players");
});
</script>
