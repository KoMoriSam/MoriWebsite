<template>
  <button
    v-if="!inline"
    class="btn btn-ghost btn-square m-1"
    type="button"
    popovertarget="theme-controller"
    style="anchor-name: --theme-controller-anchor"
    :aria-label="translate('common.themeController.chooseInterfaceTheme')"
  >
    <i :class="currentTheme.icon" class="text-xl"></i>
  </button>

  <div
    :id="inline ? undefined : 'theme-controller'"
    :popover="inline ? undefined : 'auto'"
    :class="
      inline
        ? ''
        : 'dropdown dropdown-end mt-2 max-h-[min(78dvh,32rem)] w-96 overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100 p-3 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:[inset:3.75rem_0.5rem_auto_auto]! max-sm:[position-area:none]!'
    "
    :style="inline ? undefined : 'position-anchor: --theme-controller-anchor'"
    :aria-label="translate('common.themeController.themeSelection')"
  >
    <div
      v-if="inline && !hideHeader"
      class="divider my-3 h-auto min-h-6 justify-between gap-2 before:min-w-0 before:basis-0 after:min-w-0 after:basis-0 max-lg:my-2 max-lg:gap-1.5"
    >
      <h2 class="text-base-content/55 shrink-0 text-xs font-bold">
        {{ translate("common.themeController.interfaceTheme") }}
      </h2>
      <label class="flex shrink-0 cursor-pointer items-center gap-2">
        <span class="whitespace-nowrap text-xs font-semibold">{{
          translate("reader.formatSetting.systemDefault")
        }}</span>
        <input
          v-model="followSystem"
          type="checkbox"
          class="toggle toggle-xs shrink-0"
          :aria-label="translate('common.themeController.followSystemTheme')"
        />
      </label>
    </div>

    <div v-else-if="!inline" class="mb-2 flex items-center justify-between gap-3 lg:px-1 max-lg:mb-1.5 max-lg:gap-2">
      <h2 class="font-serif mt-0.5 text-lg font-semibold">
        {{ translate("common.themeController.interfaceTheme") }}
      </h2>
      <span class="badge badge-primary badge-sm">{{
        currentTheme.name === "System"
          ? translate("reader.formatSetting.systemDefault")
          : currentTheme.name
      }}</span>
    </div>

    <label
      v-if="!inline"
      class="border-base-300 bg-base-200/55 mb-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-box border px-3 py-2 max-lg:mb-2 max-lg:min-h-12 max-lg:gap-2 max-lg:px-2"
    >
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold">{{
          translate("reader.formatSetting.systemDefault")
        }}</span>
        <span class="text-base-content/60 block text-xs">
          {{
            translate(
              "reader.formatSetting.matchYourSystemSLightOrDarkAppearance",
            )
          }}
        </span>
      </span>
      <input
        v-model="followSystem"
        type="checkbox"
        class="toggle toggle-sm mr-1 shrink-0"
        :aria-label="translate('common.themeController.followSystemTheme')"
      />
    </label>

    <div class="grid grid-cols-1 gap-2 py-1 min-[22rem]:grid-cols-2 max-lg:gap-1.5">
      <label
        v-for="style in themeList"
        :key="style.value"
        class="focus-within:outline-primary relative flex min-h-14 items-center gap-2 rounded-box border p-3 pr-8 transition-colors focus-within:outline-2 focus-within:outline-offset-2 max-lg:min-h-12 max-lg:gap-1.5 max-lg:p-2"
        :class="themeOptionClass(style)"
      >
        <input
          v-model="themeStore.theme"
          type="radio"
          :name="inline ? 'theme-navigation-mobile' : 'theme-navigation'"
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
        <i
          class="text-primary absolute top-2 right-2 text-lg transition-opacity max-lg:static max-lg:shrink-0"
          :class="
            isThemeActive(style)
              ? 'ri-checkbox-circle-fill opacity-100'
              : 'ri-checkbox-blank-circle-line opacity-35'
          "
        ></i>
      </label>
    </div>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { t: translate, text: localizeText } = useLocale();

import { storeToRefs } from "pinia";

import { useThemeStore } from "@/stores/themeStore";

defineProps({
  inline: Boolean,
  hideHeader: Boolean,
});

const themeStore = useThemeStore();
const { themeList, currentTheme, followSystem } = storeToRefs(themeStore);

const isThemeActive = (style) => style.value === themeStore.theme;

const themeOptionClass = (style) =>
  isThemeActive(style)
    ? "border-primary/50 bg-primary/10"
    : "cursor-pointer border-base-300 hover:bg-base-200";

const themeIconClass = (style) =>
  isThemeActive(style) ? "text-primary" : "text-base-content";
</script>
