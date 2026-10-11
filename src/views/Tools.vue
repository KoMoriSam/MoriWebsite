<template>
  <ContentPage
    eyebrow="Tool List"
    :title="translate('pages.home.tools')"
    :description="translate('pages.tools.chooseAToolToOpenItsPageBookmarkOrShare')"
  >
    <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6" :aria-label="translate('pages.tools.availableTools')">
      <CatalogCard
        v-for="tool in tools"
        :key="tool.name"
        :to="tool.to"
        :title="tool.title"
        :description="tool.description"
        :icon="tool.icon"
        :cover="tool.cover"
        :action="translate('pages.tools.openTool')"
      >
        <template #tags="{ coverLoaded }">
          <span
            class="badge badge-sm h-auto min-h-5 max-w-full py-0.5 transition-colors duration-300 motion-reduce:transition-none"
            :class="coverLoaded ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm' : 'badge-primary badge-soft'"
          >
            <span class="min-w-0 break-words">{{ tool.category }}</span>
          </span>
        </template>
      </CatalogCard>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import ContentPage from "@/components/layout/ContentPage.vue";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";

const tools = [
  {
    name: "image-converter",
    get title() { return translate('pages.home.imageConverter'); },
    get description() { return translate('pages.tools.batchConvertImagesInYourBrowserWithCompressionResizingAnimation'); },
    get category() { return translate('pages.tools.imageProcessing'); },
    icon: "ri-image-edit-line",
    to: { name: "image-converter" },
  },
  {
    name: "server-status",
    get title() { return translate('pages.tools.minecraftServerStatus'); },
    get description() { return translate('pages.app.checkTheStatusAndDetailsOfJavaOrBedrockMinecraft'); },
    get category() { return translate('pages.tools.serverLookup'); },
    icon: "ri-server-line",
    to: { name: "server-status" },
  },
  {
    name: "sinhala-font-converter",
    get title() { return translate('pages.home.sinhalaFontEncodingConverter'); },
    get description() { return translate('pages.app.convertBetweenStandardUnicodeAndAsciiLegacyFontEncodings'); },
    get category() { return translate('pages.tools.textEncodingConversion'); },
    icon: "ri-code-s-slash-line",
    to: { name: "sinhala-font-converter" },
  },
];
</script>
