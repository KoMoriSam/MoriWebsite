<template>
  <span v-if="showLatest" class="badge badge-warning badge-xs shrink-0">
    {{ latestLabel }}
  </span>
  <span
    v-if="chapter.modifiedDate"
    class="badge badge-info badge-xs shrink-0"
    title="该章节有过修订"
  >
    {{ revisionLabel }}
  </span>
  <span
    v-else
    class="badge badge-ghost badge-xs shrink-0"
    title="该章节为首发版本"
  >
    首发
  </span>
  <span v-if="showRecent" class="badge badge-warning badge-xs shrink-0">
    {{ recentLabel }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  chapter: {
    type: Object,
    required: true,
  },
  latestChapterUuid: {
    type: String,
    default: "",
  },
  read: {
    type: Boolean,
    default: false,
  },
  recent: {
    type: Boolean,
    default: false,
  },
  latestLabel: {
    type: String,
    default: "最新",
  },
  revisionLabel: {
    type: String,
    default: "有修订",
  },
  recentLabel: {
    type: String,
    default: "NEW",
  },
});

const isLatest = computed(() => props.chapter.uuid === props.latestChapterUuid);
const showLatest = computed(() => isLatest.value && !props.read);
const showRecent = computed(
  () => props.recent && !isLatest.value && !props.read,
);
</script>
