<template>
  <Rulebook :player-count="previewCount" />
  <div class="divider"></div>
  <section class="card">
    <div class="card-body gap-3 p-0">
      <header class="flex items-center justify-between gap-2">
        <h2
          class="card-title min-w-0 font-serif"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ t("avalon.config.title") }}
        </h2>
        <button
          v-if="isHost"
          type="button"
          class="btn btn-ghost btn-xs ml-auto shrink-0"
          :disabled="!canAct"
          @click="configure(DEFAULT_SPECIAL_ROLES, 'fixed')"
        >
          <i class="ri-reset-left-line" aria-hidden="true"></i
          >{{ t("avalon.config.restore") }}
        </button>
      </header>
      <div
        v-if="overCapacity"
        role="alert"
        class="flex shrink-0 items-start gap-1.5 border-l-2 border-error pl-2 text-xs leading-5 text-base-content/80"
      >
        <i
          class="ri-information-line shrink-0 text-error"
          aria-hidden="true"
        ></i>
        <span class="min-w-0">{{ t("avalon.errors.ROLE_CAPACITY") }}</span>
      </div>
      <ul
        class="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-base-content/60"
      >
        <li class="inline-flex items-start gap-1">
          <i class="ri-lock-line shrink-0" aria-hidden="true"></i>
          <span>{{ t("avalon.config.fixedRoles") }}</span>
        </li>
        <li class="inline-flex items-start gap-1">
          <i class="ri-user-shared-line shrink-0" aria-hidden="true"></i>
          <span>{{ t("avalon.config.hint") }}</span>
        </li>
        <li class="inline-flex items-start gap-1">
          <i class="ri-settings-3-line shrink-0" aria-hidden="true"></i>
          <span>{{ t("avalon.config.resetReady") }}</span>
        </li>
      </ul>
      <div v-if="isHost" class="space-y-3">
        <p class="text-sm font-medium" aria-live="polite">
          {{ t("avalon.config.recommendation", { n: previewCount }) }}
          <span class="ml-2 text-xs font-normal text-base-content/60">{{
            t("avalon.config.recommendationHint")
          }}</span>
        </p>
        <section
          v-for="group in recommendations"
          :key="group.level"
          class="space-y-2"
        >
          <h3 class="text-xs font-medium text-base-content/60">
            <span
              v-if="group.level === 'recommended'"
              class="badge badge-soft badge-sm"
              >{{ t(`avalon.config.levels.${group.level}`) }}</span
            >
            <span v-else>{{ t(`avalon.config.levels.${group.level}`) }}</span>
          </h3>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <RoleOption
              v-for="role in group.roles"
              :key="role"
              selectable
              :role="role"
              :recommendation="group.level"
              :enabled="specialRoles.includes(role)"
              :disabled="!canAct"
              @change="toggle(role, $event)"
              @details="showRoleDetails"
            />
          </div>
        </section>
      </div>
      <LancelotRules :room="room" :editable="isHost" :disabled="!canAct" @select-mode="configure(specialRoles, $event)" />
      <RoleRoster :room="room" split />
    </div>
  </section>
  <RolePreviewPopover ref="rolePopover" :role="selectedRole" :mode="lancelotMode" />
</template>
<script setup>
import { computed, ref } from "vue";
import { useLocale } from "@/i18n";
import {
  SPECIAL_ROLES,
  DEFAULT_SPECIAL_ROLES,
  LANCELOTS,
  isEvil,
  roleRoster,
} from "../../../../../shared/games/avalon/index.js";
import { roleRecommendations } from "../../../../../shared/games/avalon/recommendations.js";
import RoleOption from "./RoleOption.vue";
import RolePreviewPopover from "./RolePreviewPopover.vue";
import RoleRoster from "../display/RoleRoster.vue";
import Rulebook from "../display/Rulebook.vue";
import LancelotRules from "../display/LancelotRules.vue";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
});
const { t } = useLocale();
const selectedRole = ref(null);
const rolePopover = ref(null);
const lancelotMode = computed(() => props.room.gameConfig?.lancelotMode ?? 'fixed');
const isHost = computed(() => props.room.hostId === props.room.selfId);
const specialRoles = computed(
  () => props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES,
);
const previewCount = computed(() => Math.max(5, props.room.players.length));
const recommendations = computed(() => roleRecommendations(previewCount.value));
const roster = computed(() =>
  roleRoster(previewCount.value, specialRoles.value),
);
const overCapacity = computed(() => {
  const { roles, goodSlots, evilSlots } = roster.value;
  const evilCount = roles.filter(isEvil).length;
  return evilCount > evilSlots || roles.length - evilCount > goodSlots;
});
function showRoleDetails(role) {
  selectedRole.value = role;
  void rolePopover.value?.open();
}
function configure(roles, mode = lancelotMode.value) {
  if (!isHost.value || !props.canAct) return;
  if (!LANCELOTS.every(role => roles.includes(role))) mode = 'fixed';
  if (
    mode === lancelotMode.value &&
    SPECIAL_ROLES.every(
      (role) => roles.includes(role) === specialRoles.value.includes(role),
    )
  )
    return;
  void props.run("configure", { config: { specialRoles: [...roles], lancelotMode: mode } });
}
function toggle(role, enabled) {
  configure(
    SPECIAL_ROLES.filter((candidate) =>
      (
        LANCELOTS.includes(role)
          ? LANCELOTS.includes(candidate)
          : candidate === role
      )
        ? enabled
        : specialRoles.value.includes(candidate),
    ),
  );
}
</script>
