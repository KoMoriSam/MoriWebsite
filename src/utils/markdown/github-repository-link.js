const siteRoutes = new Set([
  "about", "account", "apps", "codespaces", "collections", "enterprise",
  "enterprises", "events", "features", "github-copilot", "marketplace",
  "new", "notifications", "orgs", "pricing", "search", "security",
  "settings", "site", "sponsors", "topics", "users",
]);

export function getGithubRepository(href) {
  if (typeof href !== "string") return null;
  const match = /^https:\/\/github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/([a-z0-9_.-]{1,100})\/?$/i.exec(href);
  if (!match) return null;
  const [, owner, repo] = match;
  if (siteRoutes.has(owner.toLowerCase()) || /^\.{1,2}$|\.git$/i.test(repo)) return null;
  return `${owner}/${repo}`;
}
