<template>
  <TestPage section-id="routing">
    <section title="路由与导航">
      <div class="mb-3 flex flex-wrap gap-2">
        <router-link
          v-for="item in routes"
          :key="item.path"
          class="btn btn-sm btn-outline"
          :to="item.path"
        >
          {{ item.name }}
        </router-link>
      </div>
      <p class="text-xs opacity-50">
        当前路由: <code>{{ $route.fullPath }}</code> · 可直接访问的静态路由
        {{ routes.length }} 个
      </p>
    </section>
  </TestPage>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

import TestPage from "./_TestPage.vue";

const router = useRouter();
const routes = computed(() =>
  router
    .getRoutes()
    .filter(
      (route) =>
        typeof route.name === "string" &&
        route.name !== "test" &&
        !route.name.startsWith("NotFound") &&
        !route.path.startsWith("/test/") &&
        !route.path.includes(":"),
    )
    .map((route) => ({ name: route.name, path: route.path }))
    .filter((route) => !route.path.includes("*"))
    .sort((left, right) => left.path.localeCompare(right.path, "zh-CN")),
);
</script>
