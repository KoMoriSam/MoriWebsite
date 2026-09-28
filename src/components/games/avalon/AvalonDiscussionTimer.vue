<template>
  <div
    class="relative h-[calc(var(--size-field,0.25rem)*10)] w-full shrink-0 overflow-hidden rounded-field"
  >
    <progress
      class="progress h-full w-full rounded-field"
      :value="remaining"
      :max="duration"
      :aria-label="t('avalon.discussionTimer.label')"
      :aria-valuetext="label"
    ></progress>
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-2"
    >
      <span
        role="timer"
        class="rounded-field bg-base-100/90 px-2 py-0.5 text-center text-xs font-semibold tabular-nums sm:text-sm"
        >{{ label }}</span
      >
    </div>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useLocale } from "@/i18n";
const props = defineProps({ discussion: Object, serverNow: Number });
const { t } = useLocale();
const now = ref(props.serverNow ?? Date.now());
let offset = 0;
let timer;
watch(
  () => props.serverNow,
  (value) => {
    offset = (value ?? Date.now()) - Date.now();
    now.value = Date.now() + offset;
  },
  { immediate: true },
);
const duration = computed(() =>
  Math.max(
    1,
    (props.discussion?.endsAt ?? 0) - (props.discussion?.startedAt ?? 0),
  ),
);
const remaining = computed(() =>
  Math.min(
    duration.value,
    Math.max(0, (props.discussion?.endsAt ?? 0) - now.value),
  ),
);
const label = computed(() => {
  if (!props.discussion) return t("avalon.discussionTimer.syncing");
  const seconds = Math.ceil(remaining.value / 1000);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const mode =
    props.discussion.mode === "slow"
      ? "slow"
      : props.discussion.partnerId
        ? "fast"
        : "invite";
  return t(`avalon.discussionTimer.${mode}`, { time });
});
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now() + offset;
  }, 500);
});
onBeforeUnmount(() => clearInterval(timer));
</script>
