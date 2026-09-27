<template>
  <div class="divider"></div>
  <section class="card">
    <div class="card-body gap-3 p-0">
      <h2 class="card-title font-serif" aria-live="polite" aria-atomic="true">
        {{ t("avalon.config.title") }}
      </h2>
      <div
        v-if="isHost"
        class="flex flex-wrap items-center justify-between gap-2"
      >
        <span class="min-w-0 flex-1 text-xs leading-5 text-base-content/60">{{
          t("avalon.config.hint")
        }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs ml-auto shrink-0"
          :disabled="!canAct"
          @click="configure(DEFAULT_SPECIAL_ROLES)"
        >
          <i class="ri-reset-left-line" aria-hidden="true"></i
          >{{ t("avalon.config.restore") }}
        </button>
      </div>
      <div
        v-if="isHost"
        class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        <AvalonRoleOption
          v-for="role in SPECIAL_ROLES"
          :key="role"
          selectable
          :role="role"
          :enabled="specialRoles.includes(role)"
          :disabled="!canAct"
          @change="toggle(role, $event)"
        />
      </div>
      <p class="text-sm text-base-content/70" aria-live="polite">
        {{
          t("avalon.config.preview", {
            n: previewCount,
            good: roster.goodSlots,
            evil: roster.evilSlots,
          })
        }}
      </p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <AvalonRoleOption
          v-for="[role, n] in roleCounts"
          :key="role"
          :role="role"
          :count="n"
        />
      </div>
      <p v-if="!roster.valid" role="alert" class="mt-2 text-sm text-error">
        {{ t("avalon.errors.ROLE_CAPACITY") }}
      </p>
      <p v-if="isHost" class="mt-2 text-xs text-base-content/60">
        {{ t("avalon.config.resetReady") }}
      </p>
    </div>
  </section>
</template>
<script setup>
import { computed } from "vue";
import { useLocale } from "@/i18n";
import {
  SPECIAL_ROLES,
  DEFAULT_SPECIAL_ROLES,
  roleRoster,
} from "../../../../shared/games/avalon.js";
import AvalonRoleOption from "./AvalonRoleOption.vue";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
});
const { t } = useLocale();
const isHost = computed(() => props.room.hostId === props.room.selfId);
const specialRoles = computed(
  () => props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES,
);
const previewCount = computed(() => Math.max(5, props.room.players.length));
const roster = computed(() =>
  roleRoster(previewCount.value, specialRoles.value),
);
const roleCounts = computed(() =>
  Object.entries(
    roster.value.roles.reduce((counts, role) => {
      counts[role] = (counts[role] ?? 0) + 1;
      return counts;
    }, {}),
  ),
);
function configure(roles) {
  if (!isHost.value || !props.canAct) return;
  if (
    SPECIAL_ROLES.every(
      (role) => roles.includes(role) === specialRoles.value.includes(role),
    )
  )
    return;
  void props.run("configure", { config: { specialRoles: [...roles] } });
}
function toggle(role, enabled) {
  configure(
    SPECIAL_ROLES.filter((candidate) =>
      candidate === role ? enabled : specialRoles.value.includes(candidate),
    ),
  );
}
</script>
