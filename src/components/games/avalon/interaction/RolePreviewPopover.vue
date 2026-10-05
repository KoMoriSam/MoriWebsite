<template>
  <Teleport :to="teleportTarget">
    <component
      :is="persistent ? 'dialog' : 'div'"
      :id="id"
      ref="popover"
      :popover="persistent ? undefined : 'auto'"
      data-role-popover
      role="dialog"
      :aria-modal="persistent ? true : undefined"
      tabindex="-1"
      :aria-label="
        dialogLabel ||
        (allegianceSwitch
          ? t('avalon.lancelot.switchTitle')
          : skillCard
            ? t(skillCard.title)
            : role
              ? t(`avalon.roles.${role}`)
              : t('avalon.roleDetails'))
      "
      class="fixed inset-0 m-auto border-0 bg-transparent p-0 focus:outline-none"
      :class="
        $slots.default
          ? 'h-fit max-h-none max-w-none w-[min(90vw,var(--card-popover-width))] overflow-visible'
          : 'aspect-[2/3] h-[min(127.5vw,30rem,84dvh)] w-[min(85vw,20rem,56dvh)] overflow-visible rounded-box shadow-2xl'
      "
      :style="
        $slots.default
          ? {
              '--card-popover-width': `calc(min(85vw, 20rem, 56dvh) * ${columns} + 0.75rem * ${columns - 1})`,
            }
          : undefined
      "
      @click="handleCardClick"
      @toggle="handleToggle"
      @close="handleNativeClose"
      @cancel="handleCancel"
      @keydown.esc="handleEscape"
    >
      <slot v-if="$slots.default"></slot>
      <SkillCard v-else-if="skillCard && !allegianceSwitch" :skill="skill" />
      <IdentityCard
        v-else-if="role || allegianceSwitch"
        :self="cardSelf"
        :self-id="selfId"
        :player-name="playerName"
        :game-config="gameConfig"
        :face-up="faceUp"
        :allegiance-switch="allegianceSwitch"
        :switch-from-alignment="switchFromAlignment"
        :back-title="allegianceSwitch ? t('avalon.lancelot.switchTitle') : ''"
        preview
      />
    </component>
  </Teleport>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
} from "vue";
import { onClickOutside } from "@vueuse/core";
import { useLocale } from "@/i18n";
import { useModalClose } from "@/composables/useModal";
import IdentityCard from "../display/IdentityCard.vue";
import SkillCard from "../display/SkillCard.vue";
import { SKILL_CARDS } from "@/games/avalon/presentation";
import { LANCELOTS } from "../../../../../shared/games/avalon/index.js";

const props = defineProps({
  target: { type: String, default: "body" },
  id: { type: String, default: undefined },
  role: { type: String, default: null },
  skill: { type: String, default: null },
  self: { type: Object, default: null },
  gameConfig: { type: Object, default: () => ({}) },
  mode: { type: String, default: "fixed" },
  alignment: { type: String, default: undefined },
  selfId: { type: String, default: "" },
  playerName: { type: Function, default: () => "" },
  allegianceSwitch: Boolean,
  switchFromAlignment: { type: String, default: null },
  faceUp: { type: Boolean, default: true },
  dialogLabel: { type: String, default: "" },
  columns: { type: Number, default: 1 },
  closeOnCardClick: { type: Boolean, default: true },
  persistent: Boolean,
});
const slots = useSlots();
const emit = defineEmits(["closed"]);
const { t } = useLocale();
const popover = ref(null);
const skillCard = computed(() => SKILL_CARDS[props.skill]);
const teleportTarget = ref("body");
const cardSelf = computed(() => {
  if (props.allegianceSwitch) {
    // Only the viewer's own Lancelot can supply a private event face.
    return LANCELOTS.includes(props.self?.role)
      ? {
          role: props.self.role,
          alignment: props.self.alignment,
          lancelotMode: "switching",
        }
      : {};
  }
  return (
    props.self ?? {
      role: props.role,
      lancelotMode: props.mode,
      alignment: props.alignment,
    }
  );
});
const modalClose = useModalClose({
  onClose: () => {
    if (props.persistent) popover.value?.close();
    else if (popover.value?.matches(":popover-open"))
      popover.value.hidePopover();
    emit("closed");
  },
  shouldCloseFromFallback: () => !props.persistent,
  onBlockedFallback: indicateBlockedDismiss,
});
let blockedDismissAnimation = null;
function indicateBlockedDismiss() {
  const element = popover.value;
  if (!element?.open) return;
  element.focus({ preventScroll: true });
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  blockedDismissAnimation?.cancel();
  blockedDismissAnimation = element.animate(
    [0, -8, 6, -4, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 280, easing: "ease-out" },
  );
}
onBeforeUnmount(() => blockedDismissAnimation?.cancel());
onClickOutside(popover, () => {
  if (
    props.persistent &&
    [...document.querySelectorAll("dialog[open]")].at(-1) === popover.value
  )
    indicateBlockedDismiss();
});

onMounted(async () => {
  await nextTick();
  if (props.target !== "body" && document.querySelector(props.target)) {
    teleportTarget.value = props.target;
  }
});

async function open() {
  await nextTick();
  if (
    (!slots.default &&
      !props.role &&
      !props.allegianceSwitch &&
      !skillCard.value) ||
    !popover.value ||
    (props.allegianceSwitch && !LANCELOTS.includes(props.self?.role))
  )
    return;
  const isOpen = props.persistent
    ? popover.value.open
    : popover.value.matches(":popover-open");
  if (!isOpen) {
    modalClose.activate();
    if (props.persistent) popover.value.showModal();
    else popover.value.showPopover();
  }
  popover.value?.focus({ preventScroll: true });
}

function handleToggle(event) {
  if (props.persistent) return;
  if (event.newState === "closed" && modalClose.isActive()) {
    modalClose.requestClose();
  }
}

function handleCardClick(event) {
  if (props.persistent) {
    if (event.target === event.currentTarget) indicateBlockedDismiss();
    return;
  }
  if (
    props.closeOnCardClick &&
    window.matchMedia("(max-width: 1023px)").matches
  ) {
    modalClose.requestClose();
  }
}
function handleEscape(event) {
  if (!props.persistent) return;
  event.preventDefault();
  event.stopPropagation();
  indicateBlockedDismiss();
}
function handleCancel(event) {
  if (!props.persistent) return;
  event.preventDefault();
  indicateBlockedDismiss();
}
function handleNativeClose() {
  if (props.persistent && modalClose.isActive()) modalClose.requestClose();
}

defineExpose({ open, close: modalClose.requestClose });
</script>

<style scoped>
[data-role-popover] {
  opacity: 0;
  scale: 0.95;
  translate: 0 2%;
  transition:
    opacity 0.2s ease-out,
    scale 0.3s ease-out,
    translate 0.3s ease-out,
    display 0.3s allow-discrete,
    overlay 0.3s allow-discrete;
}

[data-role-popover]:popover-open,
[data-role-popover][open] {
  opacity: 1;
  scale: 1;
  translate: 0;
}

@starting-style {
  [data-role-popover]:popover-open,
  [data-role-popover][open] {
    opacity: 0;
    scale: 0.95;
    translate: 0 2%;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-role-popover] {
    transition: none;
  }
}
</style>
