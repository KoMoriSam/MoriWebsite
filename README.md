<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite · 远方之森</h1>

<p align="center">
  阅读文章与原创小说，处理图片和僧伽罗语文档，和朋友一起玩桌游。
</p>

<p align="center">
  <a href="https://komori.cc/">访问网站</a>
  ·
  <a href="https://komori.cc/rss.xml">订阅博客</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">反馈问题</a>
</p>

<p align="center">
  当前版本：<strong>2.20.1</strong>
  ·
  <a href="https://komori.cc/changelog">更新日志</a>
</p>

## 从这里开始

远方之森是 Mori 的个人网站，收录技术探索、随笔、读书笔记与原创小说，也提供日常工具和多人桌游。直接打开网站即可使用，桌面和手机均可访问。

| 想做什么 | 入口与体验 |
| --- | --- |
| 阅读文章 | [博客](https://komori.cc/blog)：按关键词、标签和年份查找文章，切换已发布的语言版本 |
| 追更小说 | [《向远方》](https://komori.cc/novel)：浏览卷章目录，继续上次阅读，调整阅读排版 |
| 转换图片 | [图片转换器](https://komori.cc/tools/image-converter)：批量转换格式、压缩、调整尺寸、添加水印与处理动图 |
| 处理僧伽罗语文本 | [字体编码转换器](https://komori.cc/tools/sinhala-font-converter)：转换 Unicode 与传统字体编码，处理文本文档 |
| 查询服务器 | [Minecraft 服务器状态](https://komori.cc/tools/server-status)：查看服务器连接状态和在线信息 |
| 和朋友玩桌游 | [阿瓦隆](https://komori.cc/games/avalon)适合 5–10 人身份推理；[雾港商纪](https://komori.cc/games/fogport)适合 2–4 人经营对局 |
| 了解字体项目 | [开明](https://komori.cc/kaiming)：查看项目介绍与字体资源 |

## 阅读与讨论

博客和小说提供目录导航、阅读进度与排版设置。主题、阅读位置和阅读偏好保存在当前浏览器中，方便下次继续阅读。文章中的代码、公式、图表、脚注与注音可直接阅读，代码块支持复制。

按 `Ctrl + K`（macOS 为 `Cmd + K`）打开全站搜索，查找文章段落、小说章节、版本更新和许可条目；结合类型、标签、卷目或年份筛选，可以直接跳到相关内容。

界面支持中文、英语、法语和僧伽罗语。博客可切换已有译文，未提供所选语言时会显示可用版本和语言提示。

小说目录公开浏览，进入正文需要 GitHub 登录。文章、章节和段落均可通过 Giscus 参与讨论，发表评论需要 GitHub 账号。博客与小说的评论分别保存在 [theWake](https://github.com/KoMoriSam/theWake) 和 [theHorizon](https://github.com/KoMoriSam/theHorizon) 的 GitHub Discussions 中。

博客更新可通过 [RSS](https://komori.cc/rss.xml) 订阅；网站变化见[更新日志](https://komori.cc/changelog)和[公告](https://komori.cc/announcements)。

## 工具与游戏

**图片转换器**在浏览器内处理图片，适合批量整理素材、压缩体积、统一尺寸和添加文字或图片水印，也支持动图处理。

**僧伽罗字体编码转换器**支持 Unicode 与传统字体编码互转。除了直接粘贴文本，还可处理 DOCX、PPTX 和含可选中文字的 PDF，并导出可编辑的 DOCX 或 PPTX。

**多人桌游**可通过房间码或邀请链接与朋友加入同一房间。阿瓦隆提供角色配置、组队投票、任务流程和对局记录；雾港商纪围绕产业、线路、资源与销售展开经营，目前为测试版本，开发暂停，部分功能尚未完成。

## 内容使用与版权

| 内容 | 使用规则 |
| --- | --- |
| 本仓库原创软件源代码 | [MIT License](./LICENSE) |
| 原创博客文章 | 默认采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，具体以文章页的协议声明为准 |
| 原创小说《向远方》 | 保留所有权利（All Rights Reserved） |
| 第三方库、字体、图标、图片及其他素材 | 遵循各自许可证或权利声明 |
| 读者评论 | 权利归相应作者，遵循其权利声明 |

文章页的版权卡片列出标题、链接、作者、发布日期与适用协议，便于确认出处和使用条件。第三方许可可在[站内许可页](https://komori.cc/licenses)、[中文第三方声明](./THIRD_PARTY_NOTICES.zh-CN.md)与[英文第三方声明](./THIRD_PARTY_NOTICES.md)查看。

## 本地运行

项目使用 Vue 3、Vite SSG、Tailwind CSS、daisyUI 和 Pagefind，服务端接口运行于 Cloudflare Workers。需要 Node.js 24.15 及更新的 24.x 版本，或 Node.js 26 及更新版本；包管理器使用 pnpm 12.3.4。

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
```

在根目录创建 `.env.development`，配置阅读内容与评论主题的地址：

```dotenv
VITE_BLOG_RAW=https://raw.komori.cc/post
VITE_NOVEL_RAW=https://raw.komori.cc/novel
VITE_GISCUS_CSS_RAW=https://raw.komori.cc/giscus
```

```bash
pnpm dev
```

使用终端显示的地址访问本地网站。也可将内容地址指向自己的本地镜像；`mock/` 和 `.env*` 文件均被 Git 忽略。调试联机房间时，另开终端运行 `pnpm dev games`。

可按需配置其他服务：

| 环境变量 | 用途 |
| --- | --- |
| `VITE_SERVER_ADDRESS` | 默认查询的 Minecraft 服务器 |
| `VITE_RANDOM_HERO_API` | 首页随机背景图服务 |
| `VITE_COMMENT_COUNTS_API` | 段落评论数量查询 |
| `VITE_GAMES_API` | 游戏房间服务 |
| `VITE_CHANGELOG_API`、`VITE_ANNOUNCEMENTS_API` | 更新日志与公告服务 |
| `VITE_ANALYTICS_API` | 访问统计服务 |

`VITE_` 变量会进入客户端代码，只用于公开配置。私有仓库访问令牌与部署凭据应保存在构建环境的 Secrets 中。

## 构建与发布

网站与内容统一由 Workers Builds 构建，Workers Static Assets 托管。完整生产构建需要两个私有内容仓库的访问权限，或通过 `CONTENT_BLOG_DIR`、`CONTENT_NOVEL_DIR` 指定本地 Vault。导出在临时副本中进行，网站、RSS 与搜索索引使用同一份内容快照。

| 来源或资源 | 发布方式 |
| --- | --- |
| 网站代码 | `v<版本>` 标签通过校验后推进 `production`，由 Workers Builds 构建部署；日常 `main` 提交留待发版上线 |
| 博客、小说 | 私有 `ObsidianVault` 与 `MyWritingVault` 保存源内容，更新后通过各自的 `WORKERS_BUILD_HOOK` 重建 `production` |
| 开明字体 | 从 `KoMoriSam/Kaiming` 的 GitHub Release 获取，校验后发布；字体发版通过其 Hook 触发构建 |
| Giscus 评论资源 | 主题与加载动画在 `giscus/` 中维护，通过 `pnpm run deploy giscus` 本地独立发布 |
| 图片与其他内容资源 | 随内容 Worker 发布；R2 为可选方案，当前未启用 |

内容资源统一使用 `raw.komori.cc`：博客为 `/post`，小说为 `/novel`，评论主题为 `/giscus`，字体为 `/kaiming`，加载动画为 `/giscus/images/spin.gif`。`theWake` 与 `theHorizon` 用作评论仓库，正文由私有内容源导出发布。

Workers Builds 监听 `production`，构建命令为 `pnpm build`，部署命令为 `pnpm run deploy website`。构建 Secret `CONTENT_GITHUB_TOKEN` 需具备两个私有内容仓库的 Contents 只读权限；内容 Hook 同样绑定 `production`，因此内容更新使用已发版的网站代码。GitHub Actions 负责版本校验、触发构建及其他自动化。

| 命令 | 可以完成的工作 |
| --- | --- |
| `pnpm build` | 生成网站 `dist/`、内容资源 `.output/content/`、RSS、搜索索引和许可文件 |
| `pnpm preview` | 预览生产构建的网站 |
| `pnpm check <目标>` | 运行指定业务检查；省略目标可查看列表 |
| `pnpm generate <目标>` | 生成指定资源；省略目标可查看列表 |
| `pnpm release prepare <版本>` | 准备版本号、更新日志与公告草稿 |
| `pnpm release verify <版本>` | 检查版本号、README 与更新日志是否一致 |
| `pnpm run deploy <目标>` | 发布网站、内容、API 或 Giscus；省略目标可查看列表 |
| `pnpm release announcement publish` | 独立发布公告 |

版本公告按 `x.y.0` 归组，后续维护、优化与修复融入同一份公告，读者可在一处了解该版本的完整体验。博客 frontmatter 可通过 `license` 指定文章协议，未填写时使用 `CC BY-NC-SA 4.0`；译文默认沿用原文协议。

开发时可从 `src/views/` 查找页面，从 `src/components/`、`src/composables/` 与 `src/utils/` 查找对应业务实现；构建与发布入口位于 `scripts/`，Cloudflare 服务位于 `workers/`。

## 反馈与参与

遇到问题或有改进建议，可以[提交 Issue](https://github.com/KoMoriSam/MoriWebsite/issues)。描述所在页面、操作步骤、预期结果、实际表现与浏览器版本，有助于复现问题。阅读交流可直接使用文章或小说页面的评论区。

## 其他语言

- [English](./README_en.md)
- [Français](./README_fr.md)
- [සිංහල](./README_si.md)
