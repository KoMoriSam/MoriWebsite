<template>
  <aside class="flex gap-2 items-center">
    <span
      v-if="!read"
      class="status animate-bounce"
      :class="statusClass"
      aria-hidden="true"
    ></span>
    <span v-if="announcement.pinned" class="badge badge-primary badge-xs">
      <i class="ri-pushpin-line" aria-hidden="true"></i>
      {{ translate('common.badges.pinned') }}
    </span>
    <span
      v-if="announcement.priority === 'important'"
      class="badge badge-error badge-xs font-bold"
      :class="read ? 'badge-soft' : ''"
    >
      {{ translate('common.badges.important') }}
    </span>
    <span v-if="!announcement.active" class="badge badge-ghost badge-xs">
      {{ translate('common.badges.ended') }}
    </span>
    <span
      class="badge badge-xs"
      :class="{
        'badge-soft':
          ((announcement.pinned && read) ||
            announcement.priority === 'important') &&
          read,
        'badge-ghost': !announcement.pinned && read,
        'badge-outline': !read,
        [`badge-${announcement.tone}`]:
          (announcement.pinned && read) ||
          announcement.priority === 'important' ||
          !read,
      }"
    >
      {{ localizeText(announcementToneLabel[announcement.tone]) }}
    </span>
    <span
      v-if="announcement.revision > 1"
      class="badge badge-xs"
      :class="read ? 'badge-soft' : 'badge-outline'"
    >
      {{ translate('common.badges.revised') }}
    </span>
  </aside>
</template>

<script setup>
import { useLocale } from '@/i18n';
const { t: translate, text: localizeText } = useLocale();

import { computed } from "vue";

import { announcementToneLabel } from "@/utils/announcements";

const props = defineProps({
  announcement: {
    type: Object,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const statusClass = computed(() => {
  if (props.announcement.pinned) return "status-primary";
  if (
    props.announcement.priority === "important" ||
    props.announcement.tone === "error"
  ) {
    return "status-error";
  }
  return props.announcement.tone === "info" ? "status-info" : "status-warning";
});
</script>
