<template>
  <div
    v-if="self.role"
    class="ml-auto flex min-w-0 items-center justify-end gap-1"
  >
    <i
      :class="ROLE_ICONS[self.role]"
      class="shrink-0 text-base-content/70"
      aria-hidden="true"
    ></i>
    <span
      class="min-w-0 truncate text-right text-xs font-medium sm:text-sm"
      :class="isEvil(self.role) ? 'text-error' : 'text-success'"
    >
      {{ t(`avalon.roles.${self.role}`) }}
    </span>
    <div
      ref="detailsTooltip"
      class="tooltip tooltip-bottom z-20 shrink-0"
      :class="{ 'tooltip-open': detailsOpen }"
      @mouseenter="openDetails"
      @mouseleave="leaveDetails"
      @focusin="openDetails"
      @focusout="detailsOpen = false"
      @keydown.esc="closeDetails"
    >
      <div
        :id="detailsId"
        role="tooltip"
        class="tooltip-content max-h-[65dvh] w-64 max-w-[calc(100vw-2rem)] space-y-2 overflow-y-auto overscroll-contain text-left! leading-6! scrollbar-thin"
        :class="detailsOpen ? 'pointer-events-auto!' : 'hidden'"
      >
        <p class="font-semibold">{{ t(`avalon.roles.${self.role}`) }}</p>
        <p>{{ t(`avalon.roleHints.${self.role}`) }}</p>
        <p v-if="companions.length">
          {{
            t(
              self.role === "merlin"
                ? "avalon.night.merlinVision"
                : "avalon.night.evilVision",
              { names: companions.map(playerName).join(", ") },
            )
          }}
        </p>
        <p v-if="self.knownCandidates?.length">
          {{
            t("avalon.night.percivalVision", {
              names: self.knownCandidates.map(playerName).join(", "),
            })
          }}
        </p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-xs btn-square"
        :aria-label="t('avalon.roleDetails')"
        :aria-describedby="detailsOpen ? detailsId : undefined"
        @click="openDetails"
      >
        <i class="ri-information-line" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import { useLocale } from "@/i18n";
import { ROLE_ICONS } from "@/games/avalon-presentation";
import { isEvil } from "../../../../shared/games/avalon.js";

const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
});
const { t } = useLocale();
const detailsId = `role-details-${useId()}`;
const detailsTooltip = ref(null);
const detailsOpen = ref(false);
const companions = computed(() =>
  (props.self.knownEvil ?? []).filter((id) => id !== props.selfId),
);

function alignDetails() {
  const wrapper = detailsTooltip.value;
  if (!wrapper || !detailsOpen.value) return;
  const content = wrapper.querySelector(".tooltip-content");
  const viewportWidth = document.documentElement.clientWidth;
  content.style.setProperty(
    "max-width",
    `${Math.max(0, viewportWidth - 32)}px`,
    "important",
  );
  const bounds = wrapper.getBoundingClientRect();
  const width = content.offsetWidth;
  const centered = bounds.left + bounds.width / 2 - width / 2;
  const left = Math.max(16, Math.min(centered, viewportWidth - width - 16));
  content.style.marginLeft = `${left - centered}px`;
}
function openDetails() {
  detailsOpen.value = true;
  void nextTick(alignDetails);
}
function leaveDetails() {
  if (!detailsTooltip.value?.contains(document.activeElement))
    detailsOpen.value = false;
}
function closeDetails() {
  detailsOpen.value = false;
  detailsTooltip.value?.querySelector("button")?.blur();
}
function dismissDetails(event) {
  if (detailsOpen.value && !detailsTooltip.value?.contains(event.target))
    closeDetails();
}
watch(
  () => props.self.role,
  () => {
    detailsOpen.value = false;
  },
);
onMounted(() => {
  window.addEventListener("resize", alignDetails);
  document.addEventListener("pointerdown", dismissDetails);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", alignDetails);
  document.removeEventListener("pointerdown", dismissDetails);
});
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .tooltip-content {
    transition-property: opacity, transform, display;
    transition-behavior: allow-discrete;
  }
  @starting-style {
    .tooltip-content {
      opacity: 0;
      --tt-pos: 0.25rem;
    }
  }
}
</style>
