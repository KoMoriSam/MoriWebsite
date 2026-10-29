<template>
  <div>
    <GreetingMessage :side="side">
      {{ translate("novel.detail.greeting.long") }}
    </GreetingMessage>
    <GreetingMessage :side="side" :delay="2800">
      {{ translate("novel.detail.greeting.short") }}
    </GreetingMessage>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";
import GreetingMessage from "@/components/interaction/feedback/GreetingMessage.vue";

defineProps({ side: { type: String, default: "end" } });
const { t: translate } = useLocale();
</script>
