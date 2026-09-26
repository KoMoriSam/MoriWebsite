<template>
  <IllustratedPage
    :imageSrc="`/assets/images/animates/unknown.gif`"
    imageAlt="me!"
    :title="translate('common.sections.notFoundTitle')"
    :description="translate('common.sections.notFoundDescription')"
  >
    <section
      class="flex flex-col md:flex-row gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-3 lg:mt-4"
    >
      <button class="btn btn-primary" @click="route.push('/')">
        <i class="ri-home-9-fill"></i>{{ translate('pages.notFound.goHome') }}
      </button>
      <button class="btn" @click="route.push('/blog')">
        <i class="ri-article-line"></i>{{ translate('pages.notFound.readArticles') }}
      </button>
      <button class="btn" @click="route.push('/novel')">
        <i class="ri-book-line"></i>{{ translate('pages.home.readTheNovel') }}
      </button>
    </section>
  </IllustratedPage>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import IllustratedPage from "@/components/layout/IllustratedPage.vue";

import { useRouter } from "vue-router";
const route = useRouter();
</script>
