<template>
  <div
    class="relative w-full min-w-0"
    :class="compact ? 'h-52 sm:h-72' : 'aspect-[2/3]'"
  >
    <div
      class="hover-3d h-full min-h-0 w-full rounded-box text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      :class="preview ? '' : disabled ? 'opacity-50' : 'cursor-pointer'"
      :role="preview ? undefined : 'button'"
      :tabindex="preview ? undefined : disabled ? -1 : 0"
      :aria-disabled="preview ? undefined : disabled"
      :aria-pressed="preview ? undefined : faceUp"
      :aria-label="
        preview ? undefined : t(
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
            class="relative h-full min-h-0 w-full overflow-hidden"
          >
            <img
              :src="`/assets/images/games/avalon/${self.role}.webp`"
              alt=""
              class="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
            <div
              class="absolute inset-x-0 bottom-0 flex min-h-0 flex-col items-center justify-end gap-1 overflow-hidden bg-gradient-to-t from-black/95 via-black/85 to-transparent text-center text-white"
              :class="compact ? 'h-[62%] px-2 pb-10 pt-8 sm:px-3' : 'h-[82%] px-3 pb-3 pt-6 sm:px-4 lg:h-[70%] lg:pb-4 lg:pt-14'"
            >
              <span
                class="text-xs font-medium"
                :class="isEvil(self.role) ? 'text-error' : 'text-success'"
              >
                {{ t(isEvil(self.role) ? "avalon.night.evil" : "avalon.night.good") }}
              </span>
              <h3
                class="font-serif font-bold leading-tight"
                :class="compact ? 'text-base sm:text-2xl' : 'text-2xl sm:text-3xl'"
              >
                {{ t(`avalon.roles.${self.role}`) }}
              </h3>
              <div
                v-if="!compact"
                class="min-h-0 w-full space-y-1 overflow-y-auto overscroll-contain text-pretty text-xs leading-4 text-white/85 scrollbar-thin sm:space-y-2 sm:text-sm sm:leading-6"
              >
                <p>{{ t(`avalon.roleHints.${self.role}`) }}</p>
                <div
                  v-if="companions.length || self.knownCandidates?.length"
                  class="mt-2 space-y-1 rounded-box border border-white/20 bg-black/35 p-2 text-center sm:mt-3 sm:space-y-2 sm:p-3"
                >
                  <p class="flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                    <i class="ri-eye-line" aria-hidden="true"></i>
                    {{ t("avalon.night.visionTitle") }}
                  </p>
                  <div v-if="companions.length">
                    <p class="text-xs text-white/65">
                      {{
                        t(
                          self.role === "merlin"
                            ? "avalon.night.merlinVisionLabel"
                            : "avalon.night.evilVisionLabel",
                        )
                      }}
                    </p>
                    <p class="wrap-break-word font-medium text-white">
                      {{ companions.map(playerName).join(", ") }}
                    </p>
                  </div>
                  <div v-if="self.knownCandidates?.length">
                    <p class="text-xs text-white/65">
                      {{ t("avalon.night.percivalVisionLabel") }}
                    </p>
                    <p class="wrap-break-word font-medium text-white">
                      {{ self.knownCandidates.map(playerName).join(", ") }}
                    </p>
                    <p class="mt-1 text-xs text-white/75">
                      {{ t("avalon.night.percivalVisionWarning") }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            key="back"
            class="relative h-full min-h-0 w-full overflow-hidden"
          >
            <img
              src="/assets/images/games/avalon/card.webp"
              alt=""
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              class="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/95 via-black/85 to-transparent px-3 pb-5 pt-12 text-center text-white"
            >
              <span
                class="font-serif font-semibold"
                :class="compact ? 'text-sm sm:text-xl' : 'text-xl'"
                >{{ backTitle }}</span
              >
              <span :class="compact ? 'text-xs leading-4' : 'text-sm leading-6'"
                >{{ backHint }}</span
              >
            </div>
          </div>
        </Transition>
      </article>
      <div v-for="zone in 8" :key="zone" aria-hidden="true"></div>
    </div>
    <div
      v-if="compact && faceUp && self.role"
      class="absolute inset-x-2 bottom-3 z-20 flex flex-wrap items-center justify-center gap-2"
    >
      <div
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
          class="btn btn-ghost btn-xs"
          :aria-describedby="detailsOpen ? detailsId : undefined"
          @click="openDetails"
        >
          <i class="ri-information-line" aria-hidden="true"></i>
          {{ t("avalon.roleDetails") }}
        </button>
      </div>
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
import { isEvil } from "../../../../shared/games/avalon.js";
const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
  faceUp: Boolean,
  compact: Boolean,
  preview: Boolean,
  disabled: Boolean,
  backTitle: { type: String, default: "" },
  backHint: { type: String, default: "" },
});
const emit = defineEmits(["flip"]);
const { t } = useLocale();
const detailsId = `identity-details-${useId()}`;
const detailsTooltip = ref(null);
const detailsOpen = ref(false);
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
watch([() => props.faceUp, () => props.self.role], () => {
  detailsOpen.value = false;
});
onMounted(() => {
  window.addEventListener("resize", alignDetails);
  document.addEventListener("pointerdown", dismissDetails);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", alignDetails);
  document.removeEventListener("pointerdown", dismissDetails);
});
const companions = computed(() =>
  (props.self.knownEvil ?? []).filter((id) => id !== props.selfId),
);
function flip() {
  if (!props.preview && !props.disabled) emit("flip");
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
