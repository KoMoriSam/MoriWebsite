<template>
  <main
    class="mx-auto w-full max-w-7xl p-6 sm:px-8 lg:px-10 lg:py-12"
    :aria-labelledby="showHeader ? titleId : undefined"
  >
    <header v-if="showHeader" class="mb-6">
      <section
        class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <hgroup class="max-w-3xl min-w-0">
          <span
            v-if="eyebrow || $slots.eyebrow"
            class="mb-2 text-sm font-semibold tracking-wide text-primary uppercase"
          >
            <slot name="eyebrow">{{ eyebrow }}</slot>
          </span>

          <h1 :id="titleId" class="font-serif text-3xl font-bold md:text-4xl">
            <slot name="title">{{ title }}</slot>
          </h1>

          <p
            v-if="description || $slots.description"
            class="mt-3 text-pretty text-base-content/70"
          >
            <slot name="description">{{ description }}</slot>
          </p>
        </hgroup>

        <aside
          v-if="$slots.actions"
          class="flex max-w-full flex-wrap items-center gap-2 md:max-w-md md:justify-end"
        >
          <slot name="actions"></slot>
        </aside>
      </section>
    </header>

    <slot></slot>
  </main>
</template>

<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  titleId: {
    type: String,
    default: "page-title",
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
});
</script>
