<template>
  <li v-for="link in navLinks" :key="link.to.name">
    <router-link
      :to="link.to"
      class="btn m-1 lg:m-1.5"
      :class="isLinkActive(link) ? 'btn-primary' : 'btn-ghost'"
    >
      <i
        class="lg:text-xl font-normal"
        :class="`${link.icon}-${isLinkActive(link) ? 'fill' : 'line'}`"
      >
      </i>
      {{ link.name }}
    </router-link>
  </li>
</template>

<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

// SSG 直达文章页会匹配无 name 的具体文章路由。
// 使用 navName 标记它所属的一级导航，避免给所有文章路由设置重复 name。
const isLinkActive = (link) =>
  route.matched.some(
    (record) => (record.meta.navName || record.name) === link.to.name,
  );

const navLinks = [
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
];
</script>
