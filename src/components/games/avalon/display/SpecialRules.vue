<template>
  <section
    v-if="entries.length"
    class="@container min-w-0 space-y-3"
    :aria-labelledby="hideHeading ? undefined : headingId"
    :aria-label="hideHeading ? t('avalon.specialRules.title') : undefined"
  >
    <h3 v-if="!hideHeading" :id="headingId" class="font-serif font-semibold">
      {{ t("avalon.specialRules.title") }}
    </h3>
    <div
      class="columns-1 gap-x-6 [column-rule:1px_solid_var(--color-base-300)] @2xl:columns-2 @5xl:columns-3"
    >
      <section
        v-for="entry in entries"
        :key="entry.id"
        class="min-w-0 break-inside-avoid space-y-2 py-3"
      >
        <header class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h4 class="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            <button
              v-if="entry.id === 'lady'"
              type="button"
              class="flex min-w-0 items-center gap-2 rounded-field text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :aria-label="
                t('avalon.config.viewRole', { name: t(entry.title) })
              "
              @click="skillPopover?.open()"
            >
              <i :class="entry.icon" aria-hidden="true"></i>
              {{ t(entry.title) }}
            </button>
            <template v-else>
              <i :class="entry.icon" aria-hidden="true"></i>
              {{ t(entry.title) }}
            </template>
          </h4>
          <span
            v-if="entry.side"
            class="badge badge-ghost badge-xs"
            :class="entry.side === 'good' ? 'text-success' : 'text-error'"
            >{{ t(`avalon.night.${entry.side}`) }}</span
          >
          <span
            v-if="entry.id === 'lady'"
            class="text-xs text-base-content/60"
            >{{ t("avalon.lady.slotFree") }}</span
          >
          <input
            v-if="entry.id === 'lady' && configurable"
            type="checkbox"
            class="checkbox checkbox-sm ml-auto"
            :aria-label="t('avalon.lady.title')"
            :checked="ladyEnabled"
            :disabled="!editable || disabled"
            @change="emit('select-lady', $event.target.checked)"
          />
          <label
            v-if="entry.id === 'lancelot' && editable"
            class="ml-auto flex min-w-0 max-w-full cursor-pointer items-center gap-2 text-xs text-base-content/60"
          >
            <span class="min-w-0">{{ t("avalon.lancelot.enableSwitch") }}</span>
            <input
              type="checkbox"
              class="toggle toggle-sm shrink-0"
              :checked="selectedMode === 'switching'"
              :disabled="disabled"
              @change="
                emit(
                  'select-mode',
                  $event.target.checked ? 'switching' : 'fixed',
                )
              "
            />
          </label>
          <span
            v-if="entry.id === 'lancelot' && !editable"
            class="badge badge-ghost badge-xs ml-auto"
            >{{ t(`avalon.lancelot.modes.${selectedMode}`) }}</span
          >
        </header>
        <template v-if="entry.id === 'lancelot'">
          <p class="text-xs leading-5 text-base-content/60">
            {{
              t(
                configurable
                  ? "avalon.specialRules.pairConfig"
                  : "avalon.specialRules.pair",
              )
            }}
          </p>
        </template>
        <dl
          v-if="entry.id !== 'lady' || ladyEnabled || catalog"
          class="space-y-1.5 text-xs leading-5"
          :aria-live="entry.id === 'lancelot' ? 'polite' : undefined"
        >
          <div
            v-for="line in entry.lines"
            :key="line.label"
            class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2"
          >
            <dt class="flex items-start gap-1 font-medium text-base-content/60">
              <i :class="labels[line.label]" aria-hidden="true"></i
              >{{ t(`avalon.specialRules.labels.${line.label}`) }}
            </dt>
            <dd
              class="min-w-0 break-words"
              :class="
                line.emphasis
                  ? 'font-medium text-base-content'
                  : 'text-base-content/75'
              "
            >
              <p v-for="key in line.keys" :key="key">{{ t(key) }}</p>
            </dd>
          </div>
        </dl>
      </section>
    </div>
    <RolePreviewPopover ref="skillPopover" skill="lady" />
  </section>
</template>

<script setup>
import { computed, ref, useId } from "vue";
import { useLocale } from "@/i18n";
import RolePreviewPopover from "../interaction/RolePreviewPopover.vue";
import {
  SPECIAL_ROLES,
  DEFAULT_SPECIAL_ROLES,
  LANCELOTS,
  roleAlignment,
} from "../../../../../shared/games/avalon/index.js";
const props = defineProps({
  room: { type: Object, default: () => ({}) },
  catalog: Boolean,
  configurable: Boolean,
  editable: Boolean,
  disabled: Boolean,
  mode: { type: String, default: null },
  side: { type: String, default: null },
  extensionsOnly: Boolean,
  hideHeading: Boolean,
});
const emit = defineEmits(["select-mode", "select-lady"]);
const { t } = useLocale();
const headingId = `special-rules-${useId()}`;
const skillPopover = ref(null);
const selectedMode = computed(
  () =>
    props.mode ??
    props.room.game?.lancelotMode ??
    props.room.lancelotMode ??
    props.room.gameConfig?.lancelotMode ??
    "fixed",
);
const ladyEnabled = computed(() => !!props.room.gameConfig?.ladyOfTheLake);
const labels = {
  ability: "ri-magic-line",
  night: "ri-moon-line",
  quest: "ri-flag-line",
  check: "ri-search-eye-line",
  trigger: "ri-time-line",
  outcome: "ri-trophy-line",
  limit: "ri-lock-line",
};
const line = (label, keys, emphasis = false) => ({
  label,
  keys: Array.isArray(keys) ? keys : [keys],
  emphasis,
});
const roleLines = {
  percival: [["night", "vision"]],
  morgana: [["night", "vision"]],
  mordred: [["night", "vision"]],
  oberon: [["night", "vision"]],
  cleric: [
    ["night", "vision"],
    ["check", "check"],
  ],
  lunatic: [["quest", "quest"]],
  brute: [
    ["quest", "quest"],
    ["limit", "limit"],
  ],
  revealer: [["trigger", "reveal"]],
  untrustworthy_servant: [
    ["night", "vision"],
    ["quest", "quest"],
    ["trigger", "recruit"],
    ["outcome", "outcome"],
  ],
  trickster: [
    ["check", "check"],
    ["limit", "limit"],
  ],
};
const lancelotLines = computed(() =>
  selectedMode.value === "switching"
    ? [
        line("night", [
          "avalon.specialRules.lancelot.night",
          "avalon.specialRules.lancelot.vision",
        ]),
        line("trigger", [
          "avalon.specialRules.lancelot.deck",
          "avalon.specialRules.lancelot.draw",
        ]),
        line("check", "avalon.specialRules.lancelot.private", true),
        line("quest", "avalon.specialRules.lancelot.permissions", true),
        line("outcome", "avalon.specialRules.lancelot.outcome"),
      ]
    : [
        line("night", "avalon.specialRules.lancelot.fixed"),
        line("quest", "avalon.specialRules.lancelot.permissions"),
      ],
);
const entries = computed(() => {
  const roles = props.catalog
    ? SPECIAL_ROLES
    : (props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES);
  const result = roles
    .filter((role) => !LANCELOTS.includes(role))
    .map((role) => ({
      id: role,
      title: `avalon.roles.${role}`,
      side: roleAlignment(role),
      icon:
        roleAlignment(role) === "good"
          ? "ri-shield-line text-success"
          : "ri-skull-line text-error",
      lines: roleLines[role]?.map(([label, key]) =>
        line(
          label,
          `avalon.specialRules.roles.${role}.${key}`,
          ["quest", "trigger", "check"].includes(label),
        ),
      ) ?? [line("ability", `avalon.roleHints.${role}`)],
    }));
  if (LANCELOTS.every((role) => roles.includes(role)))
    result.push({
      id: "lancelot",
      title: "avalon.lancelot.title",
      icon: "ri-arrow-left-right-line",
      lines: lancelotLines.value,
    });
  if (props.configurable || props.catalog || ladyEnabled.value)
    result.push({
      id: "lady",
      title: "avalon.lady.title",
      icon: "ri-water-flash-line",
      lines: [
        line("night", "avalon.specialRules.lady.holder"),
        line("trigger", "avalon.specialRules.lady.timing", true),
        line("check", "avalon.specialRules.lady.result"),
        line("limit", "avalon.specialRules.lady.targets"),
      ],
    });
  return result.filter((entry) =>
    props.side
      ? entry.side === props.side
      : !props.extensionsOnly || !entry.side,
  );
});
</script>
