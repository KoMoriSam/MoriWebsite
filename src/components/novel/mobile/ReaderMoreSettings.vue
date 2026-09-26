<template>
  <section class="space-y-4 p-4">
    <label class="flex min-h-11 items-center justify-between gap-4">
      <span>
        <span class="block text-sm font-medium">{{ translate('reader.readerMoreSettings.mouseWheelPageTurning') }}</span>
        <span class="block text-xs text-base-content/55">
          {{ translate('reader.readerMoreSettings.useTheMouseWheelToTurnPagesInPagedMode') }}
        </span>
      </span>
      <input
        type="checkbox"
        class="toggle toggle-sm"
        :checked="mobileWheelPagination"
        @change="store.setMobileWheelPagination($event.target.checked)"
      />
    </label>

    <label
      class="flex min-h-11 items-center justify-between gap-4"
      :class="{ 'opacity-55': !volumeKeySupported }"
    >
      <span>
        <span class="block text-sm font-medium">{{ translate('reader.readerMoreSettings.volumeKeyPageTurning') }}</span>
        <span class="block text-xs text-base-content/55">
          {{ volumeKeyDescription }}
        </span>
      </span>
      <input
        type="checkbox"
        class="toggle toggle-sm"
        :checked="mobileVolumePagination"
        :disabled="!volumeKeySupported"
        @change="store.setMobileVolumePagination($event.target.checked)"
      />
    </label>

    <label
      type="button"
      @click="emit('edit-tap-zones')"
      class="flex min-h-11 items-center justify-between gap-4"
    >
      <span>
        <span class="block text-sm font-medium">{{ translate('reader.readerMoreSettings.tapZoneSettings') }}</span>
        <span class="block text-xs text-base-content/55">
          {{ translate('reader.readerMoreSettings.showTapZonesTapEachZoneToCycleItsAction') }}
        </span>
      </span>
      <i class="ri-grid-line shrink-0 text-xl" aria-hidden="true"></i>
    </label>
  </section>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useReaderStore } from "@/stores/readerStore";

const emit = defineEmits(["edit-tap-zones"]);
const store = useReaderStore();
const { mobileWheelPagination, mobileVolumePagination } = storeToRefs(store);
const volumeKeySupported =
  typeof window !== "undefined" &&
  (Boolean(window.MoriReaderVolumeBridge) ||
    !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
const volumeKeyDescription = computed(() =>
  volumeKeySupported
    ? translate('reader.readerMoreSettings.externalKeyboardsAreSupportedNativeContainersCanUseTheReader')
    : translate('reader.readerMoreSettings.theSystemHandlesHardwareVolumeKeysInThisBrowserThe'),
);
</script>
