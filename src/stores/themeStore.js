import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { usePreferredDark } from "@vueuse/core";
import { useGlobalStorage } from "@/utils/storage/new-global-storage";

const isDark = usePreferredDark();

/**
 * giscus 自定义主题 CSS 文件 URL
 * 四套配色分别对应 daisyUI 的四个内置主题：
 *   lemonade  (默认日间) — 温暖黄绿色调
 *   forest    (默认夜间) — 深绿色自然色调
 *   corporate (日间模式) — 专业蓝色商务色调
 *   dim       (夜间模式) — 低调蓝灰色调
 */
const GISCUS_THEME_BASE = import.meta.env.VITE_GISCUS_CSS_RAW;

export const useThemeStore = defineStore("theme", () => {
  const { GLOBAL_INFO } = useGlobalStorage();
  const theme = computed({
    get: () => GLOBAL_INFO.value.SET_THEME || "default",
    set: (value) => {
      GLOBAL_INFO.value.SET_THEME = value;
    },
  });

  const themeList = ref([
    { name: "跟随系统", icon: "ri-contrast-line", value: "default" },
    { name: "日间模式", icon: "ri-sun-line", value: "corporate" },
    { name: "夜间模式", icon: "ri-moon-line", value: "dim" },
  ]);

  const currentTheme = computed(() => {
    return (
      themeList.value.find((t) => t.value === theme.value) || {
        icon: "ri-contrast-line",
      }
    );
  });

  /**
   * giscus 评论组件主题
   * 根据当前 daisyUI 主题返回对应的 giscus 自定义 CSS 文件 URL
   *
   * 映射关系：
   *   default + 系统浅色 → lemonade (daisyUI 默认日间)
   *   default + 系统深色 → forest   (daisyUI 默认夜间)
   *   corporate          → corporate (daisyUI 商务日间)
   *   dim                → dim       (daisyUI 低调夜间)
   */
  const giscusTheme = computed(() => {
    if (theme.value === "default") {
      return isDark.value
        ? `${GISCUS_THEME_BASE}/forest.css`
        : `${GISCUS_THEME_BASE}/lemonade.css`;
    }
    if (theme.value === "corporate") {
      return `${GISCUS_THEME_BASE}/corporate.css`;
    }
    if (theme.value === "dim") {
      return `${GISCUS_THEME_BASE}/dim.css`;
    }
    // 兜底：自适应系统配色
    return "preferred_color_scheme";
  });

  // 修改主题并存储
  function setTheme(newTheme) {
    theme.value = newTheme;
  }

  return { theme, themeList, currentTheme, giscusTheme, setTheme };
});
