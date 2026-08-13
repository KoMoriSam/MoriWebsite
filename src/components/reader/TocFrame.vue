<template>
  <component
    ref="rootElement"
    :is="embedded || !mobile ? 'nav' : 'div'"
    :class="[
      'not-prose min-w-0 w-full max-w-full',
      embedded
        ? 'flex h-full min-h-0 flex-col'
        : mobile
        ? popupOnly
          ? 'contents'
          : 'relative'
        : 'flex h-full min-h-0 flex-col',
    ]"
    :role="mobile && popupOnly && !embedded ? 'navigation' : undefined"
    :aria-label="mobile && !popupOnly && !embedded ? undefined : ariaLabel"
  >
    <div
      v-if="!popupOnly && !embedded"
      :data-mobile-toc-handle="mobile ? '' : undefined"
      :class="[
        mobile
          ? 'relative rounded-box border transition-[padding,border-color,background-color,backdrop-filter] duration-300 ease-out motion-reduce:transition-none'
          : 'mb-3',
        mobile && compact
          ? 'rounded-none border-0 bg-transparent p-0 backdrop-blur-none'
          : mobile
            ? 'border-base-300/90 bg-base-100/96 p-2 backdrop-blur-md supports-[backdrop-filter]:bg-base-100/88'
            : '',
      ]"
    >
      <div
        :class="[
          mobile
            ? 'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none'
            : '',
          mobile && compact
            ? 'grid-rows-[0fr] opacity-0'
            : mobile
              ? 'grid-rows-[1fr] opacity-100'
              : '',
        ]"
        :aria-hidden="mobile && compact ? 'true' : undefined"
      >
        <div
          :class="mobile ? 'min-h-0 overflow-hidden' : undefined"
          :inert="mobile && compact"
        >
          <component
            :is="mobile ? 'button' : 'div'"
            :type="mobile ? 'button' : undefined"
            :class="[
              'flex w-full min-w-0 items-center gap-2',
              mobile
                ? 'h-auto flex-nowrap justify-start rounded-box px-1 text-left transition-colors hover:bg-base-200/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                : 'justify-between',
            ]"
            :aria-expanded="mobile ? expanded : undefined"
            :aria-controls="mobile ? contentId : undefined"
            @click="toggleMenu"
          >
            <i
              :class="[iconClass, 'shrink-0 text-2xl text-primary']"
              aria-hidden="true"
            ></i>

            <template v-if="mobile">
              <span class="min-w-0 flex-1 text-xs py-0">
                <span
                  class="flex min-w-0 items-center gap-2 leading-tight justify-start"
                >
                  <small class="min-w-0 truncate font-bold">
                    {{ title }}
                  </small>
                  <small class="shrink-0 font-semibold text-primary">
                    {{ progressLabel }}
                  </small>
                </span>
                <span
                  v-if="currentLabel"
                  class="mt-0.5 block truncate text-left font-medium leading-tight text-base-content/80"
                  :title="currentLabel"
                >
                  {{ currentLabel }}
                </span>
              </span>
              <i
                class="ri-arrow-down-s-line shrink-0 transition-transform"
                :class="{ 'rotate-180': expanded }"
                aria-hidden="true"
              ></i>
            </template>

            <template v-else>
              <h2 class="truncate text-base font-bold">{{ title }}</h2>
              <span class="ml-auto shrink-0 text-xs font-semibold text-primary">
                {{ progressLabel }}
              </span>
            </template>
          </component>
        </div>
      </div>

      <div
        :class="[
          'relative left-1/2 h-1.5 -translate-x-1/2 rounded-full transition-[margin,width,border-radius,background-color,box-shadow] duration-300 ease-out before:absolute before:inset-x-0 before:top-0 before:h-6 before:content-[\'\'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none',
          mobile
            ? compact
              ? 'w-dvw cursor-pointer rounded-none bg-base-300'
              : 'mt-2 mb-1 w-full cursor-pointer bg-base-300/85 ring-1 ring-base-300/70'
            : 'mt-2 w-full bg-base-300/70',
        ]"
        :role="mobile ? 'button' : undefined"
        :tabindex="mobile ? 0 : undefined"
        :aria-expanded="mobile ? !compact : undefined"
        :aria-label="mobile ? compactToggleLabel : undefined"
        @click="toggleCompact"
        @keydown.enter.prevent="toggleCompact"
        @keydown.space.prevent="toggleCompact"
      >
        <div
          :class="[
            'h-full bg-primary transition-[width,border-radius] duration-300 ease-out motion-reduce:transition-none',
            mobile && compact ? 'rounded-none' : 'rounded-full',
          ]"
          :style="{ width: `${normalizedProgress}%` }"
        ></div>
      </div>
    </div>

    <div
      v-if="contentVisible"
      :id="mobile ? contentId : undefined"
      :class="
        embedded
          ? desktopContentClass
          : mobile
          ? popupOnly
            ? 'fixed inset-x-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] z-[60] mx-auto max-h-[min(70dvh,36rem)] max-w-lg overflow-hidden rounded-box border border-base-300 bg-base-100/98 p-3 shadow-xl backdrop-blur-md'
            : 'absolute inset-x-0 top-full z-30 mt-2 rounded-box border border-base-300 bg-base-100/98 p-3 shadow-xl backdrop-blur-md'
          : desktopContentClass
      "
    >
      <slot />
    </div>
  </component>
</template>

<script setup>
import { onClickOutside } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";

const props = defineProps({
  mobile: { type: Boolean, default: false },
  popupOnly: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  title: { type: String, required: true },
  ariaLabel: { type: String, required: true },
  iconClass: { type: String, required: true },
  progress: { type: Number, default: 0 },
  progressLabel: { type: String, required: true },
  currentLabel: { type: String, default: "" },
  desktopContentClass: {
    type: String,
    default: "min-h-0 flex-1",
  },
});

const emit = defineEmits([
  "toggle-compact",
  "menu-open-change",
  "visibility-change",
]);

const expanded = ref(false);
const rootElement = ref(null);
const contentId = useId();
const normalizedProgress = computed(() =>
  Math.min(100, Math.max(0, Number(props.progress) || 0)),
);
const contentVisible = computed(
  () =>
    props.embedded ||
    !props.mobile ||
    (expanded.value && (props.popupOnly || !props.compact)),
);
const compactToggleLabel = computed(
  () => `${props.compact ? "展开" : "收起"}${props.ariaLabel}`,
);

watch(
  () => props.compact,
  (compact) => {
    if (compact) expanded.value = false;
  },
);

watch(expanded, (open) => {
  if (props.mobile) emit("menu-open-change", open);
});

watch(contentVisible, (visible) => emit("visibility-change", visible), {
  immediate: true,
});

onClickOutside(rootElement, () => {
  if (
    props.mobile &&
    !props.popupOnly &&
    !props.embedded &&
    expanded.value
  ) {
    expanded.value = false;
  }
});

onBeforeUnmount(() => {
  if (props.mobile && expanded.value) emit("menu-open-change", false);
});

const toggleMenu = () => {
  if (props.mobile) expanded.value = !expanded.value;
};

const toggleCompact = () => {
  if (props.mobile) emit("toggle-compact");
};

const closeMenu = () => {
  expanded.value = false;
};

defineExpose({ closeMenu, toggleMenu });
</script>
