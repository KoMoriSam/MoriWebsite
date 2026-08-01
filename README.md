<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="KoMoriSam Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  一个使用 Vue 3、Vite SSG、Tailwind CSS 与 daisyUI 构建的个人数字花园，集博客、小说阅读、全站搜索、评论与实用工具于一体。
</p>

<p align="center">
  <a href="https://komori.cc/">在线访问</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">源代码</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">问题反馈</a>
</p>

<p align="center">
  当前版本：<strong>1.14.0</strong>
  ·
  <a href="https://komori.cc/changelog">更新日志</a>
</p>

---

## 项目简介

MoriWebsite 是 KoMoriSam 的个人网站前端。站点围绕内容发布与长文本阅读设计，并通过静态站点生成（SSG）提供可索引的文章页面和更完整的 SEO 信息。

当前主要内容包括：

- 包含个人介绍、动态背景与联系方式的响应式首页
- 支持关键词、标签和年份筛选的博客
- Markdown 驱动的原创小说《向远方》及专用阅读器
- 基于 Pagefind 的全站搜索，可检索博客、小说与更新日志
- 基于 Giscus 的文章、章节和段落级评论
- Minecraft 服务器状态等在线工具
- 更新日志、主题切换、阅读进度和本地阅读偏好

生产环境路由：

```text
/
/blog
/blog/:articleId
/novel
/novel/:volumeSlug/:chapterSlug?
/tools/:toolSlug?
/changelog
```

开发环境还提供 `/test`，用于组件与交互调试。未知地址由站内 404 页面处理，构建时也会生成适合静态托管的 `404.html`。

## 技术栈

- Vue 3、Vue Router、Pinia
- Vite 6、vite-ssg
- Tailwind CSS 4、daisyUI 5
- Pagefind
- Unhead
- VueUse
- Markdown-it、vue-markdown-render
- Giscus
- highlight.js

## 主要功能

### 内容与阅读

- 文章列表、详情页以及关键词、标签、年份组合筛选
- 小说卷目、章节导航、阅读位置与阅读器设置持久化
- Markdown 代码高亮、脚注、任务列表、数学公式、警告框和自定义对话格式
- Obsidian 风格图片引用、横幅图片和图片懒加载
- 适配桌面端与移动端的排版、侧栏和阅读进度体验

### 搜索与内容发现

- `Ctrl/Cmd + K` 打开全局搜索
- Pagefind 在生产构建后生成静态搜索索引
- 支持按内容类型、标签或卷目、年份组合筛选
- 博客列表内置独立的全文搜索与筛选界面
- 搜索条件会同步至 URL，便于分享和返回

### 评论与本地状态

- Giscus 提供文章与小说评论
- 支持围绕具体段落发起讨论
- 可选的段评计数接口用于批量显示评论数量
- 主题、阅读设置与阅读位置保存在浏览器本地
- 内置旧版存储迁移与废弃数据清理

### SSG、SEO 与静态托管

- 构建前抓取文章、小说目录与更新日志，生成统一的 SSG 数据快照
- 为文章生成独立静态路由并保持服务端渲染与 hydration 数据一致
- 使用 Unhead 输出 canonical、Open Graph、Twitter Card 与 JSON-LD 信息
- 构建完成后生成 Pagefind 索引与静态托管用 404 页面
- `wrangler.jsonc` 已配置为从 `dist/` 提供 Cloudflare 静态资源

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

开发服务器默认监听所有网络接口。

### 构建生产版本

```bash
pnpm build
```

构建流程会依次生成 SSG 数据、预渲染页面，并为 `dist/` 创建 Pagefind 搜索索引。构建时必须能够访问文章和小说内容源。

### 本地预览

```bash
pnpm preview
```

## 环境变量

项目通过 `.env.development` 和 `.env.production` 提供不同环境的内容源与服务地址：

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
VITE_RANDOM_HERO_API=
VITE_COMMENT_COUNTS_API=
VITE_GISCUS_CSS_RAW=
```

| 变量 | 用途 |
| --- | --- |
| `VITE_BLOG_RAW` | 文章索引、Markdown 与图片资源的基础地址；生产构建必需 |
| `VITE_NOVEL_RAW` | 小说索引与章节 Markdown 的基础地址；生产构建必需 |
| `VITE_SERVER_ADDRESS` | 工具页默认查询的 Minecraft 服务器地址 |
| `VITE_RANDOM_HERO_API` | 首页随机背景图接口 |
| `VITE_COMMENT_COUNTS_API` | 可选的段落评论数量查询接口 |
| `VITE_GISCUS_CSS_RAW` | Giscus 自定义主题资源的基础地址 |

`scripts/generate-routes.mjs` 会在构建前读取 `.env.production`。请勿把私密凭据提交到仓库；只有需要暴露给客户端的值才应使用 `VITE_` 前缀。

## 项目结构

```text
src/
  components/
    blog/          # 文章列表与阅读器
    novel/         # 小说目录、章节信息与阅读器
    reader/        # Markdown、段评与阅读设置
    layout/        # 导航、全局搜索与页面布局
    ui/            # 通用界面组件
  composables/     # 搜索筛选、滚动、弹窗、图片等复用逻辑
  services/        # 内容、评论、服务器与背景图接口
  stores/          # 主题、更新日志和阅读状态
  router/          # 路由及构建期生成的 SSG 数据
  utils/           # Markdown 扩展、本地存储与更新通知
  views/           # 路由页面

scripts/
  generate-routes.mjs       # 生成文章静态路由与统一 SSG 快照

mock/
  article/                  # 本地文章、图片与索引
  novel/                    # 本地小说章节、索引及索引生成脚本

public/
  assets/                   # 图片、字体与图标
  archive/                  # 历史静态页面归档
  changelog.json            # 版本更新数据
```

## 内容与构建说明

- 博客与小说内容分别维护在 [theWake](https://github.com/KoMoriSam/theWake) 和 [theHorizon](https://github.com/KoMoriSam/theHorizon)，`mock/` 提供本地内容镜像。
- `src/router/ssg-data.generated.js` 由构建脚本自动生成，不应手动编辑。
- Giscus 配置集中在 `src/constants/config.js`。
- 文章与小说接口分别位于 `src/services/api-articles.js` 和 `src/services/api-chapters.js`。
- 更新日志数据来自 `public/changelog.json`。
- `pnpm deploy` 会把 `dist/` 发布到仓库的 `gh-pages` 分支；Cloudflare 静态资源配置位于 `wrangler.jsonc`。

## 浏览器支持

项目主要面向 Chrome、Firefox、Microsoft Edge 及主流移动浏览器的近期版本。

## 许可证

除另有说明外，本仓库的原创软件源代码采用 [MIT License](./LICENSE)。第三方库、字体、图标、图片、文章及其他非软件内容仍适用各自的许可证或权利声明，不因收录于本仓库而改为 MIT；详情参见[中文第三方声明](./THIRD_PARTY_NOTICES.zh-CN.md)或[英文原版](./THIRD_PARTY_NOTICES.md)。

生产构建会在 `dist/legal/` 中生成并附带运行时依赖的许可证文本，同时将其预渲染为站内 `/licenses` 页面。

## 其他语言

- [English](./README_en.md)
- [Français](./README_fr.md)
