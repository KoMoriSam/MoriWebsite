import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { publishAnnouncements } from "./announcement-cli.mjs";
import {
  prepareRelease,
  publishAllReleases,
  verifyReleaseVersion,
} from "./changelog-cli.mjs";

const helpText = `版本发布工具

用法：pnpm release <command> <version> [options]

命令：
  prepare <version> [--date YYYY-MM-DD] 将草稿转为正式版本并生成本地发布文件
  verify <version>                     校验版本号、package.json 与更新日志
  publish <version> [--dry-run] [--yes] 发布更新日志和公告 KV

发布步骤：
  1. pnpm release prepare <version>
  2. 提交本地发布变更
  3. git tag v<version>
  4. git push origin main --follow-tags
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

  console.log("\n发布更新日志 KV");
  const changelogResult = await publishAllReleases(publishOptions);
  if (!publishOptions.dryRun && !changelogResult.published) return;

  console.log("\n发布公告 KV");
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
      console.log(`发布版本校验通过：${result.version}`);
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
