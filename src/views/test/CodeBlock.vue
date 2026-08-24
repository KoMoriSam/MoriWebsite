<template>
  <TestPage section-id="codeblock">
    <TestCard title="CodeBlock（带复制）">
      <section class="code-block my-2">
        <CodeBlock language="typescript" :code="sampleCode" />
      </section>
      <section class="code-block my-2">
        <CodeBlock
          language=""
          code="Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione."
        />
      </section>
    </TestCard>
  </TestPage>
</template>

<script setup>
import CodeBlock from "@/components/markdown/CodeBlock.vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const sampleCode = `interface Test {
  name: string;
  value: number;
}

const t: Test = { name: "hello", value: 42 };
console.log(t);`;
</script>
