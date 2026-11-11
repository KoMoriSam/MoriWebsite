<template>
  <article class="min-w-0 rounded-box border border-base-300 bg-base-100">
    <header class="flex flex-wrap items-center gap-2 rounded-t-box bg-base-200 px-3 py-2 text-sm">
      <Avatar :src="avatar" :name="comment.author?.login" class="size-6 shrink-0" />
      <a v-if="authorUrl" :href="authorUrl" class="font-medium hover:underline" target="_blank" rel="noopener noreferrer">
        {{ comment.author.login }}
      </a>
      <span v-else>{{ comment.author?.login || t('reader.comments.deletedUser') }}</span>
      <time :datetime="comment.createdAt" class="text-base-content/60">
        {{ formatDate(comment.createdAt, { dateStyle: 'medium', timeStyle: 'short' }) }}
      </time>
    </header>
    <div class="space-y-2 p-3">
      <p v-if="comment.isMinimized" class="text-sm text-base-content/60">{{ t('reader.comments.minimized') }}</p>
      <template v-else>
        <div class="prose prose-sm max-w-none wrap-anywhere" v-html="renderCommentMarkdown(comment.body)" />
        <div class="flex flex-wrap items-center justify-between gap-2">
          <ReactionButtons :groups="reactionGroups" :disabled="busy || (permissions && !comment.viewerCanReact)"
            @react="$emit('react', $event)" />
          <div class="flex flex-wrap gap-1">
            <button v-if="canReply" class="btn btn-ghost btn-xs" type="button" :disabled="busy" @click="$emit('reply')">
              {{ t('reader.comments.reply') }}
            </button>
            <button v-if="permissions && comment.viewerCanUpdate" class="btn btn-ghost btn-xs" type="button"
              :disabled="busy" @click="$emit('edit')">{{ t('reader.comments.edit') }}</button>
            <button v-if="permissions && comment.viewerCanDelete" class="btn btn-ghost btn-xs text-error" type="button"
              :disabled="busy" @click="$emit('delete')">{{ t('reader.comments.delete') }}</button>
          </div>
        </div>
      </template>
      <slot />
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import Avatar from "@/components/auth/Avatar.vue";
import ReactionButtons from "./ReactionButtons.vue";
import { useLocale } from "@/i18n";
import { renderCommentMarkdown } from "@/services/comment-markdown";
const props = defineProps({ comment: { type: Object, required: true }, permissions: Boolean, canReply: Boolean, busy: Boolean });
defineEmits(["reply", "edit", "delete", "react"]);
const { t, date: formatDate } = useLocale();
const authorUrl = computed(() => /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/?$/u.test(props.comment.author?.url || "")
  ? props.comment.author.url : "");
const avatar = computed(() => /^https:\/\/avatars\.githubusercontent\.com\//u.test(props.comment.author?.avatarUrl || "")
  ? props.comment.author.avatarUrl : "");
const reactionGroups = computed(() => props.comment.reactionGroups?.map((group) => ({
  ...group, viewerHasReacted: props.permissions && group.viewerHasReacted,
})));
</script>
