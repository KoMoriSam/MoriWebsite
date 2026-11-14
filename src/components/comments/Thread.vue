<template>
  <section
    ref="threadElement"
    class="comment-thread flex min-h-0 w-full min-w-0 flex-col gap-6 font-sans"
    :class="{
      '[--comment-editor-max-height:40dvh]': scrollMode === 'dialog',
      'lg:[--comment-editor-max-height:40dvh]': scrollMode === 'sidebar',
    }"
    :aria-busy="pending"
    :aria-label="t('comments.title')"
  >
    <component :is="scrollMode ? ScrollableContainer : 'div'">
      <div
        class="grid min-h-0 grid-cols-1 content-start gap-6"
        :class="{
          'overflow-y-auto scrollbar-thin': scrollMode === 'dialog',
          'lg:overflow-y-auto lg:scrollbar-thin': scrollMode === 'sidebar',
        }"
      >
        <CommentsPlaceholder
          v-if="showPlaceholder"
          :authenticated="moriSession.authenticated"
          content-only
        />
        <div
          v-if="error"
          role="alert"
          class="flex flex-wrap items-center gap-2 text-sm text-error"
        >
          <span>{{ t(error) }}</span>
          <button
            v-if="error === 'comments.reauthorize'"
            type="button"
            class="btn btn-sm"
            @click="auth.login({ reauthorize: true, hash: returnHash })"
          >
            {{ t("auth.login") }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn-sm"
            :disabled="pending || busy"
            @click="retryRequest()"
          >
            {{ t("common.navigationStatus.retry") }}
          </button>
        </div>
        <template v-if="loaded">
          <div class="flex flex-wrap items-center gap-2 border-b border-base-300 pb-3 text-sm">
            <ReactionButtons
              placement="bottom"
              :groups="threadReactions"
              :disabled="busy || (permissions && !discussion?.viewerCanReact)"
              @react="react(null, $event)"
            />
            <a
              v-if="discussionUrl"
              :href="discussionUrl"
              class="link link-hover ms-auto flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i class="ri-github-fill" aria-hidden="true"></i>
              {{ t("comments.openGithub") }}
            </a>
          </div>
          <div class="flex min-w-0 flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                <span>{{ t("common.counts.comments", { count: number(commentCount) }, commentCount) }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ t("comments.replies", { count: number(replyCount) }, replyCount) }}</span>
              </span>
              <div v-if="discussion" class="flex flex-wrap items-center gap-2">
                <div
                  class="tabs tabs-box tabs-sm"
                  role="radiogroup"
                  :aria-label="t('comments.sort.label')"
                >
                  <input
                    v-for="order in ['oldest', 'newest', 'top']"
                    :key="order"
                    v-model="sort"
                    :name="sortGroup"
                    :value="order"
                    :aria-label="t('comments.sort.' + order)"
                    :disabled="pending"
                    type="radio"
                    class="tab whitespace-nowrap"
                  />
                </div>
              </div>
            </div>
            <p v-if="discussion?.locked" class="text-sm text-base-content/70">
              {{ t("comments.locked") }}
            </p>

            <p v-if="!comments.length" class="text-sm text-base-content/65">
              {{ t("comments.empty") }}
            </p>
            <div v-else class="flex min-w-0 flex-col gap-4">
              <CommentEntry
                v-for="comment in comments"
                :key="comment.id"
                :comment="comment"
                :author-login="authorLogin"
                :now="now"
                :load-history="loadEditHistory"
                :history-revision="moriSession.revision"
                :permissions="permissions"
                :can-reply="!discussion.locked"
                :authenticated="moriSession.authenticated"
                :busy="busy"
                :editing="editor.id === comment.id && editor.action === 'edit'"
                :replies-open="repliesOpen(comment)"
                @toggle-replies="toggleReplies(comment)"
                @reply="replyToComment(comment)"
                @quote="quoteReply(comment, comment)"
                @edit="startEditor('edit', comment)"
                @delete="remove(comment)"
                @react="react(comment.id, $event)"
              >
                <template
                  v-if="editor.id === comment.id && (editor.action !== 'reply' || moriSession.authenticated)"
                  #editor
                >
                  <CommentEditor
                    v-model="editor.body"
                    :return-hash="returnHash"
                    :login-action="auth.login"
                    embedded
                    cancelable
                    :authenticated="moriSession.authenticated"
                    :busy="busy || moriSession.checking"
                    :action="editor.action"
                    @cancel="resetEditor"
                    @submit="submitEditor"
                  />
                </template>
                <template
                  v-if="repliesOpen(comment) && (comment.replies?.totalCount || visibleReplies(comment).length)"
                  #replies
                >
                  <div
                    class="ms-4 border-s border-base-300"
                    :aria-busy="replyRequests.has(comment.id)"
                  >
                    <CommentEntry
                      v-for="reply in visibleReplies(comment)"
                      :key="reply.id"
                      :comment="reply"
                      :author-login="authorLogin"
                      :now="now"
                      :load-history="loadEditHistory"
                      :history-revision="moriSession.revision"
                      reply
                      :can-quote="!discussion.locked && !comment.isMinimized"
                      :permissions="permissions && comment.replies.includePermissions !== false"
                      :busy="busy"
                      @quote="quoteReply(comment, reply)"
                      @edit="startEditor('edit', reply, comment.id)"
                      @delete="remove(reply)"
                      @react="react(reply.id, $event)"
                    >
                      <template v-if="editor.id === reply.id" #editor>
                        <CommentEditor
                          v-model="editor.body"
                          :return-hash="returnHash"
                          :login-action="auth.login"
                          embedded
                          cancelable
                          :authenticated="moriSession.authenticated"
                          :busy="busy || moriSession.checking"
                          action="edit"
                          @cancel="resetEditor"
                          @submit="submitEditor"
                        />
                      </template>
                    </CommentEntry>
                    <p v-if="replyRequests.has(comment.id)" role="status" class="px-4 py-2 text-sm">
                      <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
                      {{ t("comments.loadingReplies") }}
                    </p>
                    <button
                      v-else-if="replyErrors.has(comment.id)"
                      type="button"
                      class="btn btn-ghost btn-sm mx-4 my-2"
                      @click="loadReplies(comment)"
                    >
                      {{ t("common.navigationStatus.retry") }}
                    </button>
                    <button
                      v-else-if="hasMoreReplies(comment)"
                      type="button"
                      class="btn btn-ghost btn-sm mx-4 my-2"
                      @click="loadReplies(comment)"
                    >
                      {{ t("comments.loadMoreReplies") }}
                    </button>
                  </div>
                </template>
              </CommentEntry>
            </div>
            <button
              v-if="nextCursor"
              type="button"
              class="btn btn-sm self-center"
              :disabled="pending"
              @click="load(nextCursor)"
            >
              {{ t("comments.loadMoreComments") }}
            </button>
            <button
              v-if="editor.action !== 'post' && !hasEditorTarget"
              type="button"
              class="btn btn-ghost btn-sm"
              @click="resetEditor"
            >
              {{ t("comments.cancel") }}
            </button>
          </div>
        </template>
      </div>
    </component>
    <CommentEditor
      v-if="showPlaceholder || (loaded && !discussion?.locked && editor.action === 'post')"
      v-model="editor.body"
      class="shrink-0"
      :return-hash="returnHash"
      :login-action="auth.login"
      :authenticated="moriSession.authenticated"
      :loading="showPlaceholder"
      :busy="busy || moriSession.checking"
      @submit="submitEditor"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from "vue";
import { useTimestamp } from "@vueuse/core";
import { defaultCommentSort, discussionAuthorLogins, initialReplyCount } from "@/../shared/discussions.js";
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import CommentsPlaceholder from "@/components/reader/feedback/CommentsPlaceholder.vue";
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
import { useToast } from "@/composables/useToast";
import { useCommentCountsStore } from "@/stores/commentCountsStore";
import { githubDiscussionUrl } from "@/utils/github-discussion-url";
import CommentEntry from "./display/CommentEntry.vue";
import ReactionButtons from "./display/ReactionButtons.vue";
import CommentEditor from "./interaction/CommentEditor.vue";

const props = defineProps({
  scope: { type: String, required: true },
  target: { type: String, required: true },
  scrollMode: String,
  preview: Object,
});
const returnHash = computed(() =>
  props.scope.endsWith("-paragraph") ? encodeURIComponent(props.target) : "",
);
const emit = defineEmits(["count"]);
const now = useTimestamp({ interval: 30_000 });
const authorLogin = computed(() =>
  props.scope.startsWith("article") ? discussionAuthorLogins.article : discussionAuthorLogins.novel,
);
const { t, number } = useLocale();
const toast = useToast();
const preview = import.meta.env.DEV ? props.preview : null;
const auth = preview?.auth ?? useMoriAuth();
const moriSession = auth.state;
const counts = useCommentCountsStore();
const pending = ref(true);
const loaded = ref(false);
const busy = ref(false);
const error = ref("");
const showPlaceholder = computed(() => pending.value && !loaded.value && !error.value);
const sort = ref(defaultCommentSort);
const sortGroup = useId();
const threadElement = ref(null);
const discussion = ref(null);
const discussionUrl = computed(() => githubDiscussionUrl(discussion.value?.url));
const comments = ref([]);
const replyVisibility = reactive(new Map());
const replyLimits = reactive(new Map());
const postedReplies = reactive(new Map());
const replyRequests = reactive(new Map());
const replyErrors = reactive(new Set());
const count = ref(0);
const commentCount = ref(0);
const replyCount = ref(0);
const nextCursor = ref(null);
const permissions = ref(false);
const emptyEditor = () => ({ id: null, action: "post", body: "" });
const editor = ref(emptyEditor());
const draftKey = computed(() => `mori:comments:${props.scope}:${props.target}`);
const threadReactions = computed(() =>
  discussion.value?.reactionGroups?.map((group) => ({
    ...group,
    viewerHasReacted: permissions.value && group.viewerHasReacted,
  })),
);
const hasEditorTarget = computed(() =>
  comments.value.some(
    (item) =>
      item.id === editor.value.id ||
      (repliesOpen(item) &&
        (editor.value.parentId === item.id ||
          visibleReplies(item).some((reply) => reply.id === editor.value.id))),
  ),
);
let generation = 0;
let active = false;
let controller;
let submission;
let retryRequest;

function resetEditor() {
  editor.value = emptyEditor();
}

function readDraft() {
  try {
    const saved = preview
      ? preview.draft
      : JSON.parse(sessionStorage.getItem(draftKey.value));
    const draft = saved?.editor;
    if (
      draft &&
      ["post", "reply", "edit"].includes(draft.action) &&
      typeof draft.body === "string"
    ) {
      submission = saved.submission;
      editor.value = { ...emptyEditor(), ...draft };
    }
  } catch {
    /* Draft storage is optional. */
  }
}

function saveDraft() {
  if (!active) return;
  const draft = editor.value;
  if (preview) {
    preview.draft = draft.body ? { editor: { ...draft }, submission } : null;
    return;
  }
  try {
    if (draft.body)
      sessionStorage.setItem(
        draftKey.value,
        JSON.stringify({ editor: draft, submission }),
      );
    else sessionStorage.removeItem(draftKey.value);
  } catch {
    /* Draft storage is optional. */
  }
}
watch(editor, saveDraft, { deep: true, flush: "sync" });

async function request(parameters, options) {
  if (preview) return preview.request(parameters, options);
  const search = new URLSearchParams({
    scope: props.scope,
    target: props.target,
    ...parameters,
  });
  const response = await fetch("/api/comments?" + search, {
    cache: "no-store",
    ...options,
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) auth.invalidate();
    throw Object.assign(new Error(result.error), { status: response.status });
  }
  return result;
}

function loadEditHistory(id, cursor, signal) {
  return request({ history: id, ...(cursor && { cursor }) }, { signal });
}

function report(failure, retry = load) {
  retryRequest = retry;
  error.value =
    failure.message === "COMMENT_RANKING_TOO_LARGE"
      ? "comments.rankingTooLarge"
      : failure.message === "GITHUB_REAUTHORIZE"
      ? "comments.reauthorize"
      : failure.message === "COMMENT_ALREADY_SUBMITTED"
        ? "comments.duplicate"
        : failure.status === 403
          ? "comments.forbidden"
          : failure.status === 429
            ? "comments.rateLimited"
            : "comments.failed";
}

async function load(cursor) {
  if (!active || !props.target) {
    pending.value = false;
    return;
  }
  const id = ++generation;
  controller?.abort();
  controller = new AbortController();
  if (!cursor) cancelReplyRequests();
  pending.value = true;
  error.value = "";
  try {
    const result = await request(
      {
        sort: sort.value,
        ...(cursor && { cursor }),
        // Older drafts without a parent ID still need to find their reply.
        ...(editor.value.action === "edit" &&
        editor.value.parentId === undefined
          ? {}
          : { replyPreview: "1" }),
      },
      { signal: controller.signal },
    );
    if (id !== generation) return;
    const page = result.discussion?.comments;
    discussion.value = result.discussion;
    permissions.value = Boolean(result.includePermissions);
    const pageItems = page?.nodes || [];
    const existingIds = new Set(
      cursor ? comments.value.map(({ id }) => id) : [],
    );
    comments.value = cursor
      ? [
          ...comments.value,
          ...pageItems.filter(({ id }) => !existingIds.has(id)),
        ]
      : pageItems;
    for (const comment of pageItems) {
      if (
        editor.value.parentId === comment.id ||
        comment.replies?.nodes?.some((reply) => reply.id === editor.value.id)
      ) {
        replyVisibility.set(comment.id, true);
      }
    }
    for (const comment of comments.value) {
      if (!repliesOpen(comment) || !comment.replies?.totalCount) continue;
      const nodes = comment.replies.nodes || [];
      const limit = replyLimits.get(comment.id) || initialReplyCount;
      const editTarget =
        editor.value.parentId === comment.id ? editor.value.id : null;
      if (
        !nodes.length ||
        (comment.replies.pageInfo?.hasNextPage &&
          (nodes.length < limit ||
            (editTarget && !nodes.some(({ id }) => id === editTarget))))
      ) {
        void loadReplies(comment, { limit, editTarget });
      }
    }
    nextCursor.value =
      sort.value === "newest"
        ? page?.pageInfo.hasPreviousPage && page.pageInfo.startCursor
        : page?.pageInfo.hasNextPage && page.pageInfo.endCursor;
    count.value = result.count || 0;
    commentCount.value = result.commentCount ?? page?.totalCount ?? 0;
    replyCount.value =
      result.replyCount ?? Math.max(0, count.value - commentCount.value);
    loaded.value = true;
    emit("count", count.value);
  } catch (failure) {
    if (id !== generation) return;
    if (
      !loaded.value &&
      sort.value === "top" &&
      failure.message === "COMMENT_RANKING_TOO_LARGE"
    ) {
      sort.value = "oldest";
    } else {
      report(failure, () => load(cursor));
    }
  } finally {
    if (id === generation) pending.value = false;
  }
}

function cancelReplyRequests() {
  for (const request of replyRequests.values()) request.abort();
  replyRequests.clear();
  replyErrors.clear();
}

function repliesOpen(comment) {
  return replyVisibility.get(comment.id) ?? !comment.isMinimized;
}

function visibleReplies(comment) {
  const nodes = comment.replies?.nodes || [];
  const limit = replyLimits.get(comment.id) || initialReplyCount;
  const posted = new Map(
    (postedReplies.get(comment.id) || []).map((reply) => [reply.id, reply]),
  );
  const visible = nodes.filter(({ id }, index) => {
    const ownReply = posted.delete(id);
    return index < limit || id === editor.value.id || ownReply;
  });
  return [...visible, ...posted.values()];
}

function hasMoreReplies(comment) {
  return (
    comment.replies?.pageInfo?.hasNextPage ||
    comment.replies?.nodes?.length >
      (replyLimits.get(comment.id) || initialReplyCount)
  );
}

function toggleReplies(comment) {
  const open = !repliesOpen(comment);
  replyVisibility.set(comment.id, open);
  if (!open) return;
  const limit = replyLimits.get(comment.id) || initialReplyCount;
  if (
    !comment.replies?.nodes ||
    replyErrors.has(comment.id) ||
    (comment.replies.pageInfo?.hasNextPage &&
      comment.replies.nodes.length < limit)
  ) {
    void loadReplies(comment, { limit });
  }
}

async function loadReplies(comment, { limit, editTarget } = {}) {
  if (replyRequests.has(comment.id)) return;
  if (
    limit === undefined &&
    comment.replies?.nodes?.length >
      (replyLimits.get(comment.id) || initialReplyCount)
  ) {
    replyLimits.set(comment.id, comment.replies.nodes.length);
    return;
  }
  const controller = new AbortController();
  replyRequests.set(comment.id, controller);
  replyErrors.delete(comment.id);
  try {
    do {
      const cursor = comment.replies?.pageInfo?.endCursor;
      const { replies, includePermissions } = await request(
        { parent: comment.id, ...(cursor && { cursor }) },
        { signal: controller.signal },
      );
      if (controller.signal.aborted || !comments.value.includes(comment))
        return;
      const existing = comment.replies?.nodes || [];
      const seen = new Set(existing.map(({ id }) => id));
      comment.replies = {
        ...replies,
        totalCount: replies.totalCount ?? comment.replies?.totalCount,
        nodes: [
          ...existing,
          ...replies.nodes.filter(({ id }) => !seen.has(id)),
        ],
        includePermissions:
          comment.replies?.includePermissions !== false && includePermissions,
      };
      if (limit === undefined)
        replyLimits.set(comment.id, comment.replies.nodes.length);
      if (replies.pageInfo?.endCursor === cursor) break;
    } while (
      comment.replies.pageInfo?.hasNextPage &&
      (comment.replies.nodes.length < limit ||
        (editTarget &&
          !comment.replies.nodes.some(({ id }) => id === editTarget)))
    );
  } catch (failure) {
    if (!controller.signal.aborted) {
      replyErrors.add(comment.id);
      report(failure);
    }
  } finally {
    if (replyRequests.get(comment.id) === controller)
      replyRequests.delete(comment.id);
  }
}

function focusInlineEditor() {
  void nextTick(() =>
    threadElement.value?.querySelector("[data-inline-comment-editor] textarea")?.focus(),
  );
}

function replyToComment(comment) {
  if (busy.value || moriSession.checking) return;
  if (moriSession.authenticated) startEditor("reply", comment);
  else auth.login({ hash: returnHash.value });
}

function startEditor(action, comment, parentId = null) {
  if (editor.value.action === action && editor.value.id === comment.id) return;
  editor.value = {
    action,
    id: comment.id,
    parentId,
    body: action === "edit" ? comment.body : "",
  };
  focusInlineEditor();
}

function quoteReply(parent, comment) {
  if (busy.value || moriSession.checking) return;
  const quote = comment.body.trim().slice(0, 8000).split(/\r?\n/u).map((line) => `> ${line}`).join("\n");
  const current = editor.value.action === "reply" && editor.value.id === parent.id
    ? editor.value.body
    : "";
  const body = current ? `${current.trimEnd()}\n\n${quote}\n\n` : `${quote}\n\n`;
  if (body.length > 10000) {
    toast.error(t("comments.quoteTooLong"));
    return;
  }
  editor.value = { action: "reply", id: parent.id, parentId: null, body };
  if (moriSession.authenticated) focusInlineEditor();
  else auth.login({ hash: returnHash.value });
}

async function mutate(action, options) {
  if (busy.value || moriSession.checking) return false;
  if (!moriSession.authenticated) {
    auth.login({ hash: returnHash.value });
    return false;
  }
  const revision = moriSession.revision;
  const signature = JSON.stringify([action, options]);
  // Each attempt to delete a specific comment can safely use a fresh request ID.
  if (action === "delete" || submission?.signature !== signature)
    submission = { signature, id: crypto.randomUUID() };
  saveDraft();
  busy.value = true;
  error.value = "";
  try {
    const result = await request(
      {},
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: submission.id, ...options }),
      },
    );
    submission = null;
    if (!active || revision !== moriSession.revision) return false;
    if (action === "reply") {
      replyVisibility.set(options.id, true);
      if (result.reply?.id) {
        const previous = postedReplies.get(options.id) || [];
        postedReplies.set(options.id, [...previous, result.reply]);
      }
    } else if (action === "delete" || action === "edit") {
      for (const [parentId, replies] of postedReplies) {
        if (action === "delete" && parentId === options.id)
          postedReplies.delete(parentId);
        else if (replies.some(({ id }) => id === options.id)) {
          postedReplies.set(
            parentId,
            action === "delete"
              ? replies.filter(({ id }) => id !== options.id)
              : replies.map((reply) =>
                  reply.id === options.id
                    ? { ...reply, body: options.body }
                    : reply,
                ),
          );
        }
      }
    }
    if (result.count != null || result.delta) {
      const source =
        props.scope === "article" || props.scope === "article-paragraph"
          ? "article"
          : "novel";
      const contentId = props.scope.endsWith("-paragraph")
        ? props.target.replace(/-[1-9]\d*$/, "")
        : props.target;
      if (!preview && props.scope !== "book" && result.delta)
        counts.adjustContentCommentTotal(source, contentId, result.delta);
      count.value = result.count ?? Math.max(0, count.value + result.delta);
      emit("count", count.value);
    }
    void load();
    return true;
  } catch (failure) {
    if (failure.status && failure.status < 500 && failure.status !== 409)
      submission = null;
    if (failure.message === "GITHUB_REAUTHORIZE") submission = null;
    saveDraft();
    if (active && revision === moriSession.revision) {
      const retryDelete = action === "delete" &&
        (!failure.status || failure.status >= 500 || failure.status === 429);
      report(failure, retryDelete ? () => mutate(action, options) : undefined);
    }
    return false;
  } finally {
    busy.value = false;
  }
}

async function submitEditor() {
  const { action, id, body } = editor.value;
  if (await mutate(action, { id, body })) resetEditor();
}

function remove(comment) {
  if (window.confirm(t("comments.confirmDelete")))
    void mutate("delete", { id: comment.id });
}

function react(id, reaction) {
  void mutate(reaction.viewerHasReacted ? "remove" : "add", {
    id,
    reaction: reaction.content,
  });
}

onMounted(() => {
  active = true;
  readDraft();
  if (!moriSession.checking) void load();
});
onBeforeUnmount(() => {
  active = false;
  generation++;
  controller?.abort();
  cancelReplyRequests();
});
watch(sort, () => void load());
watch(
  () => moriSession.revision,
  () => postedReplies.clear(),
);

watch(
  () => [moriSession.checking, moriSession.revision, preview?.revision],
  ([checking]) => {
    permissions.value = false;
    if (!checking) void load();
  },
);
</script>
