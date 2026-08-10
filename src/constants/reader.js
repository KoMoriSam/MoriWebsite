export const MOBILE_READER_NAVBAR_SHOW_EVENT = "mobile-reader:show-navbar";

export const MOBILE_READING_MODES = Object.freeze({
  PAGED: "paged",
  SCROLL: "scroll",
});

export const MOBILE_READING_MODE_SETTING = "MOBILE_READING_MODE";

export const STYLE_CONFIG_KEYS = [
  {
    key: "fontStyle",
    storageKey: "STYLE_FONT",
    default: "font-kai",
  },
  {
    key: "fontSize",
    storageKey: "STYLE_FONT_SIZE",
    default: 20,
  },
  {
    key: "fontGap",
    storageKey: "STYLE_FONT_GAP",
    default: 0,
  },
  {
    key: "lineHeight",
    storageKey: "CONTENT_LINE_HEIGHT",
    default: 1.6,
  },
  {
    key: "paraHeight",
    storageKey: "CONTENT_PARA_HEIGHT",
    default: 0.5,
  },
];

export const FONTS = [
  { name: "无衬线（Noto Sans SC + Manrope）", style: "font-sans" },
  { name: "衬线体（Noto Serif SC + Fraunces）", style: "font-serif" },
  { name: "霞鹜文楷", style: "font-kai" },
  { name: "霞鹜新致宋", style: "font-song" },
  { name: "霞鹜新晰黑", style: "font-hei" },
  { name: "朱雀仿宋", style: "font-fang" },
];
