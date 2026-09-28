<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col">
    <nav
      class="mb-4 shrink-0 lg:is-drawer-open:pr-10"
      :aria-label="t('avalon.mobile.navigation')"
    >
      <div
        role="tablist"
        class="tabs tabs-border tabs-sm hidden w-full flex-nowrap overflow-x-auto lg:is-drawer-open:flex"
      >
        <button
          v-for="item in visibleMenuItems"
          :id="`${panelId}-menu-${item.id}`"
          :key="item.id"
          type="button"
          role="tab"
          class="tab min-w-0 shrink-0 gap-2 whitespace-nowrap"
          :class="panel === item.id ? 'tab-active' : ''"
          :aria-selected="panel === item.id"
          :aria-controls="`${panelId}-${item.id}`"
          @click="emit('select-panel', item.id)"
        >
          <span class="indicator">
            <span
              v-if="item.id === 'discussion' && unread"
              class="indicator-item badge badge-error badge-xs min-w-5 px-1 font-semibold tabular-nums"
              aria-hidden="true"
              >{{ unread }}</span
            >
            <i
              :class="item.icon"
              class="text-lg leading-none"
              aria-hidden="true"
            ></i>
          </span>
          {{ t(item.label) }}
          <span v-if="item.id === 'discussion' && unread" class="sr-only">{{
            t("avalon.phrases.unread", { n: unread })
          }}</span>
        </button>
      </div>
      <ul class="menu w-full gap-1 p-0 lg:is-drawer-open:hidden">
        <li
          v-for="item in visibleMenuItems"
          :key="item.id"
          class="lg:is-drawer-close:tooltip lg:is-drawer-close:tooltip-left lg:is-drawer-close:flex! lg:is-drawer-close:items-center"
          :data-tip="t(item.label)"
        >
          <button
            :id="`${panelId}-menu-${item.id}-collapsed`"
            type="button"
            class="btn btn-ghost btn-sm min-w-0 gap-2 whitespace-nowrap lg:is-drawer-close:btn-square"
            :class="panel === item.id ? 'btn-active' : ''"
            :aria-label="t(item.label)"
            :aria-pressed="panel === item.id"
            :aria-controls="`${panelId}-${item.id}`"
            @click="emit('select-panel', item.id)"
          >
            <span class="indicator">
              <span
                v-if="item.id === 'discussion' && unread"
                class="indicator-item badge badge-error badge-xs min-w-5 px-1 font-semibold tabular-nums"
                aria-hidden="true"
                >{{ unread }}</span
              >
              <i
                :class="item.icon"
                class="text-lg leading-none"
                aria-hidden="true"
              ></i>
            </span>
            <span class="lg:is-drawer-close:hidden">{{ t(item.label) }}</span>
            <span v-if="item.id === 'discussion' && unread" class="sr-only">{{
              t("avalon.phrases.unread", { n: unread })
            }}</span>
          </button>
        </li>
      </ul>
    </nav>
    <div
      ref="discussionPanel"
      :id="`${panelId}-discussion`"
      role="region"
      :aria-labelledby="`${panelId}-menu-discussion`"
      class="min-h-0 flex-1 lg:is-drawer-close:hidden"
      :class="panel === 'discussion' ? '' : 'hidden'"
      @focusin="unread = 0"
    >
      <AvalonDiscussion
        :room="gameRoom"
        :can-act="canAct && canSpeak"
        :active="panel === 'discussion'"
        compact
        :run="run"
      />
    </div>
    <section
      :id="`${panelId}-history`"
      role="region"
      :aria-labelledby="`${panelId}-menu-history`"
      class="card min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin lg:is-drawer-close:hidden"
      :class="panel === 'history' ? '' : 'hidden'"
    >
      <div class="card-body p-0">
        <p
          v-if="!gameRoom.history.length"
          class="py-5 text-sm text-base-content/50"
        >
          {{ t("avalon.mobile.historyEmpty") }}
        </p>
        <ol class="space-y-4">
          <li
            v-for="quest in recordedQuests"
            :key="quest"
            class="card card-border border-base-300 p-3 sm:p-4"
          >
            <AvalonQuestHistory :room="gameRoom" :quest="quest" />
          </li>
        </ol>
      </div>
    </section>
    <section
      :id="`${panelId}-players`"
      role="region"
      :aria-labelledby="`${panelId}-menu-players`"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin lg:is-drawer-close:hidden"
      :class="midDesktop && panel === 'players' ? '' : 'hidden'"
    >
      <div :id="playersTargetId" class="min-w-0"></div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, useId, watch } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { useLocale } from "@/i18n";
import { canDiscuss } from "../../../../shared/games/avalon-discussion.js";
import AvalonDiscussion from "./AvalonDiscussion.vue";
import AvalonQuestHistory from "./AvalonQuestHistory.vue";

const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
  panel: { type: String, default: "discussion" },
  playersTargetId: { type: String, required: true },
});
const emit = defineEmits(["select-panel"]);
const { t } = useLocale();
const panelId = `avalon-sidebar-${useId()}`;
const midDesktop = useMediaQuery("(min-width: 1024px) and (max-width: 1279px)");
const menuItems = [
  { id: "players", icon: "ri-group-line", label: "avalon.mobile.players" },
  {
    id: "discussion",
    icon: "ri-user-voice-line",
    label: "avalon.mobile.discussion",
  },
  { id: "history", icon: "ri-history-line", label: "avalon.mobile.history" },
];
const visibleMenuItems = computed(() =>
  midDesktop.value
    ? menuItems
    : menuItems.filter((item) => item.id !== "players"),
);
const gameRoom = computed(() => ({
  ...props.room,
  ...props.room.game,
  game: props.room.round,
  players: props.room.players.map((player) => ({
    ...player,
    ...(props.room.game.revealedRoles
      ? { role: props.room.game.revealedRoles[player.id] }
      : {}),
  })),
}));
const canSpeak = computed(() =>
  canDiscuss(gameRoom.value, gameRoom.value.selfId),
);
const recordedQuests = computed(() =>
  [...new Set(gameRoom.value.history.map((entry) => entry.quest))].sort(
    (a, b) => a - b,
  ),
);
const discussionPanel = ref(null);
const unread = ref(0);
watch(midDesktop, (isMidDesktop) => {
  if (!isMidDesktop && props.panel === "players")
    emit("select-panel", "discussion");
});
watch(
  [
    () => props.room.code,
    () => props.room.round,
    () => props.room.selfId,
    () => props.room.messages ?? [],
  ],
  ([code, round, selfId, messages], previous) => {
    if (
      !previous ||
      code !== previous[0] ||
      round !== previous[1] ||
      selfId !== previous[2]
    ) {
      unread.value = 0;
      if (previous) emit("select-panel", "discussion");
      return;
    }
    if (
      props.panel === "discussion" &&
      typeof document !== "undefined" &&
      discussionPanel.value?.contains(document.activeElement)
    )
      return;
    const seen = new Set(previous[3].map((message) => message.id));
    unread.value += messages.filter(
      (message) => !seen.has(message.id) && message.playerId !== selfId,
    ).length;
  },
  { immediate: true },
);
</script>
