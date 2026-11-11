import { WorkerEntrypoint } from "cloudflare:workers";
import { handleComments } from "./github/comments.js";

export { default, GameRoom } from "./api.js";

export class CommentsInternal extends WorkerEntrypoint {
  handle(request, token, target) {
    return handleComments(request, this.env, token, target);
  }
}
