<template>
  <Rulebook :player-count="previewCount" />
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
        <RoleOption
          v-for="role in SPECIAL_ROLES"
          :key="role"
          selectable
          :role="role"
          :enabled="specialRoles.includes(role)"
          :disabled="!canAct"
          @change="toggle(role, $event)"
          @details="showRoleDetails"
        />
      </div>
      <RoleRoster :room="room" split />
      <p v-if="!roster.valid" role="alert" class="mt-2 text-sm text-error">
        {{ t("avalon.errors.ROLE_CAPACITY") }}
      </p>
      <p v-if="isHost" class="mt-2 text-xs text-base-content/60">
        {{ t("avalon.config.resetReady") }}
      </p>
    </div>
  </section>
  <RolePreviewPopover
    ref="rolePopover"
    :role="selectedRole"
  />
</template>
<script setup>
import { computed, ref } from "vue";
import { useLocale } from "@/i18n";
import {
  SPECIAL_ROLES,
  DEFAULT_SPECIAL_ROLES,
  roleRoster,
} from "../../../../../shared/games/avalon/index.js";
import RoleOption from "./RoleOption.vue";
import RolePreviewPopover from "./RolePreviewPopover.vue";
import RoleRoster from "../display/RoleRoster.vue";
import Rulebook from "../display/Rulebook.vue";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
});
const { t } = useLocale();
const selectedRole = ref(null);
const rolePopover = ref(null);
const isHost = computed(() => props.room.hostId === props.room.selfId);
const specialRoles = computed(
  () => props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES,
);
const previewCount = computed(() => Math.max(5, props.room.players.length));
const roster = computed(() =>
  roleRoster(previewCount.value, specialRoles.value),
);
function showRoleDetails(role) {
  selectedRole.value = role;
  void rolePopover.value?.open();
}
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
