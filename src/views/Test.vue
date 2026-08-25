<template>
  <ContentPage
    eyebrow="Development Diagnostics"
    title="开发测试面板"
    description="选择测试项进入独立页面，验证基础组件、组合式函数与数据服务在当前设计系统中的行为。"
  >
    <template #badges>
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
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="测试项目"
    >
      <router-link
        v-for="item in TEST_SECTIONS"
        :key="item.id"
        :to="{ name: item.id }"
        class="card card-border group min-w-0 bg-base-100 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-base-content/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-base-content motion-reduce:transform-none motion-reduce:transition-none"
      >
        <div class="card-body gap-3 p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-base-content/50">
                {{ item.label }}
              </p>
              <h2 class="card-title mt-1 font-serif text-lg">
                {{ item.title }}
              </h2>
            </div>
            <i
              class="ri-arrow-right-up-line mt-0.5 shrink-0 text-lg text-base-content/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            ></i>
          </div>
          <p class="text-pretty text-sm leading-relaxed text-base-content/65">
            {{ item.description }}
          </p>
          <code class="mt-auto text-xs text-base-content/40">
            /test/{{ item.id }}
          </code>
        </div>
      </router-link>
    </section>
  </ContentPage>
  <FootBar />
</template>

<script setup>
import { TEST_SECTIONS } from "@/constants/test-sections";
import ContentPage from "@/components/layout/ContentPage.vue";
import FootBar from "@/components/layout/FootBar.vue";
</script>
