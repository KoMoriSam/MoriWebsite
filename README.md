<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">KoMoriSam</h1>

<p align="center">
  一个基于 Vite、Vue 3 与 daisyUI 构建的个人站点，包含首页、博客文章流、小说阅读器、评论系统、更新日志与联系页面。
</p>

<p align="center">
  <a href="https://komori.cc/">在线访问</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io">查看源代码</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io/issues">报告问题</a>
</p>

<p align="center">
  当前版本：<strong>1.13.0</strong>
  ·
  <a href="https://komori.cc/changelog">查看更新日志</a>
</p>

---

## 项目简介

这个仓库已经不再只是一个简单的博客主页，而是一个围绕“内容展示与阅读体验”持续演进的个人站点应用。目前主要包含：

- 首页问候与服务器信息展示
- 博客文章列表与文章详情页
- 基于 Markdown 的小说目录页与阅读器
- Giscus 评论系统，以及段落级评论能力
- 独立的关于、联系、更新日志页面
- 针对桌面端与移动端优化过的阅读与排版体验

站点当前路由包括：

- /
- /blog
- /novel
- /about
- /contact
- /changelog

开发环境下额外提供 /test 页面用于调试组件与交互。

## 技术栈

- Vite 6
- Vue 3
- Vue Router
- Pinia
- Tailwind CSS 4
- daisyUI 5
- VueUse
- vue-markdown-render
- Giscus
- highlight.js

## 主要功能

### 1. 博客文章系统

- 文章列表与详情页分离，支持从列表进入阅读
- 文章内容使用 Markdown 渲染
- 支持 Obsidian 风格图片引用与横幅图规范化
- 支持文章级评论与段落级评论

文章数据默认通过文章索引与 Markdown 文件提供：

- 开发/静态内容来源：mock/article
- 文章索引生成脚本：mock/article/generate-index.mjs

### 2. 小说阅读系统

- 小说目录页与阅读页分离
- 章节内容通过索引文件与 Markdown 动态加载
- 支持阅读器设置、阅读状态持久化与评论区集成
- 针对长文本阅读做了字体、行高、滚动和分页相关优化

小说内容当前位于：

- mock/novel

### 3. 评论与交互

- 使用 Giscus 作为评论后端
- 为全站主题适配自定义 Giscus 样式
- 文章段落评论支持获取当前段落文本，方便定位讨论内容

### 4. 附加信息流与外部数据

- 首页包含服务器信息展示
- 项目内保留每日一句接口服务封装
- 更新日志通过 public/changelog.json 驱动页面展示

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 本地预览构建结果

```bash
pnpm preview
```

## 环境变量

项目当前依赖以下 Vite 环境变量：

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
MXNZP_APP_ID=
MXNZP_APP_SECRET=
VITE_GISCUS_CSS_RAW=
```

说明：

- VITE_BLOG_RAW：文章索引与文章 Markdown 的来源地址
- VITE_NOVEL_RAW：小说章节索引与正文来源地址
- VITE_SERVER_ADDRESS：默认服务器地址
- MXNZP_APP_ID / MXNZP_APP_SECRET：每日一句接口凭据
- VITE_GISCUS_CSS_RAW：站点基地址，用于主题等静态资源引用

如果你只在本地使用仓库内的静态内容，通常需要保证文章与小说接口地址能指向相应的静态目录或代理地址。

## 内容与数据组织

```bash
src/
  components/
    blog/          # 博客文章列表、文章阅读
    novel/         # 小说详情、章节信息、阅读器控制
    reader/        # 阅读器设置、样式相关组件、段落评论与 Markdown 渲染
    layout/        # 页面布局与导航
  composables/     # 滚动、弹窗、评论、图片加载等可复用逻辑
  services/        # 文章、小说、服务器、每日一句等接口封装
  stores/          # 主题、更新日志、阅读器状态管理
  utils/           # Markdown、storage、更新通知等工具
  views/           # 页面路由入口

mock/
  article/         # 博客文章 Markdown、图片与索引生成脚本
  novel/           # 小说章节 Markdown 与索引生成脚本

public/
  css/giscus/      # Giscus 自定义主题
  archive/         # 历史静态页面归档
  changelog.json   # 更新日志数据
```

## 开发约定

- 路由定义在 src/router/index.js
- 更新日志页面数据来自 public/changelog.json
- Giscus 配置集中在 src/constants/config.js
- 文章与小说内容接口分别封装在 src/services/api-articles.js 与 src/services/api-chapters.js
- 文章索引和小说索引通过 generate-index.mjs 脚本维护

## 兼容性

当前主要面向现代浏览器：

- Chrome
- Firefox
- Microsoft Edge
- 移动端主流浏览器

## 许可证

本项目采用 MIT License，详见 [LICENSE](https://github.com/KoMoriSam/komorisam.github.io/blob/master/LICENSE)。

## 多语言文档

- English: [README_en.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README_en.md)
- Français: [README_fr.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README_fr.md)
