const discussionUrl = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/discussions\/[1-9]\d*(?:#discussioncomment-[1-9]\d*)?$/u;

export const githubDiscussionUrl = (value) =>
  typeof value === "string" && discussionUrl.test(value) ? value : "";
