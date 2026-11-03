<template>
  <ContentPage
    eyebrow="Tool List"
    :title="translate('tools.title')"
    :description="translate('tools.description')"
    :metas-label="translate('tools.info')"
  >
    <template #meta>
      <span class="inline-flex items-center gap-1.5">
        <i class="ri-tools-line" aria-hidden="true"></i>
        {{ translate("tools.count", { count: TOOLS.length }) }}
      </span>
    </template>
    <section
      class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6"
      :aria-label="translate('tools.available')"
    >
      <CatalogCard
        v-for="tool in TOOLS"
        :key="tool.name"
        :to="tool.to"
        :title="translate(tool.titleKey)"
        :description="translate(tool.descriptionKey)"
        :icon="tool.icon"
        :cover="tool.cover"
        cover-class="min-h-44 flex-1 sm:min-h-56"
        compact-on-mobile
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
            <span class="min-w-0 break-words">{{
              translate(tool.categoryKey)
            }}</span>
          </span>
        </template>
      </CatalogCard>
    </section>
  </ContentPage>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { t: translate } = useLocale();
import { TOOLS } from "@/constants/tools";

import ContentPage from "@/components/layout/ContentPage.vue";
import CatalogCard from "@/components/interaction/navigation/CatalogCard.vue";
</script>
