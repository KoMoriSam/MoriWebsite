<template>
  <IllustratedPage
    :imageSrc="`/assets/images/animates/unknown.gif`"
    imageAlt="me!"
    title="Ah Oh!"
    description="404 Not Found :("
  >
    <section
      class="flex flex-col md:flex-row gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-3 lg:mt-4"
    >
      <button class="btn btn-primary" @click="route.push('/')">
        <i class="ri-home-9-fill font-normal"></i>回到主页
      </button>
      <button class="btn" @click="route.push('/blog')">
        <i class="ri-article-line font-normal"></i>读读文章
      </button>
      <button class="btn" @click="route.push('/novel')">
        <i class="ri-book-line font-normal"></i>看看小说
      </button>
    </section>
  </IllustratedPage>
</template>

<script setup>
import IllustratedPage from "@/components/layout/IllustratedPage.vue";

import { useRouter } from "vue-router";
const route = useRouter();
</script>
