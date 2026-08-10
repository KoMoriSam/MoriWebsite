<template>
  <component
    :is="mobile ? 'div' : 'nav'"
    :class="[
      'not-prose min-w-0 w-full max-w-full',
      mobile ? 'relative' : 'flex h-full min-h-0 flex-col',
    ]"
    :aria-label="mobile ? undefined : title"
  >
    <div
      :class="
        mobile
          ? 'rounded-box border border-base-300/90 bg-base-100/96 p-2 backdrop-blur-md supports-[backdrop-filter]:bg-base-100/88'
          : 'mb-3'
      "
    >
      <component
        :is="mobile ? 'button' : 'div'"
        :type="mobile ? 'button' : undefined"
        :class="[
          'flex w-full min-w-0 items-center gap-2',
          mobile
            ? 'h-auto min-h-6 flex-nowrap justify-start rounded-box text-left transition-colors hover:bg-base-200/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            : 'justify-between',
        ]"
        :aria-expanded="mobile ? expanded : undefined"
        @click="mobile && (expanded = !expanded)"
      >
        <i
          class="ri-list-unordered shrink-0 text-lg text-primary"
          aria-hidden="true"
        ></i>
        <component
          :is="mobile ? 'span' : 'h2'"
          class="shrink-0 truncate text-base font-bold"
        >
          {{ title }}
        </component>
        <span
          :class="[
            'shrink-0 text-xs font-semibold text-primary',
            { 'ml-auto': !mobile },
          ]"
        >
          {{ progressValue }}%
        </span>
        <span
          v-if="mobile && activeText"
          class="min-w-0 flex-1 truncate text-left text-sm font-medium text-base-content/80"
        >
          {{ activeText }}
        </span>
        <i
          v-if="mobile"
          class="ri-arrow-down-s-line ml-auto shrink-0 transition-transform"
          :class="{ 'rotate-180': expanded }"
          aria-hidden="true"
        ></i>
      </component>

      <div
        :class="[
          'h-1.5 w-full rounded-full',
          mobile
            ? 'my-1 bg-base-300/85 ring-1 ring-base-300/70'
            : 'mt-2 bg-base-300/70',
        ]"
      >
        <div
          class="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          :style="{ width: `${progressValue}%` }"
        ></div>
      </div>
    </div>

    <div
      v-if="!mobile || expanded"
      :class="
        mobile
          ? 'absolute inset-x-0 top-full z-30 mt-2 rounded-box border border-base-300 bg-base-100/98 p-3 shadow-xl backdrop-blur-md'
          : 'min-h-0 flex-1'
      "
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
                : 'border-transparent text-base-content/60 hover:bg-base-200 hover:text-base-content',
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
    </div>
  </component>
</template>

<script setup>
import { computed, ref } from "vue";

import { useRevealCurrentItem } from "@/composables/useRevealCurrentItem";
import { useScrollMask } from "@/composables/useScrollMask";

const props = defineProps({
  mobile: { type: Boolean, default: false },
  title: { type: String, default: "阅读进度" },
  headings: { type: Array, default: () => [] },
  activeId: { type: String, default: "" },
  progress: { type: Number, default: 0 },
});

const emit = defineEmits(["select"]);

const expanded = ref(false);
const listElement = ref(null);
const { maskImage: listMaskImage } = useScrollMask(listElement);
const tocVisible = computed(() => !props.mobile || expanded.value);
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
  () =>
    props.headings.find((heading) => heading.id === props.activeId)?.text,
);
const progressValue = computed(() =>
  Math.min(100, Math.max(0, Math.round(props.progress || 0))),
);

const isRead = (headingIndex) => activeIndex.value > headingIndex;

const selectHeading = (id) => {
  emit("select", id);
  if (props.mobile) expanded.value = false;
};
</script>
