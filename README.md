<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="KoMoriSam Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  使用 Vue 3、Vite SSG、Tailwind CSS 与 daisyUI 构建的个人数字花园「远方之森」，提供博客、小说阅读、桌游、全站搜索与在线工具。
</p>

<p align="center">
  <a href="https://komori.cc/">在线访问</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">源代码</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">问题反馈</a>
</p>

<p align="center">
  当前版本：<strong>2.20.1</strong>
  ·
  <a href="https://komori.cc/changelog">更新日志</a>
</p>

---

## 项目简介

MoriWebsite 是 KoMoriSam 的个人网站项目。静态前端负责内容阅读、工具与游戏界面，Cloudflare Worker 提供公告、更新日志和游戏房间等接口。博客正文与小说内容分别维护在独立仓库中；构建时获取内容快照，再通过 `vite-ssg` 为主要页面和博客文章生成可索引的 HTML。

站点目前提供：

- 响应式个人主页、动态背景与联系方式
- 支持关键词、标签和年份筛选的博客；有译文的文章可切换语言
- 原创小说《向远方》的卷目、章节导航和分页阅读器
- 覆盖博客、小说、更新日志与开源许可的全站搜索
- 文章、章节与段落级 Giscus 评论
- 图片格式转换、僧伽罗 Unicode／传统字体编码转换和 Minecraft 服务器状态查询工具
- 5–10 人阿瓦隆联机对局
- 中文、英语与僧伽罗语界面，以及主题切换、阅读进度和本地阅读偏好
- 公告、更新日志和博客 RSS 订阅
- 项目依赖、字体、图标等第三方内容的许可证展示页

生产环境路由：

```text
/
/blog
/blog/:articleId
/blog/:articleId/:locale
/novel
/novel/:volumeSlug/:chapterSlug?
/tools
/tools/image-converter
/tools/sinhala-font-converter
/tools/server-status
/games
/games/avalon
/changelog
/announcements
/licenses
/kaiming
```

开发环境额外提供 `/test` 组件测试页。未知地址由站内 404 视图处理，生产构建还会生成适合静态托管的 `404.html`。

## 技术栈

- Vue 3、Vue Router、Pinia
- Vite 6、vite-ssg
- Tailwind CSS 4、daisyUI 5
- Pagefind 1.5
- Unhead、VueUse
- Markdown-it、MathJax、Mermaid、highlight.js
- Vue I18n、Cloudflare Workers、Durable Objects、KV、D1
- Sharp
- Giscus

## 主要功能

### 内容与阅读

- 博客列表与详情页支持关键词、标签、年份组合筛选；文章可在已发布的中文、英语和僧伽罗语版本间切换
- 小说卷目、章节导航、总字数统计、阅读位置与阅读器设置持久化
- Markdown 代码高亮、脚注、任务列表、数学公式、警告框、自定义对话、属性与 ruby 注音
- Obsidian 风格图片引用、横幅解析、图片懒加载和代码复制
- 桌面端与移动端响应式排版、目录、侧栏和阅读进度
- GitHub 登录状态用于小说阅读入口；小说目录保持公开

### 搜索与内容发现

- 使用 `Ctrl/Cmd + K` 打开全局搜索
- 生产构建生成 Pagefind 自定义索引，开发环境可从内容接口建立本地索引
- 检索博客段落、小说章节、更新日志版本和许可证条目
- 支持按内容类型、标签或卷目、年份组合筛选
- 搜索条件同步到 URL，搜索结果可直接定位正文标题或许可条目锚点

### 评论与本地状态

- Giscus 提供文章与小说章节评论
- 支持围绕具体段落发起讨论
- 可选的批量段落评论数量接口
- 主题、阅读器设置与阅读位置保存在浏览器本地
- 内置旧版存储迁移与废弃数据清理

### 工具、游戏与多语言

- 图片转换器在浏览器内批量转换、压缩和调整尺寸，并支持水印与动图处理
- 僧伽罗字体编码转换器支持 Unicode 与传统字体编码互转；文档模式可处理 DOCX、PPTX 和含可选中文字的 PDF，并导出可编辑的 DOCX 或 PPTX
- 阿瓦隆支持房间码或邀请链接加入、角色配置、对局记录和断线重连
- 中文、英语和僧伽罗语文本按页面加载，语言选择在本地保存
- 站内图片生成分级 WebP；博客和小说图片可读取各自内容源的分级图片清单

### SSG、SEO 与许可信息

- 构建前获取文章、小说目录与更新日志，生成统一 SSG 数据快照
- 为博客文章生成独立静态路由，并保证服务端渲染与 hydration 数据一致
- 使用 Unhead 输出 canonical、Open Graph、Twitter Card 与 JSON-LD 信息
- 自动汇总生产依赖及补充许可文件，生成站内许可页和 `dist/legal/` 分发文件
- 构建后生成 Pagefind 索引与静态托管用 404 页面
- 生成博客 RSS；公告独立发布到 KV，更新日志由版本标签触发的工作流发布
- `wrangler.jsonc` 将 `dist/` 配置为 Cloudflare 静态资源目录

## 快速开始

### 前置条件

- Node.js 24.15 及更新的 24.x 版本，或 26 及更新版本
- pnpm（发布工作流使用 12.3.4）
- 可访问的博客与小说内容源，或放在 `mock/` 中的本地镜像

仓库中的 `.env.development`、`.env.production` 和 `mock/` 均被 Git 忽略。新的克隆需要自行创建环境文件，并同步本地内容镜像或改用可访问的远程内容地址。

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

`pnpm dev` 会先生成本地图片分级版本、更新日志数据和许可证数据。Vite 默认监听 `0.0.0.0`。本地调试游戏房间接口可另开终端运行 `pnpm dev games`。

### 构建生产版本

```bash
pnpm build
```

完整构建流程会：

1. 为站内图片生成分级版本，并读取可用的博客、小说图片清单；
2. 生成更新日志、内容 SSG 快照和博客 RSS；
3. 汇总依赖与补充许可证数据；
4. 预渲染站点并生成 `404.html`；
5. 为博客、小说、更新日志和许可证生成 Pagefind 索引，并将许可证文件复制到 `dist/legal/`。

生产构建先拉取私有的 `ObsidianVault` 与 `MyWritingVault`，复用各自导出器生成 `/post`、`/novel`，再从同一份本地导出生成 SSG、RSS 和搜索索引；构建不读取线上已发布的内容。

### 本地预览

```bash
pnpm preview
```

## 环境变量

在项目根目录创建 `.env.development` 和 `.env.production`，按环境填写以下客户端变量：

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
VITE_RANDOM_HERO_API=
VITE_COMMENT_COUNTS_API=
VITE_GISCUS_CSS_RAW=
VITE_GAMES_API=
VITE_CHANGELOG_API=
VITE_ANNOUNCEMENTS_API=
VITE_ANALYTICS_API=
```

| 变量                      | 用途                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `VITE_BLOG_RAW`           | 博客 `index.json`、Markdown 与图片的基础地址；生产构建必需 |
| `VITE_NOVEL_RAW`          | 小说 `index.json` 与章节 Markdown 的基础地址；生产构建必需 |
| `VITE_SERVER_ADDRESS`     | 工具页默认查询的 Minecraft 服务器地址                      |
| `VITE_RANDOM_HERO_API`    | 首页随机背景图接口                                         |
| `VITE_COMMENT_COUNTS_API` | 可选的段落评论数量批量查询接口                             |
| `VITE_GISCUS_CSS_RAW`     | Giscus 自定义主题资源的基础地址                            |
| `VITE_GAMES_API`          | 可选；游戏房间 API 地址，生产环境有默认地址                |
| `VITE_CHANGELOG_API`      | 可选；更新日志 API 地址，生产环境有默认地址                |
| `VITE_ANNOUNCEMENTS_API`  | 可选；公告 API 地址，生产环境有默认地址                    |
| `VITE_ANALYTICS_API`      | 可选；站点统计 API 地址，生产环境有默认地址                |

这些变量都使用 `VITE_` 前缀，会暴露给客户端；请勿在其中保存密钥或其他私密凭据。`scripts/build/routes.mjs` 和 `scripts/build/pagefind.mjs` 会读取 `.env.production`。

Workers Builds 的构建 secret `CONTENT_GITHUB_TOKEN` 仅需对两个私有仓库拥有 Contents 只读权限，不能使用 `VITE_` 前缀。生产分支设为 `production`，关闭非生产分支构建。该分支仅由版本标签发布工作流推进，日常推送 `main` 不部署网站代码。部署凭据需有网站、内容 Worker 和 `raw.komori.cc` 路由的发布权限；构建环境固定 Node.js 24.15.0、pnpm 12.3.4。本地构建可设置 `CONTENT_BLOG_DIR`、`CONTENT_NOVEL_DIR` 指向两个 Vault；只在临时副本内执行导出。

## 常用脚本

| 命令                          | 作用                                  |
| ----------------------------- | ------------------------------------- |
| `pnpm dev`                    | 生成许可数据并启动开发服务器          |
| `pnpm build`                  | 生成 SSG 站点、搜索索引与许可分发文件 |
| `pnpm preview`                | 本地预览 `dist/`                      |
| `pnpm check <目标>` | 按业务运行检查，省略目标可查看列表 |
| `pnpm generate <目标>` | 按需生成资源，省略目标可查看列表 |
| `pnpm run deploy <目标>` | 统一发布网站与内容，或独立发布 API/Giscus |
| `pnpm release prepare <版本>` | 准备版本日志、静态快照与公告          |
| `pnpm dev games`          | 启动本地游戏房间 API                  |
| `pnpm release announcement publish`   | 单独发布公告到 KV                     |

网站由 Workers Builds 监听 `MoriWebsite/production`，构建命令为 `pnpm build`，部署命令为 `pnpm run deploy website`，按内容、网站的顺序发布两个 Static Assets Worker。`raw.komori.cc/post`、`/novel` 与 `/giscus` 路径保持不变。内容 Worker 同时发布 `/kaiming` 下的两款可变字体、CSS、许可证及 `/images/spin.gif`，不进入网站 `dist`。字体读取 Kaiming 最新 GitHub Release 并校验 SHA-256，可用 `CONTENT_KAIMING_RELEASE` 固定标签；Kaiming 发布 Release 后通过自己的 `WORKERS_BUILD_HOOK` 触发构建。两个私有仓库使用 `WORKERS_BUILD_HOOK` secret 触发构建，所有 Hook 都绑定网站仓库的 `production` 分支，更新内容时仅重建已发布的网站代码；小说 Actions 仍先生成并回写稳定元数据，博客 Actions 只触发。`v<版本>` 标签触发版本校验和更新日志自动化，成功后把标签对应提交快进到 `production` 分支并触发部署，不读取 `main` 的后续提交。Giscus 使用 `pnpm run deploy giscus` 独立手动发布；R2 暂不启用，图片随内容静态资源发布。公告仍使用 `pnpm release announcement publish` 独立管理。

## 项目结构

```text
src/
  assets/          # 全局、主题、阅读与字体样式
  components/
    novel/         # 小说目录、章节信息与阅读器
    markdown/      # Markdown 渲染与扩展内容
    games/         # 游戏房间、阿瓦隆与雾港商纪界面
    tools/         # 工具业务组件
    layout/        # 导航与页面骨架
  games/           # 游戏目录与路由配置
  i18n/            # 按页面拆分的三语界面文本
  composables/     # 阅读、游戏、账户等业务逻辑
  services/        # 内容、搜索、公告与接口请求
  stores/          # 主题、小说与阅读状态
  router/          # 路由及构建期生成的 SSG/许可数据
  utils/           # Markdown 扩展、本地存储、资源解析与更新通知
  views/           # 路由页面

scripts/
  build/           # 构建资源、预渲染数据、索引与许可证
  checks/          # 按业务运行的回归检查
  release/         # 版本、更新日志与公告管理
  sinhala/         # 字体、字形和词库生成工具及字体源文件
  lib/             # 脚本共享逻辑
  run.mjs          # 统一命令入口

workers/           # Cloudflare API、游戏房间与内容路由
giscus/            # 手工维护、独立上传的评论主题样式
raw/               # 仅供内容 Worker 发布的静态资源，不进入网站 dist

licenses/          # 字体、图标等补充许可证原文
mock/              # 被 Git 忽略的本地博客与小说内容镜像
public/
  assets/          # 图片、字体与图标
  archive/         # 历史静态页面归档
  changelog.json   # 新版更新日志数据，用于 API 静态回退与预渲染
```

## 内容与构建说明

- 博客源位于私有 `ObsidianVault/notes`，仅导出 `public/publish` 笔记及其资源；小说仅发布私有 `MyWritingVault/public/`，保留卷章路径、UUID 与路由短码。旧公开仓库不再作为内容发布中转，Giscus 配置保持独立。
- `src/router/ssg-data.generated.js` 与 `src/router/license-data.generated.js` 均由脚本生成且被 Git 忽略，请勿手动编辑。
- Giscus 的公开仓库与分类配置集中在 `src/constants/config.js`。
- 博客、小说和全站搜索逻辑分别位于 `src/services/api-articles.js`、`src/services/api-chapters.js` 与 `src/services/search-content.js`。
- Markdown 扩展位于 `src/utils/markdown/`，文章图片与横幅路径由 `src/utils/resolve-article-assets.js` 解析。
- 更新日志源文件位于 `changelog/releases/`，构建仅生成新版结构的 `public/changelog.json`；公告源文件位于本地被 Git 忽略的 `announcements/`。
- 版本公告按 `x.y.0` 归组：维护、优化和修复的实际变化融入原公告正文，面向读者说明最终结果，不追加版本补丁段落或复制技术日志。保留 ID 和发布时间，完成正文修订后增加一次 revision。
- 网站静态资源与 API Worker 分别使用 `wrangler.jsonc`、`wrangler.api.jsonc` 配置。

## 浏览器支持

项目主要面向 Chrome、Firefox、Microsoft Edge 及主流移动浏览器的近期版本。

## 许可证

除另有说明外，本仓库的原创软件源代码采用 [MIT License](./LICENSE)。第三方库、字体、图标、图片、文章及其他非软件内容仍适用各自的许可证或权利声明，不因收录于本仓库而改为 MIT；详情参见[中文第三方声明](./THIRD_PARTY_NOTICES.zh-CN.md)、[英文第三方声明](./THIRD_PARTY_NOTICES.md)与站内 [`/licenses`](https://komori.cc/licenses) 页面。

生产构建会在 `dist/legal/` 中附带运行时依赖的许可证文本、项目许可证、第三方声明及补充许可文件。

## 其他语言

- [English](./README_en.md)
- [Français](./README_fr.md)
