import { useStorage } from "@vueuse/core";

export function useReaderSettingsStorage() {
  const READER_SETTINGS = useStorage("READER_SETTINGS", {});

  // 旧键名到新键名的映射（包含重命名）
  const keyMapping = {
    // 直接映射的键
    STYLE_FONT: "STYLE_FONT",
    STYLE_FONT_GAP: "STYLE_FONT_GAP",
    STYLE_FONT_SIZE: "STYLE_FONT_SIZE",
    NOVEL_CURRENT_COMPONENT: "NOVEL_CURRENT_COMPONENT",
    NOVEL_SIDE_CURRENT_COMPONENT: "NOVEL_SIDE_CURRENT_COMPONENT",

    // 重命名的键
    CONTENT_LINE_HEIGHT: "STYLE_LINE_HEIGHT",
    CONTENT_PARA_HEIGHT: "STYLE_PARA_HEIGHT",
  };

  // 数值类型的键（需要转换）
  const numberKeys = [
    "STYLE_FONT_GAP",
    "STYLE_FONT_SIZE",
    "CONTENT_LINE_HEIGHT",
    "CONTENT_PARA_HEIGHT",
  ];

  // 通用兼容性获取函数
  const getSetting = (key, defaultValue) => {
    const newKey = keyMapping[key] || key;

    // 优先从新结构获取
    if (READER_SETTINGS.value[newKey] !== undefined) {
      return READER_SETTINGS.value[newKey];
    }

    // 尝试从旧键名获取（SSG 构建时跳过 localStorage）
    const oldValue =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (oldValue !== null) {
      // 根据类型转换
      let value = oldValue;
      if (numberKeys.includes(key)) {
        value =
          key.includes("LINE_HEIGHT") || key.includes("PARA_HEIGHT")
            ? parseFloat(oldValue)
            : Number(oldValue);
      }

      // 自动迁移到新结构
      READER_SETTINGS.value[newKey] = value;
      return value;
    }

    // 初始化默认值到新结构，确保后续引用修改能被持久化
    READER_SETTINGS.value[newKey] = defaultValue;
    return READER_SETTINGS.value[newKey];
  };

  // 通用设置函数
  const setSetting = (key, value) => {
    const newKey = keyMapping[key] || key;
    READER_SETTINGS.value[newKey] = value;
  };

  return {
    READER_SETTINGS,
    getSetting,
    setSetting,
  };
}
