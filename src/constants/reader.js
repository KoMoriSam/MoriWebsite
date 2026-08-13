export const MOBILE_READER_NAVBAR_SHOW_EVENT = "mobile-reader:show-navbar";
export const MOBILE_READER_NAVBAR_HIDE_EVENT = "mobile-reader:hide-navbar";
export const MOBILE_READER_VOLUME_KEY_EVENT = "mobile-reader:volume-key";

export const MOBILE_READING_MODES = Object.freeze({
  PAGED: "paged",
  SCROLL: "scroll",
});

export const MOBILE_READING_MODE_OPTIONS = Object.freeze([
  Object.freeze({
    value: MOBILE_READING_MODES.PAGED,
    label: "左右翻页",
    icon: "ri-arrow-left-right-line",
  }),
  Object.freeze({
    value: MOBILE_READING_MODES.SCROLL,
    label: "上下滚动",
    icon: "ri-arrow-up-down-line",
  }),
]);

export const MOBILE_READING_MODE_SETTING = "MOBILE_READING_MODE";

export const MOBILE_READER_WHEEL_SETTING = "MOBILE_READER_WHEEL_PAGINATION";
export const MOBILE_READER_VOLUME_SETTING = "MOBILE_READER_VOLUME_PAGINATION";
export const MOBILE_READER_ZONE_SETTING = "MOBILE_READER_TAP_ZONES";
export const READER_LAYOUT_PRESETS_SETTING = "MOBILE_READER_LAYOUT_PRESETS";
export const MOBILE_READER_PRESETS_SETTING = READER_LAYOUT_PRESETS_SETTING;

export const MOBILE_READER_COLOR_THEMES = Object.freeze([
  { value: "site", label: "跟随站点", icon: "ri-contrast-line" },
  { value: "lemonade", label: "护眼浅色", icon: "ri-sun-foggy-line" },
  { value: "forest", label: "自然深色", icon: "ri-leaf-line" },
  { value: "corporate", label: "清爽日间", icon: "ri-sun-line" },
  { value: "dim", label: "低光夜间", icon: "ri-moon-clear-line" },
]);

export const MOBILE_READER_ZONE_ACTIONS = Object.freeze([
  { value: "none", label: "无操作" },
  { value: "menu", label: "菜单" },
  { value: "previous-page", label: "上一页" },
  { value: "next-page", label: "下一页" },
  { value: "previous-chapter", label: "上一章" },
  { value: "next-chapter", label: "下一章" },
  { value: "toc", label: "章节目录" },
  { value: "search", label: "书内搜索" },
  { value: "help", label: "使用帮助" },
]);

export const DEFAULT_MOBILE_READER_ZONES = Object.freeze([
  "previous-page",
  "previous-page",
  "previous-page",
  "previous-page",
  "menu",
  "next-page",
  "next-page",
  "next-page",
  "next-page",
]);

export const READER_SYSTEM_PRESETS = Object.freeze([
  {
    id: "system-comfortable",
    name: "舒适",
    description: "均衡的字号与行距，适合长时间阅读",
    mode: MOBILE_READING_MODES.PAGED,
    styles: {
      fontStyle: "font-kai",
      fontSize: 22,
      fontGap: 0.05,
      lineHeight: 1.6,
      paraHeight: 0.5,
      colorTheme: "site",
      textColor: "",
      backgroundColor: "",
    },
  },
  {
    id: "system-compact",
    name: "紧凑",
    description: "一屏容纳更多内容，适合碎片阅读",
    mode: MOBILE_READING_MODES.PAGED,
    styles: {
      fontStyle: "font-hei",
      fontSize: 18,
      fontGap: -0.05,
      lineHeight: 1.35,
      paraHeight: 0.15,
      colorTheme: "site",
      textColor: "",
      backgroundColor: "",
    },
  },
  {
    id: "system-paper",
    name: "纸张",
    description: "低对比暖色纸张，减轻白底刺激",
    mode: MOBILE_READING_MODES.PAGED,
    styles: {
      fontStyle: "font-fang",
      fontSize: 20,
      fontGap: 0,
      lineHeight: 1.6,
      paraHeight: 0.5,
      colorTheme: "lemonade",
      textColor: "",
      backgroundColor: "",
    },
  },
  {
    id: "system-night",
    name: "暗光",
    description: "深色低亮度配色，适合暗光环境",
    mode: MOBILE_READING_MODES.SCROLL,
    styles: {
      fontStyle: "font-song",
      fontSize: 20,
      fontGap: 0,
      lineHeight: 1.6,
      paraHeight: 0.5,
      colorTheme: "dim",
      textColor: "",
      backgroundColor: "",
    },
  },
  {
    id: "system-big",
    name: "大字号",
    description: "内容集中，眼部友好",
    mode: MOBILE_READING_MODES.SCROLL,
    styles: {
      fontStyle: "font-kai",
      fontSize: 24,
      fontGap: 0,
      lineHeight: 1.5,
      paraHeight: 0.5,
      colorTheme: "site",
      textColor: "",
      backgroundColor: "",
    },
  },
]);

export const MOBILE_READER_SYSTEM_PRESETS = READER_SYSTEM_PRESETS;

export const READER_TYPOGRAPHY_CONTROLS = Object.freeze([
  Object.freeze({
    key: "fontSize",
    label: "字体大小",
    shortLabel: "字号",
    storageKey: "STYLE_FONT_SIZE",
    default: 20,
    min: 16,
    max: 32,
    step: 1,
    places: 0,
    unit: "px",
  }),
  Object.freeze({
    key: "fontGap",
    label: "字间距",
    shortLabel: "字距",
    storageKey: "STYLE_FONT_GAP",
    default: 0,
    min: -1,
    max: 1,
    step: 0.05,
    places: 2,
    unit: "",
  }),
  Object.freeze({
    key: "lineHeight",
    label: "行间距",
    shortLabel: "行距",
    storageKey: "CONTENT_LINE_HEIGHT",
    default: 1.6,
    min: 1,
    max: 3,
    step: 0.05,
    places: 2,
    unit: "倍",
  }),
  Object.freeze({
    key: "paraHeight",
    label: "段间距",
    shortLabel: "段距",
    storageKey: "CONTENT_PARA_HEIGHT",
    default: 0.5,
    min: 0,
    max: 2,
    step: 0.05,
    places: 2,
    unit: "行",
  }),
]);

// 桌面端与移动端可共享的纯排版字段。阅读模式与阅读配色属于移动端界面
// 状态，不写入桌面端保存的预设，也不会在桌面端应用预设时被覆盖。
export const READER_LAYOUT_STYLE_KEYS = Object.freeze([
  "fontStyle",
  ...READER_TYPOGRAPHY_CONTROLS.map(({ key }) => key),
]);

export const STYLE_CONFIG_KEYS = Object.freeze([
  Object.freeze({
    key: "fontStyle",
    storageKey: "STYLE_FONT",
    default: "font-kai",
  }),
  ...READER_TYPOGRAPHY_CONTROLS.map(({ key, storageKey, default: value }) =>
    Object.freeze({
      key,
      storageKey,
      default: value,
    }),
  ),
  Object.freeze({
    key: "colorTheme",
    storageKey: "STYLE_COLOR_THEME",
    default: "site",
  }),
  Object.freeze({
    key: "textColor",
    storageKey: "STYLE_TEXT_COLOR",
    default: "",
  }),
  Object.freeze({
    key: "backgroundColor",
    storageKey: "STYLE_BACKGROUND_COLOR",
    default: "",
  }),
]);

export const FONTS = Object.freeze([
  Object.freeze({
    name: "无衬线（Noto Sans SC + Manrope）",
    style: "font-sans",
  }),
  Object.freeze({
    name: "衬线体（Noto Serif SC + Fraunces）",
    style: "font-serif",
  }),
  Object.freeze({ name: "霞鹜文楷", style: "font-kai" }),
  Object.freeze({ name: "霞鹜新致宋", style: "font-song" }),
  Object.freeze({ name: "霞鹜新晰黑", style: "font-hei" }),
  Object.freeze({ name: "朱雀仿宋", style: "font-fang" }),
]);
