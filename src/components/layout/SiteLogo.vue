<template>
  <router-link
    to="/"
    class="btn btn-ghost min-w-0 max-w-full flex-nowrap gap-0 p-1 sm:gap-0 sm:p-2"
  >
    <img
      src="/favicon.webp"
      alt=""
      width="512"
      height="512"
      class="size-6 shrink-0 object-contain hidden lg:inline-block"
    />
    <div class="lg:divider divider-horizontal mx-0"></div>
    <img
      v-bind="getImageAttrs(titleSrc, '(min-width: 640px) 96px, 84px')"
      alt="远方之森"
      @error="resetTitle"
      class="h-9 lg:h-6 min-w-0 object-contain"
    />
  </router-link>
</template>

<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useSiteLogo } from "@/composables/layout/useSiteLogo";

const { titleSrc, resetTitle } = useSiteLogo();
</script>
