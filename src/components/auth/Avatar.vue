<template>
  <div
    class="avatar avatar-placeholder shrink-0"
    :aria-label="name || translate('auth.guest')"
  >
    <div
      class="bg-base-200 text-base-content/60 flex size-9 items-center justify-center overflow-hidden rounded-full"
    >
      <img
        v-if="src && !failed"
        :src="src"
        :alt="name"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span
        v-else-if="initial"
        class="text-lg font-serif font-black"
        aria-hidden="true"
        >{{ initial }}</span
      >
      <i v-else class="ri-user-line text-xl" aria-hidden="true"></i>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { useLocale } from "@/i18n";
const { t: translate } = useLocale();
const props = defineProps({
  src: { type: String, default: "" },
  name: { type: String, default: "" },
});
const failed = ref(false);
const initial = computed(() => {
  const name = props.name.trim();
  if (!name) return "";
  const first =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
          .segment(name)
          [Symbol.iterator]()
          .next().value.segment
      : Array.from(name)[0];
  return first.toLocaleUpperCase();
});
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
