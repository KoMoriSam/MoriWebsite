const article = { name: "KoMoriSam/theWake", id: "R_kgDOTElB5w" };
const novel = { name: "KoMoriSam/theHorizon", id: "R_kgDOOWZUkw" };
const general = { name: "General", id: "DIC_kwDOOWZUk84C_2_B" };
export const bookTerm = "《向远方》 | 远方之森";
export const discussionRegistry = "site-data/discussion-targets.json";
export const siteOwnerLogin = "KoMoriSam";
export const discussionAuthorLogins = {
  article: "KoMoriSam",
  novel: "KoMoriSam",
};

export const discussionScopes = {
  article: { repo: article, category: { name: "Announcements", id: "DIC_kwDOTElB584C_2-6" } },
  chapter: { repo: novel, category: general },
  book: { repo: novel, category: general },
  "article-paragraph": { repo: article, category: { name: "Ideas", id: "DIC_kwDOTElB584C_2-9" } },
  "novel-paragraph": { repo: novel, category: { name: "Ideas", id: "DIC_kwDOOWZUk84C_2_D" } },
};

export function testDiscussionRepository(env) {
  const name = env.MORI_TEST_DISCUSSION_REPO || "";
  if (!/^[\w.-]+\/[\w.-]+$/.test(name) ||
      [article, novel].some((repo) => repo.name.toLowerCase() === name.toLowerCase()))
    throw new Error("Configure an independent test discussion repository");
  return name;
}

export function configuredDiscussionScopes(env) {
  if (env?.MORI_ENV !== "test") return discussionScopes;
  const scopes = JSON.parse(env.MORI_TEST_DISCUSSIONS || "null");
  if (!scopes || Object.keys(scopes).length !== Object.keys(discussionScopes).length)
    throw new Error("Missing test discussion scopes");
  const production = new Set(Object.values(discussionScopes).map(({ repo }) => repo.name.toLowerCase()));
  for (const key of Object.keys(discussionScopes)) {
    const { repo, category } = scopes[key] || {};
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo?.name || "") || production.has(repo.name.toLowerCase()) ||
        !/^R_[\w-]+$/.test(repo.id || "") || !/^DIC_[\w-]+$/.test(category?.id || "") ||
        typeof category.name !== "string" || !category.name)
      throw new Error("Invalid test discussion scope");
  }
  return scopes;
}

export function discussionTarget(registry, scope, value, env) {
  if (!Object.hasOwn(discussionScopes, scope) || typeof value !== "string" || value.length > 256) return null;
  const paragraph = scope.endsWith("-paragraph");
  const novel = ["book", "chapter", "novel-paragraph"].includes(scope);
  const parent = paragraph ? value.match(/^(.+)-([1-9]\d{0,5})$/u)?.[1] : value;
  const collection = novel ? registry.chapters : registry.articles;
  const record = parent && Object.hasOwn(collection, parent) ? collection[parent] : null;
  const term = scope === "book" ? bookTerm : scope === "chapter" ? record?.term : record && value;
  const path = scope === "book" ? "/novel" : record?.path;
  if (!term || !path || (scope === "book" && value !== bookTerm)) return null;
  const settings = env?.MORI_ENV === "test"
    ? { repo: { name: testDiscussionRepository(env) } }
    : configuredDiscussionScopes(env)[scope];
  return {
    ...settings, scope, privateRepository: env?.MORI_ENV === "test", term, sourceType: novel ? "novel" : "article",
    countScope: paragraph ? "paragraph" : novel ? "chapter" : "content",
    url: new URL(path + (paragraph ? "#" + encodeURIComponent(value) : ""), env?.MORI_SITE_ORIGIN || "https://komori.cc").href,
  };
}

export function legacyDiscussionQuery(target) {
  return `repo:${target.repo.name.toLowerCase()} category:${JSON.stringify(target.category.name)} in:title ${JSON.stringify(target.term)}`;
}
