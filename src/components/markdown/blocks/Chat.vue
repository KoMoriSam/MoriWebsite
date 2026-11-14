<template>
  <section
    class="not-prose markdown-block"
    data-markdown-chat
    :class="{ 'message-only': !ui }"
  >
    <header v-if="ui" class="chat-bar">
      <figure class="avatar flex gap-2 items-center">
        <button class="btn btn-ghost btn-square btn-sm markdown-control">
          <i class="ri-arrow-left-wide-line" aria-hidden="true"></i>
        </button>
        <!-- <img
          class="markdown-avatar rounded-full"
          :alt="ui.title"
          :src="avatarFor(ui.title)"
        /> -->
        <figcaption class="flex gap-2 items-center">
          <span class="font-bold">{{ ui.title }}</span>
          <span
            v-if="ui.extra"
            class="badge badge-xs sm:badge-sm"
            :class="headerBadgeClass"
          >
            {{ ui.extra }}
          </span>
        </figcaption>
      </figure>
      <button class="btn btn-ghost btn-square btn-sm markdown-control">
        <i class="ri-menu-line" aria-hidden="true"></i>
      </button>
    </header>

    <template
      v-for="(message, index) in messages"
      :key="`${message.type}-${message.username || 'system'}-${index}`"
    >
      <div v-if="message.type === 'system'" class="chat-info markdown-fragment">
        <RenderedContent :html="message.contentHtml || ''" />
      </div>

      <article
        v-else
        :class="['chat', isSelf(message.username) ? 'chat-end' : 'chat-start']"
      >
        <aside class="chat-image avatar">
          <div class="markdown-avatar rounded-full">
            <img
              :alt="message.username || translate('markdown.chat.user')"
              v-bind="avatarAttrs(message.username || '用户')"
            />
          </div>
        </aside>
        <header class="chat-header">
          {{ message.username || translate('markdown.chat.user') }}
          <time class="opacity-50">{{ message.time || "" }}</time>
        </header>
        <div
          :class="[
            'chat-bubble markdown-fragment',
            isSelf(message.username) && 'chat-bubble-primary',
          ]"
        >
          <RenderedContent :html="message.contentHtml || ''" />
        </div>
        <footer v-if="message.footers?.length" class="chat-footer join mt-1.5">
          <span
            v-for="footer in message.footers"
            :key="footer"
            :class="[
              'join-item badge badge-sm badge-soft',
              footerClass(footer),
            ]"
          >
            {{ footer }}
          </span>
        </footer>
      </article>
    </template>

    <footer v-if="ui" class="chat-input">
      <!-- 麦克风 / 键盘 -->
      <button
        class="btn btn-ghost btn-square btn-sm markdown-control"
        :aria-label="voiceMode ? translate('markdown.chat.keyboard') : translate('markdown.chat.voice')"
        @click="voiceMode = !voiceMode"
      >
        <i :class="voiceMode ? 'ri-keyboard-line' : 'ri-mic-line'"></i>
      </button>

      <!-- 文字输入模式 -->
      <input
        v-if="!voiceMode"
        v-model="inputText"
        class="input input-sm min-w-0 w-full"
        type="text"
        :placeholder="translate('markdown.chat.placeholder')"
      />

      <!-- 语音输入模式 -->
      <button v-else class="btn btn-sm min-w-0 flex-1 select-none">
        {{ translate('markdown.chat.holdToSpeak') }}
      </button>

      <!-- 表情 -->
      <button class="btn btn-ghost btn-square btn-sm markdown-control">
        <i class="ri-emoji-sticker-line"></i>
      </button>

      <button
        class="btn btn-sm relative overflow-hidden transition-all duration-200"
        :class="
          inputText.trim() && !voiceMode
            ? 'btn-primary w-12'
            : 'btn-ghost btn-square'
        "
      >
        <!-- 加号 -->
        <i
          class="ri-add-large-line absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-150"
          :class="
            inputText.trim() && !voiceMode
              ? 'opacity-0 scale-75'
              : 'opacity-100 scale-100 delay-75'
          "
        ></i>

        <!-- 发送 -->
        <span
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap transition-[opacity,transform] duration-150"
          :class="
            inputText.trim() && !voiceMode
              ? 'opacity-100 scale-100 delay-75'
              : 'opacity-0 scale-75'
          "
        >
          {{ translate('markdown.chat.send') }}
        </span>
      </button>
    </footer>
  </section>
</template>

<script setup>
import { useMarkdownAvatars } from "@/composables/markdown/useMarkdownAvatars";
import { useLocale } from '@/i18n';
const { t: translate } = useLocale();

import { computed, ref } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";

import {
  SELF_NAMES,
  FOOTER_MAP,
} from "@/constants/markdown";

const props = defineProps({
  ui: {
    type: Object,
    default: null,
  },
  messages: {
    type: Array,
    default: () => [],
  },
});

const inputText = ref("");
const voiceMode = ref(false);

const { avatarFor, avatarAttrs } = useMarkdownAvatars();

const footerClass = (footer = "") =>
  FOOTER_MAP.find(([keyword]) => footer.includes(keyword))?.[1] || "";

const isSelf = (username = "") => SELF_NAMES.has(username || translate('markdown.chat.user'));

const headerBadgeClass = computed(() => {
  if (!props.ui?.extra || /^\d+$/.test(props.ui.extra)) return "";

  return (
    {
      在线: "badge-soft badge-success",
      离线: "badge-soft badge-outline",
      忙碌: "badge-soft badge-error",
    }[props.ui.extra] || "badge-soft"
  );
});
</script>

<style scoped>
@reference "@/assets/main.css";

section[data-markdown-chat] {
  @apply card gap-0 overflow-hidden border border-base-300 font-sans;
}

section[data-markdown-chat].message-only {
  @apply border-none;
}

/* Chat 聊天样式 */
.chat-bar {
  @apply flex items-center justify-between bg-base-200/50 border-b border-base-300;
  margin-block-end: var(--md-component-gap);
  font-size: var(--md-component-detail-size);
}

.chat-input {
  @apply flex justify-between bg-base-200/50 border-t border-base-300;
  margin-block-start: var(--md-component-gap);
}

.chat-bar,
.chat-input {
  gap: var(--md-component-gap);
  padding: var(--md-component-gap);
}

.chat-input :is(input, button:not(.markdown-control)) {
  --size: var(--md-component-control);
  font-size: var(--md-component-detail-size);
  line-height: 1.25;
}

.chat {
  @apply px-4 sm:px-8 md:px-12 lg:px-16 xl:px-8 overflow-visible;
}

.chat-info {
  --md-align: center;
  --md-text-size: var(--md-component-meta-size);
  color: color-mix(in oklab, var(--color-base-content) 60%, transparent);
}

.chat-bubble {
  @apply bg-base-200/75 overflow-visible;
  padding: var(--md-component-gap);
  --md-text-size: var(--md-component-detail-size);
  --md-block-gap: calc(var(--md-component-gap) * 0.5);
  --md-indent: 0px;
  --md-align: justify;
  --md-link-hover-weight: 700;
}

.chat-bubble :deep(p) {
  position: relative;
}

.chat-bubble :deep(p code) {
  @apply text-base-content;
  font-size: var(--md-component-meta-size);
}

.chat-bubble :deep(img) {
  @apply rounded-lg max-w-24 min-w-8;
}

.chat-bubble:has(img) {
  padding: calc(var(--md-component-gap) * 0.5);
}

.chat-bubble-primary {
  @apply bg-primary;
}

.chat :deep(a span img) {
  @apply rounded-none max-w-[unset] min-w-[unset];
}

.chat-bubble-primary {
  --md-link-color: color-mix(in oklab, var(--color-primary-content) 65%, var(--color-primary));
}

.chat-header {
  @apply mb-1;
  font-size: var(--md-component-meta-size);
  line-height: 1.25;
}

.chat-footer span {
  font-size: var(--md-component-meta-size);
  line-height: 1.25;
}

.chat img,
.chat-image img {
  @apply m-0;
}
</style>
