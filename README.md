<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="KoMoriSam Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  使用 Vue 3、Vite SSG、Tailwind CSS 与 daisyUI 构建的个人数字花园「远方之森」，集博客、小说阅读、全站搜索、评论与实用工具于一体。
</p>

<p align="center">
  <a href="https://komori.cc/">在线访问</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">源代码</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">问题反馈</a>
</p>

<p align="center">
  当前版本：<strong>1.23.0</strong>
  ·
  <a href="https://komori.cc/changelog">更新日志</a>
</p>

---

## 项目简介

MoriWebsite 是 KoMoriSam 个人网站的前端，围绕内容发布、长文本阅读和静态托管设计。博客正文与小说内容分别维护在独立仓库中；项目在构建前获取内容快照，再通过 `vite-ssg` 为主要页面和博客文章生成可索引的 HTML。

站点目前提供：

- 响应式个人主页、动态背景与联系方式
- 支持关键词、标签和年份筛选的博客
- 原创小说《向远方》的卷目、章节导航和分页阅读器
- 覆盖博客、小说、更新日志与开源许可的全站搜索
- 文章、章节与段落级 Giscus 评论
- Minecraft 服务器状态查询工具
- 更新日志、主题切换、阅读进度和本地阅读偏好
- 项目依赖、字体、图标等第三方内容的许可证展示页

生产环境路由：

```text
/
/blog
/blog/:articleId
/novel
/novel/:volumeSlug/:chapterSlug?
/tools/:toolSlug?
/changelog
/licenses
```

开发环境额外提供 `/test` 组件测试页。未知地址由站内 404 视图处理，生产构建还会生成适合静态托管的 `404.html`。

## 1.23.0 版本重点

- 新增基于 Cloudflare D1 的访问与阅读统计，支持批量查询内容阅读统计
- Markdown 公式改用 MathJax SVG 渲染，支持 LaTeX 复制与分享卡片渲染
- 展示文章与章节的阅读评论统计，汇总主评论、段评与回复
- 修复分享卡片重复渲染、桌面端阅读位置恢复、LaTeX 首屏渲染等问题

完整记录见 [`public/changelog.json`](./public/changelog.json) 或[在线更新日志](https://komori.cc/changelog)。

## 技术栈

- Vue 3、Vue Router、Pinia
- Vite 6、vite-ssg
- Tailwind CSS 4、daisyUI 5
- Pagefind 1.5
- Unhead、VueUse
- Markdown-it、vue-markdown-render、KaTeX、highlight.js
- JetBrains Mono、Fraunces 等自托管字体
- Giscus

## 主要功能

### 内容与阅读

- 博客列表与详情页，支持关键词、标签、年份组合筛选
- 小说卷目、章节导航、总字数统计、阅读位置与阅读器设置持久化
- Markdown 代码高亮、脚注、任务列表、数学公式、警告框、自定义对话、属性与 ruby 注音
- Obsidian 风格图片引用、横幅解析、图片懒加载和代码复制
- 桌面端与移动端响应式排版、目录、侧栏和阅读进度

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

### SSG、SEO 与许可信息

- 构建前获取文章、小说目录与更新日志，生成统一 SSG 数据快照
- 为博客文章生成独立静态路由，并保证服务端渲染与 hydration 数据一致
- 使用 Unhead 输出 canonical、Open Graph、Twitter Card 与 JSON-LD 信息
- 自动汇总生产依赖及补充许可文件，生成站内许可页和 `dist/legal/` 分发文件
- 构建后生成 Pagefind 索引与静态托管用 404 页面
- `wrangler.jsonc` 将 `dist/` 配置为 Cloudflare 静态资源目录

## 快速开始

### 前置条件

- Node.js
- pnpm
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

`predev` 会先根据已安装的生产依赖生成站内许可证数据。Vite 默认监听 `0.0.0.0`。

### 构建生产版本

```bash
pnpm build
```

完整构建流程会：

1. 从生产内容源生成 SSG 数据快照；
2. 汇总依赖与补充许可证数据；
3. 预渲染站点并生成 `404.html`；
4. 为博客、小说、更新日志和许可证生成 Pagefind 索引；
5. 将许可证正文与第三方声明复制到 `dist/legal/`。

构建期间必须能够访问 `VITE_BLOG_RAW` 与 `VITE_NOVEL_RAW` 指向的内容源。

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
```

| 变量                      | 用途                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `VITE_BLOG_RAW`           | 博客 `index.json`、Markdown 与图片的基础地址；生产构建必需 |
| `VITE_NOVEL_RAW`          | 小说 `index.json` 与章节 Markdown 的基础地址；生产构建必需 |
| `VITE_SERVER_ADDRESS`     | 工具页默认查询的 Minecraft 服务器地址                      |
| `VITE_RANDOM_HERO_API`    | 首页随机背景图接口                                         |
| `VITE_COMMENT_COUNTS_API` | 可选的段落评论数量批量查询接口                             |
| `VITE_GISCUS_CSS_RAW`     | Giscus 自定义主题资源的基础地址                            |

这些变量都使用 `VITE_` 前缀，会暴露给客户端；请勿在其中保存密钥或其他私密凭据。`scripts/generate-routes.mjs` 和 `scripts/generate-pagefind-index.mjs` 会读取 `.env.production`。

## 常用脚本

| 命令           | 作用                                         |
| -------------- | -------------------------------------------- |
| `pnpm dev`     | 生成许可数据并启动开发服务器                 |
| `pnpm build`   | 生成 SSG 站点、搜索索引与许可分发文件        |
| `pnpm preview` | 本地预览 `dist/`                             |
| `pnpm deploy`  | 将 `dist/` 发布到仓库的 `gh-pages` 分支      |
| `pnpm push`    | 强制将本地 `main` 推送到远端 `cl-pages` 分支 |

`pnpm push` 含有 `--force`，使用前请确认远端分支用途与当前提交状态。

## 项目结构

```text
src/
  assets/          # 全局、主题、阅读与字体样式
  components/
    blog/          # 博客列表与阅读器
    novel/         # 小说目录、章节信息与阅读器
    reader/        # Markdown、段评与阅读设置
    layout/        # 导航、全局搜索与页面骨架
    ui/            # 通用界面组件
  composables/     # 搜索筛选、滚动、弹窗、图片等复用逻辑
  services/        # 内容、搜索、评论、服务器与背景图接口
  stores/          # 主题、更新日志与阅读状态
  router/          # 路由及构建期生成的 SSG/许可数据
  utils/           # Markdown 扩展、本地存储、资源解析与更新通知
  views/           # 路由页面

scripts/
  generate-routes.mjs                # 生成博客静态路由与 SSG 快照
  generate-pagefind-index.mjs        # 生成全站 Pagefind 自定义索引
  generate-third-party-licenses.mjs  # 汇总并分发许可证数据

licenses/          # 字体、图标等补充许可证原文
mock/              # 被 Git 忽略的本地博客与小说内容镜像
public/
  assets/          # 图片、字体与图标
  archive/         # 历史静态页面归档
  changelog.json   # 版本更新数据
```

## 内容与构建说明

- 博客与小说内容分别维护在 [theWake](https://github.com/KoMoriSam/theWake) 和 [theHorizon](https://github.com/KoMoriSam/theHorizon)。
- `src/router/ssg-data.generated.js` 与 `src/router/license-data.generated.js` 均由脚本生成且被 Git 忽略，请勿手动编辑。
- Giscus 的公开仓库与分类配置集中在 `src/constants/config.js`。
- 博客、小说和全站搜索逻辑分别位于 `src/services/api-articles.js`、`src/services/api-chapters.js` 与 `src/services/search-content.js`。
- Markdown 扩展位于 `src/utils/markdown/`，文章图片与横幅路径由 `src/utils/article-assets.js` 统一解析。
- 更新日志数据来自 `public/changelog.json`。
- Cloudflare 静态资源设置位于 `wrangler.jsonc`；GitHub Pages 发布脚本保留在 `package.json`。

## 浏览器支持

项目主要面向 Chrome、Firefox、Microsoft Edge 及主流移动浏览器的近期版本。构建同时启用了 Vite legacy 插件以提供额外的旧浏览器兼容产物。

## 许可证

除另有说明外，本仓库的原创软件源代码采用 [MIT License](./LICENSE)。第三方库、字体、图标、图片、文章及其他非软件内容仍适用各自的许可证或权利声明，不因收录于本仓库而改为 MIT；详情参见[中文第三方声明](./THIRD_PARTY_NOTICES.zh-CN.md)、[英文第三方声明](./THIRD_PARTY_NOTICES.md)与站内 [`/licenses`](https://komori.cc/licenses) 页面。

生产构建会在 `dist/legal/` 中附带运行时依赖的许可证文本、项目许可证、第三方声明及补充许可文件。

## 其他语言

- [English](./README_en.md)
- [Français](./README_fr.md)
