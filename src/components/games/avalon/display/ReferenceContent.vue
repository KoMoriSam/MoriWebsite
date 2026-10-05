<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col">
    <div
      role="tablist"
      class="tabs flex max-w-full shrink-0 flex-nowrap overflow-x-auto scrollbar-thin"
      :class="
        inSidebar
          ? 'tabs-box tabs-sm w-fit bg-base-200/70 p-1'
          : 'tabs-border tabs-sm'
      "
    >
      <button
        v-for="item in panels"
        :id="`${panelId}-tab-${item.id}`"
        :key="item.id"
        type="button"
        role="tab"
        class="tab shrink-0 gap-2 whitespace-nowrap"
        :class="panel === item.id ? 'tab-active' : ''"
        :aria-selected="panel === item.id"
        :aria-controls="`${panelId}-${item.id}`"
        @click="selectPanel(item.id)"
      >
        <i :class="item.icon" aria-hidden="true"></i>{{ t(item.label) }}
      </button>
    </div>
    <div
      ref="contentScroll"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 scrollbar-thin"
    >
      <section
        :id="`${panelId}-roles`"
        role="tabpanel"
        :aria-labelledby="`${panelId}-tab-roles`"
        :class="panel === 'roles' ? '' : 'hidden'"
      >
        <RoleRoster
          :room="room"
          :preview-target="previewTarget"
          :narrow="inSidebar"
        >
          <template #group-details="{ side }">
            <SpecialRules :room="room" :side="side" hide-heading />
          </template>
        </RoleRoster>
        <SpecialRules :room="room" extensions-only hide-heading class="mt-4" />
      </section>
      <section
        :id="`${panelId}-rules`"
        role="tabpanel"
        :aria-labelledby="`${panelId}-tab-rules`"
        :class="panel === 'rules' ? '' : 'hidden'"
      >
        <Rulebook sidebar flow-only />
      </section>
      <section
        :id="`${panelId}-catalog`"
        role="tabpanel"
        :aria-labelledby="`${panelId}-tab-catalog`"
        :class="panel === 'catalog' ? '' : 'hidden'"
      >
        <RoleCatalog
          :mode="
            room.game?.lancelotMode ??
            room.lancelotMode ??
            room.gameConfig?.lancelotMode ??
            'fixed'
          "
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, useId } from "vue";
import { useLocale } from "@/i18n";
import RoleRoster from "./RoleRoster.vue";
import Rulebook from "./Rulebook.vue";
import SpecialRules from "./SpecialRules.vue";
import RoleCatalog from "./RoleCatalog.vue";

defineProps({
  room: { type: Object, required: true },
  previewTarget: { type: String, default: "body" },
  inSidebar: Boolean,
});
const { t } = useLocale();
const panelId = `avalon-reference-panel-${useId()}`;
const panel = ref("roles");
const contentScroll = ref(null);
const panels = [
  { id: "roles", icon: "ri-id-card-line", label: "avalon.config.title" },
  { id: "rules", icon: "ri-book-open-line", label: "avalon.rulebook.title" },
  { id: "catalog", icon: "ri-gallery-line", label: "avalon.catalog.title" },
];
function selectPanel(nextPanel) {
  if (panel.value === nextPanel) return;
  panel.value = nextPanel;
  if (contentScroll.value) contentScroll.value.scrollTop = 0;
}
</script>
