<template>
  <li v-for="link in navLinks" :key="link.to.name">
    <router-link
      :to="link.to"
      class="btn m-1 lg:m-1.5"
      :class="isLinkActive(link) ? 'btn-primary' : 'btn-ghost'"
    >
      <i
        class="lg:text-xl"
        :class="`${link.icon}-${isLinkActive(link) ? 'fill' : 'line'}`"
      >
      </i>
      {{ link.name }}
    </router-link>
  </li>
</template>

<script setup>
import { useRoute } from "vue-router";
import { NAV_LINKS, isNavigationLinkActive } from "@/constants/navigation.js";

const route = useRoute();

// SSG 直达文章页会匹配无 name 的具体文章路由。
// 使用 navName 标记它所属的一级导航，避免给所有文章路由设置重复 name。
const isLinkActive = (link) => isNavigationLinkActive(route, link);

const navLinks = NAV_LINKS;
</script>
