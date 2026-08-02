<template>
  <header class="navbar bg-base-100 shadow-sm">
    <nav class="navbar-start">
      <a
        @click="router.push('/')"
        class="max-lg:hidden lg:btn lg:btn-ghost lg:text-xl"
      >
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <MobileNav />
    </nav>
    <client-only>
      <nav class="navbar-center">
        <a @click="router.push('/')" class="lg:hidden btn btn-ghost text-xl">
          <img
            src="/assets/images/icons/logo.webp"
            alt="KoMoriSam"
            class="h-8"
          />
        </a>
        <div class="hidden items-center lg:flex">
          <ul class="menu menu-horizontal px-1">
            <NavLinks />
          </ul>
          <ProjectMenu />
        </div>
      </nav>
      <nav class="navbar-end">
        <GlobalSearch />
        <ThemeController />
      </nav>
    </client-only>
  </header>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

import NavLinks from "@/components/layout/NavLinks.vue";
import MobileNav from "@/components/layout/MobileNav.vue";
import ProjectMenu from "@/components/layout/ProjectMenu.vue";
import GlobalSearch from "@/components/layout/GlobalSearch.vue";
import ThemeController from "@/components/ui/theme/ThemeController.vue";
</script>
