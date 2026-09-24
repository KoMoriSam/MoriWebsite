<template>
    <article class="flex flex-col sm:flex-row gap-2 mt-6">
      <section aria-labelledby="sinhala-converter-note">
        <h2 id="sinhala-converter-note" class="font-serif text-lg font-bold">
          注意
        </h2>
        <ol
          class="ms-4 list-decimal marker:font-serif text-sm leading-relaxed text-pretty text-base-content/75"
        >
          <li>
            旧编码字体通常不支持直引号，转换时会将 Unicode
            直引号自动替换为弯引号。
          </li>
          <li>
            旧编码字体中不存在 ්‍රු 和 ්‍රූ 的专用合写字形，转换时会拆分显示为
            ්රු 和 ්රූ。
          </li>
          <li>
            旧编码字体中不存在与 ඞ、ඞි 和 ඞී
            对应的专用字形，无法转换为对应的旧编码。
          </li>
          <li>
            ඣ් 的旧编码仅适用于部分旧编码字体，在其他字体中可能无法正确显示。
          </li>
          <li>
            相接字母（touching
            letters）暂无独立旧编码，转换时拆为普通字母序列无法还原相接字形。
          </li>
          <li>
            文本模式和文档模式导出的 Unicode
            文档均不支持自定义字体，默认使用系统字体；若系统中缺少相应字体，则将回退为
            Iskoola Pota。
          </li>
          <li>
            文档模式仅会提取上传文件中可选择的文本内容，暂不支持保留原文档的版式与排版信息，导出格式统一为
            DOCX。
          </li>
        </ol>
      </section>

      <div class="divider sm:divider-horizontal"></div>

      <section aria-labelledby="sinhala-converter-feedback">
        <h2
          id="sinhala-converter-feedback"
          class="font-serif text-lg font-bold"
        >
          发现转换问题？
        </h2>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          请选择反馈方式
        </p>
        <div class="flex sm:flex-col lg:flex-row gap-2 mt-1 mb-2">
          <a
            :href="githubIssueUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary"
          >
            <i class="ri-github-fill" aria-hidden="true"></i>
            GitHub Issue
            <i class="ri-external-link-line" aria-label="在新标签页中打开"></i>
          </a>
          <a :href="emailFeedbackUrl" class="btn">
            <i class="ri-mail-line" aria-hidden="true"></i>
            发送邮件
          </a>
        </div>
        <p
          class="mt-1 text-sm leading-relaxed text-pretty text-base-content/75"
        >
          当前文本不会自动上传，请按需粘贴可复现片段，并先移除敏感内容。
        </p>
      </section>
    </article>
</template>

<script setup>
const feedbackTemplate = `## 问题描述

请简要说明遇到的问题。

## 复现步骤

1.
2.
3.

## 输入示例

请粘贴已移除敏感内容、可复现问题的 Unicode 或 Legacy 文本。

## 实际结果

请说明转换后出现了什么。

## 预期结果

请说明正确的转换结果或字形应当是什么。

## 使用环境

- 转换方向：Unicode → Legacy / Legacy → Unicode
- 转换选项：
- 浏览器及版本：
- 操作系统：`;
const githubIssueUrl = `https://github.com/KoMoriSam/MoriWebsite/issues/new?${new URLSearchParams(
  {
    title: "[Bug] 僧伽罗字体编码转换器：",
    body: feedbackTemplate,
  },
)}`;
const emailFeedbackUrl = `mailto:wishwaluo@gmail.com?${new URLSearchParams({
  subject: "[问题反馈] 僧伽罗字体编码转换器",
  body: feedbackTemplate,
})}`;
</script>
