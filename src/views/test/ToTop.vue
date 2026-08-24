<template>
  <TestPage section-id="to-top">
    <section title="浮动按钮与回到顶部">
      <div class="flex min-h-[calc(100vh+24rem)] flex-col">
        <p class="text-sm text-base-content/60">
          向下滚动超过 300px 后，右下角应出现浮动按钮；点击后应返回页面顶部。
        </p>
        <div
          class="mt-auto rounded-box border border-dashed border-base-300 bg-base-200 p-6 text-center text-sm text-base-content/55"
        >
          已到达测试页底部
        </div>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import TestPage from "./_TestPage.vue";
</script>
