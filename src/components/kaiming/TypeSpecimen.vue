<template>
  <div class="card card-border min-w-0 bg-base-100">
    <div class="card-body gap-0 p-4 sm:p-6">
      <div
        class="grid min-w-0 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8"
      >
        <fieldset class="fieldset min-w-0">
          <legend class="fieldset-legend whitespace-normal">
            {{ translate("kaiming.family") }}
          </legend>
          <select
            id="kaiming-family"
            v-model="family"
            class="select w-full"
            :aria-label="translate('kaiming.family')"
          >
            <option
              v-for="option in familyOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </fieldset>
        <fieldset class="fieldset min-w-0">
          <legend
            class="fieldset-legend flex flex-wrap items-center gap-2 whitespace-normal"
          >
            {{ translate("kaiming.variableWeight") }}
            <output
              class="badge badge-primary badge-sm font-mono"
              for="kaiming-weight"
              >{{ weight }}</output
            >
          </legend>
          <input
            id="kaiming-weight"
            v-model.number="weight"
            class="range range-primary range-sm my-3 w-full"
            type="range"
            min="100"
            max="900"
            step="1"
            :aria-label="translate('kaiming.variableWeight')"
            :aria-valuetext="translate('kaiming.weight', { p0: weight })"
          />
        </fieldset>
      </div>
      <div class="divider" aria-hidden="true"></div>
      <div
        class="min-h-56 w-full wrap-break-word rounded-field p-2 text-[clamp(1.25rem,2.8vw,2.25rem)] leading-relaxed text-justify transition-colors hover:bg-base-200/30 focus-visible:bg-base-200/40 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none sm:min-h-64 sm:p-4"
        contenteditable="true"
        role="textbox"
        :aria-label="translate('kaiming.specimenLabel')"
        aria-multiline="true"
        spellcheck="false"
        :style="enabled ? demoStyle : baseStyle"
        lang="zh-CN"
      >
        　　潋城，清晨。老街传来消息：“《重返地平线（克里斯·莫蒂著）》已出版，首批
        100 万册！”——真让人惊喜！但我想问：它会被更多人读到吗？
      </div>
      <div class="divider" aria-hidden="true"></div>
      <div
        class="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 text-xs text-base-content/55"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CatalogMeta icon="ri-edit-line">{{
            translate("kaiming.specimenHint")
          }}</CatalogMeta>
          <CatalogMeta icon="ri-font-serif"
            >{{ translate("kaiming.currentFont")
            }}{{ activeFamilyLabel }}</CatalogMeta
          >
        </div>
        <label class="label cursor-pointer gap-2 whitespace-normal text-xs">
          <input
            v-model="enabled"
            type="checkbox"
            class="toggle toggle-primary toggle-sm shrink-0"
          />
          {{ translate("kaiming.title") }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useLocale } from "@/i18n";
import CatalogMeta from "@/components/interaction/navigation/CatalogMeta.vue";

const family = defineModel("family", { type: String, required: true });
const weight = defineModel("weight", { type: Number, required: true });
defineProps({
  demoStyle: { type: Object, required: true },
  baseStyle: { type: Object, required: true },
  familyOptions: { type: Array, required: true },
  activeFamilyLabel: { type: String, required: true },
});
const enabled = ref(true);
const { t: translate } = useLocale();
</script>
