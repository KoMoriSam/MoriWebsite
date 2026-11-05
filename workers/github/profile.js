import { GITHUB_USERNAME, handleGithubResource } from "./public-resource.js";

const profile = {
  endpoint: "users",
  cachePath: "/__cache/github-profile/v1/",
  cacheField: "profile",
  cacheHeader: "X-Profile-Cache",
  invalidError: "INVALID_GITHUB_USERNAME",
  unavailableError: "GITHUB_PROFILE_UNAVAILABLE",
  validate: ([username, ...rest]) =>
    Boolean(username && !rest.length && GITHUB_USERNAME.test(username)),
  load: (github, username, etag) => github.rest(`/users/${username}`, etag),
  project(data) {
    if (!data || typeof data.login !== "string" || !GITHUB_USERNAME.test(data.login) || !Object.hasOwn(data, "name")) {
      throw new Error("Invalid GitHub public profile response");
    }
    return {
      login: data.login,
      name: typeof data.name === "string" ? data.name.trim() || data.login : data.login,
      avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : "",
    };
  },
};

export function handleGithubProfile(request, env, corsHeaders = {}) {
  return handleGithubResource(request, env, corsHeaders, profile);
}
