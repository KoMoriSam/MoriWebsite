<template>
  <section
    class="flex min-w-0 flex-col gap-2"
    :class="split ? 'md:grid md:grid-cols-2' : ''"
  >
    <section
      v-for="group in roleGroups"
      :key="group.side"
      class="card card-dash min-w-0 overflow-hidden p-2"
      :class="
        group.side === 'good'
          ? 'border-success/50 bg-success/5'
          : 'border-error/50 bg-error/5'
      "
    >
      <h3
        class="self-center mb-2 flex flex-wrap items-baseline gap-x-2 font-serif font-semibold"
      >
        <span>{{ t(`avalon.night.${group.side}`) }}</span>
        <span class="text-sm font-normal text-base-content/60">{{
          t("avalon.config.campCount", { n: group.count })
        }}</span>
      </h3>
      <div class="flex flex-col gap-2">
        <div
          v-for="(row, rowIndex) in group.rows"
          :key="rowIndex"
          class="role-fan grid"
          :class="[
            denseRoleFan ? 'role-fan-dense' : '',
            narrow ? 'role-fan-narrow' : '',
          ]"
          :style="{ '--stack-leading': row.length - 1 }"
        >
          <button
            v-for="(role, index) in row"
            :key="`${role}-${rowIndex}-${index}`"
            type="button"
            class="card card-border role-fan-card cursor-pointer relative isolate aspect-2/3 min-w-0 overflow-hidden text-left hover:z-20 hover:shadow-2xl focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:shadow-2xl"
            :style="fanCardStyle(index, row.length)"
            :aria-label="
              t('avalon.config.viewRole', { name: t(`avalon.roles.${role}`) })
            "
            @click="showRoleDetails(role)"
          >
            <img
              :src="roleImage(role)"
              alt=""
              class="absolute inset-0 h-full w-full object-cover object-[center_20%]"
              @error="$event.currentTarget.style.opacity = '0'"
              @load="$event.currentTarget.style.opacity = ''"
            />
            <span
              class="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-linear-to-t from-black/95 via-black/75 to-transparent px-2 pb-2 pt-10 text-center"
              :class="captionClasses"
            >
              <span
                class="min-w-0 max-w-full text-xs font-medium text-nowrap"
                :class="[
                  currentRoleAlignment(room, role) === 'evil' ? 'text-error' : 'text-success',
                  labelClasses,
                ]"
              >
                {{
                  t(`avalon.night.${currentRoleAlignment(room, role)}`)
                }}
              </span>
              <span
                class="min-w-0 max-w-full font-serif text-sm font-semibold leading-tight text-white text-nowrap"
                :class="labelClasses"
                >{{ t(`avalon.roles.${role}`) }}</span
              >
            </span>
          </button>
        </div>
      </div>
    </section>
    <RolePreviewPopover
      ref="rolePopover"
      :role="selectedRole"
      :mode="lancelotMode"
      :alignment="selectedRole ? currentRoleAlignment(room, selectedRole) : undefined"
      :target="previewTarget"
    />
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { useLocale } from "@/i18n";
import { roleImage, currentRoleAlignment } from "@/games/avalon/presentation";
import {
  DEFAULT_SPECIAL_ROLES,
  roleRoster,
} from "../../../../../shared/games/avalon/index.js";
import RolePreviewPopover from "../interaction/RolePreviewPopover.vue";

const props = defineProps({
  room: { type: Object, required: true },
  previewTarget: { type: String, default: "body" },
  narrow: Boolean,
  split: Boolean,
});
const { t } = useLocale();
const selectedRole = ref(null);
const rolePopover = ref(null);
const lancelotMode = computed(() => props.room.game?.lancelotMode ?? props.room.lancelotMode ?? props.room.gameConfig?.lancelotMode ?? 'fixed');
const playerCount = computed(() =>
  Math.max(5, props.room.participants?.length ?? props.room.players.length),
);
const roster = computed(() =>
  roleRoster(
    playerCount.value,
    props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES,
  ),
);
const roleGroups = computed(() =>
  ["good", "evil"].map((side) => {
    const roles = roster.value.roles.filter((role) =>
      currentRoleAlignment(props.room, role) === side,
    );
    return {
      side,
      count: roles.length,
      rows: splitRoleRows(roles),
    };
  }),
);
const denseRoleFan = computed(() =>
  roleGroups.value.some((group) => group.rows.some((row) => row.length >= 4)),
);
const captionClasses = computed(() => [
  "max-sm:items-start max-sm:px-1 max-sm:text-left",
  props.split ? "md:max-xl:items-start md:max-xl:px-1 md:max-xl:text-left" : "",
  props.narrow ? "lg:items-start lg:px-1 lg:text-left" : "",
]);
const labelClasses = computed(() => [
  denseRoleFan.value ? "max-sm:max-w-8" : "max-sm:max-w-12",
  "max-sm:text-[0.65rem]",
  props.split ? "md:max-xl:max-w-12" : "",
  props.narrow ? "lg:max-w-12" : "",
]);

function splitRoleRows(roles) {
  const rowCount = Math.ceil(roles.length / 4);
  const perRow = Math.ceil(roles.length / rowCount);
  return Array.from({ length: rowCount }, (_, index) =>
    roles.slice(index * perRow, (index + 1) * perRow),
  );
}

function fanCardStyle(index, total) {
  const center = (total - 1) / 2;
  const distance = center ? Math.abs(index - center) / center : 0;
  return {
    "--fan-angle": `${(index - center) * 6}deg`,
    "--fan-x": `${center ? ((center - index) / center) * 0.5 : 0}rem`,
    "--fan-y": `${0.5 - (1 - distance) * 1.75}rem`,
  };
}

function showRoleDetails(role) {
  selectedRole.value = role;
  void rolePopover.value?.open();
}
</script>

<style scoped>
.role-fan {
  --role-card-width: min(7rem, 30vw);
  grid-template-columns: repeat(var(--stack-leading), minmax(0, 1fr)) var(
      --role-card-width
    );
  gap: 0;
  padding: 1rem;
}

.role-fan-dense {
  --role-card-width: min(6rem, 23vw);
}

.role-fan-card {
  width: var(--role-card-width);
  transform-origin: center bottom;
  transform: translate(var(--fan-x), var(--fan-y)) rotate(var(--fan-angle));
}

.role-fan-card:hover,
.role-fan-card:focus-visible {
  transform: translate(var(--fan-x), calc(var(--fan-y) - 1rem)) rotate(0)
    scale(1.04);
}

@media (min-width: 640px) {
  .role-fan {
    --role-card-width: 9rem;
    padding: 2rem 1.5rem 1.25rem;
  }

  .role-fan-dense {
    --role-card-width: 9rem;
  }
}

@media (min-width: 768px) {
  .role-fan-dense {
    --role-card-width: 7rem;
  }
}

@media (min-width: 1024px) {
  .role-fan {
    --role-card-width: 10rem;
  }

  .role-fan-dense {
    --role-card-width: 9rem;
  }

  .role-fan.role-fan-narrow {
    --role-card-width: 9rem;
  }

  .role-fan.role-fan-narrow.role-fan-dense {
    --role-card-width: 8rem;
  }
}

@media (min-width: 1280px) {
  .role-fan-dense {
    --role-card-width: 10rem;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .role-fan-card {
    transition:
      transform 240ms ease,
      box-shadow 240ms ease;
  }
}
</style>
