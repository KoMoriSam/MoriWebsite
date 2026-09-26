<template>
  <ContentPage :title="translate('pages.tools.minecraftServerStatus')" :metas-label="translate('tools.imageConverter.toolInformation')">
    <template #meta>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-gamepad-line" aria-hidden="true"></i>
        Java / Bedrock
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-pulse-line" aria-hidden="true"></i>
        {{ translate('tools.serverStatus.liveLookup') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-dashboard-3-line" aria-hidden="true"></i>
        {{ translate('tools.serverStatus.statusPlayersLatency') }}
      </span>
    </template>

    <ServerInfo />
  </ContentPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import ContentPage from "@/components/layout/ContentPage.vue";
import ServerInfo from "@/components/ServerInfo.vue";
</script>
