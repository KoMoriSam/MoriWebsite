<template>
  <header class="navbar bg-base-100 shadow-sm">
    <nav class="navbar-start">
      <a
        @click="router.push('/')"
        class="max-lg:hidden lg:btn lg:btn-ghost lg:text-xl"
      >
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
          <i class="fill-current ri-menu-line text-base lg:text-xl"></i>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content bg-base-200 rounded-box z-20 mt-5 w-max p-0 shadow"
        >
          <NavLinks />
        </ul>
      </div>
    </nav>
    <nav class="navbar-center">
      <a @click="router.push('/')" class="lg:hidden btn btn-ghost text-xl">
        <img src="/assets/images/icons/logo.webp" alt="KoMoriSam" class="h-8" />
      </a>
      <div class="hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <NavLinks />
        </ul>
      </div>
    </nav>
    <nav class="navbar-end">
      <ThemeController />
    </nav>
  </header>
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

import NavLinks from "@/components/layout/NavLinks.vue";
import ThemeController from "@/components/ui/theme/ThemeController.vue";
</script>
