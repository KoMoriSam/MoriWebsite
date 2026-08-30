<template>
  <section
    class="not-prose font-sans"
    data-markdown-moment
    :aria-label="`${username} 的动态`"
  >
    <!-- 动态作者 -->
    <header class="moments-author">
      <div class="avatar shrink-0">
        <div class="w-8 sm:w-10 rounded-full">
          <img
            class="m-0!"
            :src="avatarFor(username)"
            :alt="`${username} 的头像`"
          />
        </div>
      </div>

      <div class="moments-header">
        <div class="header-title">
          {{ username }}
        </div>

        <div v-if="time || location" class="header-info">
          <time v-if="time">
            <i class="ri-time-line" aria-hidden="true"></i>
            <span>{{ time }}</span>
          </time>

          <span v-if="location">
            <i class="ri-map-pin-2-line" aria-hidden="true"></i>
            <span>{{ location }}</span>
          </span>
        </div>
      </div>

      <button
        v-if="isSelf(username)"
        type="button"
        class="btn btn-ghost btn-circle btn-sm shrink-0"
        aria-label="更多操作"
      >
        <i class="ri-more-2-line text-lg" aria-hidden="true"></i>
      </button>
    </header>

    <!-- 动态正文 -->
    <article class="moments-content">
      <RenderedContent :html="contentHtml" />

      <div v-if="images.length" class="moments-images">
        <img
          v-for="({ url, alt }, index) in images"
          :key="`${url}-${index}`"
          :src="url"
          :alt="alt"
          loading="lazy"
        />
      </div>
    </article>

    <!-- 点赞 / 评论 / 分享 -->
    <footer class="moments-actions">
      <template v-for="action in actions" :key="action.label">
        <div class="moments-action">
          <button type="button" class="btn btn-ghost btn-square btn-sm">
            <i :class="action.icon" aria-hidden="true"></i>
          </button>
          <span v-if="action.value" class="action-value">
            {{ action.value }} {{ action.label }}
          </span>
        </div>
      </template>
    </footer>

    <!-- 评论区 -->
    <aside class="moments-comments" aria-label="评论">
      <!-- 评论列表 -->
      <div v-if="comments.length" class="comments-list">
        <article
          v-for="(comment, commentIndex) in comments"
          :key="`${comment.username}-${commentIndex}`"
          class="comment-thread"
        >
          <!-- 一级评论 -->
          <div class="comment-item">
            <div class="avatar shrink-0">
              <div class="w-8 rounded-full">
                <img
                  class="m-0!"
                  :src="avatarFor(comment.username)"
                  :alt="`${comment.username} 的头像`"
                />
              </div>
            </div>
            <div class="comment-body">
              <RenderedContent :html="commentHtml(comment)" />
            </div>
          </div>

          <!-- 回复 -->
          <div v-if="comment.replies?.length" class="comment-replies">
            <div
              v-for="(reply, replyIndex) in comment.replies"
              :key="`${reply.replier}-${replyIndex}`"
              class="comment-item"
            >
              <div class="avatar shrink-0">
                <div class="w-8 rounded-full">
                  <img
                    class="m-0!"
                    :src="avatarFor(reply.replier)"
                    :alt="`${reply.replier} 的头像`"
                  />
                </div>
              </div>
              <div class="comment-body">
                <RenderedContent :html="replyHtml(reply)" />
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- 发表评论 -->
      <!-- <form class="comment-composer" @submit.prevent>
        <div class="avatar shrink-0">
          <div class="w-8 rounded-full">
            <img class="m-0!" :src="avatarFor('KoMoriSam')" alt="KoMoriSam" />
          </div>
        </div>

        <div class="join min-w-0 flex-1">
          <input
            type="text"
            placeholder="说点什么……"
            class="input input-bordered input-sm join-item min-w-0 flex-1"
            aria-label="发表评论"
          />

          <button
            type="submit"
            class="btn btn-primary btn-sm join-item shrink-0"
          >
            发送
          </button>
        </div>
      </form> -->
    </aside>
  </section>
</template>

<script setup>
import { computed } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";

import { SELF_NAMES, DEFAULT_AVATAR, AVATAR_MAP } from "@/constants/markdown";

const props = defineProps({
  username: { type: String, default: "用户" },
  time: { type: String, default: "" },
  location: { type: String, default: "" },
  contentHtml: { type: String, default: "" },
  images: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  comments: { type: Array, default: () => [] },
});

const avatarFor = (username = "") =>
  AVATAR_MAP[String(username).trim()] || DEFAULT_AVATAR;

const isSelf = (username = "") => SELF_NAMES.has(String(username).trim());

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const injectInfo = (contentHtml, infoHtml) => {
  const trimmed = String(contentHtml || "").trim();

  if (!trimmed) {
    return `<p>${infoHtml}</p>`;
  }

  return trimmed.replace(/<p([^>]*)>([\s\S]*?)<\/p>/, (match, attrs, body) => {
    const triggerMatch = body.match(
      /([\s\S]*?)(<button\b[^>]*\bcomment-trigger\b[\s\S]*?<\/button>\s*)$/,
    );

    const bodyHtml = triggerMatch ? triggerMatch[1] : body;
    const triggerHtml = triggerMatch ? triggerMatch[2] : "";

    return `<p${attrs}>${infoHtml}<span data-paragraph-comment-content="true">${bodyHtml}</span>${triggerHtml}</p>`;
  });
};

const commentHtml = (comment) => {
  const username = comment.username || "用户";

  const infoHtml = `
    <span
      class="comments-info"
      data-paragraph-comment-meta="true"
    >
      <span class="user-name">
        ${isSelf(username) ? "我" : escapeHtml(username)}
      </span>
      ${
        comment.time
          ? `<span class="comment-time">${escapeHtml(comment.time)}</span>`
          : ""
      }
    </span>
  `;

  return injectInfo(comment.contentHtml, infoHtml);
};

const replyHtml = (reply) => {
  const replier = reply.replier || "用户";
  const target = reply.target || "用户";

  const infoHtml = `
    <span
      class="comments-info"
      data-paragraph-comment-meta="true"
    >
      <span class="user-name">
        ${isSelf(replier) ? "我" : escapeHtml(replier)}
        <span class="reply-label">回复</span>
        ${escapeHtml(target)}
      </span>
      ${
        reply.time
          ? `<span class="comment-time">${escapeHtml(reply.time)}</span>`
          : ""
      }
    </span>
  `;

  return injectInfo(reply.contentHtml, infoHtml);
};

const actions = computed(() => [
  {
    label: "点赞",
    icon: "ri-thumb-up-line",
    value: props.stats.like || "",
  },
  {
    label: "评论",
    icon: "ri-chat-3-line",
    value: props.stats.comment || "",
  },
  {
    label: "分享",
    icon: "ri-share-forward-line",
    value: props.stats.share || "",
  },
]);
</script>

<style scoped>
@reference "@/assets/main.css";

section[data-markdown-moment] {
  @apply card gap-0 overflow-hidden
    border border-base-300;
}

/* 作者信息 */

.moments-author {
  @apply flex items-center gap-3 p-3 pb-0;
}

.moments-header {
  @apply min-w-0 flex-1;
}

.moments-header .header-title {
  @apply truncate font-bold leading-tight;
}

.moments-header .header-info {
  @apply mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5
    text-xs text-base-content/50;
}

.moments-header .header-info > * {
  @apply inline-flex items-center gap-1;
}

/* 动态正文 */

.moments-content {
  @apply p-3;
}

.moments-content :deep(p) {
  @apply my-0 indent-0 text-justify;
}

.moments-content :deep(blockquote) {
  @apply my-2;
}

.moments-content :deep(blockquote p) {
  @apply border-l-3 border-base-content/25 pl-3;
}

.moments-content :deep(a) {
  @apply text-primary hover:font-bold;
}

/* 图片布局 */

.moments-content .moments-images {
  @apply grid grid-cols-3 gap-2 pt-2;
}

.moments-content .moments-images:has(> :nth-child(4):last-child) {
  @apply grid-cols-2 w-[calc(100%*2/3)];
}

.moments-content .moments-images img {
  @apply w-full aspect-square object-cover;
}

/* 操作栏 */

.moments-actions {
  @apply flex justify-between items-center border-y border-base-300
    bg-base-200/50 px-3 py-1;
}

.moments-action {
  @apply flex items-center gap-2 min-w-0 font-normal text-base-content/65;
}

.moments-action:hover {
  @apply text-base-content;
}

.moments-actions .action-value {
  @apply text-xs opacity-60;
}

/* 评论区 */

.moments-comments {
  @apply p-3 bg-base-200/50 gap-2;
}

/* 评论输入框 */

.comment-composer {
  @apply mt-2 flex items-center gap-2;
}

/* 评论列表 */

.comments-list {
  @apply flex flex-col gap-3;
}

.comment-thread {
  @apply flex min-w-0 flex-col gap-2;
}

.comment-item {
  @apply flex min-w-0 items-start gap-2;
}

.comment-body {
  @apply min-w-0 flex-1 pt-0.5;
}

/*
 * 回复整体向右缩进，不再使用 translate-y。
 * 这样头像、正文、长文本换行都会更稳定。
 */

.comment-replies {
  @apply ml-10 flex flex-col gap-2;
}

/* RenderedContent 内部评论样式 */

.moments-comments :deep(p) {
  @apply my-0 indent-0 flex flex-col;
}

.moments-comments :deep(.comments-info) {
  @apply mr-1 inline-flex items-baseline gap-1;
}

.moments-comments :deep(.user-name) {
  @apply font-bold text-base-content/80
    hover:text-info;
}

.moments-comments :deep(.comment-time) {
  @apply text-xs text-base-content/40;
}

.moments-comments :deep(.reply-label) {
  @apply mx-1 font-normal text-base-content/50;
}

.moments-comments :deep(a) {
  @apply text-primary hover:font-bold;
}
</style>
