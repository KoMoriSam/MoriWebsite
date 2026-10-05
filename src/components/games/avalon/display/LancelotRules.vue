<template>
  <section v-if="enabled" class="min-w-0 space-y-2 rounded-box bg-base-200/40 p-3 text-xs leading-5" :aria-labelledby="headingId">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h3 :id="headingId" class="font-medium">{{ t('avalon.lancelot.title') }}</h3>
      <span v-if="!editable" class="badge badge-ghost badge-sm">{{ t(`avalon.lancelot.modes.${mode}`) }}</span>
    </header>
    <p class="text-base-content/60">{{ t('avalon.lancelot.pair') }}</p>
    <fieldset v-if="editable" class="min-w-0">
      <legend class="sr-only">{{ t('avalon.lancelot.title') }}</legend>
      <div class="join w-full sm:w-auto">
        <label v-for="option in LANCELOT_MODES" :key="option" class="btn btn-xs join-item h-auto min-h-8 min-w-0 flex-1 gap-1.5 py-1 text-wrap" :class="mode === option ? 'btn-active' : ''">
          <input type="radio" :name="modeGroup" class="radio radio-xs shrink-0" :value="option" :checked="mode === option" :disabled="disabled" @change="emit('select-mode', option)" />
          {{ t(`avalon.lancelot.modes.${option}`) }}
        </label>
      </div>
    </fieldset>
    <div class="space-y-2" aria-live="polite">
      <section v-for="group in ruleGroups" :key="group.id" class="space-y-1">
        <h4 v-if="group.title" class="font-medium text-base-content/80">{{ t(`avalon.lancelot.rules.${group.title}`) }}</h4>
        <ul class="list-disc space-y-0.5 pl-4 text-base-content/70">
          <li v-for="rule in group.rules" :key="rule">{{ t(`avalon.lancelot.rules.${rule}`) }}</li>
        </ul>
      </section>
    </div>
  </section>
</template>
<script setup>
import { computed, useId } from 'vue';
import { useLocale } from '@/i18n';
import { LANCELOTS, LANCELOT_MODES } from '../../../../../shared/games/avalon/index.js';
const props = defineProps({ room: { type: Object, required: true }, editable: Boolean, disabled: Boolean });
const emit = defineEmits(['select-mode']);
const { t } = useLocale();
const headingId = `lancelot-rules-${useId()}`;
const modeGroup = `${headingId}-mode`;
const enabled = computed(() => LANCELOTS.every(role => props.room.gameConfig?.specialRoles?.includes(role)));
const mode = computed(() => props.room.game?.lancelotMode ?? props.room.lancelotMode ?? props.room.gameConfig?.lancelotMode ?? 'fixed');
const ruleGroups = computed(() => mode.value === 'switching' ? [
  { id: 'night', title: 'nightTitle', rules: ['unrecognised', 'evilVision'] },
  { id: 'conversion', title: 'conversionTitle', rules: ['deck', 'draw', 'limit', 'swap'] },
  { id: 'outcome', title: 'outcomeTitle', rules: ['permissions', 'settlement', 'secret'] },
] : [{ id: 'fixed', rules: ['mutual', 'unchanged'] }]);
</script>
