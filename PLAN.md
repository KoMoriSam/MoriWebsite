# 全站三语言支持

## 目标与默认行为

- 支持简体中文 `zh-CN`、英语 `en`、僧伽罗语 `si`，覆盖全部正式页面界面。
- 保持现有网址；文章、小说、公告、更新日志正文及许可证原文不翻译，开发测试页不纳入翻译范围。
- 首次访问按 `navigator.languages` 顺序匹配三种语言，区域变体归并到对应语言，未匹配时使用中文；保存的手动选择优先。

## 基础接入

- 新增 `src/i18n/`，采用 Vue I18n Composition API，每个 ViteSSG 应用创建独立实例，避免静态渲染共享语言状态。
- 中文语言包同步载入，英文和僧伽罗语按需载入；按公共界面、页面、阅读器、工具组织相同语义键，使用参数插值，缺失翻译回退中文。
- 提供语言切换、语言代码归一化和日期／数字格式化入口；非组件代码通过显式传入翻译函数或消息键接入，不引用可变全局实例。
- 偏好保存到 `GLOBAL_INFO.SET_LOCALE`。静态渲染及首次水合固定中文，挂载后恢复偏好或检测浏览器语言；存储不可用时仍可在当前会话切换。
- 目标语言包加载成功后再切换和保存；加载失败保留当前语言并提示，允许重试，连续切换以最后一次选择为准。

## 界面与文案迁移

- 导航栏右侧主题按钮前增加 daisyUI 语言下拉菜单，显示 `简体中文`、`English`、`සිංහල`，标识当前选择；支持键盘、关闭后焦点恢复及移动端布局。
- 迁移导航、首页介绍、列表与筛选、阅读设置、搜索、工具说明、公告界面、更新日志界面、许可界面、404，以及按钮、空状态、错误、Toast、弹窗和无障碍标签。
- 用响应式计算生成文案数组和格式化结果，避免切换后仍显示初始化时的语言。程序创建的 Toast／Modal 应用接入同一翻译实例；已发出的短暂提示保留原显示语言。
- Markdown 自动生成的操作标签和默认提示标题翻译，作者写入的标题与正文保留原文；分享卡片只翻译系统标签。Worker 及工具计算逻辑保持现有行为，界面按错误标识翻译提示。
- 评论语言使用中文或英文；僧伽罗语界面中的 Giscus 使用英文，其现有语言目录没有僧伽罗语。评论映射和讨论标识保持稳定。
- 复用现有僧伽罗字体，为界面补齐字体回退；长文案允许换行，语言切换不清空工具输入、阅读进度或筛选状态。

## 页面信息与验收

- 页面界面标题、通用描述和 `html lang` 跟随语言；内容正文标记实际语言，文章结构化数据保留中文。静态产物默认中文，不新增语言路由或 `hreflang`。
- 定向检查三套语言包键、插值参数和 Vue 文件编译；检查语言归一化、非法偏好、存储异常及加载失败行为，不主动运行全量构建。
- 用户手动验收三种语言的导航、工具、阅读器、搜索、弹窗、评论和移动端布局；确认刷新记住选择、首次跟随浏览器、水合无语言冲突。
- 保留现有 `MarkdownSample.md` 未提交修改。不新增其他说明文档，不自动提交。
- 完成后提供实际改动文件及统一提交消息：`feat: 添加全站中文英文及僧伽罗语支持`。

## 实施结果

- 已完成三语言基础接入、正式页面界面迁移、共享弹窗与提示、评论语言及页面元信息。
- 定向检查通过：1073 个消息键及参数、83 个 Vue 文件编译、运行时语言与存储检查、图片转换检查、Markdown XSS 检查。
- 未运行全量构建或浏览器交互验收；由用户手动验收。
- MarkdownSample.md 原有未提交修改保持不变，不包含在以下改动清单。

### 实际改动文件

- PLAN.md
- package.json
- pnpm-lock.yaml
- scripts/check-i18n-runtime.mjs
- scripts/check-i18n.mjs
- src/App.vue
- src/assets/main.css
- src/components/announcement/Badges.vue
- src/components/announcement/Modal.vue
- src/components/announcement/NoticeCenter.vue
- src/components/announcement/Title.vue
- src/components/base/Pagination.vue
- src/components/base/ToTop.vue
- src/components/layout/ContentPage.vue
- src/components/layout/FootBar.vue
- src/components/layout/MobileNav.vue
- src/components/layout/NavBar.vue
- src/components/layout/NavLinks.vue
- src/components/layout/ProjectMenu.vue
- src/components/layout/Search.vue
- src/components/layout/SideBar.vue
- src/components/markdown/Alert.vue
- src/components/markdown/Chat.vue
- src/components/markdown/CodeBlock.vue
- src/components/markdown/Markdown.vue
- src/components/markdown/Mermaid.vue
- src/components/markdown/Moment.vue
- src/components/novel/ChapterController.vue
- src/components/novel/ChapterHeader.vue
- src/components/novel/ChapterList.vue
- src/components/novel/ChapterStatusBadges.vue
- src/components/novel/ChapterToc.vue
- src/components/novel/mobile/PagedReader.vue
- src/components/novel/mobile/PageFootnotes.vue
- src/components/novel/mobile/ReaderControls.vue
- src/components/novel/mobile/ReaderDialogHeader.vue
- src/components/novel/mobile/ReaderMoreSettings.vue
- src/components/novel/mobile/ReaderStatusBar.vue
- src/components/novel/mobile/ScrollReader.vue
- src/components/novel/mobile/TapZoneEditor.vue
- src/components/novel/NovelContentSearch.vue
- src/components/reader/CommentTrigger.vue
- src/components/reader/ContextMenu.vue
- src/components/reader/FormatSetting.vue
- src/components/reader/ParaGiscus.vue
- src/components/reader/Reader.vue
- src/components/reader/ReaderBody.vue
- src/components/reader/ReaderToc.vue
- src/components/reader/ShareCard.vue
- src/components/reader/StyleMenu.vue
- src/components/reader/TocFrame.vue
- src/components/ServerInfo.vue
- src/components/tools/sinhala/Info.vue
- src/components/tools/sinhala/Notes.vue
- src/components/ui/button/FloatingActionButton.vue
- src/components/ui/FontSelect.vue
- src/components/ui/ImagePreview.vue
- src/components/ui/LanguageController.vue
- src/components/ui/menu/Menu.vue
- src/components/ui/menu/Submenu.vue
- src/components/ui/Modal.vue
- src/components/ui/theme/ThemeController.vue
- src/components/ui/Toast.vue
- src/composables/useModal.js
- src/composables/useToast.js
- src/i18n/index.js
- src/i18n/locale.js
- src/i18n/messages/en.json
- src/i18n/messages/si.json
- src/i18n/messages/zh-CN.json
- src/main.js
- src/services/search-content.js
- src/utils/announcements.js
- src/utils/image-converter-messages.js
- src/utils/markdown/markdown-component-props.js
- src/utils/markdown/markdown-it-alert.js
- src/utils/reader/create-reader-share-card.js
- src/utils/reader/create-reader-share-content.js
- src/utils/reader/create-reader-text-context.js
- src/utils/storage/use-global-storage.js
- src/utils/storage/use-reader-settings-storage.js
- src/utils/storage/use-reading-state-storage.js
- src/views/Announcements.vue
- src/views/Blog.vue
- src/views/blog/ArticleList.vue
- src/views/blog/ArticleReader.vue
- src/views/Changelog.vue
- src/views/Home.vue
- src/views/Licenses.vue
- src/views/NotFound.vue
- src/views/novel/NovelDetail.vue
- src/views/novel/NovelReader.vue
- src/views/projects/Kaiming.vue
- src/views/Tools.vue
- src/views/tools/ImageConverter.vue
- src/views/tools/ServerStatus.vue
- src/views/tools/SinhalaFontConverter.vue
- src/workers/image-converter.worker.js
