<template>
  <div
    class="relative w-full min-w-0"
    :class="compact ? (catalog ? 'aspect-4/5' : 'h-52 sm:h-72') : 'aspect-2/3'"
  >
    <div
      class="hover-3d h-full min-h-0 w-full rounded-box text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      :class="preview ? '' : disabled ? 'opacity-50' : 'cursor-pointer'"
      :role="preview ? undefined : 'button'"
      :tabindex="preview ? undefined : disabled ? -1 : 0"
      :aria-disabled="preview ? undefined : disabled"
      :aria-pressed="preview ? undefined : faceUp"
      :aria-label="
        preview
          ? undefined
          : t(
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
            v-if="(faceUp || privateSwitch) && self.role"
            :key="privateSwitch ? `face-${faceAlignment}` : 'face'"
            class="relative h-full min-h-0 w-full overflow-hidden"
          >
            <img
              v-bind="getImageAttrs(
                roleImage(
                  privateSwitch
                    ? faceAlignment === 'evil'
                      ? 'evil_lancelot'
                      : 'good_lancelot'
                    : self.role,
                ),
                cardImageSizes,
              )"
              alt=""
              class="absolute inset-0 h-full w-full object-cover object-[center_20%]"
              @error="$event.currentTarget.style.opacity = '0'"
              @load="$event.currentTarget.style.opacity = ''"
            />
            <div
              class="absolute inset-x-0 bottom-0 flex min-h-0 flex-col items-center justify-end gap-1 overflow-hidden bg-gradient-to-t from-black/95 via-black/85 to-transparent text-center text-white"
              :class="
                compact
                  ? catalog
                    ? 'h-[62%] px-2 pb-3 pt-6 sm:px-3'
                    : 'h-[62%] px-2 pb-10 pt-8 sm:px-3'
                  : catalog
                    ? 'h-[82%] px-3 pb-4 pt-6'
                    : preview
                      ? 'h-[82%] px-3 pb-5 pt-6 sm:px-4 lg:h-[70%] lg:pb-4 lg:pt-14'
                      : 'h-[82%] px-3 pb-3 pt-6 sm:px-4 lg:h-[70%] lg:pb-4 lg:pt-14'
              "
            >
              <span
                class="font-medium"
                :class="[
                  faceAlignment === 'evil' ? 'text-error' : 'text-success',
                  catalog
                    ? 'text-xs'
                    : preview
                      ? 'text-sm lg:text-xs'
                      : 'text-xs',
                ]"
              >
                {{ t(`avalon.night.${faceAlignment}`) }}
              </span>
              <h3
                class="font-serif font-bold leading-tight"
                :class="
                  compact
                    ? catalog
                      ? 'text-base'
                      : 'text-base sm:text-2xl'
                    : catalog
                      ? 'text-xl'
                      : preview
                        ? 'text-3xl'
                        : 'text-2xl sm:text-3xl'
                "
              >
                {{ t(`avalon.roles.${self.role}`) }}
              </h3>
              <span
                v-if="compact && catalog"
                class="mt-1 inline-flex items-center gap-1 text-[10px] text-white/75"
              >
                <i class="ri-information-line" aria-hidden="true"></i>
                {{ t("avalon.catalog.details") }}
              </span>
              <div
                v-if="!compact"
                class="min-h-0 w-full overflow-y-auto overscroll-contain text-pretty text-white/85 scrollbar-thin"
                :class="
                  catalog
                    ? 'space-y-1 text-xs leading-5'
                    : preview
                      ? 'space-y-2 text-sm leading-6'
                      : 'space-y-1 text-xs leading-4 sm:space-y-2 sm:text-sm sm:leading-6'
                "
              >
                <p :role="privateSwitch ? 'status' : undefined">
                  {{
                    t(
                      privateSwitch
                        ? `avalon.lancelot.currentHints.${faceAlignment}`
                        : roleHintKey(
                            self.role,
                            self.lancelotMode,
                            self.recruited,
                          ),
                    )
                  }}
                </p>
                <p
                  v-if="
                    !catalog &&
                    !privateSwitch &&
                    self.lancelotMode === 'switching' &&
                    LANCELOTS.includes(self.role)
                  "
                  class="text-xs font-medium"
                  :class="
                    faceAlignment === 'evil' ? 'text-error' : 'text-success'
                  "
                >
                  {{
                    t("avalon.lancelot.current", {
                      side: t(`avalon.night.${faceAlignment}`),
                    })
                  }}
                </p>
                <div
                  v-if="nightKnowledge.length"
                  class="mt-2 space-y-1 rounded-box border border-white/20 bg-black/35 p-2 text-center sm:mt-3 sm:space-y-2 sm:p-3"
                >
                  <p
                    class="flex items-center justify-center gap-1.5 text-xs font-semibold text-white"
                  >
                    <i class="ri-eye-line" aria-hidden="true"></i>
                    {{ t("avalon.night.visionTitle") }}
                  </p>
                  <div v-for="entry in nightKnowledge" :key="entry.id">
                    <p class="text-xs text-white/65">{{ entry.label }}</p>
                    <p class="wrap-break-word font-medium text-white">
                      {{ entry.value }}
                    </p>
                    <p v-if="entry.hint" class="mt-1 text-xs text-white/75">
                      {{ entry.hint }}
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
              v-bind="getImageAttrs('/assets/images/games/avalon/card.webp', cardImageSizes)"
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
              <span
                :class="compact ? 'text-xs leading-4' : 'text-sm leading-6'"
                >{{ backHint }}</span
              >
            </div>
          </div>
        </Transition>
      </article>
      <div v-for="zone in 8" :key="zone" aria-hidden="true"></div>
    </div>
    <div
      v-if="compact && !catalog && faceUp && self.role"
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
          <p>
            {{ t(roleHintKey(self.role, self.lancelotMode, self.recruited)) }}
          </p>
          <section v-if="nightKnowledge.length" class="space-y-2">
            <p class="flex items-center gap-1.5 text-xs font-semibold">
              <i class="ri-eye-line" aria-hidden="true"></i>
              {{ t("avalon.night.visionTitle") }}
            </p>
            <div v-for="entry in nightKnowledge" :key="entry.id">
              <p class="text-xs opacity-65">{{ entry.label }}</p>
              <p class="wrap-break-word font-medium">{{ entry.value }}</p>
              <p
                v-if="entry.hint || entry.detailHint"
                class="mt-1 text-xs opacity-75"
              >
                {{ entry.hint || entry.detailHint }}
              </p>
            </div>
          </section>
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
import { getImageAttrs } from "@/utils/images/responsive-images";
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
import {
  LANCELOTS,
  selfAlignment,
  roleHintKey,
} from "../../../../../shared/games/avalon/index.js";
import { roleImage, loyaltyWarningKeys } from "@/games/avalon/presentation";
const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
  faceUp: Boolean,
  compact: Boolean,
  preview: Boolean,
  catalog: Boolean,
  gameConfig: { type: Object, default: () => ({}) },
  allegianceSwitch: Boolean,
  switchFromAlignment: { type: String, default: null },
  disabled: Boolean,
  backTitle: { type: String, default: "" },
  backHint: { type: String, default: "" },
});
const emit = defineEmits(["flip"]);
const { t } = useLocale();
const cardImageSizes = computed(() =>
  props.preview
    ? "min(85vw, 20rem, 56dvh)"
    : "(min-width: 1024px) 320px, 192px",
);
const privateSwitch = computed(
  () => props.allegianceSwitch && LANCELOTS.includes(props.self.role),
);
const faceAlignment = computed(() =>
  privateSwitch.value && !props.faceUp
    ? (props.switchFromAlignment ?? selfAlignment(props.self))
    : selfAlignment(props.self),
);
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
const nightKnowledge = computed(() => {
  const self = props.self;
  const entries = [];
  if (companions.value.length) {
    entries.push({
      id: "companions",
      label: t(
        self.merlinHasDecoy
          ? "avalon.night.merlinSignalLabel"
          : self.lancelotMode === "switching"
            ? "avalon.night.openingEvilLabel"
            : self.role === "merlin"
              ? "avalon.night.merlinVisionLabel"
              : "avalon.night.evilVisionLabel",
      ),
      value: companions.value.map(props.playerName).join(", "),
      detailHint: [
        self.merlinHasDecoy ? t("avalon.night.merlinSignalWarning") : null,
        self.lancelotMode === "switching"
          ? t("avalon.night.openingVisionWarning")
          : null,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  if (self.knownCandidates?.length) {
    entries.push({
      id: "candidates",
      label: t("avalon.night.percivalVisionLabel"),
      value: self.knownCandidates.map(props.playerName).join(", "),
      hint: t("avalon.night.percivalVisionWarning"),
    });
  }
  const checkValue = (id, side) =>
    t("avalon.loyalty.visionValue", {
      name: props.playerName(id),
      side: t(`avalon.night.${side}`),
    });
  for (const [id, role] of Object.entries(self.knownRoles ?? {})) {
    entries.push({
      id: `role-${id}`,
      label: t("avalon.night.roleVisionLabel", {
        role: t(`avalon.roles.${role}`),
      }),
      value: props.playerName(id),
      detailHint: LANCELOTS.includes(self.role)
        ? t("avalon.night.lancelotVisionWarning")
        : null,
    });
  }
  for (const [id, side] of Object.entries(self.knownLoyalties ?? {})) {
    entries.push({
      id: `leader-${id}`,
      label: t("avalon.opening.title"),
      value: checkValue(id, side),
      detailHint: loyaltyWarningKeys(props.gameConfig, "cleric")
        .map((key) => t(key))
        .join(" "),
    });
  }
  for (const entry of self.loyaltyObservations ?? []) {
    if (entry.source !== "lady") continue;
    entries.push({
      id: `lady-${entry.at}-${entry.targetId}`,
      label: t("avalon.lady.title"),
      value: checkValue(entry.targetId, entry.alignment),
      detailHint: loyaltyWarningKeys(props.gameConfig, "lady")
        .map((key) => t(key))
        .join(" "),
    });
  }
  return entries;
});
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
