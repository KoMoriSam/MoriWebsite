<template>
  <div
    ref="avatar"
    class="avatar avatar-placeholder shrink-0"
    :aria-label="name || translate('auth.guest')"
  >
    <div
      class="bg-base-200 text-base-content/60 flex size-9 items-center justify-center overflow-hidden rounded-full"
      :class="
        ring
          ? ringDashed
            ? 'outline-2 outline-dotted outline-offset-2'
            : 'ring-offset-base-100 ring-2 ring-offset-2'
          : ''
      "
      :style="{
        '--tw-ring-color': ringColor,
        outlineColor: ring && ringDashed ? ringColor : undefined,
        color: !src || failed ? ringColor : undefined,
      }"
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
        class="select-none text-lg font-serif font-black"
        aria-hidden="true"
        >{{ initial }}</span
      >
      <i v-else class="ri-user-line text-xl" aria-hidden="true"></i>
    </div>
  </div>
</template>
<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useLocale } from "@/i18n";
import { useThemeStore } from "@/stores/themeStore";
import {
  avatarThemeColor,
  getAvatarImageColor,
  getContrastingAvatarColor,
  playerAvatarColorsKey,
} from "@/utils/auth/avatar-color";
const { t: translate } = useLocale();
const themeStore = useThemeStore();
const playerColors = inject(playerAvatarColorsKey, null);
const props = defineProps({
  src: { type: String, default: "" },
  name: { type: String, default: "" },
  ring: Boolean,
  ringDashed: Boolean,
});
const failed = ref(false);
const imageColor = ref(null);
const avatar = ref(null);
const imageRingColor = ref(null);
const ringColor = computed(
  () => props.src && !failed.value && imageColor.value
    ? imageRingColor.value || imageColor.value
    : playerColors?.value.get(props.name) || avatarThemeColor(props.name),
);
function updateRingColor() {
  imageRingColor.value = props.src && props.ring && !failed.value && imageColor.value
    ? getContrastingAvatarColor(imageColor.value, avatar.value)
    : null;
}
watch([imageColor, () => props.src, () => props.ring, failed], updateRingColor, {
  flush: "post",
});
let themeObserver;
let darkMedia;
let themeFrame;
function scheduleRingColor() {
  cancelAnimationFrame(themeFrame);
  themeFrame = requestAnimationFrame(updateRingColor);
}
watch(() => themeStore.theme, scheduleRingColor, { flush: "post" });
onMounted(() => {
  updateRingColor();
  themeObserver = new MutationObserver(scheduleRingColor);
  for (let node = avatar.value.parentElement; node; node = node.parentElement) {
    themeObserver.observe(node, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
  }
  darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
  darkMedia.addEventListener("change", scheduleRingColor);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(themeFrame);
  themeObserver?.disconnect();
  darkMedia?.removeEventListener("change", scheduleRingColor);
});
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
watch(
  () => [props.src, props.ring, failed.value],
  async ([src, ring, failed], _, onCleanup) => {
    imageColor.value = null;
    if (!ring || !src || failed) return;
    let current = true;
    onCleanup(() => {
      current = false;
    });
    const color = await getAvatarImageColor(src);
    if (current) imageColor.value = color;
  },
  { immediate: true },
);
</script>
