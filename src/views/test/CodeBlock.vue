<template>
  <TestPage section-id="codeblock">
    <section class="min-w-0">
      <section class="code-block my-2">
        <CodeBlock language="typescript" :code="sampleCode" />
      </section>
      <section class="code-block my-2">
        <CodeBlock
          language=""
          code="Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione."
        />
      </section>
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
console.log(t);`;
</script>
