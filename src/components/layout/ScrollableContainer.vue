<template>
  <component :is="tag" ref="host" class="scrollable-container relative min-h-0 min-w-0 flex-col" :class="layout">
    <slot />
    <component
      :is="tag === 'span' ? 'span' : 'div'"
      class="scroll-edge-fade-overlay pointer-events-none absolute z-10 overflow-hidden rounded-[inherit]"
      :style="overlayStyle"
      aria-hidden="true"
      data-scroll-fade-overlay
    >
      <span
        v-for="edge in directions"
        :key="edge"
        class="scroll-edge-fade"
        :class="`scroll-edge-fade-${edge}`"
        :style="{ opacity: edgeOpacity[edge] }"
      ></span>
    </component>
  </component>
</template>

<script setup>
import { onActivated, onMounted, onUpdated, ref, shallowRef } from "vue";
import { useScrollEdges } from "@/composables/useScrollEdges";
import "@/assets/scroll-edge-fade.css";

defineProps({
  tag: { type: String, default: "div" },
  layout: { type: String, default: "flex" },
});

const host = ref(null);
const viewport = shallowRef(null);
const directions = ["top", "bottom", "left", "right"];
const { edgeOpacity, overlayStyle, refresh } = useScrollEdges(viewport, host);
// The slot's single root remains the scroll viewport, preserving DOM refs,
// semantic list/table markup, scroll handlers, and existing overflow classes.
const syncViewport = () => {
  viewport.value = host.value?.querySelector(":scope > :not([data-scroll-fade-overlay])") ?? null;
};
onMounted(syncViewport);
onUpdated(() => {
  syncViewport();
  refresh();
});
onActivated(refresh);
defineExpose({ viewport });
</script>

