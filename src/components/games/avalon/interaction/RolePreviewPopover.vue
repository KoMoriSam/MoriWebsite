<template>
  <Teleport :to="teleportTarget">
    <div
      :id="id"
      ref="popover"
      popover="auto"
      data-role-popover
      role="dialog"
      tabindex="-1"
      :aria-label="role ? t(`avalon.roles.${role}`) : t('avalon.roleDetails')"
      class="fixed inset-0 m-auto aspect-[2/3] h-[min(127.5vw,30rem,84dvh)] w-[min(85vw,20rem,56dvh)] overflow-visible rounded-box border-0 bg-transparent p-0 shadow-2xl focus:outline-none"
      @click="closeOnCardClick"
      @toggle="handleToggle"
    >
      <IdentityCard
        v-if="role"
        :self="cardSelf"
        :self-id="selfId"
        :player-name="playerName"
        face-up
        preview
      />
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useLocale } from "@/i18n";
import { useModalClose } from "@/composables/useModal";
import IdentityCard from "../display/IdentityCard.vue";

const props = defineProps({
  target: { type: String, default: "body" },
  id: { type: String, default: undefined },
  role: { type: String, default: null },
  self: { type: Object, default: null },
  selfId: { type: String, default: "" },
  playerName: { type: Function, default: () => "" },
});
const { t } = useLocale();
const popover = ref(null);
const teleportTarget = ref("body");
const cardSelf = computed(() => props.self ?? { role: props.role });
const modalClose = useModalClose({
  onClose: () => {
    if (popover.value?.matches(":popover-open")) popover.value.hidePopover();
  },
});

onMounted(async () => {
  await nextTick();
  if (props.target !== "body" && document.querySelector(props.target)) {
    teleportTarget.value = props.target;
  }
});

async function open() {
  await nextTick();
  if (!props.role || !popover.value) return;
  if (!popover.value.matches(":popover-open")) {
    popover.value.showPopover();
    modalClose.activate();
  }
  popover.value?.focus({ preventScroll: true });
}

function handleToggle(event) {
  if (event.newState === "closed" && modalClose.isActive()) {
    modalClose.requestClose();
  }
}

function closeOnCardClick() {
  if (window.matchMedia("(max-width: 1023px)").matches) {
    modalClose.requestClose();
  }
}

defineExpose({ open });
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

[data-role-popover]:popover-open {
  opacity: 1;
  scale: 1;
  translate: 0;
}

@starting-style {
  [data-role-popover]:popover-open {
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
