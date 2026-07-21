import fs from "node:fs";
import path from "node:path";

const blogFile = path.resolve("dist/blog/index.html");

if (!fs.existsSync(blogFile)) {
  throw new Error(
    "SSG 校验失败：/blog 未进入预渲染路由列表，dist/blog/index.html 不存在。",
  );
}

const html = fs.readFileSync(blogFile, "utf-8");

if (!html.includes("文章列表")) {
  throw new Error(
    "SSG 校验失败：dist/blog/index.html 已生成，但不包含文章列表内容。",
  );
}

if (!html.includes('data-server-rendered="true"')) {
  throw new Error("SSG 校验失败：dist/blog/index.html 未包含服务端渲染标记。");
}

console.log("SSG 校验通过：dist/blog/index.html 已包含预渲染文章列表。");
