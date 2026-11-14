import { setTimeout } from "node:timers/promises";

export async function waitForPublishedContent(check) {
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await check()) return true;
    if (attempt < 11) await setTimeout(6000);
  }
  throw new Error("线上接口尚未返回本次发布的内容。请检查传播状态后重试构建。");
}
