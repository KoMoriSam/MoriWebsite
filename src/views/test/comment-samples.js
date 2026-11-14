export const COMMENT_SAMPLES = [
  {
    label: "短评",
    body: "读到这里我停了一下。这一句把前面的细节都串了起来。",
  },
  {
    label: "行内格式与链接",
    body: "这段的**节奏**很有意思，*尤其是结尾*。~~原来的理解~~可以再想想。\n\n还有 `inline code`、:smile: 和[站内链接](/test/markdown)。",
  },
  {
    label: "引用、列表与任务",
    body: "> 她把灯留在窗边。\n>\n> > 雨声盖住了远处的脚步。\n\n1. 窗边的灯\n   - 对应开头的场景\n2. 结尾的脚步\n\n- [x] 重读这一段\n- [ ] 对照下一章",
  },
  {
    label: "代码块与宽表格",
    body: [
      "下面的代码和表格适合检查窄栏滚动。",
      "",
      "```js",
      'const message = "这是一行很长的内容，用于检查窄栏中的代码块能否横向滚动";',
      "console.log(message);",
      "```",
      "",
      "| 场景 | 第一次出现 | 下一次出现 | 与前文的联系 |",
      "| --- | --- | --- | --- |",
      "| 窗边的灯 | 开头第一段 | 章节结尾 | 远处的脚步声 |",
    ].join("\n"),
  },
  {
    label: "图片、脚注与公式",
    body: [
      "这段文字有一个脚注[^note]，也可以试试行内公式 $a^2 + b^2 = c^2$。",
      "",
      "![段评气泡图标](/assets/images/icons/review-bubble.svg)",
      "",
      "[^note]: 点击标记检查脚注定位。",
    ].join("\n"),
  },
  {
    label: "长文与连续字符",
    body: [
      ...Array.from({ length: 8 }, (_, index) =>
        `第 ${index + 1} 段。风沿着窗缝钻进房间，纸页响了一声。她没有抬头，继续把余下的句子写完。`,
      ),
      "LongUnbrokenTextForNarrowCommentLayouts".repeat(5),
    ].join("\n\n"),
  },
  {
    label: "多语言与书写方向",
    body: "中文评论混排 English 和 සිංහල。\n\nهذا تعليق بالعربية لاختبار اتجاه النص.\n\n日本語のコメントと絵文字 🌿📚",
  },
];
