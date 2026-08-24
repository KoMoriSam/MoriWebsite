<template>
  <TestPage section-id="page-layout">
    <section title="ContentPage 内容页">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p class="max-w-3xl text-sm leading-relaxed text-base-content/70">
            当前页面就是通用布局组件的完整实例；面包屑由当前路由自动生成，眉题、标题、说明与徽章区沿用具名入口，正文继续保留自由组合能力。
          </p>
          <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div class="rounded-box bg-base-200 p-3">
              <dt class="text-xs text-base-content/55">内容宽度</dt>
              <dd class="mt-1 font-mono font-semibold">max-w-7xl</dd>
            </div>
            <div class="rounded-box bg-base-200 p-3">
              <dt class="text-xs text-base-content/55">标题层级</dt>
              <dd class="mt-1 font-semibold">语义化 h1</dd>
            </div>
            <div class="rounded-box bg-base-200 p-3">
              <dt class="text-xs text-base-content/55">响应式正文操作</dt>
              <dd class="mt-1 font-semibold">自动换行与对齐</dd>
            </div>
          </dl>
        </div>
        <div class="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          <router-link class="btn btn-sm btn-outline" to="/blog">
            文章列表
          </router-link>
          <router-link class="btn btn-sm btn-outline" to="/changelog">
            更新日志
          </router-link>
          <router-link class="btn btn-sm btn-outline" to="/licenses">
            许可声明
          </router-link>
          <router-link class="btn btn-sm btn-outline" to="/tools">
            工具集
          </router-link>
        </div>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import TestPage from "./_TestPage.vue";
</script>
