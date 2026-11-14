<template>
  <Popover
    :label="t('comments.editHistory')"
    align="end"
    trigger-class="cursor-pointer text-xs text-base-content/60 hover:underline ms-auto"
    panel-class="text-sm"
    @open="openHistory"
  >
    <template #trigger>{{ t("comments.edited") }}</template>
    <ul v-if="edits.length" class="divide-y divide-base-300">
      <li
        v-for="edit in edits"
        :key="edit.id"
        class="flex flex-wrap gap-x-3 gap-y-1 px-2 py-1.5"
      >
        <span class="font-medium wrap-anywhere">{{
          edit.editor || t("comments.unknownEditor")
        }}</span>
        <time :datetime="edit.editedAt" class="text-base-content/65">
          {{
            formatDate(edit.editedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })
          }}
        </time>
      </li>
    </ul>
    <p v-if="pending" role="status" class="flex items-center gap-2 px-2 py-1.5">
      <span
        class="loading loading-spinner loading-xs"
        aria-hidden="true"
      ></span>
      {{ t("comments.loadingEdits") }}
    </p>
    <template v-else-if="failed">
      <p role="alert" class="px-2 py-1.5">
        {{ t("comments.editsUnavailable") }}
      </p>
      <button
        class="btn btn-ghost btn-xs rounded-inner"
        type="button"
        @click="load"
      >
        {{ t("common.navigationStatus.retry") }}
      </button>
    </template>
    <button
      v-else-if="nextCursor"
      class="btn btn-ghost btn-xs rounded-inner"
      type="button"
      @click="load"
    >
      {{ t("comments.olderEdits") }}
    </button>
    <p v-else-if="loaded && !edits.length" class="px-2 py-1.5">
      {{ t("comments.noEdits") }}
    </p>
  </Popover>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useLocale } from "@/i18n";
import Popover from "@/components/display/menu/Popover.vue";

const props = defineProps({
  commentId: { type: String, required: true },
  loadHistory: { type: Function, required: true },
});
const { t, date: formatDate } = useLocale();
const edits = ref([]);
const nextCursor = ref(null);
const loaded = ref(false);
const pending = ref(false);
const failed = ref(false);
let controller;

function openHistory() {
  if (!loaded.value && !failed.value) void load();
}

async function load() {
  if (pending.value) return;
  controller = new AbortController();
  const { signal } = controller;
  pending.value = true;
  failed.value = false;
  try {
    const page = await props.loadHistory(
      props.commentId,
      nextCursor.value,
      signal,
    );
    if (signal.aborted) return;
    const seen = new Set(edits.value.map(({ id }) => id));
    edits.value = [
      ...edits.value,
      ...page.edits.filter(({ id }) => !seen.has(id)),
    ];
    nextCursor.value = page.nextCursor;
    loaded.value = true;
  } catch {
    if (!signal.aborted) failed.value = true;
  } finally {
    if (!signal.aborted) pending.value = false;
  }
}

onBeforeUnmount(() => controller?.abort());
</script>
