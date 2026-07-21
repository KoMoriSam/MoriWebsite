<template>
  <main
    class="flex-1 flex flex-col md:flex-row mx-12 my-12 items-start md:items-center justify-center md:justify-evenly gap-12"
  >
    <figure class="relative m-0 p-0" @click="onHandleClick">
      <div
        v-show="!imageLoaded"
        class="skeleton absolute inset-0 h-52 lg:w-52 lg:h-auto lg:basis-3xs rounded-lg z-10"
      ></div>
      <img
        v-fade-in
        :src="imageSrc"
        :alt="imageAlt"
        class="h-52 lg:w-52 lg:h-auto lg:basis-3xs object-cover rounded-lg z-0"
        @load="handleImageLoad"
      />
    </figure>
    <div class="divider md:divider-horizontal m-0 p-0"></div>
    <section class="prose lg:prose-xl lg:basis-3xl">
      <h2 class="font-serif">{{ title }}</h2>
      <p>{{ description }}</p>
      <slot></slot>
    </section>
    <ToTop />
  </main>
  <FootBar />
</template>

<script setup>
import { ref } from "vue";

import { useImageLoad } from "@/composables/useImageLoad";

import FootBar from "@/components/layout/FootBar.vue";
import ToTop from "@/components/base/ToTop.vue";

defineProps({
  imageSrc: {
    type: String,
    required: false,
  },
  imageAlt: {
    type: String,
    default: "Image",
  },
  title: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
});

const { imageLoaded, handleImageLoad } = useImageLoad();

import { TOAST_ICONS } from "@/constants/toast";
import { EASTER_EGGS } from "@/constants/easter";

import { useToast } from "@/composables/useToast";
const toast = useToast();

import { useClickLimit } from "@/composables/useClickLimit";
const { handleClick } = useClickLimit({
  maxClicks: 10,
});

const randomContent = ref("");
const showRandomContent = () => {
  randomContent.value =
    EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
  toast.add(randomContent.value, {
    icon: TOAST_ICONS.star,
    duration: 1500,
    position: "center",
  });
};

// 点击事件
const onHandleClick = () => {
  handleClick(showRandomContent);
};
</script>
