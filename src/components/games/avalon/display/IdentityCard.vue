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
          (faceUp || privateSwitch) && self.role
            ? faceAlignment === 'evil'
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
            v-if="faceUp && allegianceSwitch && !privateSwitch"
            key="allegiance-switch"
            class="relative flex h-full min-h-0 w-full flex-col justify-end overflow-hidden"
          >
            <div class="absolute inset-0 flex">
              <img
                v-for="role in LANCELOTS"
                :key="role"
                :src="roleImage(role)"
                alt=""
                class="h-full w-1/2 object-cover object-[center_20%]"
                @error="$event.currentTarget.style.opacity = '0'"
                @load="$event.currentTarget.style.opacity = ''"
              />
            </div>
            <div role="status" class="relative flex h-full flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/95 via-black/85 to-black/20 px-5 pb-8 pt-6 text-center text-white">
              <p class="text-sm text-white/70">{{ t('avalon.lancelot.publicSwitchTitle') }}</p>
              <h3 class="font-serif text-3xl font-bold leading-tight">{{ t('avalon.lancelot.publicSwitchState') }}</h3>
              <p class="text-pretty text-sm leading-6 text-white/85">{{ t('avalon.lancelot.publicSwitchHint') }}</p>
            </div>
          </div>
          <div
            v-else-if="(faceUp || privateSwitch) && self.role"
            :key="privateSwitch ? `face-${faceAlignment}` : 'face'"
            class="relative h-full min-h-0 w-full overflow-hidden"
          >
            <img
              :src="roleImage(privateSwitch ? faceAlignment === 'evil' ? 'evil_lancelot' : 'good_lancelot' : self.role)"
              alt=""
              class="absolute inset-0 h-full w-full object-cover object-[center_20%]"
              @error="$event.currentTarget.style.opacity = '0'"
              @load="$event.currentTarget.style.opacity = ''"
            />
            <div
              class="absolute inset-x-0 bottom-0 flex min-h-0 flex-col items-center justify-end gap-1 overflow-hidden bg-gradient-to-t from-black/95 via-black/85 to-transparent text-center text-white"
              :class="compact ? 'h-[62%] px-2 pb-10 pt-8 sm:px-3' : catalog ? 'h-[82%] px-3 pb-4 pt-6' : preview ? 'h-[82%] px-3 pb-5 pt-6 sm:px-4 lg:h-[70%] lg:pb-4 lg:pt-14' : 'h-[82%] px-3 pb-3 pt-6 sm:px-4 lg:h-[70%] lg:pb-4 lg:pt-14'"
            >
              <span
                class="font-medium"
                :class="[faceAlignment === 'evil' ? 'text-error' : 'text-success', catalog ? 'text-xs' : preview ? 'text-sm lg:text-xs' : 'text-xs']"
              >
                {{ t(`avalon.night.${faceAlignment}`) }}
              </span>
              <h3
                class="font-serif font-bold leading-tight"
                :class="compact ? 'text-base sm:text-2xl' : catalog ? 'text-xl' : preview ? 'text-3xl' : 'text-2xl sm:text-3xl'"
              >
                {{ t(`avalon.roles.${self.role}`) }}
              </h3>
              <div
                v-if="!compact"
                class="min-h-0 w-full overflow-y-auto overscroll-contain text-pretty text-white/85 scrollbar-thin"
                :class="catalog ? 'space-y-1 text-xs leading-5' : preview ? 'space-y-2 text-sm leading-6' : 'space-y-1 text-xs leading-4 sm:space-y-2 sm:text-sm sm:leading-6'"
              >
                <p :role="privateSwitch ? 'status' : undefined">{{ t(privateSwitch ? `avalon.lancelot.currentHints.${faceAlignment}` : roleHintKey(self.role, self.lancelotMode)) }}</p>
                <p v-if="!catalog && !privateSwitch && self.lancelotMode === 'switching' && LANCELOTS.includes(self.role)" class="text-xs font-medium" :class="faceAlignment === 'evil' ? 'text-error' : 'text-success'">
                  {{ t('avalon.lancelot.current', { side: t(`avalon.night.${faceAlignment}`) }) }}
                </p>
                <div
                  v-if="companions.length || self.knownCandidates?.length || privateKnowledge.length"
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
                          self.lancelotMode === 'switching'
                            ? 'avalon.night.openingEvilLabel'
                            : self.role === "merlin"
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
                  <p v-for="entry in privateKnowledge" :key="entry.id" class="wrap-break-word font-medium text-white">{{ entry.text }}</p>
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
          <p>{{ t(roleHintKey(self.role, self.lancelotMode)) }}</p>
          <p v-if="companions.length">
            {{
              t(
                self.lancelotMode === 'switching'
                  ? 'avalon.night.openingEvilVision'
                  : self.role === "merlin"
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
          <p v-for="entry in privateKnowledge" :key="entry.id">{{ entry.text }}</p>
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
import { LANCELOTS, selfAlignment, roleHintKey } from "../../../../../shared/games/avalon/index.js";
import { roleImage } from "@/games/avalon/presentation";
const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
  faceUp: Boolean,
  compact: Boolean,
  preview: Boolean,
  catalog: Boolean,
  allegianceSwitch: Boolean,
  switchFromAlignment: { type: String, default: null },
  disabled: Boolean,
  backTitle: { type: String, default: "" },
  backHint: { type: String, default: "" },
});
const emit = defineEmits(["flip"]);
const { t } = useLocale();
const privateSwitch = computed(() => props.allegianceSwitch && LANCELOTS.includes(props.self.role));
const faceAlignment = computed(() => privateSwitch.value && !props.faceUp ? props.switchFromAlignment ?? selfAlignment(props.self) : selfAlignment(props.self));
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
const privateKnowledge = computed(() => [
  ...Object.entries(props.self.knownRoles ?? {}).map(([id, role]) => ({
    id, text: t('avalon.night.lancelotVision', { name: props.playerName(id), role: t(`avalon.roles.${role}`) }),
  })),
  ...Object.entries(props.self.knownLoyalties ?? {}).map(([id, side]) => ({
    id, text: t('avalon.night.clericVision', { name: props.playerName(id), side: t(`avalon.night.${side}`) }),
  })),
]);
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
