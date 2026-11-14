<template>
  <div class="flex flex-wrap items-center gap-2">
    <Popover
      ref="picker"
      :label="t('comments.chooseReaction')"
      :disabled="disabled"
      :placement="placement"
      align="start"
      trigger-class="btn btn-xs btn-circle border-base-300 bg-base-100"
      panel-class="grid grid-cols-3 gap-1"
    >
      <template #trigger>
        <i class="ri-emotion-happy-line text-base" aria-hidden="true"></i>
      </template>
      <button
        v-for="reaction in reactions"
        :key="reaction.content"
        type="button"
        class="btn btn-xs btn-square btn-ghost rounded-inner"
        :class="{ 'btn-active': reaction.viewerHasReacted }"
        :disabled="disabled"
        :aria-pressed="Boolean(reaction.viewerHasReacted)"
        :aria-label="t('comments.reaction', { emoji: reaction.emoji })"
        @click="choose(reaction)"
      >
        {{ reaction.emoji }}
      </button>
    </Popover>
    <button
      v-for="vote in votes"
      :key="vote.content"
      type="button"
      class="btn btn-xs rounded-full"
      :class="
        vote.viewerHasReacted ? 'btn-primary' : 'border-base-300 bg-base-100'
      "
      :disabled="disabled"
      :aria-pressed="Boolean(vote.viewerHasReacted)"
      :aria-label="vote.label"
      :title="vote.label"
      @click="$emit('react', vote)"
    >
      <i :class="vote.icon" aria-hidden="true"></i>
      {{ number(vote.count) }}
    </button>
    <button
      v-for="reaction in activeReactions"
      :key="reaction.content"
      type="button"
      class="btn btn-xs rounded-full"
      :class="reaction.viewerHasReacted ? 'btn-soft btn-primary' : 'btn-soft'"
      :disabled="disabled"
      :aria-pressed="Boolean(reaction.viewerHasReacted)"
      :aria-label="t('comments.reaction', { emoji: reaction.emoji })"
      @click="$emit('react', reaction)"
    >
      {{ reaction.emoji }} {{ reaction.count }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useLocale } from "@/i18n";
import Popover from "@/components/display/menu/Popover.vue";
const props = defineProps({
  groups: { type: Array, default: () => [] },
  disabled: Boolean,
  placement: { type: String, default: "top" },
});
const emit = defineEmits(["react"]);
const { t, number } = useLocale();
const picker = ref(null);
const emojis = {
  LAUGH: "😄",
  HOORAY: "🎉",
  CONFUSED: "😕",
  HEART: "❤️",
  ROCKET: "🚀",
  EYES: "👀",
};
const voteButtons = [
  { content: "THUMBS_UP", icon: "ri-thumb-up", label: "like", undo: "unlike" },
  {
    content: "THUMBS_DOWN",
    icon: "ri-thumb-down",
    label: "dislike",
    undo: "undislike",
  },
];
function getReaction(content) {
  const group = props.groups.find((item) => item.content === content);
  return {
    content,
    count: group?.users?.totalCount || 0,
    viewerHasReacted: group?.viewerHasReacted,
  };
}
const votes = computed(() =>
  voteButtons.map(({ content, icon, label, undo }) => {
    const reaction = getReaction(content);
    const selected = reaction.viewerHasReacted;
    return {
      ...reaction,
      icon: `${icon}-${selected ? "fill" : "line"}`,
      label: t(`comments.${selected ? undo : label}`),
    };
  }),
);
const reactions = computed(() =>
  Object.entries(emojis).map(([content, emoji]) => ({
    ...getReaction(content),
    emoji,
  })),
);
const activeReactions = computed(() =>
  reactions.value.filter(({ count }) => count > 0),
);
function choose(reaction) {
  picker.value?.close();
  emit("react", reaction);
}
</script>
