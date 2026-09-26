<template>
  <ContentPage
    :eyebrow="translate('common.sections.toolList')"
    :title="translate('pages.home.tools')"
    :description="translate('pages.tools.chooseAToolToOpenItsPageBookmarkOrShare')"
  >
    <section class="grid gap-4 md:grid-cols-2" :aria-label="translate('pages.tools.availableTools')">
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
            <span class="text-sm font-medium">{{ translate('pages.tools.openTool') }}</span>
          </div>
        </section>
      </router-link>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import ContentPage from "@/components/layout/ContentPage.vue";

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
