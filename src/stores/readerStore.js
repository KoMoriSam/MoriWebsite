import { defineStore } from "pinia";
import { computed } from "vue";
import {
  MOBILE_READING_MODES,
  MOBILE_READING_MODE_SETTING,
  MOBILE_READER_WHEEL_SETTING,
  MOBILE_READER_VOLUME_SETTING,
  MOBILE_READER_ZONE_SETTING,
  MOBILE_READER_PRESETS_SETTING,
  DEFAULT_MOBILE_READER_ZONES,
  STYLE_CONFIG_KEYS,
} from "@/constants/reader";
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

  const mobileReadingMode = computed(() => {
    const mode = getSetting(
      MOBILE_READING_MODE_SETTING,
      MOBILE_READING_MODES.PAGED,
    );

    return Object.values(MOBILE_READING_MODES).includes(mode)
      ? mode
      : MOBILE_READING_MODES.PAGED;
  });

  const setMobileReadingMode = (mode) => {
    if (!Object.values(MOBILE_READING_MODES).includes(mode)) return;
    setSetting(MOBILE_READING_MODE_SETTING, mode);
  };

  const mobileWheelPagination = computed(() =>
    Boolean(getSetting(MOBILE_READER_WHEEL_SETTING, false)),
  );
  const mobileVolumePagination = computed(() =>
    Boolean(getSetting(MOBILE_READER_VOLUME_SETTING, false)),
  );
  const mobileTapZones = computed(() => {
    const zones = getSetting(MOBILE_READER_ZONE_SETTING, [
      ...DEFAULT_MOBILE_READER_ZONES,
    ]);
    return Array.isArray(zones) && zones.length === 9
      ? zones
      : [...DEFAULT_MOBILE_READER_ZONES];
  });
  const mobileLayoutPresets = computed(() => {
    const presets = getSetting(MOBILE_READER_PRESETS_SETTING, []);
    return Array.isArray(presets) ? presets : [];
  });

  const setMobileWheelPagination = (enabled) =>
    setSetting(MOBILE_READER_WHEEL_SETTING, Boolean(enabled));
  const setMobileVolumePagination = (enabled) =>
    setSetting(MOBILE_READER_VOLUME_SETTING, Boolean(enabled));
  const setMobileTapZone = (index, action) => {
    if (index < 0 || index > 8) return;
    const zones = [...mobileTapZones.value];
    zones[index] = action;
    setSetting(MOBILE_READER_ZONE_SETTING, zones);
  };
  const resetMobileTapZones = () =>
    setSetting(MOBILE_READER_ZONE_SETTING, [...DEFAULT_MOBILE_READER_ZONES]);
  const saveMobileLayoutPreset = (name) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return false;
    const preset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      mode: mobileReadingMode.value,
      styles: { ...styleConfigs.value },
    };
    setSetting(MOBILE_READER_PRESETS_SETTING, [
      ...mobileLayoutPresets.value,
      preset,
    ]);
    return true;
  };
  const applyMobileLayoutPreset = (preset) => {
    if (!preset?.styles) return;
    const inferredColorTheme =
      preset.styles.colorTheme ||
      (preset.styles.textColor || preset.styles.backgroundColor
        ? "custom"
        : "site");
    STYLE_CONFIG_KEYS.forEach(({ key }) => {
      if (key === "colorTheme") {
        setStyle(key, inferredColorTheme);
      } else if (preset.styles[key] !== undefined) {
        setStyle(key, preset.styles[key]);
      }
    });
    setMobileReadingMode(preset.mode);
  };
  const removeMobileLayoutPreset = (id) =>
    setSetting(
      MOBILE_READER_PRESETS_SETTING,
      mobileLayoutPresets.value.filter((preset) => preset.id !== id),
    );

  const isMobileLayoutDefault = computed(
    () =>
      mobileReadingMode.value === MOBILE_READING_MODES.PAGED &&
      STYLE_CONFIG_KEYS.every(
        ({ storageKey, default: defaultValue }) =>
          getSetting(storageKey, defaultValue) === defaultValue,
      ),
  );

  const resetMobileLayout = () => {
    STYLE_CONFIG_KEYS.forEach(({ key }) => resetStyle(key));
    setMobileReadingMode(MOBILE_READING_MODES.PAGED);
  };

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
    mobileReadingMode,
    mobileWheelPagination,
    mobileVolumePagination,
    mobileTapZones,
    mobileLayoutPresets,
    isMobileLayoutDefault,
    setMobileReadingMode,
    setMobileWheelPagination,
    setMobileVolumePagination,
    setMobileTapZone,
    resetMobileTapZones,
    saveMobileLayoutPreset,
    applyMobileLayoutPreset,
    removeMobileLayoutPreset,
    resetMobileLayout,
    setStyle,
    isDefault,
    resetStyle,
  };
});
