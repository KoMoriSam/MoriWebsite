import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePreferredDark } from "@vueuse/core";
import { useGlobalStorage } from "@/composables/storage/useGlobalStorage";
import { DEFAULT_THEME, SITE_THEME_NAMES } from "@/utils/layout/site-theme";

const isDark = usePreferredDark();

const manualThemeValues = new Set(SITE_THEME_NAMES);

export const useThemeStore = defineStore("theme", () => {
  const { GLOBAL_INFO, getInfo } = useGlobalStorage();
  const theme = computed({
    get: () => {
      const storedTheme = getInfo("SET_THEME", DEFAULT_THEME);
      return storedTheme === DEFAULT_THEME || manualThemeValues.has(storedTheme)
        ? storedTheme
        : DEFAULT_THEME;
    },
    set: (value) => {
      if (value !== DEFAULT_THEME && !manualThemeValues.has(value)) return;
      GLOBAL_INFO.value.SET_THEME = value;
      if (manualThemeValues.has(value)) {
        GLOBAL_INFO.value.MANUAL_THEME = value;
      }
    },
  });

  const themeList = ref([
    {
      name: "Lemonade",
      description: "默认日间",
      icon: "ri-sun-line",
      value: "lemonade",
    },
    {
      name: "Forest",
      description: "默认夜间",
      icon: "ri-moon-line",
      value: "forest",
    },
    {
      name: "Corporate",
      description: "商务亮色",
      icon: "ri-building-line",
      value: "corporate",
    },
    {
      name: "Dim",
      description: "柔和深色",
      icon: "ri-moon-foggy-line",
      value: "dim",
    },
  ]);

  const manualTheme = computed({
    get: () => {
      const storedManualTheme = GLOBAL_INFO.value.MANUAL_THEME;
      if (manualThemeValues.has(storedManualTheme)) return storedManualTheme;
      if (manualThemeValues.has(theme.value)) return theme.value;
      return isDark.value ? "forest" : "lemonade";
    },
    set: (value) => {
      if (manualThemeValues.has(value)) {
        GLOBAL_INFO.value.MANUAL_THEME = value;
      }
    },
  });

  const followSystem = computed({
    get: () => theme.value === DEFAULT_THEME,
    set: (enabled) => {
      theme.value = enabled ? DEFAULT_THEME : manualTheme.value;
    },
  });

  const currentTheme = computed(() => {
    if (followSystem.value) {
      return {
        name: "System",
        icon: "ri-contrast-line",
        value: DEFAULT_THEME,
      };
    }
    return (
      themeList.value.find((t) => t.value === theme.value) || {
        name: "System",
        icon: "ri-contrast-line",
        value: DEFAULT_THEME,
      }
    );
  });

  const resolvedTheme = computed(() =>
    followSystem.value ? (isDark.value ? "forest" : "lemonade") : theme.value,
  );
  // 修改主题并存储
  function setTheme(newTheme) {
    theme.value = newTheme;
  }

  return {
    theme,
    themeList,
    currentTheme,
    resolvedTheme,
    followSystem,
    setTheme,
  };
});
