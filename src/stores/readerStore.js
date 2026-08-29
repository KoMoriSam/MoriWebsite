import { defineStore } from "pinia";
import { computed } from "vue";
import {
  MOBILE_READING_MODES,
  MOBILE_READING_MODE_SETTING,
  MOBILE_READER_WHEEL_SETTING,
  MOBILE_READER_VOLUME_SETTING,
  MOBILE_READER_ZONE_SETTING,
  READER_LAYOUT_PRESETS_SETTING,
  DEFAULT_MOBILE_READER_ZONES,
  READER_LAYOUT_STYLE_KEYS,
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
  const readerLayoutPresets = computed(() => {
    const presets = getSetting(READER_LAYOUT_PRESETS_SETTING, []);
    return Array.isArray(presets) ? presets : [];
  });
  // 兼容现有移动端调用；底层已作为两端共用的排版预设集合。
  const mobileLayoutPresets = readerLayoutPresets;

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
    setSetting(READER_LAYOUT_PRESETS_SETTING, [
      ...readerLayoutPresets.value,
      preset,
    ]);
    return true;
  };
  const saveReaderLayoutPreset = (name) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return false;
    const styles = Object.fromEntries(
      READER_LAYOUT_STYLE_KEYS.map((key) => [key, styleConfigs.value[key]]),
    );
    const preset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      styles,
    };
    setSetting(READER_LAYOUT_PRESETS_SETTING, [
      ...readerLayoutPresets.value,
      preset,
    ]);
    return true;
  };
  const applyMobileLayoutPreset = (preset) => {
    if (!preset?.styles) return;
    const hasOwnStyle = (key) =>
      Object.prototype.hasOwnProperty.call(preset.styles, key);
    const hasPresetColors =
      hasOwnStyle("colorTheme") ||
      hasOwnStyle("textColor") ||
      hasOwnStyle("backgroundColor") ||
      hasOwnStyle("backgroundType") ||
      hasOwnStyle("backgroundImage");
    const inferredColorTheme = hasOwnStyle("colorTheme")
      ? preset.styles.colorTheme
      : preset.styles.textColor ||
          preset.styles.backgroundColor ||
          preset.styles.backgroundImage
        ? "custom"
        : "site";
    const inferredBackgroundType = hasOwnStyle("backgroundType")
      ? preset.styles.backgroundType
      : preset.styles.backgroundImage
        ? "image"
        : "color";
    STYLE_CONFIG_KEYS.forEach(({ key }) => {
      if (key === "colorTheme" && hasPresetColors) {
        setStyle(key, inferredColorTheme);
      } else if (key === "textColor" && hasPresetColors) {
        setStyle(key, preset.styles.textColor || "");
      } else if (key === "backgroundColor" && hasPresetColors) {
        setStyle(
          key,
          inferredBackgroundType === "color"
            ? preset.styles.backgroundColor || ""
            : "",
        );
      } else if (key === "backgroundType" && hasPresetColors) {
        setStyle(key, inferredBackgroundType);
      } else if (key === "backgroundImage" && hasPresetColors) {
        setStyle(
          key,
          inferredBackgroundType === "image"
            ? preset.styles.backgroundImage || ""
            : "",
        );
      } else if (preset.styles[key] !== undefined) {
        setStyle(key, preset.styles[key]);
      }
    });
    if (preset.mode !== undefined) setMobileReadingMode(preset.mode);
  };
  const applyReaderLayoutPreset = (preset) => {
    if (!preset?.styles) return;
    READER_LAYOUT_STYLE_KEYS.forEach((key) => {
      if (preset.styles[key] !== undefined) setStyle(key, preset.styles[key]);
    });
  };
  const removeMobileLayoutPreset = (id) =>
    setSetting(
      READER_LAYOUT_PRESETS_SETTING,
      readerLayoutPresets.value.filter((preset) => preset.id !== id),
    );
  const removeReaderLayoutPreset = removeMobileLayoutPreset;

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

  const isReaderLayoutDefault = computed(() =>
    READER_LAYOUT_STYLE_KEYS.every((key) => {
      const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
      return (
        config &&
        getSetting(config.storageKey, config.default) === config.default
      );
    }),
  );

  const resetReaderLayout = () => {
    READER_LAYOUT_STYLE_KEYS.forEach((key) => resetStyle(key));
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
    styleConfigs,
    mobileReadingMode,
    mobileWheelPagination,
    mobileVolumePagination,
    mobileTapZones,
    readerLayoutPresets,
    mobileLayoutPresets,
    isMobileLayoutDefault,
    isReaderLayoutDefault,
    setMobileReadingMode,
    setMobileWheelPagination,
    setMobileVolumePagination,
    setMobileTapZone,
    resetMobileTapZones,
    saveMobileLayoutPreset,
    saveReaderLayoutPreset,
    applyMobileLayoutPreset,
    applyReaderLayoutPreset,
    removeMobileLayoutPreset,
    removeReaderLayoutPreset,
    resetMobileLayout,
    resetReaderLayout,
    setStyle,
    isDefault,
    resetStyle,
  };
});
