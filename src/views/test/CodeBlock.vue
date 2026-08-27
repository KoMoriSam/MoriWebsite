<template>
  <TestPage section-id="codeblock">
    <section class="min-w-0">
      <p class="mb-3 text-sm text-base-content/60">
        第一段包含跨行高亮与超长行；窄屏时应只滚动代码区域，行号保持可见。
      </p>
      <CodeBlock class="my-2" language="typescript" :code="sampleCode" />
      <p class="mt-6 mb-3 text-sm text-base-content/60">
        第二段不声明语言，用于验证纯文本回退和复制内容。
      </p>
      <CodeBlock
        class="my-2"
        language=""
        code="Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione."
      />
    </section>
  </TestPage>
</template>

<script setup>
import CodeBlock from "@/components/markdown/CodeBlock.vue";
import TestPage from "./_TestPage.vue";

const sampleCode = `interface Test {
  name: string;
  value: number;
}

const t: Test = { name: "hello", value: 42 };
const longLine = "https://komori.cc/test/codeblock?feature=line-number&layout=single-scroll-container&fallback=plaintext&copy=legacy-clipboard";
console.log(t);`;
</script>
