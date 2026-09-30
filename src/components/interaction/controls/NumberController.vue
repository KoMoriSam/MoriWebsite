<template>
  <main class="space-y-1">
    <div class="flex items-center join">
      <button
        type="button"
        class="btn btn-soft btn-accent join-item"
        :disabled="isMin"
        @click="decrease"
      >
        <i class="ri-subtract-line"></i>
      </button>
      <input
        class="input validator join-item w-full text-center font-medium"
        type="number"
        :step="step"
        :min="min"
        :max="max"
        :value="formattedValue"
        @input="updateValue($event.target.value)"
      />
      <button
        type="button"
        class="btn btn-soft btn-accent join-item"
        :disabled="isMax"
        @click="increase"
      >
        <i class="ri-add-line"></i>
      </button>
    </div>

    <RangeController
      v-model="formattedValue"
      :step="step"
      :places="places"
      :min="min"
      :max="max"
    />
  </main>
</template>

<script setup>
import RangeController from "./RangeController.vue";
import { computed } from "vue";

const props = defineProps({
  modelValue: Number, // v-model 绑定的值
  step: { type: Number, default: 1 },
  places: { type: Number, default: 2 },
  min: Number, // 可选最小值
  max: Number, // 可选最大值
  type: String,
});

const emit = defineEmits(["update:modelValue"]);

const formattedValue = computed({
  get: () => Number(props.modelValue.toFixed(props.places)),
  set: (val) => emit("update:modelValue", parseFloat(val)),
});

// 计算是否禁用按钮
const isMin = computed(
  () => props.min !== undefined && props.modelValue <= props.min,
);
const isMax = computed(
  () => props.max !== undefined && props.modelValue >= props.max,
);

const updateValue = (val) => {
  let num = parseFloat(val);
  if (isNaN(num)) num = props.min !== undefined ? props.min : 0;
  if (props.max !== undefined && num > props.max) {
    num = props.max;
  }
  if (props.min !== undefined && num < props.min) {
    num = props.min;
  }
  num = parseFloat(num.toFixed(props.places));
  emit("update:modelValue", num);
};

const increase = () => {
  updateValue(props.modelValue + props.step);
};

const decrease = () => {
  updateValue(props.modelValue - props.step);
};
</script>
