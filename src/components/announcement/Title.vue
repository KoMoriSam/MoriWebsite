<template>
  <hgroup class="min-w-0 flex-1">
    <span class="flex flex-wrap items-center gap-2">
      <AnnouncementBadges :announcement="announcement" :read="read" />
      <component
        :is="headingTag"
        class="text-balance"
        :class="read ? 'font-normal text-base-content/50' : 'font-bold'"
      >
        {{ announcement.title }}
      </component>
      <time
        v-if="showTime"
        :datetime="announcement.startsAt"
        class="hidden text-xs font-normal text-base-content/45 sm:block"
      >
        {{ formatAnnouncementDate(announcement.startsAt, true) }}
      </time>
    </span>
    <slot></slot>
  </hgroup>
</template>

<script setup>
import AnnouncementBadges from "@/components/announcement/Badges.vue";
import { formatAnnouncementDate } from "@/utils/announcements";

defineProps({
  announcement: {
    type: Object,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  headingTag: {
    type: String,
    default: "h3",
    validator: (value) => ["h2", "h3", "h4", "h5", "h6"].includes(value),
  },
  showTime: {
    type: Boolean,
    default: false,
  },
});
</script>
