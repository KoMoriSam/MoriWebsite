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
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square shrink-0"
      :aria-label="t('avalon.roleDetails')"
      aria-haspopup="dialog"
      :aria-controls="previewId"
      @click="preview?.open()"
    >
      <i class="ri-information-line" aria-hidden="true"></i>
    </button>
    <AvalonRolePreviewPopover
      :id="previewId"
      ref="preview"
      :role="self.role"
      :self="self"
      :self-id="selfId"
      :player-name="playerName"
    />
  </div>
</template>

<script setup>
import { ref, useId } from "vue";
import { useLocale } from "@/i18n";
import { ROLE_ICONS } from "@/games/avalon-presentation";
import { isEvil } from "../../../../shared/games/avalon.js";
import AvalonRolePreviewPopover from "./AvalonRolePreviewPopover.vue";

defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
});
const { t } = useLocale();
const previewId = `avalon-role-preview-${useId()}`;
const preview = ref(null);
</script>
