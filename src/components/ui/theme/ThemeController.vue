<template>
  <div class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="btn btn-ghost max-md:btn-square m-1">
      <i :class="currentTheme.icon" class="text-base lg:text-xl"></i>
      <span class="hidden lg:block">主题</span>
      <i class="ri-arrow-down-s-line hidden lg:block"></i>
    </div>
    <ul
      tabindex="0"
      class="menu menu-sm dropdown-content bg-base-200 rounded-box z-20 mt-5 w-max p-0 shadow"
    >
      <li v-for="style in themeList" :key="style.value">
        <div class="relative inline-block">
          <i
            class="absolute translate-x-2.25 translate-y-3 lg:translate-y-3.25 z-20"
            :class="`${style.icon} ${
              style.name === currentTheme.name ? 'text-primary-content' : ''
            }`"
          ></i>
          <input
            type="radio"
            name="theme-dropdown"
            class="theme-controller btn btn-sm justify-end pl-6 my-1 lg:my-1.5"
            :class="
              style.name === currentTheme.name ? 'btn-primary' : 'btn-ghost'
            "
            :aria-label="style.name"
            :value="style.value"
            v-model="themeStore.theme"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useThemeStore } from "@/stores/themeStore";

const themeStore = useThemeStore();
const { themeList, currentTheme } = storeToRefs(themeStore);
</script>
