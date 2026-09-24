<template>
  <ContentPage title="Minecraft 服务器状态" metas-label="工具信息">
    <template #meta>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-gamepad-line" aria-hidden="true"></i>
        Java / Bedrock
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-pulse-line" aria-hidden="true"></i>
        实时查询
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-dashboard-3-line" aria-hidden="true"></i>
        状态 · 人数 · 延迟
      </span>
    </template>

    <ServerInfo />
  </ContentPage>
</template>

<script setup>
import ContentPage from "@/components/layout/ContentPage.vue";
import ServerInfo from "@/components/ServerInfo.vue";
</script>
