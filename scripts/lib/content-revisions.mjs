import { buildEnvironment } from "./build-environment.mjs";
import { run } from "./commands.mjs";

export const sources = [
  {
    name: "blog",
    repository: "KoMoriSam/ObsidianVault",
    folders: ["notes", "attachments", "scripts"],
  },
  {
    name: "novel",
    repository: "KoMoriSam/MyWritingVault",
    folders: ["public", "scripts"],
  },
];

export function sourceGitEnvironment() {
  const token = process.env.CONTENT_GITHUB_TOKEN;
  if (!token)
    throw new Error(
      "缺少 CONTENT_GITHUB_TOKEN：请配置两个私有仓库的只读构建凭据，或设置 CONTENT_BLOG_DIR / CONTENT_NOVEL_DIR 使用本地内容源。",
    );
  return {
    ...buildEnvironment(),
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
  };
}

export function sourceRef(key) {
  const ref = process.env[`CONTENT_${key}_REF`] || "main";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) || ref.includes(".."))
    throw new Error(`无效的内容分支：${ref}`);
  return ref;
}

export async function readSourceHead(repository, ref) {
  const line = await run(
    [
      "git",
      "ls-remote",
      "--exit-code",
      `https://github.com/${repository}.git`,
      `refs/heads/${ref}`,
    ],
    { env: sourceGitEnvironment(), capture: true },
  );
  return line.split(/\s+/u)[0];
}

