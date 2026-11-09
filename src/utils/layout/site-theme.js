export const DEFAULT_THEME = "default";
export const SITE_THEME_NAMES = ["lemonade", "forest", "corporate", "dim"];

// Serialized into a synchronous head script; keep this function self-contained.
export function initializeSiteTheme(themes) {
  let preference;
  try {
    preference = JSON.parse(localStorage.getItem("GLOBAL_INFO") || "{}")?.SET_THEME;
    if (preference == null) {
      preference = localStorage.getItem("SET_THEME");
      if (preference?.startsWith('"')) preference = JSON.parse(preference);
    }
  } catch {
    // System colors still work when storage is unavailable or malformed.
  }
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = themes.includes(preference)
    ? preference
    : dark ? "forest" : "lemonade";
}
