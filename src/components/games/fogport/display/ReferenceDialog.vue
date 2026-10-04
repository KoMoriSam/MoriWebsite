<template>
  <HelpDialog
    :title="t('fogport.visual.reference')"
    :mobile-only="mobileOnly"
    wide
    ><Rulebook class="min-h-0 flex-1"
  /></HelpDialog>
</template>
<script setup>
import HelpDialog from "../../display/HelpDialog.vue";
import Rulebook from "./Rulebook.vue";
import { useLocale } from "@/i18n";
defineProps({ mobileOnly: Boolean });
const { t } = useLocale();
</script>
