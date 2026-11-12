const runtime = /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|LOCALAPPDATA|APPDATA|HOME|TEMP|TMP|TMPDIR|NODE_PATH|ESBUILD_BINARY_PATH|LD_LIBRARY_PATH|LANG|LC_\w+|CI|TZ|TERM|NO_COLOR)$/i;
const publicVite = /^VITE_(?:BLOG_RAW|NOVEL_RAW|COMMENT_COUNTS_API|GISCUS_CSS_RAW|RANDOM_HERO_API|ANALYTICS_API|SERVER_ADDRESS|GAMES_API|ANNOUNCEMENTS_API|CHANGELOG_API|GITHUB_PROFILE_API|GITHUB_REPOSITORY_API|SSG)$/;

export const workerSecrets = {
  auth: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
  api: ["GITHUB_APP_PRIVATE_KEY", "GITHUB_TOKEN", "PIXABAY_API_KEY"],
};

const runtimeOnly = new Set([...Object.values(workerSecrets).flat(), "GITHUB_APP_ID", "GITHUB_INSTALLATION_ID"]);
const retiredRelease = /^(?:RELEASE_(?:R2_|CONTROL_R2_)\w+|RELEASE_APPROVAL_KEY)$/;

export function unusedBuildVariables(source = process.env) {
  return Object.keys(source).filter((key) => runtimeOnly.has(key.toUpperCase()) ||
    retiredRelease.test(key.toUpperCase())).sort();
}

export function buildEnvironment(source = process.env) {
  return Object.fromEntries(Object.entries(source).filter(([key]) =>
    runtime.test(key) || publicVite.test(key) ||
    /^(?:CONTENT_BUILD_DIR|SSG_(?:CONTENT_CACHE_VERSION|RSS_CACHE_VERSION|IMAGE_CACHE|RENDER_REPORT|DATA_DIR|BUILD_PROFILE))$/.test(key),
  ));
}

export function deployEnvironment(source = process.env) {
  return {
    ...Object.fromEntries(Object.entries(source).filter(([key]) =>
      runtime.test(key) || /^(?:CLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)|WRANGLER_(?:SEND_METRICS|CI_OVERRIDE_NAME|CI_MATCH_TAG))$/.test(key),
    )),
    WRANGLER_SEND_METRICS: "false",
  };
}

export function assertPublicVite(source = process.env) {
  for (const key of Object.keys(source)) {
    if (key.startsWith("VITE_") && !publicVite.test(key))
      throw new Error(`Unsupported public build variable: ${key}`);
  }
}


export function sameOriginAssets() {
  return { VITE_BLOG_RAW: "/content/post", VITE_NOVEL_RAW: "/content/novel",
    VITE_COMMENT_COUNTS_API: "/api/github/discussions/counts", VITE_RANDOM_HERO_API: "/api/random-hero",
    VITE_ANALYTICS_API: "/api/analytics", VITE_ANNOUNCEMENTS_API: "/api/announcements",
    VITE_CHANGELOG_API: "/api/changelog", VITE_GAMES_API: "/api/games/rooms",
    VITE_GITHUB_PROFILE_API: "/api/github/users", VITE_GITHUB_REPOSITORY_API: "/api/github/repos" };
}
