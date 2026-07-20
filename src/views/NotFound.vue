<template>
  <BasePage
    :imageSrc="`/assets/images/profile/me4.webp`"
    imageAlt="me!"
    title="Ah Oh!"
    description="404 Not Found :("
  >
    <section class="join md:join-vertical mt-2 lg:mt-4">
      <button
        class="btn btn-primary btn-soft join-item"
        @click="route.push('/')"
      >
        <i class="ri-home-9-fill"></i>回到主页
      </button>
      <button
        class="btn btn-info btn-soft join-item"
        @click="route.push('/blog')"
      >
        <i class="ri-article-fill"></i>读读文章
      </button>
      <button
        class="btn btn-accent btn-soft join-item"
        @click="route.push('/novel')"
      >
        <i class="ri-book-fill"></i>看看小说
      </button>
    </section>
  </BasePage>
</template>

<script setup>
import BasePage from "@/components/layout/BasePage.vue";

import { useRouter } from "vue-router";
const route = useRouter();
</script>
