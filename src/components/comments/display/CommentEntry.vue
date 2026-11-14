<template>
  <article
    class="min-w-0 text-sm"
    :class="{ 'comment-surface card card-border border-base-300 bg-base-100': !reply }"
  >
    <header
      class="flex min-w-0 items-center gap-2 px-4 py-2"
      :class="{ 'comment-surface-top border-b border-base-300 bg-base-200/50': !reply }"
    >
      <Avatar
        :src="avatar"
        :name="comment.author?.login"
      />
      <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 self-center">
        <a
          v-if="authorUrl"
          :href="authorUrl"
          class="link link-hover min-w-0 font-semibold wrap-anywhere"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ comment.author.login }}
        </a>
        <span v-else class="min-w-0 font-semibold wrap-anywhere">
          {{ comment.author?.login || t("comments.deletedUser") }}
        </span>
        <span v-if="isSiteOwner" class="badge badge-outline badge-xs">
          {{ t("comments.siteOwner") }}
        </span>
        <span v-if="isContentAuthor" class="badge badge-outline badge-xs">
          {{ t("comments.contentAuthor") }}
        </span>
        <Popover
          :label="publishedAt"
          :title="publishedAt"
          focus-preview
          align="center"
          trigger-class="cursor-pointer whitespace-nowrap text-xs text-base-content/60 hover:underline"
          panel-class="text-xs"
        >
          <template #trigger>
            <time :datetime="comment.createdAt">{{ relativeTime }}</time>
          </template>
          <time :datetime="comment.createdAt">{{ publishedAt }}</time>
        </Popover>
        <EditHistory
          v-if="comment.lastEditedAt && !comment.isMinimized"
          :key="`${historyRevision}:${comment.lastEditedAt}`"
          :comment-id="comment.id"
          :load-history="loadHistory"
        />
      </div>
      <ActionMenu
        :label="t('comments.actions')"
        :disabled="busy"
        :groups="actionGroups"
        trigger-class="btn btn-ghost btn-xs btn-square ms-auto"
        @select="chooseAction"
      >
        <template #trigger>
          <i class="ri-more-line text-base" aria-hidden="true"></i>
        </template>
      </ActionMenu>
    </header>
    <p v-if="comment.isMinimized" class="px-4 py-4 text-base-content/60">
      {{ minimizedMessage }}
    </p>
    <template v-else>
      <Renderer
        :content="comment.body"
        mode="comment"
        prose-size="sm"
        class="max-w-none px-4 py-4 wrap-anywhere"
        dir="auto"
      />
      <footer class="mb-3 flex flex-wrap items-center justify-between gap-2 px-4">
        <div class="flex flex-wrap items-center gap-2">
          <ReactionButtons
            :groups="reactionGroups"
            :disabled="busy || (permissions && !comment.viewerCanReact)"
            @react="$emit('react', $event)"
          />
        </div>
        <button
          v-if="replyCount"
          class="btn btn-ghost btn-xs ms-auto"
          type="button"
          :aria-expanded="repliesOpen"
          @click="$emit('toggle-replies')"
        >
          <i :class="repliesOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'" aria-hidden="true"></i>
          {{ t("comments.replies", { count: number(replyCount) }, replyCount) }}
        </button>
      </footer>
    </template>
    <button
      v-if="comment.isMinimized && replyCount"
      type="button"
      class="btn btn-ghost btn-xs mb-3 me-4 self-end"
      :aria-expanded="repliesOpen"
      @click="$emit('toggle-replies')"
    >
      {{ t("comments.replies", { count: number(replyCount) }, replyCount) }}
    </button>
    <div
      v-if="$slots.editor || $slots.replies || showReplyControl"
      class="divide-y divide-base-300 border-t border-base-300"
      :class="{ 'comment-surface-bottom bg-(--comment-reply-bg)': !reply }"
    >
      <slot v-if="editing" name="editor" />
      <slot name="replies" />
      <slot v-if="!editing" name="editor" />
      <div v-if="showReplyControl && !$slots.editor" class="p-(--comment-inset)">
        <button
          class="btn btn-sm rounded-inner w-full justify-start border-base-300 bg-base-100 font-normal text-base-content/65"
          type="button"
          :disabled="busy"
          @click="$emit('reply')"
        >
          {{ t(authenticated ? "comments.reply" : "comments.loginToReply") }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { useClipboard } from "@vueuse/core";
import Avatar from "@/components/auth/Avatar.vue";
import Renderer from "@/components/markdown/Renderer.vue";
import ReactionButtons from "./ReactionButtons.vue";
import ActionMenu from "@/components/display/menu/ActionMenu.vue";
import Popover from "@/components/display/menu/Popover.vue";
import EditHistory from "../interaction/EditHistory.vue";
import { useLocale } from "@/i18n";
import { formatRelativeDate } from "@/i18n/format-date";
import { commentMinimizedReasons, siteOwnerLogin } from "@/../shared/discussions.js";
import { useToast } from "@/composables/useToast";
import { githubDiscussionUrl } from "@/utils/github-discussion-url";
const props = defineProps({
  comment: { type: Object, required: true },
  authorLogin: { type: String, required: true },
  now: { type: Number, required: true },
  loadHistory: { type: Function, required: true },
  historyRevision: Number,
  permissions: Boolean,
  canReply: Boolean,
  authenticated: Boolean,
  canQuote: Boolean,
  repliesOpen: Boolean,
  reply: Boolean,
  editing: Boolean,
  busy: Boolean,
});
const emit = defineEmits(["reply", "quote", "edit", "delete", "react", "toggle-replies"]);
function chooseAction(action) {
  if (action === "copyLink") void copyLink();
  else emit(action);
}
const { t, locale, date: formatDate, number } = useLocale();
const minimizedMessage = computed(() => {
  const reason = props.comment.minimizedReason;
  if (!commentMinimizedReasons.includes(reason)) return t("comments.minimized");
  return t("comments.minimizedWithReason", {
    reason: t("comments.minimizedReasons." + reason),
  });
});
const login = computed(() => props.comment.author?.login?.toLowerCase());
const isSiteOwner = computed(() => login.value === siteOwnerLogin.toLowerCase());
const isContentAuthor = computed(() => login.value === props.authorLogin.toLowerCase());
const publishedAt = computed(() =>
  formatDate(props.comment.createdAt, { dateStyle: "medium", timeStyle: "short" }),
);
const relativeTime = computed(() =>
  formatRelativeDate(props.comment.createdAt, locale.value, props.now),
);
const toast = useToast();
const { copy, copied } = useClipboard({ legacy: true });
const commentUrl = computed(() => githubDiscussionUrl(props.comment.url));
const canQuoteComment = computed(
  () => (props.canReply || props.canQuote) && !props.comment.isMinimized && Boolean(props.comment.body?.trim()),
);
const canEditComment = computed(
  () => props.permissions && !props.comment.isMinimized && props.comment.viewerCanUpdate,
);
const canDeleteComment = computed(
  () => props.permissions && !props.comment.isMinimized && props.comment.viewerCanDelete,
);
const actionGroups = computed(() => [
  {
    items: [
      commentUrl.value && { id: "copyLink", label: t("comments.copyLink") },
      canQuoteComment.value && { id: "quote", label: t("comments.quoteReply") },
    ].filter(Boolean),
  },
  {
    items: [
      canEditComment.value && { id: "edit", label: t("comments.edit") },
      canDeleteComment.value && {
        id: "delete",
        label: t("comments.delete"),
        destructive: true,
      },
    ].filter(Boolean),
  },
]);

async function copyLink() {
  try {
    await copy(commentUrl.value);
    if (!copied.value) throw new Error("Clipboard is unavailable");
    toast.success(t("comments.linkCopied"));
  } catch {
    toast.error(t("comments.copyLinkFailed"));
  }
}
const replyCount = computed(() => props.comment.replies?.totalCount || 0);
const showReplyControl = computed(
  () => props.canReply && !props.comment.isMinimized,
);
const authorUrl = computed(() =>
  /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/?$/u.test(
    props.comment.author?.url || "",
  )
    ? props.comment.author.url
    : "",
);
const avatar = computed(() =>
  /^https:\/\/avatars\.githubusercontent\.com\//u.test(
    props.comment.author?.avatarUrl || "",
  )
    ? props.comment.author.avatarUrl
    : "",
);
const reactionGroups = computed(() =>
  props.comment.reactionGroups?.map((group) => ({
    ...group,
    viewerHasReacted: props.permissions && group.viewerHasReacted,
  })),
);
</script>
