import { useStorage } from "@vueuse/core";

export function useGlobalStorage() {
  const GLOBAL_INFO = useStorage("GLOBAL_INFO", {});

  // 旧键名到新键名的映射（包含重命名）
  const keyMapping = {
    // 直接映射的键
    APP_VERSION: "APP_VERSION",
    SET_THEME: "SET_THEME",
  };

  // 通用兼容性获取函数
  const getInfo = (key, defaultValue) => {
    const newKey = keyMapping[key] || key;

    // 优先从新结构获取
    if (GLOBAL_INFO.value[newKey] !== undefined) {
      return GLOBAL_INFO.value[newKey];
    }

    // 尝试从旧键名获取（SSG 构建时跳过 localStorage）
    const oldValue =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (oldValue !== null) {
      // 根据类型转换
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
      GLOBAL_INFO.value[newKey] = value;
      return value;
    }

    // 初始化默认值到新结构，确保后续引用修改能被持久化
    GLOBAL_INFO.value[newKey] = defaultValue;
    return GLOBAL_INFO.value[newKey];
  };

  // 通用设置函数
  const setInfo = (key, value) => {
    const newKey = keyMapping[key] || key;
    GLOBAL_INFO.value[newKey] = value;
  };

  return {
    GLOBAL_INFO,
    getInfo,
    setInfo,
  };
}
