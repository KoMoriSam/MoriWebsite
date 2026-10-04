import { computed, reactive, readonly } from "vue";

const SESSION_KEY = "giscus-session";
const PROFILE_KEY = "mori:github:profile";
const RETURN_KEY = "mori:github:return";
const RECHECK_AFTER = 5 * 60 * 1000;
export const GISCUS_ORIGIN = "https://giscus.app";

const classifyError = (message) => {
  if (/State has expired/i.test(message)) return "token-expired";
  if (/Invalid state value/i.test(message)) return "session-invalid";
  if (/Bad credentials|\b401\b/i.test(message)) return "token-invalid";
  if (/rate limit|\b429\b/i.test(message)) return "rate-limit";
  if (/forbidden|\b403\b/i.test(message)) return "forbidden";
  if (/failed to fetch|network|load failed|offline/i.test(message))
    return "network";
  if (/Discussion not found/i.test(message)) return "discussion";
  return "api";
};
const invalidSession = (code) =>
  ["token-expired", "session-invalid", "token-invalid"].includes(code);

// 共用 giscus 的加密会话；它不是本站服务端 session，也不作为房间接口凭证。
export function createGithubSession() {
  const state = reactive({
    authenticated: false,
    hasSession: false,
    status: "anonymous",
    profile: null,
    error: "",
    errorInfo: null,
    checking: false,
    revision: 0,
  });
  let session = "";
  let request = 0;
  let viewerLogin = "";
  let profileRequestLogin = "";
  let profileController;
  let verifiedAt = 0;
  let stop = null;
  const storage = () => window.localStorage;
  const widgets = () => [...document.querySelectorAll("giscus-widget")];
  const clearProfile = () => {
    state.profile = null;
    try {
      storage().removeItem(PROFILE_KEY);
    } catch {
      /* Storage can be unavailable. */
    }
  };
  const clearError = () => {
    state.error = "";
    state.errorInfo = null;
  };
  const report = (code, phase = "session", status = null) => {
    state.error = code;
    state.errorInfo = { code, phase, status, at: Date.now() };
    // 不记录 session、token、回调 URL 或原始接口错误文本。
    console.warn("[github-auth]", {
      code,
      phase,
      status,
      revision: state.revision,
    });
  };
  const readSession = () => {
    try {
      const raw = storage().getItem(SESSION_KEY);
      if (!raw) return "";
      const value = JSON.parse(raw);
      if (typeof value === "string" && value) return value;
      throw new Error("Invalid session storage");
    } catch (error) {
      try {
        storage().removeItem(SESSION_KEY);
      } catch {
        /* Storage can be unavailable. */
      }
      state.status = "unknown";
      report(
        error instanceof SyntaxError ||
          error.message === "Invalid session storage"
          ? "session-invalid"
          : "storage",
      );
      return "";
    }
  };
  const invalidate = (next = "") => {
    profileController?.abort();
    profileController = null;
    session = next;
    request++;
    viewerLogin = "";
    profileRequestLogin = "";
    verifiedAt = 0;
    clearProfile();
    clearError();
    state.authenticated = false;
    state.hasSession = !!session;
    state.status = session ? "checking" : "anonymous";
    state.checking = !!session;
    state.revision++;
  };
  const unknown = (code, status = null) => {
    profileController?.abort();
    profileController = null;
    request++;
    viewerLogin = "";
    profileRequestLogin = "";
    verifiedAt = 0;
    state.authenticated = false;
    state.checking = false;
    state.status = "unknown";
    clearProfile();
    report(code, "session", status);
  };
  const sync = () => {
    const next = readSession();
    const readError = state.errorInfo;
    if (next !== session) {
      invalidate(next);
      if (!next && ["storage", "session-invalid"].includes(readError?.code)) {
        state.status = "unknown";
        report(readError.code);
      }
    }
  };
  const logout = () => {
    const mounted = widgets();
    invalidate();
    let failed = false;
    for (const store of ["localStorage", "sessionStorage"]) {
      for (const key of [SESSION_KEY, PROFILE_KEY, RETURN_KEY]) {
        try {
          window[store].removeItem(key);
        } catch {
          failed = true;
        }
      }
    }
    // 在旧组件卸载前同步清掉其内存会话和 iframe 中的 token。
    mounted.forEach((widget) => {
      try {
        widget.signOut?.();
      } catch {
        failed = true;
      }
    });
    if (failed) report("storage", "logout");
  };
  const loadProfile = async (login) => {
    profileController?.abort();
    const controller = new AbortController();
    profileController = controller;
    const id = ++request;
    profileRequestLogin = login;
    clearError();
    state.checking = true;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(login)}`,
        {
          headers: { Accept: "application/vnd.github+json" },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const error = new Error("profile");
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      if (id !== request || !session || !state.authenticated) return;
      state.profile = {
        login,
        name: String(data.name || login).trim() || login,
        avatarUrl: String(data.avatar_url || ""),
        email: String(data.email || "").trim(),
      };
    } catch (error) {
      if (id === request) {
        state.profile = null;
        // 公开资料 API 的 401/403 不证明 giscus 会话失效。
        report("profile", "profile", error.status || null);
        state.errorInfo.reason =
          error.name === "AbortError"
            ? "timeout"
            : error.status
              ? classifyError(String(error.status))
              : "network";
      }
    } finally {
      window.clearTimeout(timer);
      if (id === request) {
        state.checking = false;
        profileRequestLogin = "";
        profileController = null;
      }
    }
  };
  const receive = (event) => {
    if (event.origin !== GISCUS_ORIGIN || !event.data?.giscus) return;
    const message = event.data.giscus;
    const code =
      typeof message.error === "string" ? classifyError(message.error) : "";
    // giscus 3.1 内置监听只校验 origin，旧/其他 iframe 也能清掉新会话。
    // 捕获阶段统一处理退出和失效，避免组件各自再次修改共享 storage。
    if (message.signOut || invalidSession(code))
      event.stopImmediatePropagation?.();
    const widget = widgets().find(
      (item) => item.iframeRef?.contentWindow === event.source,
    );
    if (!widget) return;
    sync();
    if (!session || widget.__session !== session) return;
    if (message.signOut) {
      logout();
      return;
    }
    if (invalidSession(code)) {
      logout();
      state.status = "invalid";
      report(code);
      return;
    }
    if (code) {
      if (widget.id === "github-profile-probe")
        unknown(
          code,
          Number(message.error.match(/\b([45]\d{2})\b/)?.[1]) || null,
        );
      return;
    }
    if (!("viewer" in message)) return;
    const login = message.viewer?.login;
    // 空 metadata 不等于确定退出，保留凭证并允许重新确认。
    if (typeof login !== "string" || !login) {
      if (widget.id === "github-profile-probe") unknown("session-mismatch");
      return;
    }
    if (viewerLogin && viewerLogin !== login) invalidate(session);
    viewerLogin = login;
    verifiedAt = Date.now();
    state.authenticated = true;
    state.status = "authenticated";
    clearError();
    state.checking = !!profileRequestLogin;
    if (
      (!state.profile || state.profile.login !== login) &&
      profileRequestLogin !== login
    )
      void loadProfile(login);
  };
  const retry = () => {
    const next = readSession();
    const readError = state.errorInfo;
    // 重试重新验证会话，不能只读取旧公开资料或失败结果。
    invalidate(next);
    if (!next)
      report(
        ["storage", "session-invalid"].includes(readError?.code)
          ? readError.code
          : "token-missing",
      );
  };
  const resume = () => {
    sync();
    if (
      session &&
      !state.checking &&
      (!state.authenticated || Date.now() - verifiedAt >= RECHECK_AFTER)
    )
      retry();
  };
  const login = () => {
    const target = new URL(window.location.href);
    target.searchParams.delete("giscus");
    logout();
    if (state.error === "storage") return;
    try {
      window.sessionStorage.setItem(RETURN_KEY, target.href);
    } catch {
      /* Callback preserves the route. */
    }
    window.location.assign(
      `${GISCUS_ORIGIN}/api/oauth/authorize?redirect_uri=${encodeURIComponent(target.href)}`,
    );
  };
  const start = (router) => {
    if (typeof window === "undefined" || stop) return;
    const url = new URL(window.location.href);
    const callback = url.searchParams.get("giscus");
    let returned;
    try {
      returned = window.sessionStorage.getItem(RETURN_KEY);
      window.sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* Optional position restore. */
    }
    if (callback) {
      logout();
      try {
        storage().setItem(SESSION_KEY, JSON.stringify(callback));
      } catch {
        report("storage", "callback");
      }
      url.searchParams.delete("giscus");
    }
    let restored = false;
    try {
      const target = returned && new URL(returned);
      if (
        target &&
        target.origin === url.origin &&
        target.pathname === url.pathname
      ) {
        url.hash = target.hash;
        restored = true;
      }
    } catch {
      /* Ignore malformed saved locations. */
    }
    if (callback || restored) {
      window.history.replaceState(window.history.state, "", url.href);
      void router.replace(`${url.pathname}${url.search}${url.hash}`);
    }
    sync();
    if (!session) clearProfile();
    window.addEventListener("message", receive, true);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    const timer = window.setInterval(sync, 2000);
    stop = () => {
      window.removeEventListener("message", receive, true);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.clearInterval(timer);
      profileController?.abort();
      request++;
      profileRequestLogin = "";
      state.checking = false;
      stop = null;
    };
    return () => stop?.();
  };
  return {
    state: readonly(state),
    login,
    logout,
    retry,
    start,
    probeFailed: (revision = state.revision) => {
      if (
        revision === state.revision &&
        state.status === "checking" &&
        !state.authenticated
      ) {
        unknown("timeout");
      }
    },
  };
}

const client = createGithubSession();
export const githubSession = client.state;
export const hasGithubSession = () => githubSession.authenticated;
export function useGithubSession() {
  return {
    ...client,
    authenticated: computed(() => client.state.authenticated),
    profile: computed(() => client.state.profile),
  };
}
