<template>
  <article
    class="card card-border min-w-0"
    :class="
      enabled
        ? 'border-base-content/40 bg-base-200/40'
        : 'bg-base-100 hover:border-primary/25 hover:bg-primary/5'
    "
  >
    <div class="flex min-w-0 items-center gap-2 p-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 rounded-field text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :aria-label="
          t('avalon.config.viewRole', { name: t(`avalon.roles.${role}`) })
        "
        @click="emit('details', role)"
      >
        <i
          :class="ROLE_ICONS[role]"
          class="shrink-0 text-xl text-base-content/70"
          aria-hidden="true"
        ></i>
        <span class="min-w-0 flex-1">
          <span class="block font-serif text-sm font-semibold leading-5">{{
            t(`avalon.roles.${role}`)
          }}</span>
          <span class="text-xs text-base-content/50">{{
            t(isEvil(role) ? "avalon.night.evil" : "avalon.night.good")
          }}</span>
        </span>
        <span
          v-if="!selectable"
          class="shrink-0 font-mono text-xs text-base-content/60"
          >× {{ count }}</span
        >
      </button>
      <input
        v-if="selectable"
        type="checkbox"
        class="checkbox shrink-0"
        :checked="enabled"
        :disabled="disabled"
        :aria-label="
          t('avalon.config.toggleRole', { name: t(`avalon.roles.${role}`) })
        "
        @change="change"
      />
    </div>
  </article>
</template>
<script setup>
import { useLocale } from "@/i18n";
import { ROLE_ICONS } from "@/games/avalon-presentation";
import { isEvil } from "../../../../shared/games/avalon.js";
const props = defineProps({
  role: { type: String, required: true },
  selectable: Boolean,
  enabled: Boolean,
  disabled: Boolean,
  count: { type: Number, default: 1 },
});
const emit = defineEmits(["change", "details"]);
const { t } = useLocale();
function change(event) {
  const enabled = event.target.checked;
  event.target.checked = props.enabled;
  if (!props.disabled) emit("change", enabled);
}
</script>
