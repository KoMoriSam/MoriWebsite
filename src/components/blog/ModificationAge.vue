<template>
  <aside
    v-if="Number.isFinite(modifiedTime)"
    role="note"
    class="not-prose mt-4 items-start text-sm leading-relaxed font-sans"
    :class="showTimelinessNotice
      ? 'alert alert-soft gap-3 sm:alert-horizontal'
      : 'flex gap-2 text-base-content/55'"
    data-pagefind-ignore
  >
    <i class="ri-history-line mt-0.5" aria-hidden="true"></i>
    <div class="min-w-0">
      <I18nT keypath="blog.article.modifiedElapsed" tag="p" scope="global">
        <template #elapsed>
          <span role="timer" aria-live="polite" aria-atomic="true" :aria-label="elapsedLabel">
            <span aria-hidden="true" class="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 align-baseline">
              <I18nT
                v-for="unit in units"
                :key="unit.name"
                :keypath="`blog.article.elapsedUnits.${unit.name}`"
                :plural="unit.value"
                tag="span"
                scope="global"
                class="inline-flex items-baseline gap-1 whitespace-nowrap"
              >
                <template #count>
                  <span v-if="now !== null" class="countdown font-mono text-base-content/75 tabular-nums motion-reduce:[&>span]:transition-none motion-reduce:[&>span::before]:transition-none motion-reduce:[&>span::after]:transition-none">
                    <span v-for="(digit, index) in unit.digits" :key="index" :style="{ '--value': Number(digit) }">{{ digit }}</span>
                  </span>
                  <span v-else class="font-mono text-base-content/75">--</span>
                </template>
              </I18nT>
            </span>
          </span>
        </template>
      </I18nT>
      <p v-if="showTimelinessNotice" class="mt-1 text-xs leading-relaxed text-base-content/65">
        {{ translate("blog.article.timelinessNotice") }}
      </p>
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Translation as I18nT } from "vue-i18n";
import { useLocale } from "@/i18n";

const props = defineProps({
  modifiedAt: { type: [String, Number, Date], default: "" },
  noticeAfterDays: { type: Number, default: 365 },
});
const { t: translate, number: formatNumber } = useLocale();
// Keep SSR and the initial hydration identical; start the live clock on mount.
const now = ref(null);
const modifiedTime = computed(() => new Date(props.modifiedAt).getTime());
const elapsedSeconds = computed(() => now.value === null || !Number.isFinite(modifiedTime.value)
    ? 0
    : Math.max(0, Math.floor((now.value - modifiedTime.value) / 1000)),
);
const showTimelinessNotice = computed(() =>
  now.value !== null &&
  Number.isFinite(props.noticeAfterDays) && props.noticeAfterDays > 0 &&
  elapsedSeconds.value >= props.noticeAfterDays * 86400,
);
const units = computed(() => {
  const total = elapsedSeconds.value;
  return [
    { name: "days", value: Math.floor(total / 86400) },
    { name: "hours", value: Math.floor(total / 3600) % 24 },
    { name: "minutes", value: Math.floor(total / 60) % 60 },
    { name: "seconds", value: total % 60 },
  ].map((unit) => ({
    ...unit,
    // Each wheel stays within daisyUI's range, including ages over 999 days.
    digits: String(unit.value).padStart(unit.name === "days" ? 1 : 2, "0").split(""),
  }));
});
const elapsedLabel = computed(() => now.value === null ? undefined : units.value.map((unit) =>
  translate(`blog.article.elapsedUnits.${unit.name}`, { count: formatNumber(unit.value) }, unit.value),
).join(" "));
let interval;
const updateNow = () => {
  if (Number.isFinite(modifiedTime.value)) now.value = Date.now();
};
onMounted(() => {
  watch(modifiedTime, () => {
    window.clearInterval(interval);
    if (Number.isFinite(modifiedTime.value)) {
      updateNow();
      interval = window.setInterval(updateNow, 1000);
    }
  }, { immediate: true });
  document.addEventListener("visibilitychange", updateNow);
});
onBeforeUnmount(() => {
  window.clearInterval(interval);
  document.removeEventListener("visibilitychange", updateNow);
});
</script>
