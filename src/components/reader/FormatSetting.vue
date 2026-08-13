<template>
  <client-only>
    <section class="space-y-5 p-1">
      <header v-if="showHeader">
        <h3
          class="text-base font-semibold tracking-wide text-base-content/90 m-0"
        >
          阅读排版
        </h3>
        <p class="mt-1 text-xs text-base-content/60">
          按你的阅读习惯，微调文字密度与节奏。
        </p>
      </header>

      <StyleMenu title="正文字体" configKey="fontStyle">
        <select
          class="select w-full"
          :class="styleConfigs.fontStyle"
          @change="(e) => store.setStyle('fontStyle', e.target.value)"
        >
          <option disabled selected>选择字体</option>
          <option
            v-for="font in FONTS"
            :key="font.style"
            :class="font.style"
            :selected="styleConfigs.fontStyle === font.style"
            :value="font.style"
          >
            {{ font.name }}
          </option>
        </select>
      </StyleMenu>

      <StyleMenu
        v-for="control in READER_TYPOGRAPHY_CONTROLS"
        :key="control.key"
        :title="control.label"
        :config-key="control.key"
      >
        <NumberController
          :model-value="styleConfigs[control.key]"
          :step="control.step"
          :places="control.places"
          :min="control.min"
          :max="control.max"
          @update:modelValue="(val) => store.setStyle(control.key, val)"
        />
      </StyleMenu>
    </section>
  </client-only>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useReaderStore } from "@/stores/readerStore";
import { FONTS, READER_TYPOGRAPHY_CONTROLS } from "@/constants/reader";

import StyleMenu from "@/components/reader/StyleMenu.vue";
import NumberController from "@/components/ui/input/NumberController.vue";

defineProps({
  showHeader: {
    type: Boolean,
    default: true,
  },
});

const store = useReaderStore();
const { styleConfigs } = storeToRefs(store);
</script>
