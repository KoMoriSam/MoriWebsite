import { READER_LAYOUT_STYLE_KEYS, STYLE_CONFIG_KEYS } from "../../constants/reader.js";
import { useHydratedStorage } from "./useHydratedStorage";

const legacyKeyMapping = {
  CONTENT_LINE_HEIGHT: "STYLE_LINE_HEIGHT",
  CONTENT_PARA_HEIGHT: "STYLE_PARA_HEIGHT",
};
const numericKeys = new Set(
  STYLE_CONFIG_KEYS
    .filter(({ default: value }) => typeof value === "number")
    .map(({ storageKey }) => storageKey),
);
export const LEGACY_READER_SETTING_KEYS = [
  ...STYLE_CONFIG_KEYS
    .filter(({ key }) => READER_LAYOUT_STYLE_KEYS.includes(key))
    .map(({ storageKey }) => storageKey),
  "NOVEL_CURRENT_COMPONENT",
  "NOVEL_SIDE_CURRENT_COMPONENT",
];

export function useReaderSettingsStorage() {
  const { storage: READER_SETTINGS, ready } = useHydratedStorage("READER_SETTINGS", {});

  const getSetting = (key, defaultValue) => {
    const storageKey = legacyKeyMapping[key] || key;
    const saved = READER_SETTINGS.value[storageKey];
    if (saved !== undefined) return saved;
    if (!ready.value || typeof window === "undefined") return defaultValue;

    let legacy = null;
    try {
      legacy = window.localStorage.getItem(key);
    } catch {
      // Storage restrictions must not prevent reading in this session.
    }
    if (legacy === null) return defaultValue;

    if (numericKeys.has(key)) {
      const value = legacy.trim() ? Number(legacy) : NaN;
      if (!Number.isFinite(value)) return defaultValue;
      legacy = value;
    }
    READER_SETTINGS.value[storageKey] = legacy;
    return legacy;
  };

  const setSetting = (key, value) => {
    READER_SETTINGS.value[legacyKeyMapping[key] || key] = value;
  };

  return { READER_SETTINGS, getSetting, setSetting };
}
