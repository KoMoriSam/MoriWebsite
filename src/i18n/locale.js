export const DEFAULT_LOCALE = "zh-CN";
export const LOCALES = Object.freeze([
  { code: "zh-CN", name: "中文（简体）" },
  { code: "en", name: "English" },
  { code: "si", name: "සිංහල" },
]);

export function normalizeLocale(value) {
  if (typeof value !== "string") return null;
  const language = value
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .split("-")[0];
  if (language === "zh") return "zh-CN";
  return language === "en" || language === "si" ? language : null;
}

export function detectLocale(languages = []) {
  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

export function readLocalePreference(storage) {
  try {
    return normalizeLocale(
      JSON.parse(storage.getItem("GLOBAL_INFO") || "{}")?.SET_LOCALE,
    );
  } catch {
    return null;
  }
}

export function writeLocalePreference(storage, locale) {
  try {
    const current = JSON.parse(storage.getItem("GLOBAL_INFO") || "{}");
    const info =
      current && typeof current === "object" && !Array.isArray(current)
        ? current
        : {};
    storage.setItem(
      "GLOBAL_INFO",
      JSON.stringify({ ...info, SET_LOCALE: locale }),
    );
  } catch {
    // Language selection still works when browser storage is disabled.
  }
}

export function createLocaleSwitcher({ load, apply, persist }) {
  let sequence = 0;
  return async (value, { save = true } = {}) => {
    const locale = normalizeLocale(value);
    if (!locale) return false;
    const request = ++sequence;
    try {
      await load(locale);
    } catch (error) {
      if (request !== sequence) return false;
      throw error;
    }
    if (request !== sequence) return false;
    apply(locale);
    if (save) persist(locale);
    return true;
  };
}
