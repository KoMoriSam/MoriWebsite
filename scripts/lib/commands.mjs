import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function run(
  [tool, ...args],
  { cwd = PROJECT_ROOT, env = process.env, capture = false, signal } = {},
) {
  let executable = process.execPath;
  if (tool === "git" || tool === "tar") executable = tool;
  else if (tool === "python") executable = env.PYTHON || "python";
  else if (tool !== "node") {
    const manifestPath = resolve(
      PROJECT_ROOT,
      "node_modules",
      tool,
      "package.json",
    );
    const { bin } = JSON.parse(await readFile(manifestPath, "utf8"));
    const entry = typeof bin === "string" ? bin : bin?.[tool];
    if (!entry) throw new Error(`找不到 ${tool} 命令，请先安装项目依赖。`);
    args.unshift(resolve(dirname(manifestPath), entry));
  }
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      signal,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    let output = "";
    if (capture)
      child.stdout.setEncoding("utf8").on("data", (data) => {
        output += data;
      });
    child.once("error", (error) =>
      reject(
        new Error(`无法启动 ${tool}。请检查依赖和运行环境：${error.message}`, {
          cause: error,
        }),
      ),
    );
    child.once("close", (code, signal) => {
      if (code === 0) resolve(output.trim());
      else
        reject(
          Object.assign(
            new Error(
              `命令未完成（${tool}，${signal ? `终止信号 ${signal}` : `退出码 ${code}`}）。请查看上方错误说明。`,
            ),
            { exitCode: code || 1 },
          ),
        );
    });
  });
}
