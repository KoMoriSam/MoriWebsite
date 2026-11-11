<template>
  <form class="space-y-2 rounded-box border border-base-300 bg-base-200 p-3" @submit.prevent="$emit('submit')">
    <div class="flex flex-wrap gap-1">
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': !preview }"
        :aria-pressed="!preview" @click="preview = false">{{ label }}</button>
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': preview }"
        :aria-pressed="preview" @click="preview = true">{{ t('reader.comments.preview') }}</button>
    </div>
    <div v-if="preview" class="prose prose-sm min-h-24 max-w-none rounded-field bg-base-100 p-3 wrap-anywhere"
      v-html="renderCommentMarkdown(body)" />
    <textarea v-else v-model="body" class="textarea w-full" rows="4" maxlength="10000"
      :aria-label="label" :placeholder="t('reader.comments.markdownPlaceholder')" />
    <div class="flex flex-wrap items-center justify-end gap-2">
      <button v-if="cancelable" type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="$emit('cancel')">
        {{ t('reader.comments.cancel') }}
      </button>
      <button v-if="authenticated" type="submit" class="btn btn-primary btn-sm" :disabled="busy || !body.trim()">
        {{ label }}
      </button>
      <LoginButton v-else :disabled="busy" :return-hash="returnHash" />
    </div>
  </form>
</template>

<script setup>
import { ref } from "vue";
import LoginButton from "@/components/auth/LoginButton.vue";
import { useLocale } from "@/i18n";
import { renderCommentMarkdown } from "@/services/comment-markdown";
const body = defineModel({ type: String, required: true });
defineProps({ label: String, returnHash: String, busy: Boolean, authenticated: Boolean, cancelable: Boolean });
defineEmits(["submit", "cancel"]);
const preview = ref(false);
const { t } = useLocale();
</script>
