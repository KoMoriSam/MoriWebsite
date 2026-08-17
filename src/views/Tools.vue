<template>
  <ContentPage
    eyebrow=" Tool List"
    title="工具集"
    description="选择一个工具进入独立页面，地址可以直接收藏或分享。"
  >
    <section class="grid gap-4 md:grid-cols-2" aria-label="可用工具">
      <router-link
        v-for="tool in tools"
        :key="tool.name"
        :to="tool.to"
        class="card card-border group bg-base-100 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-base-content/30 hover:bg-base-200/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
      >
        <section class="card-body gap-4">
          <div class="flex items-start justify-between gap-4">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-box bg-base-200 text-xl text-base-content"
              aria-hidden="true"
            >
              <i :class="tool.icon"></i>
            </span>
            <i
              class="ri-arrow-right-up-line text-xl text-base-content/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            ></i>
          </div>

          <div>
            <h2 class="card-title font-serif font-bold">{{ tool.title }}</h2>
            <p class="mt-2 text-pretty text-sm leading-6 text-base-content/65">
              {{ tool.description }}
            </p>
          </div>

          <div class="card-actions mt-auto items-center justify-between">
            <span class="badge badge-outline badge-sm">{{
              tool.category
            }}</span>
            <span class="text-sm font-medium">打开工具</span>
          </div>
        </section>
      </router-link>
    </section>
  </ContentPage>
</template>

<script setup>
import ContentPage from "@/components/layout/ContentPage.vue";

const tools = [
  {
    name: "server-status",
    title: "Minecraft 服务器状态",
    description: "查询 Java 版或基岩版 Minecraft 服务器的在线状态与基础信息。",
    category: "服务器查询",
    icon: "ri-server-line",
    to: { name: "server-status" },
  },
  {
    name: "sinhala-font-converter",
    title: "僧伽罗字体编码转换器",
    description: "在标准 Unicode 与 ASCII 传统字体编码之间双向转换。",
    category: "文本编码转换",
    icon: "ri-code-s-slash-line",
    to: { name: "sinhala-font-converter" },
  },
];
</script>
