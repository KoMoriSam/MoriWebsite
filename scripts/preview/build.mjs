import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { run } from "../lib/commands.mjs";
import { copyTree } from "../lib/content-files.mjs";
import { preparePreviewData } from "./data.mjs";
import { buildEnvironment } from "../lib/build-environment.mjs";

const env = {
  ...buildEnvironment(),
  VITE_GITHUB_PROFILE_API: "/api/github/users",
  VITE_GITHUB_REPOSITORY_API: "/api/github/repos",
  VITE_COMMENT_COUNTS_API: "/api/github/discussions/counts",
  VITE_RANDOM_HERO_API: "/api/random-hero",
  VITE_ANALYTICS_API: "/api/analytics",
  VITE_GAMES_API: "/api/games/rooms",
  VITE_ANNOUNCEMENTS_API: "/api/announcements",
  VITE_CHANGELOG_API: "/api/changelog",
};
for (const command of [
  ["node", "scripts/build/static-assets.mjs"],
  ["node", "scripts/build/mock-articles.mjs"],
  ["node", "scripts/release/changelog.mjs", "generate"],
  ["vite", "build", "--config", "vite.dev.config.js", "--outDir", ".output/preview"],
]) await run(command, { env });
await copyTree(resolve("mock/article"), resolve(".output/preview/mock/article"));
await preparePreviewData(resolve(".output/preview"));
const fonts = resolve(".output/preview/content/kaiming");
await mkdir(fonts, { recursive: true });
await writeFile(resolve(fonts, "index.css"), "/* Branch preview uses installed fallback fonts. */\n");
