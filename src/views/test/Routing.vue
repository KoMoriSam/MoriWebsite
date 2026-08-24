<template>
  <TestPage section-id="routing">
    <TestCard title="路由与导航">
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
        当前路由: <code>{{ $route.fullPath }}</code>
      </p>
    </TestCard>
  </TestPage>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const router = useRouter();
const routes = computed(() =>
  router.options.routes
    .filter(
      (route) =>
        route.name &&
        route.name !== "test" &&
        !route.name.startsWith("NotFound"),
    )
    .map((route) => ({ name: route.name, path: route.path }))
    .filter((route) => !route.path.includes("*")),
);
</script>
