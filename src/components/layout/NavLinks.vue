<template>
  <router-link
    v-for="link in navLinks"
    :key="link.to.name"
    :to="link.to"
    class="tab flex-nowrap whitespace-nowrap"
    :class="isLinkActive(link) ? 'tab-active font-bold' : ''"
    :aria-current="isLinkActive(link) ? 'page' : undefined"
  >
    <i
      class="shrink-0 text-lg font-normal"
      :class="`${link.icon}-${isLinkActive(link) ? 'fill' : 'line'}`"
    >
    </i>
    {{ localizeText(link.name) }}
  </router-link>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { text: localizeText } = useLocale();
import { useNavigationTarget } from "@/composables/useNavigationFeedback";
import { NAV_LINKS, isNavigationLinkActive } from "@/constants/navigation.js";

const navigationRoute = useNavigationTarget();

// SSG 直达文章页会匹配无 name 的具体文章路由。
// 使用 navName 标记它所属的一级导航，避免给所有文章路由设置重复 name。
const isLinkActive = (link) =>
  isNavigationLinkActive(navigationRoute.value, link);

const navLinks = NAV_LINKS;
</script>
