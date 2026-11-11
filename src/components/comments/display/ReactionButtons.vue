<template>
  <div class="flex flex-wrap items-center gap-1">
    <button v-for="reaction in activeReactions" :key="reaction.content" type="button"
      class="btn btn-xs btn-ghost" :class="{ 'btn-active': reaction.viewerHasReacted }"
      :disabled="disabled" :aria-pressed="Boolean(reaction.viewerHasReacted)"
      :aria-label="t('reader.comments.reaction', { emoji: reaction.emoji })"
      @click="$emit('react', reaction)">
      {{ reaction.emoji }} {{ reaction.count }}
    </button>
    <details ref="picker" class="dropdown dropdown-top">
      <summary class="btn btn-xs btn-square btn-ghost"
        :aria-label="t('reader.comments.chooseReaction')" :aria-disabled="disabled"
        @click="disabled && $event.preventDefault()">
        <i class="ri-emotion-happy-line" aria-hidden="true"></i>
      </summary>
      <div class="dropdown-content z-10 flex w-32 flex-wrap gap-1 rounded-box border border-base-300 bg-base-100 p-2 shadow">
        <button v-for="reaction in reactions" :key="reaction.content" type="button"
          class="btn btn-xs btn-square btn-ghost" :class="{ 'btn-active': reaction.viewerHasReacted }"
          :disabled="disabled" :aria-pressed="Boolean(reaction.viewerHasReacted)"
          :aria-label="t('reader.comments.reaction', { emoji: reaction.emoji })"
          @click="choose(reaction)">
          {{ reaction.emoji }}
        </button>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useLocale } from "@/i18n";
const props = defineProps({ groups: { type: Array, default: () => [] }, disabled: Boolean });
const emit = defineEmits(["react"]);
const { t } = useLocale();
const picker = ref(null);
const emojis = {
  THUMBS_UP: "👍", THUMBS_DOWN: "👎", LAUGH: "😄", HOORAY: "🎉",
  CONFUSED: "😕", HEART: "❤️", ROCKET: "🚀", EYES: "👀",
};
const reactions = computed(() => Object.entries(emojis).map(([content, emoji]) => {
  const group = props.groups.find((item) => item.content === content);
  return { content, emoji, count: group?.users?.totalCount || 0, viewerHasReacted: group?.viewerHasReacted };
}));
const activeReactions = computed(() => reactions.value.filter((reaction) => reaction.count > 0));
function choose(reaction) {
  picker.value.open = false;
  emit("react", reaction);
}
</script>
