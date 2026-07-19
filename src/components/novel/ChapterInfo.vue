<template>
  <section class="flex justify-between gap-2 w-full">
    <a
      :class="[
        'btn justify-start font-bold flex-2 gap-2 md:gap-4 truncate group',
        additionalClasses,
      ]"
      @click="onClick"
    >
      <span v-if="badge">
        <span class="badge badge-xs group-hover:badge-soft mr-2">
          {{ badge }}
        </span>
        {{ content }}
      </span>
      <i v-else class="ri-star-fill text-2xl md:text-lg"></i>
      <slot name="content"></slot>
    </a>
    <slot name="aside"></slot>
  </section>
</template>

<script setup>
defineProps({
  badge: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: false,
  },
  additionalClasses: {
    type: String,
    default: "",
  },
  onClick: {
    type: Function,
    default: null,
  },
});
</script>
