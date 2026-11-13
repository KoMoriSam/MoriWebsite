import { WorkerEntrypoint } from "cloudflare:workers";
import { handleComments } from "./github/comments.js";

import api from "./api.js";
import { discussionGithub } from "./github/installation.js";
import { configuredDiscussionScopes, testDiscussionRepository } from "../shared/discussions.js";

export { GameRoom } from "./api.js";

let metadata;
async function discussionEnvironment(env) {
  if (env.MORI_ENV !== "test") return env;
  const repository = testDiscussionRepository(env);
  const key = JSON.stringify([env.GITHUB_APP_ID, env.GITHUB_INSTALLATION_ID, repository]);
  if (metadata?.key !== key || metadata.until <= Date.now()) {
    const pending = (async () => {
      const github = await discussionGithub(env, repository);
      const [owner, name] = repository.split("/");
      const { repository: repo } = await github.graphql(`
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            id nameWithOwner isPrivate hasDiscussionsEnabled
            discussionCategories(first: 30) { nodes { id name } }
          }
        }
      `, { owner, name });
      if (!repo?.isPrivate || !repo.hasDiscussionsEnabled ||
          repo.nameWithOwner.toLowerCase() !== repository.toLowerCase())
        throw new Error("The test discussion repository must be private with Discussions enabled");
      const categories = repo.discussionCategories.nodes;
      const general = categories.find(({ name }) => name === "General") || categories[0];
      const paragraph = categories.find(({ name }) => name === "Ideas") || general;
      const source = { name: repo.nameWithOwner, id: repo.id };
      const scopes = {
        article: { repo: source, category: general }, book: { repo: source, category: general },
        chapter: { repo: source, category: general }, "article-paragraph": { repo: source, category: paragraph },
        "novel-paragraph": { repo: source, category: paragraph },
      };
      const settings = JSON.stringify(scopes);
      configuredDiscussionScopes({ ...env, MORI_TEST_DISCUSSIONS: settings });
      return settings;
    })().catch((error) => {
      if (metadata?.pending === pending) metadata = undefined;
      throw error;
    });
    metadata = { key, pending, until: Date.now() + 300_000 };
  }
  return { ...env, MORI_TEST_DISCUSSIONS: await metadata.pending };
}

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.replace(/\/+$/, "") !== "/github/discussions/counts")
      return api.fetch(request, env, ctx);
    try {
      return await api.fetch(request, await discussionEnvironment(env), ctx);
    } catch {
      return Response.json({ error: "DISCUSSIONS_UNAVAILABLE" }, { status: 503 });
    }
  },
  scheduled: api.scheduled,
};

export class CommentsInternal extends WorkerEntrypoint {
  async handle(request, token, target) {
    try {
      const env = await discussionEnvironment(this.env);
      if (env.MORI_ENV !== "test") return handleComments(request, env, token, target);
      const scope = configuredDiscussionScopes(env)[target.scope];
      if (!scope) return { status: 404, body: { error: "DISCUSSION_NOT_FOUND" } };
      return handleComments(request, env, token, { ...target, ...scope, privateRepository: true });
    } catch {
      return { status: 503, body: { error: "DISCUSSIONS_UNAVAILABLE" } };
    }
  }
}
