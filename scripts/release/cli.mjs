import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { appendFile } from "node:fs/promises";

import {
  finalizeRelease,
  prepareRelease,
  publishAllReleases,
  publishReleaseChangelog,
  verifyReleaseVersion,
} from "./changelog.mjs";

const helpText = `准备发布资料，并管理更新日志与公告。

用法：pnpm release <命令> [版本] [选项]

命令：
  prepare <version> [--date YYYY-MM-DD] 准备版本号、项目说明和更新日志
  verify <version>                     确认发布资料中的版本号一致
  publish <version> [--dry-run] [--yes] 上线更新日志
  changelog <command> [options]        管理更新日志
  announcement <command> [options]     管理公告

日常发版只需将一份更新日志草稿提交到 main，再运行 GitHub Actions → 发布网站。
Cloudflare Workers Builds 验证网站上线后会同步更新日志。
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
  await publishAllReleases({
    dryRun: options.has("--dry-run"),
    yes: options.has("--yes"),
  });
};

async function syncRelease(version) {
  if (process.env.WORKERS_CI !== "1" || process.env.WORKERS_CI_BRANCH !== "production")
    throw new Error("自动同步仅由正式网站构建执行。");
  await publishReleaseChangelog(version);
}

const main = async () => {
  const [command = "help", ...rawArgs] = process.argv.slice(2);
  const { options, positional } = parseOptions(rawArgs);
  const version = positional[0];

  switch (command) {
    case "finalize": {
      const output = process.env.GITHUB_OUTPUT;
      if (process.env.GITHUB_ACTIONS !== "true" || !output)
        throw new Error("请通过 GitHub Actions → 发布网站执行。");
      const next = await finalizeRelease();
      await appendFile(output, `tag=v${next}\n`);
      break;
    }
    case "sync":
      if (!version) throw new Error("请提供已部署的网站版本号。");
      await syncRelease(version);
      break;
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
