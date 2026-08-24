<template>
  <TestPage section-id="reader-share">
    <section class="min-w-0">
      <p class="max-w-3xl text-sm leading-relaxed text-base-content/65">
        生成结果应为 1080 × 1350 PNG；短内容完整显示，长内容显示截断提示。关闭预览后再次打开应重新生成并释放旧预览。
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn btn-sm btn-primary" @click="openShortSample">
          生成富文本示例
        </button>
        <button class="btn btn-sm btn-outline" @click="openLongSample">
          生成长文截断示例
        </button>
      </div>
      <ReaderShareCardDialog ref="shareDialogRef" />
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import ReaderShareCardDialog from "@/components/reader/ReaderShareCardDialog.vue";
import TestPage from "./_TestPage.vue";

const shareDialogRef = ref(null);

const baseMeta = {
  sourceLabel: "开发测试面板",
  detail: "阅读器分享卡片 · 富文本与排版检查",
  path: "/test/reader-share",
};

function openShortSample() {
  void shareDialogRef.value?.open({
    text: "分享卡片应保留正文的主要行内样式与块级结构。",
    paragraphId: "reader-share-rich-sample",
    shareContent: {
      blocks: [
        {
          type: "heading",
          level: 2,
          runs: [{ text: "富文本分享卡片" }],
        },
        {
          type: "paragraph",
          runs: [
            { text: "正文支持" },
            { text: "粗体", bold: true },
            { text: "、" },
            { text: "斜体", italic: true },
            { text: "、" },
            { text: "高亮", mark: true },
            { text: "与行内代码。", code: true },
          ],
        },
        {
          type: "list-item",
          marker: "1.",
          runs: [{ text: "列表、标点避头尾与中文两端对齐" }],
        },
        {
          type: "code",
          language: "javascript",
          runs: [{ text: "const verified = true;", syntax: "keyword" }],
        },
      ],
    },
    meta: {
      ...baseMeta,
      title: "富文本分享卡片测试",
    },
  });
}

function openLongSample() {
  const text = Array.from(
    { length: 36 },
    (_, index) =>
      `第 ${index + 1} 段用于验证长文自动缩小字号，并在画布空间不足时安全截断。`,
  ).join("\n");

  void shareDialogRef.value?.open({
    text,
    paragraphId: "reader-share-long-sample",
    meta: {
      ...baseMeta,
      title: "长文截断测试",
    },
  });
}
</script>
