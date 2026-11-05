import { handleDiscussionCounts } from "./discussions.js";
import { handleGithubProfile } from "./profile.js";
import { handleGithubRepository } from "./repository.js";

export function routeGithubRequest(request, env, pathname, corsHeaders) {
  if (pathname === "/github/discussions/counts") {
    return handleDiscussionCounts(request, env, corsHeaders);
  }
  if (pathname === "/github/users" || pathname.startsWith("/github/users/")) {
    return handleGithubProfile(request, env, corsHeaders);
  }
  if (pathname === "/github/repos" || pathname.startsWith("/github/repos/")) {
    return handleGithubRepository(request, env, corsHeaders);
  }
  return null;
}
