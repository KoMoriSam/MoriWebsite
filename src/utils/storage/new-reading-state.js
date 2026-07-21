import { useStorage } from "@vueuse/core";

export function useReadingStateStorage() {
  const READING_STATE = useStorage("READING_STATE", {});

  const keyMapping = {
    CHAPTER_LIST: "CHAPTER_LIST",
    CHAPTER_LIST_UPDATED_AT: "CHAPTER_LIST_UPDATED_AT",
    READ_CHS: "READ_CHS",
    READ_CH_ID: "READ_CH_ID",
    READ_PAGE: "READ_PAGE",
    READ_POS: "READ_POS",
  };

  // 通用兼容性获取函数
  const getState = (key, defaultValue) => {
    const newKey = keyMapping[key] || key;

    // 优先从新结构获取
    if (READING_STATE.value[newKey] !== undefined) {
      return READING_STATE.value[newKey];
    }

    // 尝试从旧键名获取（带类型转换，与 migrateReadingState 保持一致；SSG 构建时跳过 localStorage）
    const oldValue =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (oldValue !== null) {
      let value = oldValue;
      try {
        if (/^[\[{]/.test(oldValue)) {
          value = JSON.parse(oldValue);
        } else if (/^-?\d+(\.\d+)?$/.test(oldValue)) {
          value = oldValue.includes(".")
            ? parseFloat(oldValue)
            : Number(oldValue);
        }
      } catch (e) {
        value = oldValue;
      }

      // 自动迁移到新结构
      READING_STATE.value[newKey] = value;
      return value;
    }

    // 初始化默认值到新结构，确保后续引用修改能被持久化
    READING_STATE.value[newKey] = defaultValue;
    return READING_STATE.value[newKey];
  };

  // 通用设置函数
  const setState = (key, value) => {
    const newKey = keyMapping[key] || key;
    READING_STATE.value[newKey] = value;
  };

  return {
    READING_STATE,
    getState,
    setState,
  };
}
