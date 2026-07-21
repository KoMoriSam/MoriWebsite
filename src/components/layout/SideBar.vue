<template>
  <section class="drawer">
    <input :id="drawerId" type="checkbox" class="drawer-toggle" />
    <section
      class="drawer-content flex flex-wrap h-full min-w-0 w-full max-w-full items-start justify-center gap-4 lg:pr-16 pb-16 lg:pb-12"
    >
      <slot name="content"></slot>
    </section>
    <aside class="drawer-side">
      <label
        :for="drawerId"
        aria-label="关闭侧边栏"
        class="drawer-overlay"
      ></label>
      <section
        class="menu bg-base-200 text-base-content min-h-full w-80 items-stretch p-4 md:w-96"
      >
        <aside
          class="mb-12 flex w-full min-w-0 flex-1 flex-col lg:sticky lg:top-12 lg:mb-0"
        >
          <slot name="aside"></slot>
        </aside>
      </section>
    </aside>
  </section>
</template>

<script setup>
defineProps({
  drawerId: {
    type: String,
    default: "sidebar",
  },
});
</script>
