import { inject, computed } from 'vue';
import { createI18n } from 'vue-i18n';
import zh from './messages/zh-CN.json';
import { DEFAULT_LOCALE, detectLocale, readLocalePreference, writeLocalePreference, createLocaleSwitcher } from './locale.js';

export { LOCALES } from './locale.js';
export const LOCALE_SERVICE = Symbol('mori-locale');
const loaders = {
  en: () => import('./messages/en.json'),
  si: () => import('./messages/si.json'),
};

const sourceKeys = new Map();
function indexSources(messages, prefix = '') {
  for (const [key, value] of Object.entries(messages)) {
    const messageKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') sourceKeys.set(value.replace(/\{'([@|])'\}/g, '$1'), messageKey);
    else indexSources(value, messageKey);
  }
}
indexSources(zh);
const sourcePatterns = [...sourceKeys].filter(([source]) => /\{p\d+\}/.test(source)).map(([source, key]) => {
  const parameters = [...source.matchAll(/\{(p\d+)\}/g)].map(match => match[1]);
  const pattern = source.split(/\{p\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)');
  return { key, parameters, pattern: new RegExp(`^${pattern}$`, 's') };
});

export function createLocaleService() {
  const i18n = createI18n({ legacy: false, locale: DEFAULT_LOCALE, fallbackLocale: DEFAULT_LOCALE, messages: { [DEFAULT_LOCALE]: zh } });
  const { t, locale } = i18n.global;
  const loaded = new Set([DEFAULT_LOCALE]);
  let globalInfo = null;
  const pending = new Map();
  const load = async (code) => {
    if (loaded.has(code)) return;
    if (!pending.has(code)) {
      pending.set(code, loaders[code]().then(({ default: messages }) => {
        i18n.global.setLocaleMessage(code, messages);
        loaded.add(code);
      }).finally(() => pending.delete(code)));
    }
    await pending.get(code);
  };
  const switchLocale = createLocaleSwitcher({
    load,
    apply: (code) => { locale.value = code; },
    persist: (code) => {
      if (globalInfo) {
        try {
          const info = globalInfo.value;
          globalInfo.value = { ...(info && typeof info === 'object' && !Array.isArray(info) ? info : {}), SET_LOCALE: code };
        } catch { /* Session selection remains active. */ }
        return;
      }
      try { writeLocalePreference(window.localStorage, code); } catch { /* Storage may be inaccessible. */ }
    },
  });
  const text = (value) => {
    if (value && typeof value === 'object' && typeof value.key === 'string') return t(value.key, value.params || {});
    if (typeof value !== 'string') return value;
    const key = sourceKeys.get(value);
    if (key) return t(key);
    for (const entry of sourcePatterns) {
      const match = value.match(entry.pattern);
      if (match) return t(entry.key, Object.fromEntries(entry.parameters.map((name, index) => [name, match[index + 1]])));
    }
    return value;
  };
  const number = (value, options) => new Intl.NumberFormat(locale.value, options).format(value);
  const date = (value, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value || '') : new Intl.DateTimeFormat(locale.value, options).format(parsed);
  };
  return {
    i18n, t, text, locale, number, date, switchLocale,
    message: (key, params = {}) => ({ key, params }),
    commentLocale: computed(() => locale.value === DEFAULT_LOCALE ? 'zh-CN' : 'en'),
    async restoreLocale(info = null) {
      globalInfo = info;
      let saved = null;
      try { saved = readLocalePreference(window.localStorage); } catch { /* Browser preference is still available. */ }
      const detected = detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
      await switchLocale(saved || detected, { save: false });
    },
    install(app) { app.use(i18n); app.provide(LOCALE_SERVICE, this); },
    // Auxiliary apps share the composer without owning its disposal lifecycle.
    provide(app) { app.provide(LOCALE_SERVICE, this); },
  };
}

export function useLocale() {
  const service = inject(LOCALE_SERVICE);
  if (!service) throw new Error('Locale service is not installed');
  return service;
}
