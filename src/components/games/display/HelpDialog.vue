<template>
  <div
    class="tooltip tooltip-bottom"
    :class="mobileOnly ? 'lg:hidden' : ''"
    :data-tip="title"
  >
    <button
      type="button"
      class="btn btn-square btn-ghost btn-xs"
      :aria-label="title"
      @click="open"
    >
      <i class="ri-book-2-line" aria-hidden="true"></i>
    </button>
  </div>
  <dialog
    :id="dialogId"
    ref="dialog"
    class="modal"
    :class="mobileOnly ? 'lg:hidden' : ''"
    :aria-labelledby="`${dialogId}-title`"
    @cancel.prevent="modalClose.requestPlatformClose()"
  >
    <div
      class="modal-box flex max-h-[calc(100dvh-2rem)] min-h-0 w-[calc(100vw-2rem)] flex-col gap-3 overflow-hidden p-4"
      :class="wide ? 'max-w-4xl' : 'max-w-xl'"
    >
      <div class="flex shrink-0 items-center justify-between gap-2">
        <h2 :id="`${dialogId}-title`" class="font-serif text-lg font-semibold">
          {{ title }}
        </h2>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm"
          :aria-label="t('common.modal.close')"
          @click="modalClose.requestClose()"
        >
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </div>
      <slot :preview-target="`#${dialogId}`"></slot>
    </div>
    <div class="modal-backdrop">
      <button
        type="button"
        :aria-label="t('common.modal.close')"
        @click="modalClose.requestClose()"
      ></button>
    </div>
  </dialog>
</template>
<script setup>
import { ref, useId } from "vue";
import { useModalClose } from "@/composables/useModal";
import { useLocale } from "@/i18n";
defineProps({
  title: { type: String, required: true },
  mobileOnly: { type: Boolean, default: true },
  wide: Boolean,
});
const { t } = useLocale();
const dialog = ref(null),
  dialogId = `game-reference-${useId()}`;
const modalClose = useModalClose({ onClose: () => dialog.value?.close() });
function open() {
  if (!dialog.value || dialog.value.open) return;
  modalClose.activate();
  dialog.value.showModal();
}
</script>
