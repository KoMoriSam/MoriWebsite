<template>
  <Teleport to="body"
    ><div
      v-if="ghost"
      class="pointer-events-none fixed z-[100] origin-center select-none overflow-hidden rounded-field border-2 shadow-2xl"
      :class="[
        valid ? 'border-success' : 'border-error',
        ghost.returning ? 'transition-[left,top] duration-150' : 'rotate-3',
      ]"
      :style="{
        left: ghost.x + 'px',
        top: ghost.y + 'px',
        width: Math.max(ghost.width, 80) + 'px',
        height: Math.max(ghost.height, 96) + 'px',
      }"
    >
      <HandFace
        v-if="card"
        :card="card"
        :dense="ghost.payload.dense"
        :compact="!ghost.payload.dense && ghost.height < 150"
      />
      <TileFace
        v-else-if="tile"
        embedded
        :tile="tile"
        :building="building"
        :detail="ghost.payload.detail"
        :quantity="
          ghost.payload.kind === 'industry'
            ? self.inventory[ghost.payload.industry].length
            : 1
        "
      />
      <div
        v-else
        class="flex h-full flex-col items-center justify-center gap-2 bg-base-100 p-2"
      >
        <i class="ri-route-line text-3xl" aria-hidden="true"></i
        >{{ ghost.label }}
      </div>
      <span
        class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-base-100"
        :class="valid ? 'text-success' : 'text-error'"
        ><i
          :class="valid ? 'ri-check-line' : 'ri-forbid-line'"
          aria-hidden="true"
        ></i
      ></span>
    </div>
    <p
      v-if="ghost && !ghost.returning"
      class="pointer-events-none fixed z-[101] max-w-72 rounded-field px-3 py-2 text-xs font-bold shadow-xl"
      :class="
        valid
          ? 'bg-success text-success-content'
          : 'bg-error text-error-content'
      "
      :style="{
        left: Math.max(8, Math.min(ghost.x, viewportWidth - 296)) + 'px',
        top: Math.max(8, ghost.y - 48) + 'px',
      }"
    >
      {{ hint }}
    </p></Teleport
  >
</template>
<script setup>
import { computed } from "vue";
import { useWindowSize } from "@vueuse/core";
import HandFace from "../display/HandFace.vue";
import TileFace from "../display/TileFace.vue";
import { TILE_BY_ID } from "../../../../../shared/games/fogport/data.js";
const props = defineProps({
  ghost: { type: Object, default: null },
  game: { type: Object, required: true },
  valid: Boolean,
  hint: { type: String, default: "" },
});
const { width: viewportWidth } = useWindowSize();
const self = computed(() =>
  props.game.players.find((p) => p.id === props.game.selfId),
);
const card = computed(() =>
  props.ghost?.payload.kind === "card"
    ? self.value.hand.find((c) => c.id === props.ghost.payload.id)
    : null,
);
const building = computed(() =>
  props.ghost?.payload.kind === "building"
    ? props.game.buildings.find((b) => b.id === props.ghost.payload.id)
    : null,
);
const tile = computed(() => {
  const p = props.ghost?.payload;
  if (p?.kind === "industry")
    return TILE_BY_ID[self.value.inventory[p.industry][0]];
  if (p?.kind === "building")
    return TILE_BY_ID[props.game.buildings.find((b) => b.id === p.id)?.tileId];
  return null;
});
</script>
