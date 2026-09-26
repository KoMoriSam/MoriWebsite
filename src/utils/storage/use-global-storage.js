import { useStorage } from "@vueuse/core";

export function useGlobalStorage() {
  const GLOBAL_INFO = useStorage("GLOBAL_INFO", {});

  const ensureInfo = () => {
    if (!GLOBAL_INFO.value || typeof GLOBAL_INFO.value !== "object" || Array.isArray(GLOBAL_INFO.value)) {
      GLOBAL_INFO.value = {};
    }
    return GLOBAL_INFO.value;
  };
  ensureInfo();

  // 旧键名到新键名的映射（包含重命名）
  const keyMapping = {
    // 直接映射的键
    SET_THEME: "SET_THEME",
  };

  // 通用兼容性获取函数
  const getInfo = (key, defaultValue) => {
    const newKey = keyMapping[key] || key;

    // 优先从新结构获取
    const info = ensureInfo();
    if (info[newKey] !== undefined) {
      return info[newKey];
    }

    // 尝试从旧键名获取（SSG 构建时跳过 localStorage）
    let oldValue = null;
    try {
      if (typeof window !== "undefined") oldValue = window.localStorage.getItem(key);
    } catch {
      // Keep preferences usable in memory when browser storage is unavailable.
    }
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
    ensureInfo()[newKey] = value;
  };

  return {
    GLOBAL_INFO,
    getInfo,
    setInfo,
  };
}
