import { GITHUB_USERNAME, handleGithubResource } from "./public-resource.js";

const repositoryPreviewQuery = `
  query RepositoryPreview($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      visibility
      description
      primaryLanguage { name }
      stargazerCount
      forkCount
      usesCustomOpenGraphImage
      openGraphImageUrl
      owner { avatarUrl(size: 48) }
    }
  }
`;

function githubImageUrl(value, ...hosts) {
  if (typeof value !== "string" || !URL.canParse(value)) return "";
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.host)
    ? url.href
    : "";
}

const repository = {
  endpoint: "repos",
  cachePath: "/__cache/github-repository/v2/",
  cacheField: "repository",
  cacheHeader: "X-Repository-Cache",
  invalidError: "INVALID_GITHUB_REPOSITORY",
  unavailableError: "GITHUB_REPOSITORY_UNAVAILABLE",
  missingTtl: 5 * 60 * 1000,
  validate: ([owner, repo, ...rest]) =>
    Boolean(owner && repo && !rest.length && GITHUB_USERNAME.test(owner) &&
      /^[a-z\d_.-]{1,100}$/i.test(repo) && !/^\.{1,2}$|\.git$/i.test(repo)),
  async load(github, identifier) {
    const [owner, name] = identifier.split("/");
    const { repository: data } = await github.graphql(repositoryPreviewQuery, { owner, name });
    return { data };
  },
  project(data) {
    if (data === null || ["PRIVATE", "INTERNAL"].includes(data?.visibility)) {
      throw Object.assign(new Error("Public GitHub repository not found"), { status: 404 });
    }
    if (data?.visibility !== "PUBLIC") {
      throw new Error("Invalid GitHub repository response");
    }
    return {
      description: typeof data.description === "string" ? data.description : "",
      language: typeof data.primaryLanguage?.name === "string" ? data.primaryLanguage.name : "",
      stars: Number.isSafeInteger(data.stargazerCount) ? data.stargazerCount : null,
      forks: Number.isSafeInteger(data.forkCount) ? data.forkCount : null,
      coverUrl: data.usesCustomOpenGraphImage === true
        ? githubImageUrl(data.openGraphImageUrl, "repository-images.githubusercontent.com", "opengraph.githubassets.com")
        : "",
      ownerAvatarUrl: githubImageUrl(data.owner?.avatarUrl, "avatars.githubusercontent.com"),
    };
  },
};

export function handleGithubRepository(request, env, corsHeaders = {}) {
  return handleGithubResource(request, env, corsHeaders, repository);
}
