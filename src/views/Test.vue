<template>
  <ContentPage
    eyebrow="Development Diagnostics"
    title="开发测试面板"
    description="选择测试项进入独立页面，验证基础组件、组合式函数与数据服务在当前设计系统中的行为。"
  >
    <template #meta>
      <span class="inline-flex items-center gap-1">
        <i class="ri-test-tube-line"></i>
        仅开发环境
      </span>
      <span class="inline-flex items-center gap-1">
        <i class="ri-list-check-3"></i>
        {{ TEST_SECTIONS.length }} 个检查项
      </span>
    </template>

    <section
      class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6"
      aria-label="测试项目"
    >
      <CatalogCard
        v-for="item in TEST_SECTIONS"
        :key="item.id"
        :to="{ name: item.id }"
        :title="item.title"
        :description="item.description"
        :cover="item.cover"
        icon="ri-test-tube-line"
        action="打开测试"
      >
        <template #tags="{ coverLoaded }">
          <span
            class="badge badge-sm h-auto min-h-5 max-w-full py-0.5 transition-colors duration-300 motion-reduce:transition-none"
            :class="coverLoaded ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm' : 'badge-primary badge-soft'"
          >
            <span class="min-w-0 break-words">{{ item.label }}</span>
          </span>
        </template>
        <template #meta>
          <code class="min-w-0 max-w-full break-all text-xs text-base-content/40">
            /test/{{ item.id }}
          </code>
        </template>
      </CatalogCard>
    </section>
  </ContentPage>
</template>

<script setup>
import { TEST_SECTIONS } from "@/constants/test-sections";
import ContentPage from "@/components/layout/ContentPage.vue";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";
</script>
