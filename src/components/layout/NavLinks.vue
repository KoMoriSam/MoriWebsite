<template>
  <li v-for="link in navLinks" :key="link.routeName">
    <router-link
      :to="link.to"
      class="btn m-1 lg:m-1.5"
      :class="route.name === link.to.name ? 'btn-primary' : 'btn-ghost'"
    >
      <i
        class="lg:text-xl font-normal"
        :class="`${link.icon}-${route.name === link.to.name ? 'fill' : 'line'}`"
      >
      </i>
      {{ link.name }}
    </router-link>
  </li>
</template>

<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

import { computed } from "vue";

const navLinks = computed(() => [
  {
    name: "主页",
    icon: "ri-home-9",
    to: { name: "home" },
  },
  {
    name: "博客",
    icon: "ri-article",
    to: { name: "blog" },
  },
  {
    name: "小说",
    icon: "ri-book-3",
    to: { name: "novel" },
  },
  {
    name: "工具",
    icon: "ri-pencil-ruler-2",
    to: { name: "tools" },
  },
]);
</script>
