# 站点体积与加载优化计划

## 目标与约束

保留现有功能、字体选择和默认外观，减少重复资源、首页依赖及全站共享数据。

- 图片压缩暂不实施，也不将雾港测试图片加入上线产物。
- 已将本计划替换写入根目录 PLAN.MD，并随实施更新进度。
- 保留当前公告标题及更新日志的未提交修改。
- 仅运行定向检查；完整构建、浏览器验收由用户执行。不部署、不自动提交。
- 旧构建中重复图片约 59.6 MiB；上线版本没有这些图片，因此该数字不作为本轮上线收益承诺。

## 实施步骤

### 1. 统一静态资源生成，消除图片重复

新增 scripts/generate-static-assets.mjs，接入现有 predev、prebuild：

- 扫描雾港图片目录，只生成文件名清单，不导入图片内容或生成图片副本。
- 目录不存在时生成空清单；空目录和部分素材均正常支持。
- artCandidates 根据清单返回 /assets/images/games/fogport/... 公共路径，保持现有格式优先级、名称校验及占位行为。
- 移除图片的 import.meta.glob(...?url) 导入。原图仅通过 public 复制一次。
- 清单属于本地生成文件，加入 Git 忽略规则，不提交测试素材。

同一步骤生成 Remix Icon 样式：

- 从已安装依赖读取官方 CSS，保留版权声明、所有图标映射和工具类。
- 字体声明仅保留 WOFF2，移除 EOT、TTF、WOFF、SVG 引用。
- 全局样式改为导入生成 CSS；保留完整图标库，支持图片转换器中的图标选择和导出。
- 依赖字体声明结构发生变化时，生成脚本明确报错，避免静默生成错误样式。

### 2. 公告详情按需加载 Markdown

- 将 NoticeDialog 中的 Renderer 改为异步组件，仅在打开公告详情时加载。
- 等待期间使用现有加载组件；加载失败支持重新尝试，不改变公告确认、返回和关闭操作。
- 公告摘要、导航栏及首页不再通过此导入链加载 Markdown 渲染器。
- 保留渲染器的安全过滤、搜索锚点及现有 Mermaid、MathJax、高亮语言懒加载。

### 3. 拆分路由元数据与 SSG 页面数据

调整生成脚本与 src/router/ssg-data.js：

- 单独生成轻量文章元数据：保留路径、标题、摘要、标签、日期、封面及导航所需字段；不包含正文。
- 完整文章、更新日志和小说章节快照继续供 SSG 与 Pagefind 构建使用，只在 SSR 分支导入。
- 使用 ViteSSG 已有 initialState，按当前页面序列化所需数据：文章页仅包含当前文章正文，更新日志页包含日志，小说页包含章节索引；首页不携带这些快照。
- 在页面渲染前准备对应数据，让 SSR 与浏览器初次 hydration 使用相同内容。
- 页面数据按应用实例隔离，客户端恢复时校验路径和文章身份，避免串页。
- 博客、更新日志和小说初始化改为读取当前页面快照；站内跳转继续使用现有 API、缓存、刷新和错误处理。
- 保留文章分页、上下篇导航、SEO、搜索索引及现有公开路由。使用 ViteSSG 自带安全序列化。
- 尾斜杠路径视为同一页面；返回最初页面时不重复恢复旧快照。未匹配的快照不恢复，SSR 已知文章缺正文时明确报错。

### 4. 撤回僧伽罗字体拆分，清除字体兼容副本

- 按用户反馈撤回僧伽罗字体 CSS 拆分：该拆分只移动约 2.5 KiB CSS，没有减少字体文件总量，不再作为优化成果。
- 恢复原有 sinhala.css，移除 sinhala-tools.css 及字体选择器、Markdown 渲染器、转换器入口的新增导入。
- 静态资源脚本从已安装的志莽行官方 CSS 生成 WOFF2-only 样式；reader-fonts.css 导入生成文件，生成文件加入 Git 忽略。
- 保留全部 92 条字体声明、字体名称、字重、unicode-range、排版参数及原有 WOFF2 文件，移除同时打包的 WOFF 兼容副本；上游声明不兼容时明确报错。
- 不裁剪中文字符集，不改变字体来源，也不延迟中文斜体规则。

### 当前产物复查（2026-10-10，读取已有 dist，未重新构建）

- 字体文件：WOFF2 约 14.09 MiB，WOFF 约 2.73 MiB；志莽行的重复格式副本约 2.66 MiB，改用生成样式后将不再被引用和打包。
- JavaScript 总计约 11.46 MiB；WASM 总计约 8.89 MiB，包括 AVIF 编码的单线程、多线程两种实现。再次检查部署配置后，确认仓库未配置跨源隔离头，因此本轮改为构建时移除不能启用的多线程实现，详见步骤 5。
- 核心字体 CSS 约 618.5 KiB（gzip 216.6 KiB），主要是中文子集及斜体声明；僧伽罗专用声明约 2.5 KiB（gzip 0.5 KiB）。
- 前一轮主要减少首页依赖和重复图片，不能据此承诺无测试图片的上线版本总量大幅下降。后续应分别记录页面实际下载量和产物总量。

### 5. 减少非图片、非字体产物的实际体积

- 当前 dist 排除图片和字体文件后约 33.50 MiB。以实际删除和减少的字节为依据，不把新增懒加载分块算成总量缩减。
- 新增 scripts/vite-single-thread-codecs.mjs，在 Vite 主构建和 Worker 构建中移除 AVIF、OxiPNG 的多线程初始化分支；保留官方单线程编码器、编码参数、错误校验、解码和 Worker 转换流程。不修改 node_modules 文件。
- 当前仓库没有 COOP/COEP 配置，浏览器无法启用 WASM 线程。若以后启用跨源隔离，需移除该构建插件再恢复多线程能力；构建脚本检查上游结构，不兼容时明确失败。
- 主线程及 Worker 编码器的定向内存打包：7.17 → 3.51 MiB，减少约 3.66 MiB；不是完整站点生产构建。
- 主构建与 Worker 共用输出路径规则：入口、动态分块和通过 ?url 导入的 JS/MJS/CJS 统一输出到 js/，.wasm 输出到 js/wasm/；CSS、图片、字体保持对应资源目录。Pagefind 独立生成的搜索产物保留其原有目录结构。
- 停止复制 licenses.html 为 licenses/index.html。Cloudflare 的现有 auto-trailing-slash 配置可直接处理平面 HTML 文件及其路由别名：[官方 HTML 路由规则](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。
- 新增 scripts/prune-build-assets.mjs，接入 postbuild。在 SSG、Pagefind、许可文件生成完成后，删除构建专用 SSR 清单、未使用的 Pagefind UI/高亮界面文件，以及与原页逐字节相同的旧许可页副本。保留两套隔离搜索引擎、Worker、WASM、索引、片段和完整许可下载文件。
- 当前产物可清理 16 个文件，共约 2.90 MiB；路径必须在目标产物目录内，正文不同的 HTML 不删除，重复运行不产生额外删除。
- 许可页折叠正文改为首次展开时渲染。保留全部 543 个依赖摘要、原始许可正文、下载和搜索索引；锚点跳转先渲染对应正文再展开。SSR 与客户端初始化都保持折叠状态，挂载后恢复带锚点的访问。
- 许可页定向 SSR：1349.1 → 243.4 KiB，减少约 1.08 MiB；不包含完整站点外壳的最终生产 HTML，实际浏览器展开及搜索高亮仍需用户验收。
- 三项合计预计再减少约 7.64 MiB 的非图片、非字体产物；按当前内容估算约 33.50 → 25.86 MiB，最终以完整生产构建为准。剩余包含完整 Mermaid/MathJax、PDF、单线程转换器、SSG 内容、搜索索引和许可数据，本轮没有删掉这些功能或把它们转移到外部 CDN。

## 定向检查与验收

已执行并通过：

- node scripts/check-site-perf.mjs：素材目录缺失、空目录、部分素材、多格式优先级、无效名称；完整图标映射保留；上游字体声明不兼容时失败。
- 页面数据检查：首页无快照、文章仅当前正文、错误路径和身份不恢复、尾斜杠别名、并发 SSR 实例互不污染、站内跳转不重放初始快照、原始路由记录不被修改。
- 用 Vue SSR 渲染夹具验证初次客户端组件初始化与服务端内容一致；用已安装 ViteSSG 序列化器验证 script 结束标签及 Unicode 行分隔符的安全转义。实际浏览器 hydration 尚未验证。
- 七个 Vue 组件通过 SFC 编译检查，包含许可页。
- node scripts/check-build-assets.mjs：AVIF 有损、无损编码与官方单线程输出一致并可解码；PNG 优化结果一致且像素可恢复；保留位深错误校验；Vite 主线程和 Worker 都只输出两份可用 WASM；上游布局变化报错。
- 清理夹具验证搜索引擎、Worker、WASM、索引和片段均保留，正文不同的 HTML 保留，重复清理无副作用。
- 许可页实际组件的 Vue SSR 渲染验证全部 543 个依赖摘要和全文下载链接保留，折叠正文不内嵌；node scripts/check-image-converter.mjs 通过。
- 僧伽罗字体拆分相关文件的 Git 差异已清除。
- 志莽行生成样式的全部字体声明和 unicode-range 与官方 CSS 逐项相同，WOFF2 文件顺序保持一致，无 WOFF 引用；缺失 WOFF2 和空样式均明确失败。
- Vite 定向转换 reader-fonts.css，确认生成样式的字体子集正常解析且无 WOFF 引用。
- 修复 Remix Icon 字体 URL 被 Tailwind 错误重写为不存在的相对目录：生成 CSS 使用相对真实依赖文件的路径。
- main.css 定向打包验证仅输出一份 Remix Icon WOFF2、内容与依赖原文件一致且最终 CSS 引用该文件；开发服务器 HTTP 检查验证字体 URL 返回原始 WOFF2。此前仅做 CSS 转换的检查未覆盖实际资源输出，已补齐。
- 输出路径定向内存打包验证主入口、Worker、Worker 动态依赖、PDF Worker 均位于 js/，相对模块引用有效；另行验证主构建与 Worker 的 .wasm 均输出到 js/wasm/，生成的脚本正确引用新路径。
- 定向转换雾港模块，确认只导入路径清单，不导入图片。
- git diff --check 通过。
- Markdown 安全过滤和解析依赖未改变，未运行全套安全或业务检查。

用户后续验收：

- 生产产物中雾港图片只出现一份；无素材时正常显示占位。
- 首页未打开公告详情时不加载 Markdown 渲染代码。
- 公告首次打开、关闭重开及加载重试正常。
- 文章直接访问、刷新、站内跳转和上下篇导航正常，无 hydration 警告。
- 更新日志、小说目录和搜索功能正常。
- 默认字体、中文斜体、字体预览、僧伽罗转换及图标导出保持原效果。
- AVIF 有损/无损、PNG 优化、取消转换和下载正常；生产产物不含 avif_enc_mt 及 OxiPNG 并行实现。
- /licenses、尾斜杠别名、依赖许可首次展开/关闭重开、搜索结果带锚点跳转和高亮正常。
- 使用 pnpm build 完成生产流程，确认 postbuild 清理执行；单独运行 vite build 不执行 npm 生命周期中的 postbuild。

生产构建后再记录首页 JS/CSS 压缩体积、字体文件数和重复资源量；本轮没有完整构建，不以旧 dist 的总大小判定上线收益。

## 进度与交付

- [x] 替换保存 PLAN.MD
- [x] 静态资源清单与图标字体精简
- [x] 公告 Markdown 按需加载
- [x] 路由元数据与页面快照拆分
- [x] 撤回僧伽罗字体拆分，移除志莽行 WOFF 兼容副本
- [x] 移除不可启用的编码器分支、重复 HTML 和未使用的构建附带文件
- [x] 许可正文展开渲染，完成编码器/Worker/清理/SSR 定向验证
- [x] 定向检查完成，更新计划状态

### 修改文件

- PLAN.MD、.gitignore、package.json
- scripts/generate-static-assets.mjs、scripts/generate-routes.mjs、scripts/check-site-perf.mjs
- scripts/vite-single-thread-codecs.mjs、scripts/prune-build-assets.mjs、scripts/check-build-assets.mjs、scripts/generate-third-party-licenses.mjs、vite.config.js
- src/assets/main.css、src/assets/font/reader-fonts.css
- src/components/announcement/interaction/NoticeDialog.vue
- src/composables/novel/useChapterSetup.js、src/games/fogport/art-assets.js
- src/main.js、src/router/ssg-data.js、src/router/ssg-snapshot.js、src/utils/ssg/page-data.js
- src/views/Blog.vue、src/views/Changelog.vue、src/views/Licenses.vue

本地生成且已忽略：src/games/fogport/art-manifest.generated.json、src/assets/font/remixicon.generated.css、src/assets/font/zhi-mang-xing.generated.css、src/router/article-metadata.generated.js。元数据由现有本地 SSG 快照生成，没有远程抓取或改动完整快照。

原有 public/changelog.json、public/changelog.v1.json、src/components/announcement/display/NoticeTitle.vue 未修改。

提交消息：perf: 优化站点资源打包与页面按需加载
