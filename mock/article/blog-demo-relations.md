---
title: "博客示例：引用网络中的主文章"
summary: "同一篇文章包含互相引用、单向引用和反链。四篇引用文章展示后，剩余位置由同二级标签的文章补上。"
date: 2025-01-08T03:00:00.000Z
modified: 2025-02-01T10:12:34.000Z
tags:
  - 博客测试/引用实验
banner: /assets/images/banners/bell_tower.jpg
type: technical
public: true
---

这是一篇本地推荐排序测试文章。它先提到发表较早的 [[blog-demo-related-older|纸带记录]]，再提到发表较新的 [[blog-demo-related-newer|浮标校准]]。两篇都引用了本文。

这里还单向引用[标尺使用说明](/blog/blog-demo-related-citation/zh-CN)。再次提到 [[blog-demo-related-newer|浮标校准]] 时，推荐列表仍应只出现一条。

## 预期顺序

1. 浮标校准札记（互相引用，较新）
2. 纸带记录札记（互相引用，较旧）
3. 标尺使用说明（文中提及）
4. 水位校核报告（引用本文）
5. 数据归档约定（共同标签）

同一级内按发布时间倒序，即使正文先链接旧文。四篇引用文章占据前四位，同二级标签的文章补到第五位，仅共享一级标签的搜索样本不进入列表。

## 排除项

下面的代码块和行内代码只用于展示语法。它们指向的文章不应被算作正文引用。

`[[blog-demo-search]]`

```markdown
[[blog-demo-related-tags]]
[代码中的链接](/blog/blog-demo-search/zh-CN)
```

本文修改时间早于 180 天，应显示内容时效提醒。返回列表后，也可以使用“博客测试 / 引用实验”标签检查筛选。
