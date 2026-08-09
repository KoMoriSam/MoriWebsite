<template>
  <nav
    class="w-full min-w-0 overflow-hidden"
    :class="{
      'rounded-lg border border-base-300 bg-base-100': !isCompact,
    }"
    :aria-labelledby="headingId"
  >
    <header
      class="flex min-w-0 border-b border-base-300"
      :class="
        isCompact
          ? 'items-center justify-between gap-3 px-4 py-4'
          : 'flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'
      "
    >
      <div class="min-w-0">
        <p
          class="mb-1 text-xs font-bold tracking-[0.2em] text-base-content/45 uppercase"
        >
          {{ eyebrow }}
        </p>
        <div
          class="flex min-w-0 flex-wrap items-baseline gap-y-1"
          :class="isCompact ? 'gap-x-2' : 'gap-x-3'"
        >
          <h2
            :id="headingId"
            class="min-w-0 font-serif font-bold text-balance break-words"
            :class="isCompact ? 'text-2xl' : 'text-3xl'"
          >
            {{ title }}
          </h2>
          <span
            v-if="meta"
            class="text-base-content/55"
            :class="isCompact ? 'text-xs' : 'text-sm'"
          >
            {{ meta }}
          </span>
        </div>
      </div>

      <div
        v-if="$slots.btn"
        class="flex shrink-0 items-center"
        :class="isCompact ? 'gap-1.5' : 'gap-2'"
      >
        <slot name="btn"></slot>
      </div>
    </header>

    <ul class="w-full min-w-0 divide-y divide-base-300">
      <slot></slot>
    </ul>
  </nav>
</template>

<script setup>
import { computed, useId } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  eyebrow: {
    type: String,
    default: "Contents",
  },
  meta: {
    type: String,
    default: "",
  },
  density: {
    type: String,
    default: "compact",
    validator: (value) => ["compact", "comfortable"].includes(value),
  },
});

const headingId = useId();
const isCompact = computed(() => props.density === "compact");
</script>
