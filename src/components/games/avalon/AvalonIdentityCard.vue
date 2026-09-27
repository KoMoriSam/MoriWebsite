<template>
  <div
    class="relative w-full min-w-0"
    :class="compact ? 'h-52 sm:h-72' : 'h-112 sm:h-128'"
  >
    <div
      class="hover-3d h-full min-h-0 w-full rounded-box text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      :class="disabled ? 'opacity-50' : 'cursor-pointer'"
      role="button"
      :tabindex="disabled ? -1 : 0"
      :aria-disabled="disabled"
      :aria-pressed="faceUp"
      :aria-label="
        t(
          faceUp
            ? 'avalon.hideRole'
            : self.roleRevealed
              ? 'avalon.showRole'
              : 'avalon.night.peek',
        )
      "
      @click="flip"
      @keydown.enter.prevent="flip"
      @keydown.space.prevent="flip"
    >
      <article
        class="card card-border h-full min-h-0 w-full overflow-hidden transition-colors"
        :class="
          faceUp && self.role
            ? isEvil(self.role)
              ? 'border-error/40 bg-error/10'
              : 'border-success/40 bg-success/10'
            : 'border-base-300 bg-base-200/50'
        "
      >
        <Transition
          mode="out-in"
          enter-active-class="transition duration-300 motion-reduce:transition-none"
          enter-from-class="opacity-0 rotate-y-90"
          leave-active-class="transition duration-150 motion-reduce:transition-none"
          leave-to-class="opacity-0 -rotate-y-90"
        >
          <div
            v-if="faceUp && self.role"
            key="face"
            class="flex h-full min-h-0 flex-col items-center justify-center"
            :class="
              compact
                ? 'gap-1.5 p-2 pb-10 sm:gap-3 sm:p-4 sm:pb-10'
                : 'gap-2 p-3 pb-12 sm:gap-3 sm:p-5 sm:pb-12'
            "
          >
            <span class="text-xs text-base-content/60">{{
              t(isEvil(self.role) ? "avalon.night.evil" : "avalon.night.good")
            }}</span>
            <i
              :class="[
                ROLE_ICONS[self.role],
                compact ? 'text-2xl sm:text-4xl' : 'text-4xl',
              ]"
              class="text-base-content/70"
              aria-hidden="true"
            ></i>
            <h3
              class="font-serif font-bold"
              :class="compact ? 'text-base sm:text-2xl' : 'text-3xl'"
            >
              {{ t(`avalon.roles.${self.role}`) }}
            </h3>
            <div
              v-if="!compact"
              class="max-w-full space-y-2 text-pretty text-xs leading-5 text-base-content/70 sm:text-sm sm:leading-6"
            >
              <div>{{ t(`avalon.roleHints.${self.role}`) }}</div>
              <div v-if="companions.length">
                {{
                  t(
                    self.role === "merlin"
                      ? "avalon.night.merlinVision"
                      : "avalon.night.evilVision",
                    { names: companions.map(playerName).join(", ") },
                  )
                }}
              </div>
              <div v-if="self.knownCandidates?.length">
                {{
                  t("avalon.night.percivalVision", {
                    names: self.knownCandidates.map(playerName).join(", "),
                  })
                }}
              </div>
            </div>
          </div>
          <div
            v-else
            key="back"
            class="flex h-full min-h-0 flex-col items-center justify-center"
            :class="compact ? 'gap-2 p-2 sm:gap-4 sm:p-4' : 'gap-3 p-5'"
          >
            <i
              :class="[
                self.nightConfirmed
                  ? 'ri-shield-check-line'
                  : 'ri-shield-keyhole-line',
                compact ? 'text-2xl sm:text-4xl' : 'text-5xl',
              ]"
              class="text-base-content/50"
              aria-hidden="true"
            ></i>
            <span
              class="font-serif font-semibold"
              :class="compact ? 'text-sm sm:text-xl' : 'text-xl'"
              >{{ backTitle }}</span
            >
            <span
              class="text-base-content/60"
              :class="
                compact ? 'text-xs leading-4 sm:leading-6' : 'text-sm leading-7'
              "
              >{{ backHint }}</span
            >
          </div>
        </Transition>
      </article>
      <div v-for="zone in 8" :key="zone" aria-hidden="true"></div>
    </div>
    <div
      v-if="faceUp && self.role"
      class="absolute inset-x-2 bottom-3 z-20 flex flex-wrap items-center justify-center gap-2"
    >
      <div
        v-if="compact"
        ref="detailsTooltip"
        class="tooltip group"
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
          class="tooltip-content max-h-[65dvh] overflow-y-auto overscroll-contain space-y-2 text-left! leading-6! scrollbar-thin"
          :class="detailsOpen ? 'pointer-events-auto!' : 'hidden'"
        >
          <p>{{ t(`avalon.roleHints.${self.role}`) }}</p>
          <p v-if="companions.length">
            {{ t(self.role === 'merlin' ? 'avalon.night.merlinVision' : 'avalon.night.evilVision', { names: companions.map(playerName).join(', ') }) }}
          </p>
          <p v-if="self.knownCandidates?.length">
            {{ t('avalon.night.percivalVision', { names: self.knownCandidates.map(playerName).join(', ') }) }}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs" :aria-describedby="detailsOpen ? detailsId : undefined" @click="openDetails">
          <i class="ri-information-line" aria-hidden="true"></i>
          {{ t("avalon.roleDetails") }}
        </button>
      </div>
      <slot name="actions"></slot>
    </div>
  </div>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import { ROLE_ICONS } from "@/games/avalon-presentation";
import { isEvil } from "../../../../shared/games/avalon.js";
const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
  faceUp: Boolean,
  compact: Boolean,
  disabled: Boolean,
  backTitle: { type: String, required: true },
  backHint: { type: String, required: true },
});
const emit = defineEmits(["flip"]);
const { t } = useLocale();
const detailsId = `identity-details-${useId()}`;
const detailsTooltip = ref(null);
const detailsOpen = ref(false);
function alignDetails() {
  const wrapper = detailsTooltip.value;
  if (!wrapper || !detailsOpen.value) return;
  const content = wrapper.querySelector('.tooltip-content');
  const viewportWidth = document.documentElement.clientWidth;
  content.style.setProperty('max-width', `${Math.max(0, viewportWidth - 32)}px`, 'important');
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
  if (!detailsTooltip.value?.contains(document.activeElement)) detailsOpen.value = false;
}
function closeDetails() {
  detailsOpen.value = false;
  detailsTooltip.value?.querySelector('button')?.blur();
}
function dismissDetails(event) {
  if (detailsOpen.value && !detailsTooltip.value?.contains(event.target)) closeDetails();
}
watch([() => props.faceUp, () => props.self.role], () => { detailsOpen.value = false; });
onMounted(() => {
  window.addEventListener('resize', alignDetails);
  document.addEventListener('pointerdown', dismissDetails);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', alignDetails);
  document.removeEventListener('pointerdown', dismissDetails);
});
const companions = computed(() =>
  (props.self.knownEvil ?? []).filter((id) => id !== props.selfId),
);
function flip() {
  if (!props.disabled) emit("flip");
}
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
