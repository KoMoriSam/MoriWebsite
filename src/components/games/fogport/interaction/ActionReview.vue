<template>
  <section
    class="flex max-h-64 min-h-0 shrink-0 flex-col rounded-box border border-base-300 bg-base-100/95 p-2 shadow-lg backdrop-blur-sm lg:max-h-72"
    :aria-label="t('fogport.preview')"
  >
    <div class="flex items-center gap-2">
      <i :class="ACTION_ICONS[kind]" aria-hidden="true"></i
      ><b class="min-w-0 flex-1 truncate text-sm">{{ summary }}</b
      ><button
        class="btn btn-square btn-ghost btn-sm"
        :aria-label="t('fogport.cancel')"
        @click="emit('close')"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>
    <div class="min-h-0 overflow-y-auto overscroll-contain">
      <div class="flex flex-wrap items-center gap-3 py-2 text-sm" role="status">
        <span
          ><i class="ri-coins-line text-warning" aria-hidden="true"></i>
          {{ signed(preview.delta?.money ?? 0) }}</span
        ><span :title="t('fogport.incomeSpaces')"
          ><i
            class="ri-arrow-up-circle-line text-success"
            aria-hidden="true"
          ></i>
          {{ signed(preview.delta?.income ?? 0) }}</span
        ><span :title="t('fogport.vp')"
          ><i class="ri-star-line text-primary" aria-hidden="true"></i>
          {{ signed(preview.delta?.vp ?? 0) }}</span
        ><span class="text-xs text-base-content/60"
          >{{ t("fogport.mode.payCard") }}:
          {{
            cardName(
              self.hand.find((c) => c.id === command.card),
              t,
            )
          }}</span
        >
      </div>
      <div
        v-for="tile in changedBuildings"
        :key="tile.id"
        class="flex flex-wrap items-center gap-2 pb-1 text-xs"
      >
        <i
          :class="INDUSTRY_ICONS[TILE_BY_ID[tile.tileId].type]"
          aria-hidden="true"
        ></i
        ><span
          >{{ placeName(tile.location, t) }} ·
          {{ tileName(tile.tileId, t) }}</span
        ><span>{{ t("fogport.output") }} {{ tile.resources }}</span
        ><span
          class="badge badge-xs"
          :class="tile.flipped ? 'badge-success' : 'badge-ghost'"
          >{{ t(tile.flipped ? "fogport.flipped" : "fogport.unflipped") }}</span
        >
      </div>
      <fieldset v-for="step in resources" :key="step.index" class="fieldset">
        <legend class="fieldset-legend py-1">
          {{
            t("fogport.chooseResource", {
              resource: t("fogport.resources." + step.resource),
            })
          }}
        </legend>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="source in step.choices"
            :key="source.id"
            class="btn btn-xs h-auto min-h-8 whitespace-normal"
            :class="step.source === source.id ? 'btn-active' : ''"
            :disabled="submitted"
            @click="
              change({ ...command, resources: [...step.prefix, source.id] })
            "
          >
            {{ sourceName(source.id, step.state)
            }}<span v-if="source.price"> · £{{ source.price }}</span>
          </button>
        </div>
      </fieldset>
      <fieldset
        v-for="(sale, i) in command.sales ?? []"
        :key="sale.building"
        class="fieldset"
      >
        <legend class="fieldset-legend py-1">{{ saleName(sale) }}</legend>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="type in bonusChoices(game, game.selfId, command, i)"
            :key="type"
            class="btn btn-xs"
            :class="sale.bonus === type ? 'btn-active' : ''"
            :disabled="submitted"
            @click="bonus(i, type)"
          >
            <i :class="INDUSTRY_ICONS[type]" aria-hidden="true"></i
            >{{ t("fogport.industries." + type) }}</button
          ><button
            v-if="command.sales.length > 1"
            class="btn btn-ghost btn-xs"
            :disabled="submitted"
            @click="
              change({
                ...command,
                sales: command.sales.filter((_, index) => index !== i),
                resources: [],
              })
            "
          >
            <i class="ri-close-line" aria-hidden="true"></i
            >{{ t("fogport.remove") }}
          </button>
        </div>
      </fieldset>
      <p v-if="!preview.valid" class="text-xs text-error">
        {{ t("fogport.errors." + preview.error) }}
      </p>
      <p v-if="error" class="text-xs text-error" role="alert">{{ error }}</p>
    </div>
    <div class="flex flex-wrap justify-end gap-2 pt-2">
      <button
        v-if="canAdd"
        class="btn btn-sm"
        :disabled="submitted"
        @click="emit('add')"
      >
        <i class="ri-add-line" aria-hidden="true"></i
        >{{ t("fogport.mode.add." + kind) }}</button
      ><button
        v-if="command.links?.length === 2 || command.industries?.length === 2"
        class="btn btn-ghost btn-sm"
        :disabled="submitted"
        @click="removeSecond"
      >
        {{ t("fogport.mode.removeSecond") }}</button
      ><button
        class="btn btn-primary btn-sm"
        :disabled="!preview.valid || !canAct || submitted"
        @click="submit"
      >
        <span v-if="submitted" class="loading loading-spinner loading-xs"></span
        >{{ t("fogport.confirm") }}
      </button>
    </div>
  </section>
</template>
<script setup>
import { computed, ref } from "vue";
import { previewAction } from "../../../../../shared/games/fogport/engine.js";
import {
  completeAction,
  extensions,
  resourceSteps,
  bonusChoices,
} from "../../../../../shared/games/fogport/options.js";
import {
  LINK_BY_ID,
  TILE_BY_ID,
} from "../../../../../shared/games/fogport/data.js";
import {
  ACTION_ICONS,
  INDUSTRY_ICONS,
  cardName,
  placeName,
  tileName,
  routeName,
} from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  game: { type: Object, required: true },
  command: { type: Object, required: true },
  kind: { type: String, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
  error: { type: String, default: "" },
});
const emit = defineEmits(["change", "close", "add"]);
const { t } = useLocale(),
  submitted = ref(false);
const self = computed(() =>
  props.game.players.find((p) => p.id === props.game.selfId),
);
const preview = computed(() =>
  previewAction(props.game, props.game.selfId, props.command),
);
const changedBuildings = computed(() =>
  preview.value.valid
    ? preview.value.state.buildings.filter((tile) => {
        const old = props.game.buildings.find((b) => b.id === tile.id);
        return (
          !old ||
          old.flipped !== tile.flipped ||
          old.resources !== tile.resources
        );
      })
    : [],
);
const resources = computed(() =>
  resourceSteps(props.game, props.game.selfId, props.command).filter(
    (s) => s.choices.length > 1,
  ),
);
const canAdd = computed(
  () => extensions(props.game, props.game.selfId, props.command).length > 0,
);
const signed = (n) => (n >= 0 ? "+" + n : n);
const summary = computed(() =>
  props.kind === "build"
    ? placeName(props.command.location, t) +
      " · " +
      t("fogport.industries." + props.command.industry)
    : props.kind === "network"
      ? props.command.links
          .map((id) => routeName(LINK_BY_ID[id], props.game.era, t))
          .join(" → ")
      : props.kind === "develop"
        ? props.command.industries
            .map((type, i) =>
              tileName(
                self.value.inventory[type][
                  i && type === props.command.industries[0] ? 1 : 0
                ],
                t,
              ),
            )
            .join(" → ")
        : props.command.sales.map(saleName).join(" · "),
);
function saleName(sale) {
  const tile = props.game.buildings.find((b) => b.id === sale.building),
    m = props.game.merchants.find((m) => m.id === sale.merchant);
  return placeName(tile.location, t) + " → " + placeName(m.location, t);
}
function sourceName(id, state) {
  if (id === "market") return t("fogport.market");
  if (id.startsWith("m:")) {
    const m = state.merchants.find((m) => m.id === id.slice(2));
    const rows = state.merchants.filter((v) => v.location === m.location);
    return (
      placeName(m.location, t) +
      " · " +
      t("fogport.info.buyer", { n: rows.findIndex((v) => v.id === m.id) + 1 })
    );
  }
  const tile = state.buildings.find((b) => b.id === id);
  return (
    state.players.find((p) => p.id === tile.owner).nickname +
    " · " +
    placeName(tile.location, t)
  );
}
function change(command) {
  if (submitted.value) return;
  const result = completeAction(props.game, props.game.selfId, command);
  if (result.valid) emit("change", result.command);
}
function bonus(i, type) {
  const sales = props.command.sales.map((s, index) =>
    index === i ? { ...s, bonus: type } : s,
  );
  change({ ...props.command, sales, resources: [] });
}
function removeSecond() {
  const key = props.command.links ? "links" : "industries";
  change({
    ...props.command,
    [key]: props.command[key].slice(0, 1),
    resources: [],
  });
}
async function submit() {
  if (!preview.value.valid || !props.canAct || submitted.value) return;
  submitted.value = true;
  try {
    const saved = await props.run(props.command.type, props.command);
    if (!saved) submitted.value = false;
  } catch {
    submitted.value = false;
  }
}
</script>
