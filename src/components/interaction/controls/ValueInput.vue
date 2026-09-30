<template>
  <input
    :type="type"
    :min="min"
    :max="max"
    :step="step"
    class="range range-info join-item text-center"
    :value="formattedValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: Number,
  step: Number,
  places: Number,
  min: Number,
  max: Number,
  type: {
    type: String,
    default: "number",
  },
});

const emit = defineEmits(["update:modelValue"]);
</script>
