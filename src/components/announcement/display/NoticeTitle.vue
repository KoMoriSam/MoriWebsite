<template>
  <hgroup v-bind="$attrs" class="flex flex-col items-start gap-2">
    <NoticeBadges :announcement="announcement" :read="read" />
    <span class="flex items-center gap-2">
      <h3
        class="text-balance text-base"
        :class="read ? 'font-normal text-base-content/50' : 'font-bold'"
      >
        {{ announcement.title }}
      </h3>
      <time
        v-if="showTime"
        :datetime="announcement.startsAt"
        class="hidden text-xs font-normal text-base-content/45 sm:block"
      >
        {{ formatAnnouncementDate(announcement.startsAt, true, uiLocale) }}
      </time>
    </span>
  </hgroup>
  <slot></slot>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { locale: uiLocale } = useLocale();
import NoticeBadges from "@/components/announcement/display/NoticeBadges.vue";
import { formatAnnouncementDate } from "@/utils/announcement/format";

defineOptions({
  inheritAttrs: false,
});

defineProps({
  announcement: {
    type: Object,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  showTime: {
    type: Boolean,
    default: false,
  },
});
</script>
