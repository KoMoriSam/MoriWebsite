<template>
  <ContentPage
    eyebrow="Minecraft Server Status Checker"
    title="Minecraft 服务器状态"
    description="查询 Java 版或基岩版服务器的在线状态与基础信息。"
  >
    <ServerInfo />
  </ContentPage>
</template>

<script setup>
import ContentPage from "@/components/layout/ContentPage.vue";
import ServerInfo from "@/components/ServerInfo.vue";
</script>
