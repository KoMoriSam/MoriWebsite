<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-20 z-80 flex justify-center px-3"
  >
    <div
      role="alert"
      class="alert pointer-events-auto max-w-xl sm:alert-horizontal"
    >
      <span>{{ translate("common.navigationStatus.failed") }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-sm" @click="emit('retry')">
          {{ translate("common.navigationStatus.retry") }}
        </button>
        <a :href="reloadHref" class="btn btn-sm btn-ghost">
          {{ translate("common.navigationStatus.reload") }}
        </a>
        <button type="button" class="btn btn-sm btn-ghost" @click="emit('dismiss')">
          {{ translate("common.modal.close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocale } from "@/i18n";

defineProps({ reloadHref: { type: String, required: true } });
const emit = defineEmits(["retry", "dismiss"]);
const { t: translate } = useLocale();
</script>
