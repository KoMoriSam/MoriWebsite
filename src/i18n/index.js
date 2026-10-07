import { inject, computed } from "vue";
import { createI18n } from "vue-i18n";
import zh from "./messages/zh-CN/common.json";
import { messageLoaders, getRouteMessageGroups } from "./message-groups.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  readLocalePreference,
  writeLocalePreference,
  createLocaleSwitcher,
} from "./locale.js";

export { LOCALES } from "./locale.js";
export const LOCALE_SERVICE = Symbol("mori-locale");
function indexSources(messages, sourceKeys, prefix = "") {
  for (const [key, value] of Object.entries(messages)) {
    const messageKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string")
      sourceKeys.set(value.replace(/\{'([@|])'\}/g, "$1"), messageKey);
    else indexSources(value, sourceKeys, messageKey);
  }
}
function createSourcePatterns(sourceKeys) {
  return [...sourceKeys]
    .filter(([source]) => /\{p\d+\}/.test(source))
    .map(([source, key]) => {
      const parameters = [...source.matchAll(/\{(p\d+)\}/g)].map(
        (match) => match[1],
      );
      const pattern = source
        .split(/\{p\d+\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("(.*?)");
      return { key, parameters, pattern: new RegExp(`^${pattern}$`, "s") };
    });
}

export function createLocaleService({ loaders = messageLoaders } = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: DEFAULT_LOCALE,
    fallbackLocale: DEFAULT_LOCALE,
    messages: { [DEFAULT_LOCALE]: structuredClone(zh) },
  });
  const { t, locale } = i18n.global;
  const loaded = new Set([`${DEFAULT_LOCALE}/common`]);
  const sourceKeys = new Map();
  const sourceMessages = new Map([["common", zh]]);
  let sourcePatterns = [];
  let activeGroups = ["common"];
  const refreshSources = () => {
    sourceKeys.clear();
    // Shared labels stay available when previously visited pages are not loaded
    // in the newly selected language.
    for (const group of [...activeGroups.filter((group) => group !== "common"), "common"]) {
      const messages = sourceMessages.get(group);
      if (messages) indexSources(messages, sourceKeys);
    }
    sourcePatterns = createSourcePatterns(sourceKeys);
  };
  refreshSources();
  let groupSequence = 0;
  let requestedLocale = DEFAULT_LOCALE;
  let localeLoadSequence = 0;
  let globalInfo = null;
  const pending = new Map();
  const loadGroup = async (code, group) => {
    const id = `${code}/${group}`;
    if (loaded.has(id)) return;
    if (!pending.has(id)) {
      const loader = loaders[`./messages/${id}.json`];
      if (!loader) throw new Error(`Unknown locale message group: ${id}`);
      pending.set(
        id,
        Promise.resolve()
          .then(loader)
          .then((messages) => {
            i18n.global.mergeLocaleMessage(code, structuredClone(messages));
            if (code === DEFAULT_LOCALE) {
              sourceMessages.set(group, messages);
              refreshSources();
            }
            loaded.add(id);
          })
          .finally(() => pending.delete(id)),
      );
    }
    await pending.get(id);
  };
  const load = async (code) => {
    // Navigation may change the required groups while a language is downloading.
    let sequence;
    do {
      sequence = groupSequence;
      const codes = [...new Set([DEFAULT_LOCALE, code])];
      await Promise.all(
        codes.flatMap((language) =>
          activeGroups.map((group) => loadGroup(language, group)),
        ),
      );
    } while (sequence !== groupSequence);
  };
  const switchLocale = createLocaleSwitcher({
    load: async (code) => {
      requestedLocale = code;
      const request = ++localeLoadSequence;
      try {
        await load(code);
      } catch (error) {
        if (request === localeLoadSequence) requestedLocale = locale.value;
        throw error;
      }
    },
    apply: (code) => {
      locale.value = code;
    },
    persist: (code) => {
      if (globalInfo) {
        try {
          const info = globalInfo.value;
          globalInfo.value = {
            ...(info && typeof info === "object" && !Array.isArray(info)
              ? info
              : {}),
            SET_LOCALE: code,
          };
        } catch {
          /* Session selection remains active. */
        }
        return;
      }
      try {
        writeLocalePreference(window.localStorage, code);
      } catch {
        /* Storage may be inaccessible. */
      }
    },
  });
  const text = (value) => {
    if (value && typeof value === "object" && typeof value.key === "string")
      return t(value.key, value.params || {});
    if (typeof value !== "string") return value;
    const key = sourceKeys.get(value);
    if (key) return t(key);
    for (const entry of sourcePatterns) {
      const match = value.match(entry.pattern);
      if (match)
        return t(
          entry.key,
          Object.fromEntries(
            entry.parameters.map((name, index) => [name, match[index + 1]]),
          ),
        );
    }
    return value;
  };
  const number = (value, options) =>
    new Intl.NumberFormat(locale.value, options).format(value);
  const date = (
    value,
    options = { year: "numeric", month: "long", day: "numeric" },
  ) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? String(value || "")
      : new Intl.DateTimeFormat(locale.value, options).format(parsed);
  };
  return {
    i18n,
    t,
    text,
    locale,
    number,
    date,
    switchLocale,
    async loadRoute(route) {
      activeGroups = getRouteMessageGroups(route);
      refreshSources();
      groupSequence++;
      await Promise.all([...new Set([locale.value, requestedLocale])].map(load));
    },
    message: (key, params = {}) => ({ key, params }),
    commentLocale: computed(() =>
      locale.value === DEFAULT_LOCALE ? "zh-CN" : "en",
    ),
    async restoreLocale(info = null) {
      globalInfo = info;
      let saved = null;
      try {
        saved = readLocalePreference(window.localStorage);
      } catch {
        /* Browser preference is still available. */
      }
      const detected = detectLocale(
        navigator.languages?.length
          ? navigator.languages
          : [navigator.language],
      );
      await switchLocale(saved || detected, { save: false });
    },
    install(app) {
      app.use(i18n);
      app.provide(LOCALE_SERVICE, this);
    },
    // Auxiliary apps share the composer without owning its disposal lifecycle.
    provide(app) {
      app.provide(LOCALE_SERVICE, this);
    },
  };
}

export function useLocale() {
  const service = inject(LOCALE_SERVICE);
  if (!service) throw new Error("Locale service is not installed");
  return service;
}
