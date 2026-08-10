<template>
  <SideBar
    v-if="drawer"
    :drawer-id="drawerId"
    class="h-full min-w-0 w-full max-w-full"
  >
    <template #content>
      <slot />
    </template>
    <template v-if="$slots.drawer" #aside>
      <slot name="drawer" />
    </template>
  </SideBar>

  <template v-else>
    <slot />
  </template>
</template>

<script setup>
import SideBar from "@/components/layout/SideBar.vue";

defineProps({
  drawer: {
    type: Boolean,
    default: false,
  },
  drawerId: {
    type: String,
    default: "reader-sidebar",
  },
});
</script>
