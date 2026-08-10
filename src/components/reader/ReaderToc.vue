<template>
  <TocFrame
    ref="tocFrame"
    :mobile="mobile"
    :compact="compact"
    :title="title"
    :progress="progressValue"
    :progress-label="`${progressValue}%`"
    :current-label="activeText"
    aria-label="阅读目录"
    icon-class="ri-list-unordered"
    @toggle-compact="emit('toggle-compact')"
    @menu-open-change="emit('menu-open-change', $event)"
    @visibility-change="tocVisible = $event"
  >
    <ol
      ref="listElement"
      :class="[
        'space-y-0.5 overflow-y-auto overscroll-contain pr-1 scrollbar-none',
        mobile ? 'max-h-[min(55vh,32rem)]' : 'h-full min-h-0',
      ]"
      :style="
        mobile
          ? undefined
          : {
              maskImage: listMaskImage,
              WebkitMaskImage: listMaskImage,
            }
      "
    >
      <li v-for="(heading, headingIndex) in headings" :key="heading.id">
        <button
          type="button"
          :title="heading.text"
          :aria-current="heading.id === activeId ? 'location' : undefined"
          :data-current="heading.id === activeId ? 'true' : undefined"
          class="block w-full rounded-lg py-1.5 pr-2 text-left text-sm leading-snug transition-[background-color,color,opacity] duration-150"
          :class="[
            heading.level === 1 ? 'pl-2 font-bold' : '',
            heading.level === 2 ? 'pl-4 font-medium' : '',
            heading.level === 3 ? 'pl-6 text-xs' : '',
            heading.level >= 4 ? 'pl-8 font-light text-xs' : '',
            heading.id === activeId
              ? 'border-primary bg-primary/10 text-primary font-black!'
              : 'border-transparent text-base-content/80 hover:bg-base-200 hover:text-base-content',
            isRead(headingIndex) && heading.id !== activeId
              ? 'opacity-50 hover:opacity-80'
              : '',
          ]"
          @click="selectHeading(heading.id)"
        >
          {{ heading.text }}
        </button>
      </li>
    </ol>
  </TocFrame>
</template>

<script setup>
import { computed, ref } from "vue";

import TocFrame from "@/components/reader/TocFrame.vue";
import { useRevealCurrentItem } from "@/composables/useRevealCurrentItem";
import { useScrollMask } from "@/composables/useScrollMask";

const props = defineProps({
  mobile: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  title: { type: String, default: "阅读进度" },
  headings: { type: Array, default: () => [] },
  activeId: { type: String, default: "" },
  progress: { type: Number, default: 0 },
});

const emit = defineEmits(["select", "toggle-compact", "menu-open-change"]);

const tocFrame = ref(null);
const listElement = ref(null);
const { maskImage: listMaskImage } = useScrollMask(listElement);
const tocVisible = ref(!props.mobile);
const currentHeadingId = computed(() => props.activeId);

useRevealCurrentItem({
  containerRef: listElement,
  currentKey: currentHeadingId,
  enabled: tocVisible,
});

const activeIndex = computed(() =>
  props.headings.findIndex((heading) => heading.id === props.activeId),
);
const activeText = computed(
  () => props.headings.find((heading) => heading.id === props.activeId)?.text,
);
const progressValue = computed(() =>
  Math.min(100, Math.max(0, Math.round(props.progress || 0))),
);

const isRead = (headingIndex) => activeIndex.value > headingIndex;

const selectHeading = (id) => {
  emit("select", id);
  tocFrame.value?.closeMenu();
};
</script>
