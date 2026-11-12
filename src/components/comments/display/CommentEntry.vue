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
          {{ comment.author?.login || t("reader.comments.deletedUser") }}
        </span>
        <span v-if="isSiteOwner" class="badge badge-outline badge-xs">
          {{ t("reader.comments.siteOwner") }}
        </span>
        <span v-if="isContentAuthor" class="badge badge-outline badge-xs">
          {{ t("reader.comments.contentAuthor") }}
        </span>
        <CommentPopover
          :label="publishedAt"
          :title="publishedAt"
          focus-preview
          align="start"
          trigger-class="cursor-pointer whitespace-nowrap text-xs text-base-content/60 hover:underline"
          panel-class="text-xs"
        >
          <template #trigger>
            <time :datetime="comment.createdAt">{{ relativeTime }}</time>
          </template>
          <time :datetime="comment.createdAt">{{ publishedAt }}</time>
        </CommentPopover>
        <EditHistory
          v-if="comment.lastEditedAt && !comment.isMinimized"
          :key="`${historyRevision}:${comment.lastEditedAt}`"
          :comment-id="comment.id"
          :load-history="loadHistory"
        />
      </div>
      <CommentPopover
        v-if="commentUrl || canQuoteComment || canEditComment || canDeleteComment"
        ref="actions"
        class="ms-auto"
        :label="t('reader.comments.actions')"
        :disabled="busy"
        menu
        trigger-class="btn btn-ghost btn-xs btn-square"
      >
        <template #trigger>
          <i class="ri-more-line text-base" aria-hidden="true"></i>
        </template>
        <ul class="menu menu-sm w-full p-0" role="none">
          <li v-if="commentUrl" role="none">
            <button
              class="rounded-inner"
              type="button"
              role="menuitem"
              tabindex="-1"
              @click="copyLink"
            >
              {{ t("reader.comments.copyLink") }}
            </button>
          </li>
          <li v-if="canQuoteComment" role="none">
            <button
              class="rounded-inner"
              type="button"
              role="menuitem"
              tabindex="-1"
              :disabled="busy"
              @click="chooseAction('quote')"
            >
              {{ t("reader.comments.quoteReply") }}
            </button>
          </li>
          <li
            v-if="(commentUrl || canQuoteComment) && (canEditComment || canDeleteComment)"
            class="my-1 border-t border-base-300"
            role="separator"
          ></li>
          <li v-if="canEditComment" role="none">
            <button
              class="rounded-inner"
              type="button"
              role="menuitem"
              tabindex="-1"
              :disabled="busy"
              @click="chooseAction('edit')"
            >
              {{ t("reader.comments.edit") }}
            </button>
          </li>
          <li v-if="canDeleteComment" role="none">
            <button
              class="rounded-inner text-error"
              type="button"
              role="menuitem"
              tabindex="-1"
              :disabled="busy"
              @click="chooseAction('delete')"
            >
              {{ t("reader.comments.delete") }}
            </button>
          </li>
        </ul>
      </CommentPopover>
    </header>
    <p v-if="comment.isMinimized" class="px-4 py-4 text-base-content/60">
      {{ t("reader.comments.minimized") }}
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
          {{ t("reader.comments.replies", { count: number(replyCount) }, replyCount) }}
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
      {{ t("reader.comments.replies", { count: number(replyCount) }, replyCount) }}
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
          {{ t(authenticated ? "reader.comments.reply" : "reader.comments.loginToReply") }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from "vue";
import { useClipboard } from "@vueuse/core";
import Avatar from "@/components/auth/Avatar.vue";
import Renderer from "@/components/markdown/Renderer.vue";
import ReactionButtons from "./ReactionButtons.vue";
import CommentPopover from "../interaction/CommentPopover.vue";
import EditHistory from "../interaction/EditHistory.vue";
import { useLocale } from "@/i18n";
import { formatRelativeDate } from "@/i18n/format-date";
import { siteOwnerLogin } from "@/../shared/discussions.js";
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
const actions = ref(null);
function chooseAction(action) {
  actions.value?.close();
  emit(action);
}
const { t, locale, date: formatDate, number } = useLocale();
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
async function copyLink() {
  actions.value?.close();
  try {
    await copy(commentUrl.value);
    if (!copied.value) throw new Error("Clipboard is unavailable");
    toast.success(t("reader.contextMenu.linkCopied"));
  } catch {
    toast.error(t("reader.contextMenu.copyFailed"));
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
