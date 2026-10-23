<template>
  <section :aria-label="translate('common.theme.label')">
    <ScrollableContainer class="-mx-1">
      <div class="min-h-0 overflow-y-auto overscroll-contain px-1">
        <div
          class="grid grid-cols-1 gap-2 py-1 min-[22rem]:grid-cols-2 max-lg:gap-1.5"
        >
          <label
            v-for="style in themeList"
            :key="style.value"
            class="focus-within:outline-primary relative flex min-h-14 items-center gap-2 rounded-box border p-3 pr-8 transition-colors focus-within:outline-2 focus-within:outline-offset-2 max-lg:min-h-12 max-lg:gap-1.5 max-lg:p-2"
            :class="themeOptionClass(style)"
          >
            <input
              v-model="themeStore.theme"
              type="radio"
              name="theme-navigation"
              class="theme-controller absolute inset-0 cursor-pointer appearance-none rounded-box opacity-0"
              :aria-label="`${style.name}：${localizeText(style.description)}`"
              :value="style.value"
            />
            <span
              class="grid size-8 shrink-0 place-items-center rounded-field transition-colors max-lg:size-7"
              :class="themeIconClass(style)"
            >
              <i :class="style.icon"></i>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block whitespace-nowrap text-sm font-semibold">
                {{ style.name }}
              </span>
              <span class="text-base-content/55 block text-[0.625rem]">
                {{ localizeText(style.description) }}
              </span>
            </span>
            <input
              type="checkbox"
              class="checkbox checkbox-primary checkbox-xs pointer-events-none absolute right-2"
              :checked="isThemeActive(style)"
              tabindex="-1"
            />
          </label>
        </div>
      </div>
    </ScrollableContainer>
  </section>
</template>

<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { useLocale } from "@/i18n";
const { t: translate, text: localizeText } = useLocale();

import { storeToRefs } from "pinia";

import { useThemeStore } from "@/stores/themeStore";

const themeStore = useThemeStore();
const { themeList } = storeToRefs(themeStore);

const isThemeActive = (style) => style.value === themeStore.theme;

const themeOptionClass = (style) =>
  isThemeActive(style)
    ? "border-primary/50 bg-primary/10"
    : "cursor-pointer border-base-300 hover:bg-base-200";

const themeIconClass = (style) =>
  isThemeActive(style) ? "text-primary" : "text-base-content";
</script>
