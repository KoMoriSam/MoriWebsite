<template>
  <div
    class="tooltip tooltip-bottom lg:hidden"
    :data-tip="t('avalon.reference')"
  >
    <button
      type="button"
      class="btn btn-square btn-ghost btn-xs"
      :aria-label="t('avalon.reference')"
      @click="open"
    >
      <i class="ri-book-2-line" aria-hidden="true"></i>
    </button>
  </div>
  <dialog :id="dialogId" ref="dialog" class="modal lg:hidden" @cancel.prevent="modalClose.requestPlatformClose()">
    <div class="modal-box flex max-h-[calc(100dvh-2rem)] min-h-0 w-[calc(100vw-2rem)] max-w-xl flex-col gap-3 overflow-hidden p-4">
      <div class="flex shrink-0 items-center justify-between gap-2">
        <h2 class="font-serif text-lg font-semibold">{{ t('avalon.reference') }}</h2>
        <button type="button" class="btn btn-square btn-ghost btn-sm" :aria-label="t('common.modal.close')" @click="close">
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>
      <ReferenceContent class="min-h-0 flex-1" :room="room" :preview-target="`#${dialogId}`" />
    </div>
    <div class="modal-backdrop"><button type="button" :aria-label="t('common.modal.close')" @click="close"></button></div>
  </dialog>
</template>

<script setup>
import { ref, useId } from "vue";
import { useLocale } from "@/i18n";
import { useModalClose } from "@/composables/useModal";
import ReferenceContent from "./ReferenceContent.vue";

defineProps({ room: { type: Object, required: true } });
const { t } = useLocale();
const dialog = ref(null);
const dialogId = `avalon-reference-${useId()}`;
const modalClose = useModalClose({ onClose: () => dialog.value?.close() });

function open() {
  if (!dialog.value || dialog.value.open) return;
  modalClose.activate();
  dialog.value.showModal();
}

function close() {
  modalClose.requestClose();
}
</script>
