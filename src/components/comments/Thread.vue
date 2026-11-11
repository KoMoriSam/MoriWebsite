<template>
  <section class="not-prose min-w-0 space-y-3" :aria-busy="pending" :aria-label="t('reader.comments.title')">
    <CommentsPlaceholder v-if="pending && !loaded && !error" :input-position="inputPosition" />
    <div v-if="error" role="alert" class="flex flex-wrap items-center gap-2 text-sm text-error">
      <span>{{ t(error) }}</span>
      <button v-if="error === 'reader.comments.reauthorize'" type="button" class="btn btn-sm"
        @click="auth.login({ reauthorize: true, hash: returnHash })">{{ t('auth.login') }}</button>
      <button v-else type="button" class="btn btn-sm" :disabled="pending" @click="load()">
        {{ t('common.navigationStatus.retry') }}
      </button>
    </div>
    <template v-if="loaded">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm text-base-content/70">{{ t('reader.comments.title') }} · {{ number(count) }}</span>
        <label v-if="discussion" class="flex items-center gap-2 text-sm">
          {{ t('reader.comments.sort') }}
          <select v-model="sort" class="select select-sm" :disabled="pending">
            <option value="oldest">{{ t('reader.comments.oldest') }}</option>
            <option value="newest">{{ t('reader.comments.newest') }}</option>
          </select>
        </label>
      </div>
      <ReactionButtons :groups="threadReactions" :disabled="busy || (permissions && !discussion?.viewerCanReact)"
        @react="react(null, $event)" />
      <p v-if="discussion?.locked" class="text-sm text-base-content/70">{{ t('reader.comments.locked') }}</p>
      <CommentEditor v-else-if="inputPosition === 'top' && editor.action === 'post'"
        v-model="editor.body" :return-hash="returnHash" :authenticated="moriSession.authenticated" :busy="busy || moriSession.checking"
        :label="t('reader.comments.post')" @submit="submitEditor" />

      <p v-if="!comments.length" class="text-sm text-base-content/65">{{ t('reader.comments.empty') }}</p>
      <CommentEntry v-for="comment in comments" :key="comment.id" :comment="comment" :permissions="permissions"
        :can-reply="!discussion.locked" :busy="busy" @reply="startEditor('reply', comment)"
        @edit="startEditor('edit', comment)" @delete="remove(comment)" @react="react(comment.id, $event)">
        <CommentEditor v-if="editor.id === comment.id" v-model="editor.body" :return-hash="returnHash" cancelable
          :authenticated="moriSession.authenticated" :busy="busy || moriSession.checking"
          :label="t('reader.comments.' + editor.action)" @cancel="resetEditor" @submit="submitEditor" />
        <div v-if="comment.replies?.nodes.length" class="space-y-2 border-s border-base-300 ps-2 sm:ps-3">
          <CommentEntry v-for="reply in comment.replies.nodes" :key="reply.id" :comment="reply"
            :permissions="permissions" :busy="busy" @edit="startEditor('edit', reply)"
            @delete="remove(reply)" @react="react(reply.id, $event)">
            <CommentEditor v-if="editor.id === reply.id" v-model="editor.body" :return-hash="returnHash" cancelable
              :authenticated="moriSession.authenticated" :busy="busy || moriSession.checking"
              :label="t('reader.comments.edit')" @cancel="resetEditor" @submit="submitEditor" />
          </CommentEntry>
          <button v-if="comment.replies.pageInfo.hasNextPage" type="button" class="btn btn-ghost btn-sm"
            :disabled="pending" @click="loadReplies(comment)">{{ t('reader.comments.moreReplies') }}</button>
        </div>
      </CommentEntry>
      <button v-if="nextCursor" type="button" class="btn btn-ghost btn-sm" :disabled="pending" @click="load(nextCursor)">
        {{ t('reader.comments.more') }}
      </button>
      <CommentEditor v-if="!discussion?.locked && inputPosition !== 'top' && editor.action === 'post'"
        v-model="editor.body" :return-hash="returnHash" :authenticated="moriSession.authenticated" :busy="busy || moriSession.checking"
        :label="t('reader.comments.post')" @submit="submitEditor" />
      <button v-if="editor.action !== 'post' && !hasEditorTarget" type="button" class="btn btn-ghost btn-sm"
        @click="resetEditor">{{ t('reader.comments.cancel') }}</button>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import CommentsPlaceholder from "@/components/reader/feedback/CommentsPlaceholder.vue";
import { moriSession, useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
import { useCommentCountsStore } from "@/stores/commentCountsStore";
import CommentEntry from "./display/CommentEntry.vue";
import ReactionButtons from "./display/ReactionButtons.vue";
import CommentEditor from "./interaction/CommentEditor.vue";

const props = defineProps({
  scope: { type: String, required: true },
  target: { type: String, required: true },
  inputPosition: { type: String, default: "bottom" },
});
const returnHash = computed(() => props.scope.endsWith("-paragraph") ? encodeURIComponent(props.target) : "");
const emit = defineEmits(["count"]);
const { t, number } = useLocale();
const auth = useMoriAuth();
const counts = useCommentCountsStore();
const pending = ref(true);
const loaded = ref(false);
const busy = ref(false);
const error = ref("");
const sort = ref("oldest");
const discussion = ref(null);
const comments = ref([]);
const count = ref(0);
const nextCursor = ref(null);
const permissions = ref(false);
const emptyEditor = () => ({ id: null, action: "post", body: "" });
const editor = ref(emptyEditor());
const draftKey = computed(() => `mori:comments:${props.scope}:${props.target}`);
const threadReactions = computed(() => discussion.value?.reactionGroups?.map((group) => ({
  ...group, viewerHasReacted: permissions.value && group.viewerHasReacted,
})));
const hasEditorTarget = computed(() => comments.value.some((item) => item.id === editor.value.id ||
  item.replies?.nodes.some((reply) => reply.id === editor.value.id)));
let generation = 0;
let active = false;
let controller;
let submission;

function resetEditor() {
  editor.value = emptyEditor();
}

function readDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey.value));
    const draft = saved?.editor;
    if (draft && ["post", "reply", "edit"].includes(draft.action) && typeof draft.body === "string") {
      submission = saved.submission;
      editor.value = { ...emptyEditor(), ...draft };
    }
  } catch { /* Draft storage is optional. */ }
}

function saveDraft() {
  if (!active) return;
  const draft = editor.value;
  try {
    if (draft.body) sessionStorage.setItem(draftKey.value, JSON.stringify({ editor: draft, submission }));
    else sessionStorage.removeItem(draftKey.value);
  } catch { /* Draft storage is optional. */ }
}
watch(editor, saveDraft, { deep: true, flush: "sync" });

async function request(parameters, options) {
  const search = new URLSearchParams({ scope: props.scope, target: props.target, ...parameters });
  const response = await fetch("/api/comments?" + search, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) auth.invalidate();
    throw Object.assign(new Error(result.error), { status: response.status });
  }
  return result;
}

function report(failure) {
  error.value = failure.message === "GITHUB_REAUTHORIZE" ? "reader.comments.reauthorize"
    : failure.message === "COMMENT_ALREADY_SUBMITTED" ? "reader.comments.duplicate"
    : failure.status === 403 ? "reader.comments.forbidden"
    : failure.status === 429 ? "reader.comments.rateLimited"
    : "reader.comments.failed";
}

async function load(cursor) {
  if (!active || !props.target) { pending.value = false; return; }
  const id = ++generation;
  controller?.abort();
  controller = new AbortController();
  pending.value = true;
  error.value = "";
  try {
    const result = await request({ sort: sort.value, ...(cursor && { cursor }) }, { signal: controller.signal });
    if (id !== generation) return;
    const page = result.discussion?.comments;
    discussion.value = result.discussion;
    permissions.value = Boolean(result.includePermissions);
    const pageItems = page?.nodes || [];
    comments.value = cursor ? [...comments.value, ...pageItems] : pageItems;
    nextCursor.value = sort.value === "newest"
      ? page?.pageInfo.hasPreviousPage && page.pageInfo.startCursor
      : page?.pageInfo.hasNextPage && page.pageInfo.endCursor;
    count.value = result.count || 0;
    loaded.value = true;
    emit("count", count.value);
  } catch (failure) {
    if (id === generation) report(failure);
  } finally {
    if (id === generation) pending.value = false;
  }
}

async function loadReplies(comment) {
  const id = generation;
  pending.value = true;
  try {
    const { replies } = await request({ parent: comment.id, cursor: comment.replies.pageInfo.endCursor });
    if (id === generation) {
      comment.replies.nodes.push(...replies.nodes);
      comment.replies.pageInfo = replies.pageInfo;
    }
  } catch (failure) {
    if (id === generation) report(failure);
  } finally {
    if (id === generation) pending.value = false;
  }
}

function startEditor(action, comment) {
  if (editor.value.action === action && editor.value.id === comment.id) return;
  editor.value = { action, id: comment.id, body: action === "edit" ? comment.body : "" };
}

async function mutate(action, options) {
  if (busy.value || moriSession.checking) return false;
  if (!moriSession.authenticated) {
    auth.login({ hash: returnHash.value });
    return false;
  }
  const revision = moriSession.revision;
  const signature = JSON.stringify([action, options]);
  if (submission?.signature !== signature) submission = { signature, id: crypto.randomUUID() };
  saveDraft();
  busy.value = true;
  error.value = "";
  try {
    const result = await request({}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, requestId: submission.id, ...options }),
    });
    submission = null;
    if (!active || revision !== moriSession.revision) return false;
    if (result.delta) {
      const source = props.scope === "article" || props.scope === "article-paragraph" ? "article" : "novel";
      const contentId = props.scope.endsWith("-paragraph") ? props.target.replace(/-[1-9]\d*$/, "") : props.target;
      if (props.scope !== "book") counts.adjustContentCommentTotal(source, contentId, result.delta);
      count.value = result.count ?? Math.max(0, count.value + result.delta);
      emit("count", count.value);
    }
    void load();
    return true;
  } catch (failure) {
    if (failure.status && failure.status < 500 && failure.status !== 409) submission = null;
    if (failure.message === "GITHUB_REAUTHORIZE") submission = null;
    saveDraft();
    if (active && revision === moriSession.revision) report(failure);
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
  if (window.confirm(t("reader.comments.confirmDelete"))) void mutate("delete", { id: comment.id });
}

function react(id, reaction) {
  void mutate(reaction.viewerHasReacted ? "remove" : "add", { id, reaction: reaction.content });
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
});
watch(sort, () => void load());
watch(() => [moriSession.checking, moriSession.revision], ([checking]) => {
  permissions.value = false;
  if (!checking) void load();
});
</script>
