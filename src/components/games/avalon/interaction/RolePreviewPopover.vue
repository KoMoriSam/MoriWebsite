<template>
  <Teleport to="body">
    <div
      :id="id"
      ref="popover"
      popover="auto"
      data-role-popover
      role="dialog"
      tabindex="-1"
      :aria-label="role ? t(`avalon.roles.${role}`) : t('avalon.roleDetails')"
      class="fixed inset-0 m-auto aspect-[2/3] h-[min(127.5vw,30rem,84dvh)] w-[min(85vw,20rem,56dvh)] overflow-visible rounded-box border-0 bg-transparent p-0 shadow-2xl focus:outline-none"
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
import { computed, nextTick, ref } from "vue";
import { useLocale } from "@/i18n";
import IdentityCard from "../display/IdentityCard.vue";

const props = defineProps({
  id: { type: String, default: undefined },
  role: { type: String, default: null },
  self: { type: Object, default: null },
  selfId: { type: String, default: "" },
  playerName: { type: Function, default: () => "" },
});
const { t } = useLocale();
const popover = ref(null);
const cardSelf = computed(() => props.self ?? { role: props.role });

async function open() {
  await nextTick();
  if (!props.role) return;
  if (!popover.value?.matches(":popover-open")) popover.value?.showPopover();
  popover.value?.focus({ preventScroll: true });
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
