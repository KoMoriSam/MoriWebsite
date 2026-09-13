<template>
  <span
    v-if="!read"
    class="status animate-bounce"
    :class="statusClass"
    aria-hidden="true"
  ></span>
  <span
    v-if="announcement.pinned"
    class="badge badge-primary badge-outline badge-xs"
  >
    <i class="ri-pushpin-line" aria-hidden="true"></i>
    置顶
  </span>
  <span
    v-if="announcement.priority === 'important'"
    class="badge badge-error badge-xs"
    :class="read ? 'badge-soft' : ''"
  >
    重要
  </span>
  <span
    v-if="announcement.revision > 1"
    class="badge badge-xs"
    :class="read ? 'badge-ghost' : 'badge-outline'"
  >
    有修订
  </span>
  <span v-if="!announcement.active" class="badge badge-ghost badge-xs">
    已结束
  </span>
  <span
    class="badge badge-xs"
    :class="{
      'badge-soft': announcement.pinned && read,
      'badge-ghost': !announcement.pinned && read,
      'badge-outline': !read,
      [`badge-${announcement.tone}`]: announcement.pinned || !read,
    }"
  >
    {{ announcementToneLabel[announcement.tone] }}
  </span>
</template>

<script setup>
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
