import { defineStore } from "pinia";
import { computed } from "vue";
import { STYLE_CONFIG_KEYS } from "@/constants/reader";
import { useReaderSettingsStorage } from "@/utils/storage/use-reader-settings-storage";

export const useReaderStore = defineStore("reader", () => {
  const { getSetting, setSetting } = useReaderSettingsStorage();

  const styleConfigs = computed(() => {
    const configs = {};
    STYLE_CONFIG_KEYS.forEach((config) => {
      configs[config.key] = getSetting(config.storageKey, config.default);
    });
    return configs;
  });

  const isDefault = (key) => {
    const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
    if (!config) return false;
    const currentValue = getSetting(config.storageKey, config.default);
    return currentValue === config.default;
  };

  const resetStyle = (key) => {
    const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
    if (config) {
      setSetting(config.storageKey, config.default);
    }
  };

  const setStyle = (key, value) => {
    const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
    if (config) {
      setSetting(config.storageKey, value);
    }
  };

  return {
    styleConfigs, // 保持兼容性
    setStyle,
    isDefault,
    resetStyle,
  };
});
