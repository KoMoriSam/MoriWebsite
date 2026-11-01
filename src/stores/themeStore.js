import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePreferredDark } from "@vueuse/core";
import { useGlobalStorage } from "@/composables/storage/useGlobalStorage";

const isDark = usePreferredDark();

/**
 * giscus 共用样式中的四套配色对应 daisyUI 的四个内置主题：
 *   lemonade  (默认日间) — 温暖黄绿色调
 *   forest    (默认夜间) — 深绿色自然色调
 *   corporate (日间模式) — 专业蓝色商务色调
 *   dim       (夜间模式) — 低调蓝灰色调
 */
const GISCUS_THEME_BASE = import.meta.env.VITE_GISCUS_CSS_RAW;
const DEFAULT_THEME = "default";
const MANUAL_THEME_VALUES = ["lemonade", "forest", "corporate", "dim"];
const manualThemeValues = new Set(MANUAL_THEME_VALUES);

export const useThemeStore = defineStore("theme", () => {
  const { GLOBAL_INFO } = useGlobalStorage();
  const theme = computed({
    get: () => {
      const storedTheme = GLOBAL_INFO.value.SET_THEME;
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
  // 评论配色随页面实际应用主题，在过渡回调中一同更新。
  const appliedTheme = ref(resolvedTheme.value);

  function applyTheme(value) {
    if (manualThemeValues.has(value)) appliedTheme.value = value;
  }

  /**
   * giscus 评论组件主题
   * URL 片段选择配色；样式只加载一份，iframe 收到配置即可切换。
   *
   * 映射关系：
   *   default + 系统浅色 → lemonade (daisyUI 默认日间)
   *   default + 系统深色 → forest   (daisyUI 默认夜间)
   *   corporate          → corporate (daisyUI 商务日间)
   *   dim                → dim       (daisyUI 低调夜间)
   */
  const giscusTheme = computed(() => {
    return manualThemeValues.has(appliedTheme.value)
      ? `${GISCUS_THEME_BASE}/themes.css#${appliedTheme.value}`
      : "preferred_color_scheme";
  });

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
    giscusTheme,
    applyTheme,
    setTheme,
  };
});
