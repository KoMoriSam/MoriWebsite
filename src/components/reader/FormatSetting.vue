<template>
  <client-only>
    <section class="space-y-5 p-1">
      <h3
        class="text-base font-semibold tracking-wide text-base-content/90 m-0"
      >
        阅读排版
      </h3>
      <p class="mt-1 text-xs text-base-content/60">
        按你的阅读习惯，微调文字密度与节奏。
      </p>

      <StyleMenu title="正文字体" configKey="fontStyle">
        <div class="join w-full">
          <button
            v-for="font in FONTS"
            :key="font.style"
            type="button"
            :class="{
              'btn btn-accent join-item w-1/4 p-0': true,
              [font.style]: true,
              'btn-soft': styleConfigs.fontStyle !== font.style,
            }"
            @click="store.setStyle('fontStyle', font.style)"
          >
            {{ font.name }}
          </button>
        </div>
      </StyleMenu>

      <StyleMenu title="字体大小" configKey="fontSize">
        <NumberController
          :modelValue="styleConfigs.fontSize"
          :step="1"
          :places="0"
          :min="16"
          :max="32"
          @update:modelValue="(val) => store.setStyle('fontSize', val)"
        />
      </StyleMenu>

      <StyleMenu title="字间距" configKey="fontGap">
        <NumberController
          :modelValue="styleConfigs.fontGap"
          :step="0.01"
          :places="2"
          :min="-1"
          :max="1"
          @update:modelValue="(val) => store.setStyle('fontGap', val)"
        />
      </StyleMenu>

      <StyleMenu title="行间距" configKey="lineHeight">
        <NumberController
          :modelValue="styleConfigs.lineHeight"
          :step="0.1"
          :places="1"
          :min="1"
          :max="3"
          @update:modelValue="(val) => store.setStyle('lineHeight', val)"
        />
      </StyleMenu>

      <StyleMenu title="段间距" configKey="paraHeight">
        <NumberController
          :modelValue="styleConfigs.paraHeight"
          :step="0.1"
          :places="1"
          :min="1"
          :max="3"
          @update:modelValue="(val) => store.setStyle('paraHeight', val)"
        />
      </StyleMenu>
    </section>
  </client-only>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useReaderStore } from "@/stores/readerStore";
import { FONTS } from "@/constants/reader";

import StyleMenu from "@/components/reader/StyleMenu.vue";
import NumberController from "@/components/ui/input/NumberController.vue";

const store = useReaderStore();
const { styleConfigs } = storeToRefs(store);
</script>
