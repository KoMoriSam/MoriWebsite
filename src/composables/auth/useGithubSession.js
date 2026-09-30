import { computed, reactive, readonly } from 'vue';

const SESSION_KEY = 'giscus-session';
const PROFILE_KEY = 'mori:github:profile';
const RETURN_KEY = 'mori:github:return';
export const GISCUS_ORIGIN = 'https://giscus.app';

// Giscus 授权只用于本站的界面门槛，房间接口不接收此会话。
export function createGithubSession() {
  const state = reactive({ authenticated: false, profile: null, error: '', checking: false, revision: 0, fallbackOpen: false });
  let session = '';
  let request = 0;
  let profileRequestLogin = '';
  let stop = null;
  const storage = () => window.localStorage;
  const readSession = () => {
    try { const value = JSON.parse(storage().getItem(SESSION_KEY) || 'null'); return typeof value === 'string' ? value : ''; }
    catch { return ''; }
  };
  const clearProfile = (removeCache = true) => {
    state.profile = null;
    if (removeCache) try { storage().removeItem(PROFILE_KEY); } catch { /* Storage can be unavailable. */ }
  };
  const sync = () => {
    const next = readSession();
    if (next === session) return;
    const changedSession = !!session;
    state.authenticated = false;
    session = next; request++; state.revision++;
    profileRequestLogin = '';
    state.authenticated = false; state.error = ''; state.checking = !!session;
    clearProfile(changedSession || !session);
  };
  const logout = () => {
    try { storage().removeItem(SESSION_KEY); } catch { /* Still clear in-memory state. */ }
    state.authenticated = false;
    session = ''; request++; state.revision++;
    viewerLogin = ''; profileRequestLogin = '';
    state.authenticated = false; state.checking = false; state.error = '';
    clearProfile();
    document.querySelectorAll('giscus-widget').forEach(widget => widget.signOut?.());
  };
  const loadProfile = async (login) => {
    const id = ++request;
    profileRequestLogin = login;
    state.error = ''; state.checking = true;
    try {
      let cached;
      try { cached = JSON.parse(storage().getItem(PROFILE_KEY) || 'null'); } catch { /* Ignore broken cache. */ }
      if (typeof cached?.email !== 'string' || cached?.login !== login || !Number.isFinite(cached.at) || Date.now() - cached.at > 3600000) cached = null;
      const response = cached ? null : await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (response && !response.ok) throw new Error('profile');
      const data = cached || await response.json();
      if (id !== request || !session || !state.authenticated) return;
      const profile = { login, name: String(data.name || login).trim() || login, avatarUrl: String(data.avatarUrl || data.avatar_url || ''), email: String(data.email || '').trim() };
      state.profile = profile;
      try { storage().setItem(PROFILE_KEY, JSON.stringify({ ...profile, at: Date.now() })); } catch { /* Profile remains available in memory. */ }
    } catch {
      if (id === request) { state.profile = null; state.error = 'profile'; }
    } finally { if (id === request) { state.checking = false; profileRequestLogin = ''; } }
  };
  let viewerLogin = '';
  const receive = (event) => {
    if (event.origin !== GISCUS_ORIGIN || !event.data?.giscus) return;
    const widgets = [...document.querySelectorAll('giscus-widget')];
    const widget = widgets.find(item => item.iframeRef?.contentWindow === event.source);
    if (!widget) return;
    const message = event.data.giscus;
    if (message.signOut || (message.error && /Bad credentials|Invalid state value|State has expired/.test(message.error))) {
      if (widget.__session === session || !readSession()) logout();
      return;
    }
    if (widget.id !== 'github-profile-probe' || widget.__session !== session) return;
    if (message.error) { state.checking = false; state.error = 'session'; return; }
    if (!('viewer' in message)) return;
    if (!session) return;
    const login = message.viewer?.login;
    if (!login) { logout(); return; }
    if (viewerLogin && viewerLogin !== login) { state.authenticated = false; request++; state.revision++; clearProfile(); }
    viewerLogin = login;
    state.authenticated = true;
    if ((!state.profile || state.profile.login !== login) && profileRequestLogin !== login) void loadProfile(login);
  };
  const retry = () => {
    if (state.authenticated && viewerLogin) void loadProfile(viewerLogin);
    else { state.error = ''; state.checking = !!session; state.revision++; }
  };
  const login = () => {
    const target = new URL(window.location.href);
    target.searchParams.delete('giscus');
    try { window.sessionStorage.setItem(RETURN_KEY, target.href); } catch { /* The callback URL still preserves the route. */ }
    window.location.assign(`${GISCUS_ORIGIN}/api/oauth/authorize?redirect_uri=${encodeURIComponent(target.href)}`);
  };
  const start = (router) => {
    if (typeof window === 'undefined' || stop) return;
    const url = new URL(window.location.href);
    const callback = url.searchParams.get('giscus');
    let returned;
    try { returned = window.sessionStorage.getItem(RETURN_KEY); window.sessionStorage.removeItem(RETURN_KEY); } catch { /* Optional position restore. */ }
    if (callback) {
      try { storage().setItem(SESSION_KEY, JSON.stringify(callback)); } catch { state.error = 'session'; }
      url.searchParams.delete('giscus');
    }
    let restored = false;
    try {
      const target = returned && new URL(returned);
      if (target && target.origin === url.origin && target.pathname === url.pathname) { url.hash = target.hash; restored = true; }
    } catch { /* Ignore malformed saved locations. */ }
    if (callback || restored) {
      window.history.replaceState(window.history.state, '', url.href);
      void router.replace(`${url.pathname}${url.search}${url.hash}`);
    }
    sync();
    if (!session) clearProfile();
    window.addEventListener('message', receive);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const timer = window.setInterval(sync, 2000);
    stop = () => { window.removeEventListener('message', receive); window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); window.clearInterval(timer); stop = null; };
    return () => stop?.();
  };
  return { state: readonly(state), login, logout, retry, start, showFallback: () => {
    try { window.sessionStorage.setItem(RETURN_KEY, window.location.href); } catch { /* Optional position restore. */ }
    state.fallbackOpen = true;
  }, closeFallback: () => { state.fallbackOpen = false; }, probeFailed: () => { if (state.checking && !state.authenticated) { state.checking = false; state.error = 'session'; } } };
}

const client = createGithubSession();
export const githubSession = client.state;
export const hasGithubSession = () => githubSession.authenticated;
export function useGithubSession() {
  return { ...client, authenticated: computed(() => client.state.authenticated), profile: computed(() => client.state.profile) };
}
