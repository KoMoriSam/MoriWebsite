<template>
  <form
    class="@container min-w-0 text-sm"
    :class="
      !embedded &&
      'comment-surface card card-border border-base-300 bg-base-100'
    "
    :data-inline-comment-editor="embedded || undefined"
    :inert="loading"
    :aria-hidden="loading || undefined"
    @submit.prevent="authenticated && !loading && $emit('submit')"
    @keydown="handleShortcut"
  >
    <div
      class="grid @xl:grid-cols-[auto_minmax(0,1fr)] @xl:items-end before:pointer-events-none before:col-span-full before:row-start-1 before:self-end before:border-b before:border-base-300"
      :class="!embedded && 'comment-surface-top bg-base-200/50'"
    >
      <div
        class="tabs tabs-lift relative col-start-1 row-start-1 px-(--comment-inset) pt-(--comment-inset)"
        role="radiogroup"
        :aria-label="fieldLabel"
      >
        <input
          v-model="preview"
          :name="tabGroup"
          :value="false"
          :aria-label="t('comments.write')"
          type="radio"
          class="tab"
        />
        <input
          v-model="preview"
          :name="tabGroup"
          :value="true"
          :aria-label="t('comments.preview')"
          :disabled="!authenticated"
          type="radio"
          class="tab"
        />
      </div>
      <MarkdownToolbar
        v-if="!preview"
        v-model="monospace"
        :disabled="!authenticated || loading"
        class="row-start-2 bg-(--comment-editor-bg) p-(--comment-inset) pb-0 @xl:col-start-2 @xl:row-start-1 @xl:justify-end @xl:bg-transparent"
        @format="format"
      />
    </div>
    <div class="bg-(--comment-editor-bg) p-(--comment-inset) pb-0">
      <div
        class="rounded-inner grid min-w-0 overflow-hidden border border-base-300 bg-base-100"
        :class="{ 'focus-within:border-primary': !preview }"
      >
        <Renderer
          v-if="preview && body.trim()"
          :content="body"
          mode="comment"
          prose-size="sm"
          class="col-start-1 row-start-1 max-h-[var(--comment-editor-max-height,none)] max-w-none overflow-y-auto p-3 wrap-anywhere scrollbar-thin"
          dir="auto"
        />
        <p
          v-else-if="preview"
          class="col-start-1 row-start-1 p-3 text-base-content/60"
        >
          {{ t("comments.emptyPreview") }}
        </p>
        <textarea
          ref="textarea"
          v-model="body"
          class="textarea col-start-1 row-start-1 block max-h-[var(--comment-editor-max-height,none)] w-full resize-y rounded-none border-0 p-3 shadow-none focus:outline-none enabled:bg-transparent disabled:resize-none"
          :class="{
            'font-mono': monospace,
            invisible: preview,
            'text-transparent placeholder:text-transparent': loading,
          }"
          :aria-hidden="preview || undefined"
          :disabled="!authenticated"
          dir="auto"
          rows="4"
          maxlength="10000"
          :aria-label="fieldLabel"
          :placeholder="placeholder"
        />
        <div
          v-if="loading"
          class="pointer-events-none col-start-1 row-start-1 min-w-0 p-3"
        >
          <div class="skeleton h-3.5 w-36 max-w-full rounded-sm"></div>
        </div>
      </div>
    </div>
    <footer
      class="m-(--comment-inset) flex flex-wrap items-center justify-between gap-2"
    >
      <a
        href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-ghost btn-sm rounded-inner font-normal text-base-content/65"
      >
        <i class="ri-markdown-line text-base" aria-hidden="true"></i>
        <span :class="{ 'skeleton skeleton-text': loading }">{{ t("comments.markdownHelp") }}</span>
      </a>
      <div class="ms-auto flex flex-wrap items-center justify-end gap-2">
        <button
          v-if="cancelable"
          type="button"
          class="btn btn-ghost btn-sm rounded-inner"
          :disabled="busy"
          @click="$emit('cancel')"
        >
          {{ t("comments.cancel") }}
        </button>
        <button
          v-if="authenticated"
          type="submit"
          class="btn btn-primary btn-sm rounded-inner"
          :disabled="loading || busy || !body.trim()"
        >
          <span :class="{ 'skeleton skeleton-text': loading }">{{ submitLabel }}</span>
        </button>
        <LoginButton
          v-else
          class="btn-sm rounded-inner"
          :class="{ 'skeleton skeleton-text': loading }"
          :disabled="busy"
          :return-hash="returnHash"
          :login-action="loginAction"
          :label="t('comments.loginToComment')"
        />
      </div>
    </footer>
  </form>
</template>

<script setup>
import { defineAsyncComponent, nextTick, ref, useId, watch } from "vue";
import { useStorage } from "@vueuse/core";
import LoginButton from "@/components/auth/LoginButton.vue";
import MarkdownToolbar from "./MarkdownToolbar.vue";
import { useLocale } from "@/i18n";
import { editMarkdown } from "@/utils/markdown/edit-markdown";
const Renderer = defineAsyncComponent(() => import("@/components/markdown/Renderer.vue"));
const body = defineModel({ type: String, required: true });
const props = defineProps({
  action: { type: String, default: "post" },
  returnHash: String,
  loginAction: Function,
  busy: Boolean,
  authenticated: Boolean,
  loading: Boolean,
  cancelable: Boolean,
  embedded: Boolean,
});
defineEmits(["submit", "cancel"]);
const preview = ref(false);
watch(() => props.authenticated, (authenticated) => {
  if (!authenticated) preview.value = false;
});
const textarea = ref(null);
const monospace = useStorage("mori:comments:monospace", false, undefined, {
  initOnMounted: true,
});
const tabGroup = useId();
const { t } = useLocale();
const fieldLabel = computed(() => t(`comments.editor.${props.action}.label`));
const placeholder = computed(() => t(`comments.editor.${props.action}.placeholder`));
const submitLabel = computed(() => t(`comments.editor.${props.action}.submit`));
const shortcuts = { b: "bold", i: "italic", e: "code", k: "link" };

function format(action) {
  const field = textarea.value;
  if (!props.authenticated || props.loading || !field || preview.value) return;
  const edit = editMarkdown(
    action,
    field.value,
    field.selectionStart,
    field.selectionEnd,
  );
  if (
    !edit ||
    field.value.length + edit.text.length - (edit.end - edit.start) >
      field.maxLength
  )
    return;
  field.setRangeText(edit.text, edit.start, edit.end);
  body.value = field.value;
  field.focus();
  field.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

function handleShortcut(event) {
  if (!props.authenticated || props.loading) return;
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.isComposing)
    return;
  const key = event.key.toLowerCase();
  if (key === "p" && event.shiftKey) {
    event.preventDefault();
    preview.value = !preview.value;
    if (!preview.value) void nextTick(() => textarea.value?.focus());
  } else if (key === "enter") {
    event.preventDefault();
    if (!props.busy && body.value.trim()) event.currentTarget.requestSubmit();
  } else if (
    event.target === textarea.value &&
    !event.shiftKey &&
    shortcuts[key]
  ) {
    event.preventDefault();
    format(shortcuts[key]);
  }
}
</script>

<style scoped>
form {
  --comment-editor-bg: var(--color-base-100);
}

form[data-inline-comment-editor] {
  --comment-editor-bg: var(--comment-reply-bg, var(--color-base-100));
}

.tabs-lift > .tab:checked {
  --tab-bg: var(--comment-editor-bg);
  /* Let the corner fill overlap the adjacent surfaces when edges round to device pixels. */
  --tab-corner-height: calc(var(--tab-radius-limit) + var(--border));
  --tab-inset: auto auto calc(0px - var(--border)) auto;
  --tab-radius-grad:
    transparent calc(100% - var(--border) - 0.125px),
    var(--tab-border-color) calc(100% - var(--border) + 0.125px)
      calc(100% - 0.125px),
    var(--tab-bg) calc(100% + 0.125px);
  --radius-start: radial-gradient(
    circle var(--tab-radius-limit) at top left,
    var(--tab-radius-grad)
  );
  --radius-end: radial-gradient(
    circle var(--tab-radius-limit) at top right,
    var(--tab-radius-grad)
  );
}

.tabs-lift > .tab:checked::before {
  background-size: calc(var(--tab-radius-limit) + var(--border)) 100%;
  pointer-events: none;
}
</style>
