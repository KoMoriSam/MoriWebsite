<template>
  <TestPage section-id="markdown">
    <TestCard title="Markdown 渲染与阅读器样式设置">
      <div
        class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]"
      >
        <FormatSetting />

        <section class="rounded-box p-4 sm:p-5">
          <h3 class="font-semibold">实时联动检查</h3>

          <dl class="my-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <div
              class="col-span-2 rounded-box border border-base-300 p-2 sm:col-auto"
            >
              <dt class="text-xs text-base-content/55">字体类名</dt>
              <dd class="mt-1 font-mono font-semibold">
                {{ readerStore.styleConfigs.fontStyle }}
              </dd>
            </div>
            <div class="rounded-box border border-base-300 p-2">
              <dt class="text-xs text-base-content/55">字体大小</dt>
              <dd class="mt-1 font-mono font-semibold">
                {{ readerStore.styleConfigs.fontSize }}px
              </dd>
            </div>
            <div class="rounded-box border border-base-300 p-2">
              <dt class="text-xs text-base-content/55">字间距</dt>
              <dd class="mt-1 font-mono font-semibold">
                {{ readerStore.styleConfigs.fontGap }}
              </dd>
            </div>
            <div class="rounded-box border border-base-300 p-2">
              <dt class="text-xs text-base-content/55">行间距</dt>
              <dd class="mt-1 font-mono font-semibold">
                {{ readerStore.styleConfigs.lineHeight }}
              </dd>
            </div>
            <div class="rounded-box border border-base-300 p-2">
              <dt class="text-xs text-base-content/55">段间距</dt>
              <dd class="mt-1 font-mono font-semibold">
                {{ readerStore.styleConfigs.paraHeight }}
              </dd>
            </div>
          </dl>

          <div class="my-4 flex flex-wrap gap-2">
            <button
              v-for="sample in markdownSamples"
              :key="sample.name"
              class="btn btn-xs"
              :class="currentSample === sample.name ? 'btn-primary' : 'btn-outline'"
              @click="currentSample = sample.name"
            >
              {{ sample.name }}
            </button>
          </div>
          <Markdown
            class="max-h-140 overflow-auto"
            :content="markdownContent"
            :header-data="markdownHeaderData"
            :style-configs="readerStore.styleConfigs"
          />
        </section>
      </div>
    </TestCard>
  </TestPage>
</template>

<script setup>
import { computed, ref } from "vue";
import { useReaderStore } from "@/stores/readerStore";
import Markdown from "@/components/reader/Markdown.vue";
import FormatSetting from "@/components/reader/FormatSetting.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const readerStore = useReaderStore();
const markdownSamples = [
  {
    name: "标题与段落",
    content: [
      "# 一级标题",
      "## 二级标题",
      "### 三级标题",
      "#### 四级标题",
      "##### 五级标题",
      "###### 六级标题",
      "",
      "这是第一段正文，用于观察段落宽度、字号、行高、字间距与首行缩进。",
      "",
      "这是第二段正文。下面使用两个行尾空格产生硬换行。  ",
      "这一行应紧跟上一行显示，但仍然位于同一段落中。",
      "",
      "---",
      "",
      "> 普通引用第一层",
      ">",
      "> > 嵌套引用第二层",
    ].join("\n"),
  },
  {
    name: "行内与扩展",
    content: [
      "普通文本、**粗体aBc123**、*斜体aBc123*、***粗斜体aBc123***、~~删除线~~、==高亮文本==。",
      "",
      "行内代码 `const answer = 42`，转义字符 \\*不会变成斜体\\*。",
      "",
      "上标：X^2^；下标：H~2~O；Emoji：:smile: :tada: :warning:。",
      "",
      "Ruby 注音：{小森|コモリ}、{远方|yuǎnfāng}、{汉字|かんじ}。",
      "",
      "HTML 和 CSS 都可以使用缩写提示。",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
      "",
      "这是一段签名样式测试。{.signature}",
      "",
      "## 带自定义 ID 的标题 {#custom-heading}",
      "",
      "[跳转到自定义标题](#custom-heading)",
    ].join("\n"),
  },
  {
    name: "列表与任务",
    content: [
      "## 无序列表",
      "",
      "- 一级项目 A",
      "  - 二级项目 A.1",
      "    - 三级项目 A.1.1",
      "- 一级项目 B",
      "",
      "## 有序列表",
      "",
      "1. 第一步",
      "2. 第二步",
      "   1. 子步骤",
      "   2. 另一个子步骤",
      "3. 第三步",
      "",
      "## 任务列表",
      "",
      "- [x] 已完成任务",
      "- [ ] 未完成任务",
      "- [x] 包含 **粗体** 与 `code` 的任务",
    ].join("\n"),
  },
  {
    name: "链接与媒体",
    content: [
      "## 链接",
      "",
      "[站内首页](/)、[GitHub](https://github.com) 与自动链接 <https://komori.cc/>。",
      "",
      '这是一个带标题的链接：[Markdown 指南](https://www.markdownguide.org/ "打开 Markdown 指南")。',
      "",
      "[引用式链接][docs]",
      "",
      "[docs]: https://www.markdownguide.org/",
      "",
      "## 图片",
      "",
      '![小森头像](/assets/images/avatar/komorisam.webp "本地图片与替代文本测试")',
      "",
      "图片下方正文用于检查图片尺寸、间距和加载后的布局稳定性。",
    ].join("\n"),
  },
  {
    name: "表格",
    content: [
      "## 对齐与行内格式",
      "",
      "| 左对齐 | 居中 | 右对齐 | 混合内容 |",
      "| :--- | :---: | ---: | --- |",
      "| 普通文本 | **粗体** | 123.45 | `inline code` |",
      "| 较长内容用于测试列宽和换行 | [链接](https://example.com) | 9,999 | ~~删除~~ 与 ==高亮== |",
      "| 中文标点：，。！？ | :smile: | -42 | H~2~O 与 X^2^ |",
      "",
      "表格下方正文用于检查滚动容器与上下间距。",
    ].join("\n"),
  },
  {
    name: "代码高亮",
    content: [
      "行内代码：`npm run build`。",
      "",
      "~~~javascript",
      "// 这是一段 JavaScript 代码",
      "function fibonacci(n) {",
      "  if (n <= 1) return n;",
      "  return fibonacci(n - 1) + fibonacci(n - 2);",
      "}",
      "",
      "console.log(fibonacci(10));",
      "~~~",
      "",
      "~~~python",
      "def greet(name: str) -> str:",
      "    return f'Hello, {name}!'",
      "",
      "print(greet('KoMoriSam'))",
      "~~~",
      "",
      "~~~diff",
      "- const enabled = false;",
      "+ const enabled = true;",
      "~~~",
      "",
      "~~~",
      "没有声明语言的纯文本代码块",
      "用于检查 fallback 与复制按钮。",
      "~~~",
    ].join("\n"),
  },
  {
    name: "提示与折叠",
    content: [
      "> [!NOTE] 普通说明 `Markdown 格式支持`",
      "> 静态说明块，支持 **Markdown** 与 `行内代码`。",
      "",
      "> [!TIP]+ 默认展开",
      "> 这是可以折叠的提示块。",
      ">",
      "> - 支持列表",
      "> - 支持多段内容",
      "",
      "> [!WARNING]- 默认折叠",
      "> 点击标题后才能看到这段警告内容。",
      "",
      "> [!CAUTION] 危险操作",
      "> 请确认 error 语义色、图标与正文对比度。",
      "",
      "> [!SUCCESS] 操作成功",
      "> success 类型的渲染效果。",
      "",
      "> [!QUOTE] 自定义引用",
      "> 用于区别普通 blockquote 与项目提示块。",
    ].join("\n"),
  },
  {
    name: "脚注与锚点",
    content: [
      "# 可跳转的测试标题",
      "",
      "标题右侧应生成无障碍锚点。[跳转到标题](#可跳转的测试标题)",
      "",
      "这是数字脚注[^1]，这是命名脚注[^note]。同一个脚注可以再次引用[^1]。",
      "",
      "脚注中可以包含 **粗体**、链接和多段内容。[^long]",
      "",
      "[^1]: 第一条脚注内容。",
      "[^note]: 命名脚注会按照出现顺序编号。",
      "[^long]: 第一段脚注，包含 [外部链接](https://example.com)。",
      "",
      "    第二段脚注，用于检查缩进和返回链接。",
    ].join("\n"),
  },
  {
    name: "数学公式",
    content: [
      "## 行内公式",
      "",
      "质能方程 $E = mc^2$ 应与正文基线对齐，勾股定理为 $a^2 + b^2 = c^2$。",
      "",
      "## 块级公式",
      "",
      "$$",
      "a^2 + b^2 = c^2",
      "$$",
      "",
      "$$",
      "f(x) = x^3 + 2x^2 - x + 1",
      "$$",
      "",
      "公式后的正文用于检查异步加载 KaTeX 时是否闪烁或丢失内容。",
    ].join("\n"),
  },
  {
    name: "原生 HTML",
    content: [
      "## HTML 混排",
      "",
      "<u>下划线文本</u>、<small>小号文本</small> 与 <del>删除文本</del>。",
      "",
      "<details>",
      "  <summary>点击展开原生 details</summary>",
      "  <p>这里包含 <strong>HTML 粗体</strong> 和 <code>HTML code</code>。</p>",
      "</details>",
      "",
      '<div title="悬停提示">带有 title 属性的块级 HTML。</div>',
      "",
      "HTML 后的 **Markdown 正文** 应继续正常解析。",
    ].join("\n"),
  },
  {
    name: "聊天记录",
    content: [
      "> [!chat] **李焰老师** · 在线",
      ">",
      "> > **Mori** 10:30 · 已送达",
      "> > 老师，这是包含 **粗体**、`代码` 和 [链接](https://example.com) 的消息。",
      ">",
      "> 对方已加入会话",
      ">",
      "> > **李焰老师** 10:31 · 已读 · 👍",
      "> > 收到，聊天气泡与状态徽章渲染正常。",
      "> >",
      "> > 第二行消息用于测试气泡内的多段内容。",
      "",
      "## 仅聊天消息（无 ChatBar）",
      "",
      "> > [!chat] **Mori** 10:30 · 已送达",
      "> > 康神开播了，真的假的😲",
    ].join("\n"),
  },
  {
    name: "空间动态",
    content: [
      "> [!moment] **Mori** · 2026-08-06 10:30 · 昆明",
      ">",
      "> 今天在测试自定义 **空间动态** 渲染，正文支持 `Markdown` 和 :tada:。",
      ">",
      "> ![动态配图](/assets/images/avatar/komorisam.webp)",
      ">",
      "> ❤️ 12 · 💬 2 · 🔁 3",
      ">",
      "> **评论**",
      "> - **李焰老师** 10:35：渲染效果不错。",
      ">   - **Mori** 回复 **李焰老师** 10:36：收到，谢谢！",
      "> - **小群主** 10:40：评论也支持 **行内格式**。",
    ].join("\n"),
  },
  {
    name: "边界情况",
    content: [
      "## 中英文与标点",
      "",
      "中文English混排，数字1234567890，全角标点：，。！？；：“”‘’（）【】——……",
      "",
      "超长连续文本用于检查换行：LooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooongWord",
      "",
      "特殊字符：& < > © ™，以及已经转义的 HTML：&lt;script&gt;alert('safe')&lt;/script&gt;。",
      "",
      "连续分隔线：",
      "",
      "---",
      "",
      "***",
      "",
      "空链接 [空目标]()、不存在的图片 ![替代文本](/assets/images/not-found.webp)。",
    ].join("\n"),
  },
];

const currentSample = ref("标题与段落");
const markdownContent = computed(
  () =>
    markdownSamples.find((sample) => sample.name === currentSample.value)
      ?.content || "",
);
const markdownHeaderData = computed(() => ({
  title: `Markdown 渲染测试：${currentSample.value}`,
  uuid: "markdown-test",
  page:
    markdownSamples.findIndex(
      (sample) => sample.name === currentSample.value,
    ) + 1,
  meta: "",
  sourceType: "article",
}));
</script>
