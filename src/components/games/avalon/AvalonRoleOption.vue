<template>
  <component
    :is="selectable ? 'label' : 'article'"
    class="card card-border min-w-0"
    :class="[selectable ? 'cursor-pointer transition-colors hover:border-base-content/40' : '', enabled ? 'border-base-content/40 bg-base-200/40' : 'bg-base-100']"
    :title="t(`avalon.roleHints.${role}`)"
  >
    <div class="flex min-w-0 items-center gap-2 p-2">
      <i :class="ROLE_ICONS[role]" class="shrink-0 text-xl text-base-content/70" aria-hidden="true"></i>
      <div class="min-w-0 flex-1">
        <div class="font-serif text-sm font-semibold leading-5">{{ t(`avalon.roles.${role}`) }}</div>
        <span class="text-xs text-base-content/50">{{ t(isEvil(role) ? 'avalon.night.evil' : 'avalon.night.good') }}</span>
      </div>
      <input v-if="selectable" type="checkbox" class="checkbox checkbox-xs shrink-0" :checked="enabled" :disabled="disabled" :aria-label="t(`avalon.roles.${role}`)" @change="change" />
      <span v-else class="shrink-0 font-mono text-xs text-base-content/60">× {{ count }}</span>
    </div>
  </component>
</template>
<script setup>
import { useLocale } from '@/i18n';
import { ROLE_ICONS } from '@/games/avalon-presentation';
import { isEvil } from '../../../../shared/games/avalon.js';
const props = defineProps({ role: { type: String, required: true }, selectable: Boolean, enabled: Boolean, disabled: Boolean, count: { type: Number, default: 1 } });
const emit = defineEmits(['change']);
const { t } = useLocale();
function change(event) {
  const enabled = event.target.checked;
  event.target.checked = props.enabled;
  if (!props.disabled) emit('change', enabled);
}
</script>
