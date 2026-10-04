<template>
  <HelpDialog :title="t('avalon.reference')">
    <template #default="{ previewTarget }"
      ><ReferenceContent
        class="min-h-0 flex-1"
        :room="room"
        :preview-target="previewTarget"
    /></template>
  </HelpDialog>
</template>
<script setup>
import HelpDialog from "../../display/HelpDialog.vue";
import ReferenceContent from "./ReferenceContent.vue";
import { useLocale } from "@/i18n";
defineProps({ room: { type: Object, required: true } });
const { t } = useLocale();
</script>
