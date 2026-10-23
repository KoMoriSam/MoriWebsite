<template>
  <ContentPage
    eyebrow="Tool List"
    :title="translate('tools.title')"
    :description="
      translate('tools.description')
    "
    :metas-label="translate('tools.info')"
  >
    <template #meta>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-tools-line" aria-hidden="true"></i>
        {{ translate('tools.count', { count: tools.length }) }}
      </span>
    </template>
    <section
      class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6"
      :aria-label="translate('tools.available')"
    >
      <CatalogCard
        v-for="tool in tools"
        :key="tool.name"
        :to="tool.to"
        :title="tool.title"
        :description="tool.description"
        :icon="tool.icon"
        :cover="tool.cover"
        :action="translate('tools.open')"
      >
        <template #tags="{ coverLoaded }">
          <span
            class="badge badge-sm h-auto min-h-5 max-w-full py-0.5 transition-colors duration-300 motion-reduce:transition-none"
            :class="
              coverLoaded
                ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm'
                : 'badge-primary badge-soft'
            "
          >
            <span class="min-w-0 break-words">{{ tool.category }}</span>
          </span>
        </template>
      </CatalogCard>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { t: translate } = useLocale();

import ContentPage from "@/components/layout/ContentPage.vue";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";

const tools = [
  {
    name: "image-converter",
    get title() {
      return translate("image.title");
    },
    get description() {
      return translate(
        "tools.imageDescription",
      );
    },
    get category() {
      return translate("tools.imageProcessing");
    },
    icon: "ri-image-edit-line",
    cover: "/assets/images/banners/image-converter.webp",
    to: { name: "image-converter" },
  },
  {
    name: "server-status",
    get title() {
      return translate("server.title");
    },
    get description() {
      return translate(
        "site.serverDescription",
      );
    },
    get category() {
      return translate("tools.serverLookup");
    },
    icon: "ri-server-line",
    cover: "/assets/images/banners/server-status.webp",
    to: { name: "server-status" },
  },
  {
    name: "sinhala-font-converter",
    get title() {
      return translate("sinhala.title");
    },
    get description() {
      return translate(
        "site.sinhalaDescription",
      );
    },
    get category() {
      return translate("tools.textEncoding");
    },
    icon: "ri-code-s-slash-line",
    cover: "/assets/images/banners/sinhala-font-converter.webp",
    to: { name: "sinhala-font-converter" },
  },
];
</script>
