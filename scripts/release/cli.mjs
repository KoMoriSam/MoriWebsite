import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { publishAnnouncements } from "./announcement.mjs";
import {
  prepareRelease,
  publishAllReleases,
  verifyReleaseVersion,
} from "./changelog.mjs";

const helpText = `准备发布资料，并管理已经上线的更新日志与公告。

用法：pnpm release <命令> [版本] [选项]

命令：
  prepare <version> [--date YYYY-MM-DD] 准备版本号、项目说明、更新日志和版本公告
  verify <version>                     确认发布资料中的版本号一致
  publish <version> [--dry-run] [--yes] 上线更新日志与公告
  changelog <command> [options]        管理更新日志
  announcement <command> [options]     管理公告

网站版本在 Cloudflare Workers → website → Deployments 中切换和回滚。
`;

const parseOptions = (args) => {
  const options = new Map();
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    if (value === "--date" && args[index + 1] && !args[index + 1].startsWith("--")) {
      options.set(value, args[index + 1]);
      index += 1;
    } else {
      options.set(value, true);
    }
  }
  return { options, positional };
};

const publishRelease = async (version, options) => {
  await verifyReleaseVersion(version);
  const publishOptions = {
    dryRun: options.has("--dry-run"),
    yes: options.has("--yes"),
  };

  console.log("\n正在发布更新日志…");
  const changelogResult = await publishAllReleases(publishOptions);
  if (!publishOptions.dryRun && !changelogResult.published) return;

  console.log("\n正在发布公告…");
  await publishAnnouncements(publishOptions);
};

const main = async () => {
  const [command = "help", ...rawArgs] = process.argv.slice(2);
  const { options, positional } = parseOptions(rawArgs);
  const version = positional[0];

  switch (command) {
    case "prepare":
      await prepareRelease(version, {
        date: options.get("--date"),
        dryRun: options.has("--dry-run"),
      });
      break;
    case "verify": {
      if (!version) throw new Error("请提供版本号。");
      const result = await verifyReleaseVersion(version);
      console.log(`发布资料已就绪：版本 ${result.version} 的项目说明与更新日志一致。`);
      break;
    }
    case "publish":
      if (!version) throw new Error("请提供版本号。");
      await publishRelease(version, options);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(helpText);
      break;
    default:
      throw new Error(`未知命令：${command}\n\n${helpText}`);
  }
};

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(pathToFileURL(resolve(process.argv[1])));

if (isMain) {
  main().catch((error) => {
    console.error(`\n版本发布失败：${error.message}`);
    process.exitCode = 1;
  });
}
