<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label
      v-for="card in cards"
      :key="card.id"
      class="flex min-h-12 items-center gap-3 rounded-box border p-3 transition-colors"
      :class="
        isDisabled(card.id)
          ? 'cursor-not-allowed border-base-300 bg-base-200/40 opacity-45'
          : selected.includes(card.id)
            ? 'cursor-pointer border-primary bg-primary/10'
            : 'cursor-pointer border-base-300 hover:bg-base-200 has-focus-visible:bg-base-200'
      "
    >
      <input
        :type="multiple ? 'checkbox' : 'radio'"
        :name="groupName"
        :value="card.id"
        class="shrink-0"
        :class="multiple ? 'checkbox checkbox-sm' : 'radio radio-sm'"
        :checked="selected.includes(card.id)"
        :disabled="isDisabled(card.id)"
        @change="change(card.id, $event.target.checked)"
      />
      <i
        class="ri-stack-line shrink-0 text-base-content/60"
        aria-hidden="true"
      ></i
      ><span class="min-w-0 text-sm leading-5">{{ cardName(card, t) }}</span>
    </label>
  </div>
</template>
<script setup>
import { useId } from "vue";
import { cardName } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  cards: { type: Array, required: true },
  selected: { type: Array, required: true },
  multiple: Boolean,
  max: { type: Number, default: 3 },
  disabled: Boolean,
});
const emit = defineEmits(["change"]);
const { t } = useLocale(),
  groupName = "fogport-hand-" + useId();
const isDisabled = () => props.disabled;
function change(id, checked) {
  if (isDisabled(id)) return;
  if (!props.multiple) {
    if (checked) emit("change", [id]);
    return;
  }
  emit(
    "change",
    checked
      ? [...props.selected.filter((value) => value !== id), id].slice(
          -props.max,
        )
      : props.selected.filter((value) => value !== id),
  );
}
</script>
