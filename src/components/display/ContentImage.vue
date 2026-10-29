<template>
  <div class="content-image relative overflow-hidden bg-base-200">
    <img
      v-if="src && !failed"
      v-bind="imageAttrs"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      class="absolute inset-0 size-full"
      :class="[contain ? 'object-contain' : 'object-cover', zoom ? 'transition-[opacity,transform,scale] duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none' : '']"
      @error="handleError"
    />
    <div v-else class="flex size-full items-center justify-center p-5 font-serif text-xl text-base-content/60">
      <slot>{{ alt }}</slot>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { getImageAttrs, restoreOriginalImage } from '@/utils/images/responsive-images';

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  sizes: { type: String, default: '(min-width: 1280px) 600px, (min-width: 640px) 50vw, calc(100vw - 3rem)' },
  width: { type: Number, default: 1200 },
  height: { type: Number, default: 800 },
  contain: Boolean,
  eager: Boolean,
  zoom: Boolean,
});
const failed = ref(false);
const imageAttrs = computed(() => {
  const attrs = getImageAttrs(props.src, props.sizes);
  delete attrs.onError;
  return attrs;
});
watch(() => props.src, () => { failed.value = false; });
function handleError(event) {
  const image = event.currentTarget;
  const original = image.getAttribute('data-original-src');
  if (original && image.getAttribute('src') !== original) {
    restoreOriginalImage(event);
    return;
  }
  failed.value = true;
}
</script>
