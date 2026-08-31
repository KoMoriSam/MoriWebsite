<template>
  <section
    class="not-prose"
    data-markdown-chat
    :class="{ 'message-only': !ui }"
  >
    <header v-if="ui" class="chat-bar">
      <figure class="avatar flex gap-2 items-center">
        <button class="btn btn-ghost btn-square btn-sm">
          <i class="ri-arrow-left-wide-line" aria-hidden="true"></i>
        </button>
        <!-- <img
          class="w-8 sm:w-10 rounded-full"
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
      <button class="btn btn-ghost btn-square btn-sm">
        <i class="ri-menu-line" aria-hidden="true"></i>
      </button>
    </header>

    <template
      v-for="(message, index) in messages"
      :key="`${message.type}-${message.username || 'system'}-${index}`"
    >
      <div v-if="message.type === 'system'" class="chat-info">
        <RenderedContent :html="message.contentHtml || ''" />
      </div>

      <article
        v-else
        :class="['chat', isSelf(message.username) ? 'chat-end' : 'chat-start']"
      >
        <aside class="chat-image avatar">
          <div class="w-8 sm:w-10 rounded-full">
            <img
              :alt="message.username || '用户'"
              :src="avatarFor(message.username || '用户')"
            />
          </div>
        </aside>
        <header class="chat-header">
          {{ message.username || "用户" }}
          <time class="opacity-50">{{ message.time || "" }}</time>
        </header>
        <div
          :class="[
            'chat-bubble',
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
        class="btn btn-ghost btn-square btn-sm"
        :aria-label="voiceMode ? '切换到键盘输入' : '切换到语音输入'"
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
        placeholder="输入消息..."
      />

      <!-- 语音输入模式 -->
      <button v-else class="btn btn-sm min-w-0 flex-1 select-none">
        按住 说话
      </button>

      <!-- 表情 -->
      <button class="btn btn-ghost btn-square btn-sm">
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
          发送
        </span>
      </button>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";

import {
  SELF_NAMES,
  DEFAULT_AVATAR,
  AVATAR_MAP,
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

const avatarFor = (username = "") =>
  AVATAR_MAP[String(username).trim()] || DEFAULT_AVATAR;

const footerClass = (footer = "") =>
  FOOTER_MAP.find(([keyword]) => footer.includes(keyword))?.[1] || "";

const isSelf = (username = "") => SELF_NAMES.has(username || "用户");

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
  @apply flex items-center justify-between gap-2 bg-base-200/50 border-b border-base-300 p-2 mb-2;
}

.chat-input {
  @apply flex justify-between gap-2 bg-base-200/50 border-t border-base-300 p-2 mt-2;
}

.chat {
  @apply px-4 sm:px-8 md:px-12 lg:px-16 xl:px-8 overflow-visible;
}

.chat-info :deep(p) {
  @apply indent-0 text-center text-base-content/60;
}

.chat-bubble {
  @apply px-1 py-2 bg-base-200/75 overflow-visible;
}

.chat-bubble :deep(p) {
  @apply indent-0 m-1 text-justify relative;
}

.chat-bubble :deep(p code) {
  @apply text-base-content;
}

.chat-bubble :deep(img) {
  @apply rounded-lg max-w-24 min-w-8;
}

.chat-bubble:has(img) {
  @apply p-1;
}

.chat-bubble-primary {
  @apply bg-primary;
}

.chat :deep(a) {
  @apply text-primary hover:font-bold;
}

.chat :deep(a span img) {
  @apply rounded-none max-w-[unset] min-w-[unset];
}

.chat-bubble-primary :deep(a) {
  @apply text-[color-mix(in_oklab,var(--color-primary-content)_65%,var(--color-primary))];
}

.chat-header {
  @apply mb-1;
}

.chat img,
.chat-image img {
  @apply m-0;
}
</style>
