<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">远方之森 · MoriWebsite</h1>

<p align="center">
  记录技术与生活，阅读原创故事，探索文字与图像，也和朋友一起玩游戏。
</p>

<p align="center">
  <a href="https://komori.cc/">访问网站</a> ·
  <a href="https://komori.cc/blog">博客</a> ·
  <a href="https://komori.cc/novel">小说</a> ·
  <a href="https://komori.cc/tools">工具</a> ·
  <a href="https://komori.cc/games">游戏</a> ·
  <a href="https://komori.cc/changelog">更新日志</a>
</p>

<p align="center">
  简体中文 ·
  <a href="./README_en.md">English</a> ·
  <a href="./README_fr.md">Français</a> ·
  <a href="./README_si.md">සිංහල</a>
</p>

<p align="center">
  当前版本：<strong>2.21.2</strong>
</p>

## 关于远方之森

**远方之森**是 Mori 的个人网站，也是一个持续完善的 Web 项目。这里收录技术记录、随笔、阅读笔记和原创小说，并提供浏览器工具、多人游戏与独立设计项目。

网站面向实际阅读与使用而设计：文章有完整的阅读器和站内讨论；工具尽可能直接在浏览器中完成工作；桌面端与移动端采用适合各自操作方式的界面。仓库公开的是网站程序，博客、小说等内容由独立仓库管理。

## 你可以在这里做什么

| 内容                   | 入口与体验                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **博客**               | [阅读文章](https://komori.cc/blog)：按关键词、标签和年份查找内容，阅读技术记录与随笔，切换已发布的译文                                           |
| **原创小说《向远方》** | [浏览卷章](https://komori.cc/novel)：使用目录、进度记录与个性化排版继续阅读；正文向获授权的登录用户开放                                          |
| **图片转换**           | [图片格式转换器](https://komori.cc/tools/image-converter)：批量转换、压缩、缩放、添加水印，支持动图处理                                          |
| **僧伽罗语文本处理**   | [字体编码转换器](https://komori.cc/tools/sinhala-font-converter)：在 Unicode 与传统字体编码之间转换文本，处理 DOCX、PPTX 及含可选中文字的 PDF    |
| **Minecraft 查询**     | [服务器状态](https://komori.cc/tools/server-status)：查看 Java 版和基岩版服务器的连接及在线信息                                                  |
| **多人桌游**           | [阿瓦隆](https://komori.cc/games/avalon)：5–10 人在线身份推理；[雾港商纪](https://komori.cc/games/fogport)：2–4 人经济经营桌游实验项目（半成品） |
| **开明标点**           | [项目展示](https://komori.cc/kaiming)：了解标点字形设计与相关字体资源                                                                            |

## 阅读与交流

博客和小说使用统一的阅读界面，提供目录、阅读进度、字体与排版调整、主题设置，以及适配触屏操作的移动端阅读方式。阅读偏好和进度保存在当前浏览器中。

文章支持代码高亮、数学公式、Mermaid 图表、脚注、注音、双链和扩展 Markdown 内容。可以跳转到具体标题或段落、查看相关内容，也可以将选中的内容整理为分享图片。文章还提供关联推荐、修改时间和内容时效提示。

**站内评论直接连接 GitHub Discussions**：登录 GitHub 后，可在网站中发表评论、回复、编辑、删除和表态；文章、小说章节与正文段落都有相应的讨论入口。评论支持热门、最新和最早排序，长评论与多级浏览体验针对不同屏幕做了优化。讨论数据分别保存在 [theWake](https://github.com/KoMoriSam/theWake) 和 [theHorizon](https://github.com/KoMoriSam/theHorizon)，不依赖外嵌评论界面。

网站界面支持**简体中文、英语、法语和僧伽罗语**。博客译文有独立地址，便于直接分享与搜索收录；不同语言的文章内容可单独切换，而不影响网站界面语言。

按 `Ctrl + K`（macOS 使用 `Cmd + K`）可打开站内搜索，查找文章、章节、更新日志及许可信息。博客也提供 [RSS 订阅](https://komori.cc/rss.xml)。

## 技术与架构

| 层面       | 主要技术与设计                                                             |
| ---------- | -------------------------------------------------------------------------- |
| 前端       | Vue 3、Vue Router、Pinia、Vite、Tailwind CSS、daisyUI                      |
| 内容呈现   | Vite SSG、Markdown-it、Pele（Mermaid）、Pagefind、按语言独立生成的文章页面 |
| 服务端     | Cloudflare Workers、D1、KV、R2、Durable Objects                            |
| 登录与讨论 | GitHub OAuth、GitHub Discussions，配合站内原生评论界面与 API               |
| 构建和发布 | GitHub Actions、Cloudflare Workers Builds、构建快照、增量 SSG 与版本化部署 |

网站以静态预渲染页面承载公开内容与 SEO 信息，以 Workers 处理登录、讨论、统计和联机游戏等动态能力。博客和小说采用独立的内容发布流程，与网站代码解耦。

构建流程会判断实际变更，按需跳过构建、局部更新静态页面，或执行完整构建；图片分级资源和其他可复用产物通过快照避免重复生成。发布流程将候选版本与正式流量分离，支持先验证再切换，以及回退到之前的版本。

## 本地开发

要求 **Node.js 24.15+（24.x）或 26+**，以及 **pnpm 12.3.4**。

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
pnpm dev
```

`pnpm dev` 会自动准备隔离的本地 API、认证、评论和小说测试数据，使用模拟内容启动网站；**无需获取私有内容仓库或配置正式环境的密钥**。打开终端输出的地址即可预览。

常用命令：

| 命令                             | 用途                                             |
| -------------------------------- | ------------------------------------------------ |
| `pnpm menu`                      | 使用交互式菜单选择开发、检查、构建与发布相关操作 |
| `pnpm dev`                       | 启动本地网站及配套测试服务                       |
| `pnpm dev:seed`                  | 刷新隔离的本地测试数据                           |
| `pnpm dev games`                 | 单独运行多人游戏的本地服务                       |
| `pnpm check`                     | 查看可用检查项目；例如 `pnpm check markdown`     |
| `pnpm build`                     | 使用完整内容源构建网站、搜索索引与内容资源       |
| `pnpm preview`                   | 预览完成构建的网站                               |
| `pnpm run build:smart --dry-run` | 查看增量构建的模式与变更范围                     |

**完整生产构建**与本地模拟开发不同，需要通过 `CONTENT_BLOG_DIR`、`CONTENT_NOVEL_DIR` 指定本地内容目录，或使用具备相应权限的 `CONTENT_GITHUB_TOKEN` 读取私有内容仓库。访问令牌及部署凭据应通过环境 Secrets 提供，不应提交到仓库或使用 `VITE_` 客户端变量保存。

## 内容与版本发布

网站代码通过 `main` 开发与维护，已发布版本由 `production` 承载。网站版本经 GitHub Actions 准备发布提交与标签，再由 Cloudflare 构建、核验并切换正式版本；博客、小说和字体内容可以独立触发对应更新。详细变化可查看[更新日志](https://komori.cc/changelog)与[站点公告](https://komori.cc/announcements)。

代码主要位于 `src/`，服务端 Worker 位于 `workers/`，构建、检查与发布脚本位于 `scripts/`；版本记录保存在 `changelog/releases/`。项目的自动发布流程依赖仓库和 Cloudflare 环境的特定配置，并非克隆后即可部署到其他账号。

## 版权与许可

- **本仓库原创软件代码**：[MIT License](./LICENSE)。
- **原创博客文章**：默认使用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，具体以文章内的版权声明为准。
- **原创小说《向远方》**：保留所有权利（All Rights Reserved）。
- **第三方字体、图像、图标与其他资源**：遵循各自的许可或权利声明。
- **读者评论**：权利归各自作者所有。

第三方资源的许可信息可查看[站内许可页](https://komori.cc/licenses)、[中文声明](./THIRD_PARTY_NOTICES.zh-CN.md)与[英文声明](./THIRD_PARTY_NOTICES.md)。

## 反馈

欢迎通过 [GitHub Issues](https://github.com/KoMoriSam/MoriWebsite/issues) 反馈问题或提出建议；与文章、小说有关的交流也可以直接留在对应内容的评论区。
