<template>
  <div
    v-if="isLoading"
    class="pointer-events-none fixed inset-x-0 top-0 z-80 h-1 animate-pulse bg-primary motion-reduce:animate-none"
    aria-hidden="true"
  />
</template>

<script setup>
import { useNavigationFeedback } from "@/composables/useNavigationFeedback";
import { useNavigationToast } from "@/composables/useNavigationToast";

const feedback = useNavigationFeedback();
const { isLoading } = feedback;
useNavigationToast(feedback);
</script>
