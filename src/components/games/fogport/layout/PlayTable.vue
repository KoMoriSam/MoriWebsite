<template>
  <div
    v-if="game"
    ref="tableRoot"
    class="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
  >
    <header
      class="flex shrink-0 items-center justify-between gap-2 rounded-box border border-base-300 bg-base-100 px-2 py-1.5 lg:h-16 lg:gap-3 lg:px-3 lg:py-2"
    >
      <div class="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
        <Avatar
          v-if="acting"
          class="[&>div]:size-7 lg:[&>div]:size-9"
          :src="room.players.find((p) => p.id === acting.id)?.avatarUrl"
          :name="acting.nickname"
        />
        <div class="min-w-0">
          <div
            class="hidden items-center gap-2 text-[10px] text-base-content/60 lg:flex"
          >
            <span
              class="flex items-center gap-1"
              :class="game.era === 'canal' ? 'text-primary font-bold' : ''"
              ><i class="ri-ship-line" aria-hidden="true"></i
              >{{ t("fogport.canal") }}</span
            ><i class="ri-arrow-right-s-line" aria-hidden="true"></i
            ><span
              class="flex items-center gap-1"
              :class="game.era === 'rail' ? 'text-secondary font-bold' : ''"
              ><i class="ri-train-line" aria-hidden="true"></i
              >{{ t("fogport.rail") }}</span
            ><span>· {{ t("fogport.round", { n: game.eraRound }) }}</span>
          </div>
          <p class="truncate text-[10px] text-base-content/60 lg:hidden">
            <i
              :class="game.era === 'canal' ? 'ri-ship-line' : 'ri-train-line'"
              aria-hidden="true"
            ></i>
            {{ t("fogport." + game.era) }} ·
            {{ t("fogport.round", { n: game.eraRound }) }}
          </p>
          <div class="flex min-w-0 items-center gap-2 lg:mt-1">
            <h2
              class="truncate font-serif text-xs font-bold lg:text-base"
              :title="turnLabel"
            >
              {{ turnLabel }}
            </h2>
            <span
              v-if="headerActions && core.includes(activeKind)"
              class="badge badge-sm shrink-0"
              ><i :class="ACTION_ICONS[activeKind]" aria-hidden="true"></i
              >{{ t("fogport.actions." + activeKind) }}</span
            >
          </div>
        </div>
      </div>
      <div
        ref="assetSummary"
        class="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs lg:gap-3 lg:text-sm"
      >
        <span class="text-[10px] text-base-content/60" :title="self.nickname">{{
          t("fogport.info.you")
        }}</span
        ><span :title="t('fogport.cash')"
          ><i class="ri-coins-line text-warning" aria-hidden="true"></i>
          <b>{{ self.money }}</b></span
        ><span
          :title="
            t('fogport.info.roundIncome') + ' · ' + t('fogport.info.incomeHint')
          "
          ><i
            class="ri-arrow-up-circle-line text-success"
            aria-hidden="true"
          ></i>
          <b>{{ incomeLevel(self.income) }}</b></span
        ><span :title="t('fogport.info.scored')"
          ><i class="ri-star-line text-primary" aria-hidden="true"></i>
          <b>{{ self.vp }}</b></span
        ><span
          v-if="game.phase === 'turn'"
          class="tooltip tooltip-bottom flex items-center gap-1 border-l border-base-300 pl-2"
          :data-tip="t('fogport.actionPointsHint')"
          :aria-label="
            t('fogport.actionPointsCount', {
              name: acting?.nickname,
              n: game.actionsLeft,
            })
          "
          ><i class="ri-flashlight-line text-primary" aria-hidden="true"></i
          ><b class="tabular-nums">{{ game.actionsLeft }}</b
          ><span class="text-[10px] text-base-content/60">{{
            t("fogport.actionPoints")
          }}</span></span
        >
      </div>
      <div
        :id="toolbarTargetId"
        v-show="headerActions && game.phase === 'turn'"
        :style="{ width: toolbarWidth + 14 + 'px' }"
        class="min-w-0 shrink-0 border-l border-base-300 pl-3"
      ></div>
    </header>
    <div
      v-if="game.boardVersion !== BOARD_VERSION"
      class="alert alert-warning shrink-0 text-sm"
      role="status"
    >
      <i class="ri-information-line" aria-hidden="true"></i
      ><span>{{ t("fogport.errors.BOARD_VERSION") }}</span>
    </div>
    <div class="relative flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
      <main class="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <Board
          v-if="game.boardVersion === BOARD_VERSION"
          :id="`${panelId}-board`"
          v-show="desktop || panel === 'board'"
          class="min-h-0 flex-1"
          :game="game"
          :targets="targets"
          :liquidation-offers="activeKind === 'liquidate' ? commands : []"
          :selected-targets="selectedTargets"
          :active-mode="activeKind"
          :hover-target="hoverTarget"
          :dragging="!!ghost"
          @hover="hover"
          @select="boardSelect"
          @drag="startDrag"
        />
        <div
          v-show="
            !headerActions &&
            game.phase === 'turn' &&
            (desktop || panel === 'board')
          "
          class="absolute left-2 right-28 top-2 z-10 rounded-field bg-base-100/95 p-1 shadow-sm w-fit"
        >
          <Teleport
            :to="`#${toolbarTargetId}`"
            :disabled="!headerActions"
            defer
          >
            <ActionToolbar
              :compact="!desktop"
              :icons-only="!headerActions"
              :actions="ACTIONS"
              :can-act="canPlay"
              :active="activeKind"
              @measure="toolbarWidth = $event"
              @action="open"
            />
          </Teleport>
        </div>
        <div
          v-if="mode && (desktop || panel === 'board')"
          :class="
            !headerActions && game.phase === 'turn'
              ? desktop
                ? 'top-14'
                : 'top-12'
              : 'top-2 right-28'
          "
          class="absolute inset-x-2 z-10 flex items-center gap-2 rounded-field border border-success/50 bg-base-100/95 px-2 py-1.5 text-xs shadow-sm"
          role="status"
        >
          <button
            v-if="mode.adding"
            class="btn btn-square btn-ghost btn-xs"
            :aria-label="t('fogport.mode.back')"
            @click="backMode"
          >
            <i class="ri-arrow-left-line" aria-hidden="true"></i></button
          ><i
            :class="ACTION_ICONS[mode.kind]"
            class="text-success"
            aria-hidden="true"
          ></i
          ><span class="min-w-0 flex-1">{{ modeHint }}</span
          ><span
            v-if="activeKind !== 'liquidate'"
            class="hidden gap-2 whitespace-nowrap sm:flex"
            ><span class="text-success"
              ><i class="ri-checkbox-blank-circle-fill" aria-hidden="true"></i>
              {{ t("fogport.mode.legal") }}</span
            ><span class="text-primary"
              ><i class="ri-checkbox-circle-line" aria-hidden="true"></i>
              {{ t("fogport.mode.selected") }}</span
            ></span
          ><span
            v-if="activeKind === 'liquidate' && submitting"
            class="loading loading-spinner loading-xs"
          ></span
          ><button
            v-else-if="activeKind !== 'liquidate'"
            class="btn btn-square btn-ghost btn-xs"
            :aria-label="t('fogport.cancel')"
            @click="clearMode"
          >
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>
        <section
          v-if="!desktop && ['players', 'market', 'history'].includes(panel)"
          :id="`${panelId}-${panel}`"
          class="h-full overflow-y-auto overscroll-contain scrollbar-thin"
        >
          <PlayerList
            v-if="panel === 'players'"
            :game="game"
            :players="room.players"
          /><Market v-else-if="panel === 'market'" :game="game" /><History
            in-context
            v-else
            :game="game"
          />
        </section>
        <InventoryTray
          v-if="!desktop"
          v-show="panel === 'hand'"
          :id="`${panelId}-hand`"
          v-model:tray="tray"
          :dragging="!!ghost"
          class="h-full"
          :game="game"
          :selected="selected"
          :active-mode="activeKind"
          :legal-cards="cards"
          :legal-industries="industries"
          :legal-targets="targets"
          :selected-targets="selectedTargets"
          :drag-payload="ghost?.payload"
          :chosen-command="mode?.command"
          detail
          @pick="pick"
          @drag="startDrag"
        />
        <ActionReview
          v-if="
            mode?.command &&
            mode.kind !== 'liquidate' &&
            !mode.adding &&
            (desktop || panel === 'board')
          "
          class="absolute inset-x-2 bottom-2 z-30 lg:left-auto lg:w-[calc(100%_-_1rem)] lg:max-w-md"
          :game="game"
          :kind="mode.kind"
          :command="mode.command"
          :can-act="canAct && !ghost"
          :run="runCore"
          :error="error"
          @change="replace"
          @close="clearMode"
          @add="addTarget"
        />
        <section
          v-if="
            activeKind === 'liquidate' &&
            (desktop || panel === 'board') &&
            (liquidationHover || error)
          "
          class="pointer-events-none absolute inset-x-2 bottom-10 z-20 rounded-box border border-warning/40 bg-base-100/95 p-3 text-xs shadow-lg lg:left-auto lg:max-w-sm"
          role="status"
        >
          <template v-if="liquidationHover"
            ><b>{{ liquidationHover.name }}</b>
            <p class="mt-1">
              {{ t("fogport.liquidationDetails", liquidationHover) }}
            </p></template
          >
          <p v-if="error" class="mt-1 text-error" role="alert">{{ error }}</p>
        </section>
        <ActionMenu
          v-if="menu && (desktop || panel === 'board')"
          class="absolute inset-x-2 bottom-2 z-40"
          :title="menu.title"
          :options="menu.options"
          @choose="chooseMenu"
          @close="clearMode"
        />
      </main>
      <Teleport :to="`#${inventoryTargetId}`" :disabled="!midDesktop" defer>
        <InventoryTray
          v-show="
            activeKind !== 'liquidate' &&
            (desktop || (panel === 'board' && (!mode?.command || mode?.adding)))
          "
          v-model:tray="tray"
          :dragging="!!ghost"
          :game="game"
          :selected="selected"
          :active-mode="activeKind"
          :legal-cards="cards"
          :legal-industries="industries"
          :legal-targets="targets"
          :selected-targets="selectedTargets"
          :drag-payload="ghost?.payload"
          :chosen-command="mode?.command"
          :compact="!desktop"
          class="absolute inset-x-2 bottom-2 z-20 shrink-0 lg:static lg:inset-auto lg:z-auto lg:h-full 2xl:w-90"
          @pick="pick"
          @drag="startDrag"
        />
      </Teleport>
    </div>
    <MobileDock
      :items="panels"
      :panel="panel"
      :panel-id="panelId"
      :label="t('fogport.visual.views')"
      @select-panel="selectPanel"
    />
    <ActionEditor
      v-if="draft && myTurn && game.phase === 'turn'"
      :key="editorKey"
      :game="game"
      :initial="draft"
      :can-act="canAct"
      :run="runCore"
      :error="error"
      @close="clearMode"
    />
    <DragPreview
      :ghost="ghost"
      :game="game"
      :valid="dropValid"
      :hint="dropHint"
    />
  </div>
</template>
<script setup>
import { computed, ref, watch, useId, onMounted, onBeforeUnmount } from "vue";
import { useMediaQuery, useElementSize } from "@vueuse/core";
import Avatar from "@/components/auth/Avatar.vue";
import MobileDock from "../../layout/MobileDock.vue";
import ActionToolbar from "../interaction/ActionToolbar.vue";
import Board from "../display/Board.vue";
import InventoryTray from "../interaction/InventoryTray.vue";
import ActionMenu from "../interaction/ActionMenu.vue";
import ActionReview from "../interaction/ActionReview.vue";
import DragPreview from "../interaction/DragPreview.vue";
import PlayerList from "../display/PlayerList.vue";
import Market from "../display/Market.vue";
import History from "../display/History.vue";
import ActionEditor from "../interaction/ActionEditor.vue";
import {
  incomeLevel,
  LINK_BY_ID,
  BOARD_VERSION,
} from "../../../../../shared/games/fogport/data.js";
import {
  actorId,
  previewAction,
} from "../../../../../shared/games/fogport/engine.js";
import {
  cardName,
  placeName,
  tileName,
  ACTION_ICONS,
  routeName,
} from "@/games/fogport/presentation";
import { usePointerDrag } from "@/composables/games/fogport/usePointerDrag";
import { useActionMode } from "@/composables/games/fogport/useActionMode";
import {
  ACTIONS,
  legalActions,
  unavailableReason,
} from "../../../../../shared/games/fogport/options.js";
import { useToast } from "@/composables/useToast";
import { useLocale } from "@/i18n";
const props = defineProps({
  room: { type: Object, required: true },
  inventoryTargetId: { type: String, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
  error: { type: String, default: "" },
});
const { t } = useLocale(),
  tray = ref("cards");
const toast = useToast({
  position: "center-top",
  duration: 2800,
  closable: false,
  soft: true,
});
const emit = defineEmits(["request-sidebar-panel"]);
const tableRoot = ref(null),
  assetSummary = ref(null),
  toolbarWidth = ref(0);
const { width: tableWidth } = useElementSize(tableRoot),
  { width: assetWidth } = useElementSize(assetSummary);
// Reserve readable player information and divider spacing; measure full labels independently of icon mode.
const headerActions = computed(
  () =>
    desktop.value &&
    toolbarWidth.value > 0 &&
    tableWidth.value >= toolbarWidth.value + assetWidth.value + 240 + 72,
);
const desktop = useMediaQuery("(min-width: 1024px)"),
  midDesktop = useMediaQuery("(min-width: 1024px) and (max-width: 1535px)");
watch(
  midDesktop,
  (value) => {
    if (value) emit("request-sidebar-panel", "hand");
  },
  { immediate: true },
);
const panelId = "fogport-panels-" + useId(),
  game = computed(() => props.room.game),
  selfId = computed(() => props.room.selfId);
const toolbarTargetId = panelId + "-actions";
const self = computed(() =>
    game.value.players.find((p) => p.id === selfId.value),
  ),
  player = (id) => game.value.players.find((p) => p.id === id),
  acting = computed(() => player(actorId(game.value)));
const myTurn = computed(() => actorId(game.value) === selfId.value),
  canPlay = computed(
    () => props.canAct && myTurn.value && game.value.phase === "turn",
  );
const tileLabel = (tile) =>
  placeName(tile.location, t) + " · " + tileName(tile.tileId, t);
const resultLabel = computed(() =>
  game.value.result?.reason === "aborted"
    ? t("fogport.aborted")
    : t("fogport.winners", {
        names: game.value.result?.winners
          .map((id) => player(id).nickname)
          .join(" / "),
      }),
);
const turnLabel = computed(() =>
  game.value.phase === "finished"
    ? resultLabel.value
    : game.value.phase === "liquidation"
      ? t("fogport.debtTurn", { name: acting.value?.nickname })
      : t("fogport.actingPlayer", { name: acting.value?.nickname }),
);
const panels = [
  { id: "board", icon: "ri-route-line", label: "fogport.board" },
  { id: "hand", icon: "ri-stack-line", label: "fogport.hand" },
  { id: "players", icon: "ri-group-line", label: "fogport.players" },
  { id: "market", icon: "ri-exchange-line", label: "fogport.market" },
  { id: "history", icon: "ri-history-line", label: "fogport.history" },
];
const panel = ref("board"),
  editorKey = ref(0);
const {
  context,
  mode,
  activeKind,
  selected,
  menu,
  draft,
  hoverTarget,
  dragTarget,
  commands,
  targets,
  cards,
  industries,
  selectedTargets,
  submitting,
  begin,
  inspect,
  replace,
  chooseIndustry,
  chooseCard,
  matching,
  chooseTarget,
  acceptsPayload,
  acceptsTarget,
  beginDrag,
  finishDrag,
  beginSubmit,
  endSubmit,
  hover,
  dragOver,
  add,
  back,
  reset,
} = useActionMode(game, selfId);
const core = ["build", "network", "develop", "sell"];
function selectPanel(value) {
  if (value === "reference" || ghost.value) return;
  panel.value = value;
  if (["players", "market", "history", "hand"].includes(value))
    emit("request-sidebar-panel", value);
}
defineExpose({ open, selectPanel });
function guard(kind = "turn") {
  if (game.value.boardVersion !== BOARD_VERSION) {
    toast.warning(t("fogport.errors.BOARD_VERSION"));
    return false;
  }
  if (submitting.value) {
    toast.warning(t("fogport.mode.pending"));
    return false;
  }
  if (!props.canAct) {
    toast.warning(t("fogport.ui.offline"));
    return false;
  }
  if (
    !(kind === "liquidate"
      ? myTurn.value && activeKind.value === "liquidate"
      : canPlay.value)
  ) {
    toast.warning(t("fogport.errors.TURN"));
    return false;
  }
  return true;
}
function warn(kind, filter = {}) {
  toast.warning(
    t(
      "fogport.errors." +
        unavailableReason(game.value, selfId.value, kind, filter),
    ),
  );
}
function filterFor(kind, payload = selected.value) {
  const f = {};
  if (payload?.kind === "card") f.card = payload.id;
  if (payload?.kind === "industry" && ["build", "develop"].includes(kind))
    f.industry = payload.industry;
  if (payload?.kind === "building" && kind === "sell") f.building = payload.id;
  return f;
}
function request(kind, filter = {}, selection = null) {
  if (!begin(kind, filter, selection)) {
    warn(kind, filter);
    return false;
  }
  if (core.includes(kind)) {
    panel.value = "board";
    if (["build", "develop", "sell"].includes(kind)) {
      tray.value = "industry";
      if (midDesktop.value) emit("request-sidebar-panel", "hand");
    }
  } else editorKey.value++;
  return true;
}
function open(kind) {
  if (!clickAllowed() || !guard()) return;
  if (activeKind.value === kind) {
    clearMode();
    return;
  }
  request(kind);
}
function pick(payload) {
  if (!clickAllowed() || !guard()) return;
  if (!acceptsPayload(payload)) {
    toast.warning(t("fogport.mode.invalidObject"));
    return;
  }
  if (mode.value && payload.kind === "card") {
    if (!chooseCard(payload.id)) toast.warning(t("fogport.mode.invalidObject"));
    return;
  }
  if (
    mode.value &&
    payload.kind === "industry" &&
    ["build", "develop"].includes(mode.value.kind)
  ) {
    if (!chooseIndustry(payload.industry)) {
      warn(mode.value.kind, filterFor(mode.value.kind, payload));
      return;
    }
    if (mode.value.command) panel.value = "board";
    return;
  }
  if (mode.value) {
    if (!chooseTarget(payload)) toast.warning(t("fogport.mode.invalidObject"));
    return;
  }
  const kinds =
    payload.kind === "industry"
      ? ["build", "develop"]
      : payload.kind === "building"
        ? ["sell"]
        : ACTIONS;
  const options = kinds.flatMap((kind) => {
    const filter = filterFor(kind, payload);
    return legalActions(game.value, selfId.value, kind, filter).length
      ? [{ kind, filter }]
      : [];
  });
  if (!options.length) {
    warn(kinds[0], filterFor(kinds[0], payload));
    return;
  }
  if (options.length === 1)
    request(options[0].kind, options[0].filter, payload);
  else {
    panel.value = "board";
    inspect(
      payload,
      payload.kind === "card"
        ? cardName(
            self.value.hand.find((c) => c.id === payload.id),
            t,
          )
        : tileName(self.value.inventory[payload.industry]?.[0], t),
      options,
    );
  }
}
function chooseMenu(option) {
  if (guard()) request(option.kind, option.filter, selected.value);
}
function targetFrom(value) {
  if (!value) return null;
  const [kind, a, b] = value.split(":");
  if (kind === "slot") {
    const building = game.value.buildings.find(
      (v) => v.location === a && v.slot === Number(b),
    );
    if (["sell", "liquidate"].includes(mode.value?.kind))
      return building ? { kind: "building", id: building.id } : null;
    return { kind, location: a, slot: Number(b) };
  }
  return { kind, id: a, ...(kind === "link" ? { links: [a] } : {}) };
}
const { ghost, start, cancel, clickAllowed } = usePointerDrag(
  drop,
  (payload) => {
    if (!guard()) return false;
    if (!acceptsPayload(payload)) {
      toast.warning(t("fogport.mode.invalidObject"));
      return false;
    }
    const kind =
      mode.value?.kind ??
      { card: "build", industry: "build", building: "sell", link: "network" }[
        payload.kind
      ];
    if (!beginDrag(payload)) {
      warn(kind, filterFor(kind, payload));
      return false;
    }
    panel.value = "board";
    if (midDesktop.value) emit("request-sidebar-panel", "hand");
    return true;
  },
  (position) => dragOver(position ? targetFrom(position.value) : null),
  finishDrag,
);
function startDrag(event, payload, label) {
  start(event, payload, label);
}
const dropRows = computed(() =>
  dragTarget.value ? matching(dragTarget.value) : [],
);
const dropValid = computed(() => dropRows.value.length > 0);
const dropHint = computed(() => {
  if (!dropValid.value)
    return dragTarget.value
      ? t("fogport.mode.invalidDrop") + " · " + failureReason(dragTarget.value)
      : t("fogport.mode.dragHint");
  const c = dropRows.value[0] ?? commands.value[0],
    preview = previewAction(game.value, selfId.value, c);
  const object =
    mode.value.kind === "build"
      ? placeName(c.location, t) + " · " + t("fogport.industries." + c.industry)
      : mode.value.kind === "network"
        ? routeName(LINK_BY_ID[c.links.at(-1)], game.value.era, t)
        : mode.value.kind === "develop"
          ? t("fogport.industries." + c.industries.at(-1))
          : placeName(
              game.value.buildings.find((b) => b.id === c.sales.at(-1).building)
                .location,
              t,
            );
  return t("fogport.mode.drop", {
    action: t("fogport.actions." + mode.value.kind),
    object,
    cost: Math.max(0, -(preview.delta?.money ?? 0)),
  });
});
function drop(payload, value) {
  if (!guard()) return false;
  const target = targetFrom(value);
  if (!target || !matching(target).length) {
    toast.warning(
      target ? failureReason(target) : t("fogport.mode.invalidDrop"),
    );
    return false;
  }
  return applyTarget(target);
}
function boardSelect(target) {
  if (!clickAllowed()) return;
  if (activeKind.value === "liquidate") {
    void liquidate(
      target.kind === "slot"
        ? targetFrom("slot:" + target.location + ":" + target.slot)
        : target,
    );
    return;
  }
  if (!guard()) return;
  if (context.value.kind === "idle") {
    if (target.kind === "slot") {
      const tile = game.value.buildings.find(
        (b) => b.location === target.location && b.slot === target.slot,
      );
      if (tile?.owner === selfId.value && !tile.flipped) {
        request(
          "sell",
          { building: tile.id },
          { kind: "building", id: tile.id },
        );
        return;
      }
      request("build", { location: target.location, slot: target.slot });
    } else if (target.kind === "link") {
      if (request("network")) applyTarget(target);
    } else if (target.kind === "place" && !target.id.startsWith("p"))
      request("build", { location: target.id });
    else if (target.kind === "merchant")
      request("sell", { merchant: target.id });
    else toast.warning(t("fogport.mode.chooseAction"));
    return;
  }
  if (target.kind === "slot" && mode.value?.kind === "sell") {
    const tile = game.value.buildings.find(
      (b) => b.location === target.location && b.slot === target.slot,
    );
    target = tile ? { kind: "building", id: tile.id } : target;
  }
  if (!applyTarget(target)) toast.warning(failureReason(target));
}
function failureReason(target) {
  if (!mode.value || !acceptsTarget(target))
    return t("fogport.mode.invalidObject");
  const f = { ...mode.value.filter };
  if (target.kind === "slot")
    Object.assign(f, { location: target.location, slot: target.slot });
  if (target.kind === "place") f.location = target.id;
  if (target.kind === "link") f.link = target.id;
  if (target.kind === "building") f.building = target.id;
  if (target.kind === "merchant") f.merchant = target.id;
  if (mode.value.adding || (mode.value.kind === "sell" && mode.value.building))
    return t("fogport.mode.invalidObject");
  return t(
    "fogport.errors." +
      unavailableReason(game.value, selfId.value, mode.value.kind, f),
  );
}
function applyTarget(target) {
  return chooseTarget(target);
}
const liquidationHover = computed(() => {
  if (
    activeKind.value !== "liquidate" ||
    !hoverTarget.value?.startsWith("building:")
  )
    return null;
  const offer = commands.value.find(
    (c) => "building:" + c.building === hoverTarget.value,
  );
  if (!offer) return null;
  return {
    ...offer,
    name: tileLabel(game.value.buildings.find((b) => b.id === offer.building)),
  };
});
const modeHint = computed(() =>
  !mode.value
    ? ""
    : activeKind.value === "liquidate"
      ? t("fogport.liquidationHint", {
          n: Math.max(0, game.value.settlement.debt - self.value.money),
        })
      : mode.value.adding
        ? t("fogport.mode.additional." + mode.value.kind)
        : mode.value.building
          ? t("fogport.mode.merchant")
          : mode.value.command
            ? t("fogport.mode.confirm")
            : t("fogport.mode.select." + mode.value.kind),
);
async function runCore(type, command) {
  const token = beginSubmit(type);
  if (!token) return false;
  let saved = false;
  try {
    saved = await props.run(type, command);
    return saved;
  } finally {
    endSubmit(token, saved);
  }
}
function backMode() {
  if (ghost.value) {
    clearMode();
    return;
  }
  back();
}
function addTarget() {
  if (add() && mode.value.kind === "develop") {
    tray.value = "industry";
    if (midDesktop.value) emit("request-sidebar-panel", "hand");
  }
}
function clearMode() {
  cancel();
  reset();
}
async function liquidate(target) {
  if (!guard("liquidate")) return;
  if (!target || !chooseTarget(target)) {
    toast.warning(t("fogport.mode.invalidObject"));
    return;
  }
  const command = { building: mode.value.command.building };
  await runCore("fogport_liquidate", command);
}
function escapeMode(event) {
  if (event.key === "Escape" && !draft.value) backMode();
}
onMounted(() => window.addEventListener("keydown", escapeMode));
onBeforeUnmount(() => window.removeEventListener("keydown", escapeMode));
watch(() => [props.room.code, props.room.round, props.room.stage], clearMode);
watch(
  () => [props.room.code, props.room.round],
  () => {
    panel.value = "board";
    tray.value = "cards";
  },
);
watch(canPlay, (value) => {
  if (!value) clearMode();
});
watch(
  () => activeKind.value,
  (kind) => {
    if (kind === "liquidate") {
      cancel();
      panel.value = "board";
    }
  },
  { immediate: true },
);
</script>
