<template>
  <section v-if="embedded" aria-labelledby="mobile-theme-controller">
    <h2 class="text-base-content/55 text-xs font-bold mb-2 px-1">
      <div class="divider my-3">
        主题
        <span class="font-normal mt-0.5">
          跟随系统
          <input
            v-model="followSystem"
            type="checkbox"
            class="toggle toggle-xs ml-1 mb-0.5"
            aria-label="跟随系统主题"
          />
        </span>
      </div>
    </h2>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label
        v-for="style in themeList"
        :key="style.value"
        class="focus-within:outline-primary relative flex items-center justify-center gap-2 rounded-box border p-2 transition-colors focus-within:outline-2 focus-within:outline-offset-2"
        :class="themeOptionClass(style)"
        :aria-disabled="followSystem"
      >
        <input
          v-model="themeStore.theme"
          type="radio"
          name="theme-mobile-navigation"
          class="theme-controller absolute inset-0 cursor-pointer appearance-none rounded-box opacity-0"
          :aria-label="`${style.name}：${style.description}`"
          :value="style.value"
          :disabled="followSystem"
        />
        <i :class="[style.icon, themeIconClass(style)]"></i>
        <span class="min-w-0 text-center">
          <span class="block text-xs font-semibold">{{ style.name }}</span>
          <span class="text-base-content/55 block text-[0.625rem]">
            {{ style.description }}
          </span>
        </span>
      </label>
    </div>
  </section>

  <div v-else class="hidden lg:block">
    <button
      class="btn btn-ghost m-1"
      type="button"
      popovertarget="desktop-theme-controller"
      style="anchor-name: --desktop-theme-controller-anchor"
      aria-label="选择界面主题"
    >
      <i :class="currentTheme.icon" class="text-xl"></i>
      <span>主题</span>
      <i class="ri-arrow-down-s-line"></i>
    </button>

    <div
      id="desktop-theme-controller"
      popover="auto"
      class="dropdown dropdown-end bg-base-100 border-base-300 mt-2 w-96 rounded-box border p-3 shadow-xl"
      style="position-anchor: --desktop-theme-controller-anchor"
      aria-label="主题选择"
    >
      <div class="mb-2 flex items-center justify-between gap-3 px-1">
        <div>
          <p class="text-primary text-xs font-bold tracking-[0.14em] uppercase">
            Theme
          </p>
          <h2 class="font-serif mt-0.5 text-lg font-semibold">界面主题</h2>
        </div>
        <span class="badge badge-primary badge-sm">{{
          currentTheme.name
        }}</span>
      </div>

      <label
        class="border-base-300 bg-base-200/55 mb-3 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-box border px-3 py-2"
      >
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold">跟随系统</span>
          <span class="text-base-content/60 block text-xs">
            自动匹配系统的浅色或深色外观
          </span>
        </span>
        <input
          v-model="followSystem"
          type="checkbox"
          class="toggle toggle-sm mr-1 shrink-0"
          aria-label="跟随系统主题"
        />
      </label>

      <div class="grid grid-cols-2 gap-2">
        <label
          v-for="style in themeList"
          :key="style.value"
          class="focus-within:outline-primary relative flex min-h-14 items-center gap-2 rounded-box border p-3 pr-8 transition-colors focus-within:outline-2 focus-within:outline-offset-2"
          :class="themeOptionClass(style)"
          :aria-disabled="followSystem"
        >
          <input
            v-model="themeStore.theme"
            type="radio"
            name="theme-desktop-navigation"
            class="theme-controller absolute inset-0 cursor-pointer appearance-none rounded-box opacity-0"
            :aria-label="`${style.name}：${style.description}`"
            :value="style.value"
            :disabled="followSystem"
          />
          <span
            class="grid size-8 shrink-0 place-items-center rounded-field transition-colors"
            :class="themeIconClass(style)"
          >
            <i :class="style.icon"></i>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block whitespace-nowrap text-sm font-semibold">
              {{ style.name }}
            </span>
            <span class="text-base-content/55 block text-[0.625rem]">
              {{ style.description }}
            </span>
          </span>
          <i
            class="text-primary absolute top-2 right-2 text-lg transition-opacity"
            :class="
              isThemeActive(style)
                ? 'ri-checkbox-circle-fill opacity-100'
                : 'ri-checkbox-blank-circle-line opacity-35'
            "
          ></i>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";

import { useThemeStore } from "@/stores/themeStore";

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
});

const themeStore = useThemeStore();
const { themeList, currentTheme, followSystem } = storeToRefs(themeStore);

const isThemeActive = (style) => style.value === themeStore.theme;

const themeOptionClass = (style) =>
  followSystem.value
    ? "cursor-not-allowed border-base-300 bg-base-200/40 opacity-50"
    : isThemeActive(style)
      ? "border-primary/50 bg-primary/10"
      : "cursor-pointer border-base-300 hover:bg-base-200";

const themeIconClass = (style) =>
  isThemeActive(style) ? "text-primary" : "text-base-content";
</script>
