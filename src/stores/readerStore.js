import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  FONTS,
  MOBILE_READING_MODES,
  MOBILE_READING_MODE_SETTING,
  MOBILE_READER_WHEEL_SETTING,
  MOBILE_READER_VOLUME_SETTING,
  MOBILE_READER_ZONE_SETTING,
  READER_LAYOUT_PRESETS_SETTING,
  DEFAULT_MOBILE_READER_ZONES,
  DEFAULT_MOBILE_READING_MODE,
  READER_STYLE_DEFAULTS,
  getReaderPresetAppearance,
  READER_LAYOUT_STYLE_KEYS,
  STYLE_CONFIG_KEYS,
} from "@/constants/reader";
import { useReaderSettingsStorage } from "@/composables/storage/useReaderSettingsStorage";
import { resolveReaderTypography } from "@/utils/reader/reader-typography";

export const useReaderStore = defineStore("reader", () => {
  const { getSetting, setSetting } = useReaderSettingsStorage();
  const readerFontOverride = ref(null);

  const savedStyles = computed(() => {
    const configs = {};
    STYLE_CONFIG_KEYS.forEach(({ key, storageKey }) => {
      configs[key] = getSetting(storageKey, READER_STYLE_DEFAULTS[key]);
    });
    return { ...configs, ...resolveReaderTypography(configs) };
  });

  // Device fonts only override the active session. Website fonts are saved.
  const styleConfigs = computed(() => {
    const configs = { ...savedStyles.value };
    if (readerFontOverride.value) {
      configs.fontStyle = readerFontOverride.value.id;
      configs.fontFamily = readerFontOverride.value.family;
    } else {
      configs.fontFamily = "";
    }
    configs.fontClass = FONTS.some(
      ({ style }) => style === configs.fontStyle,
    )
      ? configs.fontStyle
      : "";
    return configs;
  });

  const mobileReadingMode = computed(() => {
    const mode = getSetting(
      MOBILE_READING_MODE_SETTING,
      DEFAULT_MOBILE_READING_MODE,
    );

    return Object.values(MOBILE_READING_MODES).includes(mode)
      ? mode
      : DEFAULT_MOBILE_READING_MODE;
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
    const styles = { ...preset.styles, ...getReaderPresetAppearance(preset.styles) };
    STYLE_CONFIG_KEYS.forEach(({ key }) => {
      if (styles[key] !== undefined) setStyle(key, styles[key]);
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

  const isDefault = (key) =>
    Object.hasOwn(READER_STYLE_DEFAULTS, key) &&
    !(key === "fontStyle" && readerFontOverride.value) &&
    savedStyles.value[key] === READER_STYLE_DEFAULTS[key];

  const isMobileLayoutDefault = computed(
    () =>
      mobileReadingMode.value === DEFAULT_MOBILE_READING_MODE &&
      STYLE_CONFIG_KEYS.every(({ key }) => isDefault(key)),
  );

  const resetMobileLayout = () => {
    STYLE_CONFIG_KEYS.forEach(({ key }) => resetStyle(key));
    setMobileReadingMode(DEFAULT_MOBILE_READING_MODE);
  };

  const isReaderLayoutDefault = computed(
    () => READER_LAYOUT_STYLE_KEYS.every(isDefault),
  );

  const resetReaderLayout = () => {
    READER_LAYOUT_STYLE_KEYS.forEach(resetStyle);
  };

  const resetStyle = (key) => {
    if (key === "fontStyle") readerFontOverride.value = null;
    const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
    if (config) {
      setSetting(config.storageKey, READER_STYLE_DEFAULTS[key]);
    }
  };

  const setStyle = (key, value) => {
    if (key === "fontStyle") readerFontOverride.value = null;
    const config = STYLE_CONFIG_KEYS.find((item) => item.key === key);
    if (config) {
      setSetting(config.storageKey, value);
    }
  };

  const setReaderFont = (id, family = "") => {
    const isWebsiteFont = FONTS.some(({ style }) => style === id);
    if (isWebsiteFont) setStyle("fontStyle", id);
    readerFontOverride.value = family ? { id, family } : null;
  };

  return {
    styleConfigs,
    readerFontOverride,
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
    setReaderFont,
    setStyle,
    isDefault,
    resetStyle,
  };
});
