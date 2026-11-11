import { computed, reactive, readonly } from "vue";

const signalKey = "mori:auth:changed";
const positionKey = "mori:auth:return";
const recheckAfter = 120_000;

export function createMoriAuth() {
  const state = reactive({
    authenticated: false, canReadNovel: false, hasSession: false,
    status: "unknown", profile: null, error: "", checking: true, revision: 0,
  });
  let request = 0;
  let checkedAt = 0;
  let expiryTimer;
  let pending;
  let stop;

  function apply(profile, status, error = "", canReadNovel = false) {
    const changed = state.profile?.id !== profile?.id ||
      state.profile?.expiresAt !== profile?.expiresAt || state.canReadNovel !== canReadNovel;
    Object.assign(state, {
      authenticated: Boolean(profile), canReadNovel,
      hasSession: Boolean(profile) || status === "error",
      profile, status, error, checking: false,
    });
    if (changed) state.revision++;
    clearTimeout(expiryTimer);
    if (profile?.expiresAt) {
      expiryTimer = setTimeout(() => void retry(), Math.min(2 ** 31 - 1, Math.max(1000, profile.expiresAt - Date.now())));
    }
  }

  function signal() {
    try { window.localStorage.setItem(signalKey, crypto.randomUUID()); } catch { /* Storage is optional. */ }
  }

  function retry() {
    if (typeof window === "undefined") return;
    if (pending) return pending;
    const id = ++request;
    if (!state.authenticated) state.checking = true;
    pending = (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store", signal: AbortSignal.timeout(10000),
        });
        if (id !== request) return;
        checkedAt = Date.now();
        if (response.status === 401) {
          apply(null, "expired", "token-expired");
          return;
        }
        if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
        const { profile, canReadNovel } = await response.json();
        if (id !== request) return;
        apply(profile || null, profile ? "authenticated" : "anonymous", "", Boolean(canReadNovel));
      } catch {
        if (id === request) apply(null, "error", "network");
      } finally {
        if (id === request) pending = null;
      }
    })();
    return pending;
  }

  function invalidate() {
    ++request;
    pending = null;
    apply(null, "expired", "token-expired");
    void retry();
  }

  function login(options = {}) {
    const url = new URL(window.location.href);
    url.searchParams.delete("auth_error");
    if (options?.hash) url.hash = options.hash;
    const target = url.pathname + url.search + url.hash;
    try {
      window.sessionStorage.setItem(positionKey, JSON.stringify({ path: target, y: window.scrollY }));
    } catch { /* The return URL still includes the route and anchor. */ }
    const params = new URLSearchParams({ return: target });
    if (options?.reauthorize) params.set("reauthorize", "1");
    window.location.assign("/auth/login?" + params);
  }

  async function logout() {
    ++request;
    pending = null;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
      const { logoutUrl } = await response.json();
      ++request;
      pending = null;
      apply(null, "anonymous");
      signal();
      window.location.assign(logoutUrl + "?" + new URLSearchParams({
        return: window.location.pathname + window.location.search + window.location.hash,
      }));
    } catch {
      ++request;
      pending = null;
      apply(null, "error", "network");
    }
  }

  function start(router) {
    if (typeof window === "undefined" || stop) return;
    const url = new URL(window.location.href);
    const failed = url.searchParams.has("auth_error");
    const legacy = url.searchParams.has("giscus");
    url.searchParams.delete("auth_error");
    url.searchParams.delete("giscus");
    const path = url.pathname + url.search + url.hash;
    if (failed || legacy) void router.replace(path);
    let returning;
    try {
      window.localStorage.removeItem("giscus-session");
      window.localStorage.removeItem("mori:github:profile");
      returning = JSON.parse(window.sessionStorage.getItem(positionKey));
      window.sessionStorage.removeItem(positionKey);
      window.sessionStorage.removeItem("mori:github:return");
    } catch { /* Storage is optional. */ }
    void retry()?.then(() => {
      if (failed && !state.authenticated) apply(null, "anonymous", "session-invalid");
      if (returning?.path === path) {
        if (state.authenticated) signal();
        if (!url.hash && Number.isFinite(returning.y)) {
          requestAnimationFrame(() => window.scrollTo({ top: returning.y, behavior: "instant" }));
        }
      }
    });
    const resume = () => {
      if (Date.now() - checkedAt >= recheckAfter || !state.authenticated) void retry();
    };
    const sync = (event) => {
      if (event.key !== signalKey) return;
      ++request;
      pending = null;
      void retry();
    };
    const visible = () => { if (document.visibilityState === "visible") resume(); };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(visible, recheckAfter);
    stop = () => {
      ++request;
      pending = null;
      clearTimeout(expiryTimer);
      clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", visible);
      stop = null;
    };
    return stop;
  }

  return { state: readonly(state), login, logout, retry, invalidate, start };
}

const client = createMoriAuth();
export const moriSession = client.state;
export function useMoriAuth() {
  return {
    ...client,
    authenticated: computed(() => client.state.authenticated),
    profile: computed(() => client.state.profile),
  };
}
