<template>
  <nav
    ref="navigation"
    class="fixed top-[min(50dvh,calc(var(--footer-top,100dvh)-50dvh))] right-0 z-30 hidden -translate-y-1/2 md:right-1 md:block xl:right-3 2xl:right-6"
    :aria-label="label"
  >
    <ul class="flex flex-col">
      <template v-for="(section, index) in sections" :key="section.id">
      <li
        class="tooltip tooltip-left"
        :data-tip="sectionLabel(section)"
      >
        <a
          :href="`#${section.id}`"
          :aria-current="activeSection === section.id ? 'location' : undefined"
          class="group flex h-8 w-10 items-center justify-end px-2 focus-visible:rounded-field focus-visible:outline-2 focus-visible:outline-primary"
          @click.prevent="$emit('navigate', section.id)"
        >
          <span class="sr-only">{{ sectionLabel(section) }}</span>
          <span
            aria-hidden="true"
            class="relative block h-0.5 overflow-hidden rounded-full bg-base-content/25 transition-[width] duration-150 ease-out group-hover:bg-base-content/60 group-focus-visible:bg-base-content/60 motion-reduce:transition-none"
            :style="waveStyle(index)"
          >
            <span class="absolute inset-0 bg-primary opacity-(--wave-opacity) transition-opacity duration-150 ease-out motion-reduce:transition-none"></span>
          </span>
        </a>
      </li>
      <li
        v-if="index < sections.length - 1"
        aria-hidden="true"
        class="pointer-events-none flex h-8 flex-col items-end justify-between px-2"
      >
        <span
          v-for="tick in 3"
          :key="tick"
          class="relative block h-px overflow-hidden rounded-full bg-base-content/20 transition-[width] duration-150 ease-out motion-reduce:transition-none"
          :style="waveStyle(index + tick / 4)"
        >
          <span
            class="absolute inset-0 bg-primary opacity-(--wave-opacity) transition-opacity duration-150 ease-out motion-reduce:transition-none"
          ></span>
        </span>
      </li>
      </template>
    </ul>
  </nav>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "@/i18n";

const props = defineProps({
  label: { type: String, required: true },
  sections: { type: Array, required: true },
  activeSection: { type: String, required: true },
  sectionPosition: { type: Number, default: 0 },
  sectionSpan: { type: Number, default: 0 },
});
defineEmits(["navigate"]);
const { t: translate } = useLocale();
const navigation = ref(null);
let dispose = () => {};

onMounted(() => {
  const footer = document.querySelector("[data-site-footer]");
  if (!footer) return;
  let frame = 0;
  function updatePosition() {
    frame = 0;
    navigation.value?.style.setProperty("--footer-top", `${footer.getBoundingClientRect().top}px`);
  }
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(updatePosition);
  }
  const observer = new ResizeObserver(scheduleUpdate);
  observer.observe(document.body);
  observer.observe(footer);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  updatePosition();
  dispose = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
  };
});
onBeforeUnmount(() => dispose());

const sectionLabel = (section) => section.title ?? translate(section.titleKey);
function waveStyle(position) {
  const center = props.sectionPosition + props.sectionSpan / 2;
  const spread = 0.32 * (1 + props.sectionSpan);
  const distance = (position - center) / spread;
  const strength = Math.exp(-0.5 * distance * distance);
  return {
    width: `${8 + strength * 16}px`,
    "--wave-opacity": strength,
  };
}
</script>
