<template>
  <article
    class="card card-border min-w-0 bg-base-100 transition-[border-color,box-shadow] duration-200 hover:border-base-content/25 hover:shadow-sm motion-reduce:transition-none"
  >
    <div class="card-body gap-4 p-5 sm:p-6">
      <h2 class="card-title font-serif text-xl">{{ title }}</h2>
      <div class="min-w-0">
        <slot></slot>
      </div>
    </div>
  </article>
</template>

<script setup>
defineProps({ title: String });
</script>
