<template>
  <section class="moments-card" data-markdown-moment>
    <header class="flex items-center gap-3">
      <div class="avatar">
        <div class="w-12 rounded-full">
          <img class="m-0!" :src="avatarFor(username)" :alt="username" />
        </div>
      </div>
      <div class="moments-header">
        <div class="header-title">{{ username }}</div>
        <div class="header-info">
          <span v-if="time"><i class="ri-time-line"></i> {{ time }}</span>
          <span v-if="location"
            ><i class="ri-map-pin-2-line"></i> {{ location }}</span
          >
        </div>
      </div>
      <i v-if="isSelf(username)" class="ri-more-2-line"></i>
    </header>

    <div class="moments-content mt-3">
      <RenderedContent :html="contentHtml" />
      <div v-if="images.length" class="moments-images not-prose">
        <img
          v-for="({ url, alt }, index) in images"
          :key="`${url}-${index}`"
          :src="url"
          :alt="alt"
          loading="lazy"
        />
      </div>
    </div>

    <div class="moments-actions">
      <button
        v-for="action in actions"
        :key="action.label"
        class="btn btn-ghost btn-sm"
      >
        <i :class="action.icon"></i>
        <span class="hidden sm:inline">{{ action.label }}</span>
        <template v-if="action.value">
          <span class="hidden sm:inline">·</span><span>{{ action.value }}</span>
        </template>
      </button>
    </div>

    <div v-if="comments.length" class="moments-comments">
      <div class="flex items-center gap-2 mb-2 w-full not-prose">
        <div class="avatar">
          <div class="w-8 rounded-full">
            <img :src="avatarFor('KoMoriSam')" alt="KoMoriSam" />
          </div>
        </div>
        <div class="join w-full">
          <input
            type="text"
            placeholder="说点什么……"
            class="input input-bordered input-sm join-item w-full"
          />
          <button class="btn btn-primary btn-sm join-item">发送</button>
        </div>
      </div>

      <div class="comments-list">
        <template
          v-for="(comment, commentIndex) in comments"
          :key="`${comment.username}-${commentIndex}`"
        >
          <div class="flex items-center gap-2">
            <div class="avatar">
              <div class="w-8 h-8 rounded-full">
                <img
                  class="m-0!"
                  :src="avatarFor(comment.username)"
                  :alt="comment.username"
                />
              </div>
            </div>
            <RenderedContent :html="commentHtml(comment)" />
          </div>

          <div
            v-for="(reply, replyIndex) in comment.replies || []"
            :key="`${reply.replier}-${replyIndex}`"
            class="flex items-center gap-2 ml-10 -translate-y-1.5"
          >
            <div class="avatar">
              <div class="w-8 h-8 rounded-full">
                <img
                  class="m-0!"
                  :src="avatarFor(reply.replier)"
                  :alt="reply.replier"
                />
              </div>
            </div>
            <RenderedContent :html="replyHtml(reply)" />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";

const props = defineProps({
  username: { type: String, default: "用户" },
  time: { type: String, default: "" },
  location: { type: String, default: "" },
  contentHtml: { type: String, default: "" },
  images: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  comments: { type: Array, default: () => [] },
});

const selfNames = new Set(["我", "小群主", "Mori", "KoMoriSam"]);
const avatarMap = {
  "🈚️内👻，LG": "/assets/images/avatar/lg.webp",
  小群主: "/assets/images/avatar/komorisam.webp",
  Mori: "/assets/images/avatar/komorisam.webp",
  KoMoriSam: "/assets/images/avatar/komorisam.webp",
  真正群主: "/assets/images/avatar/talloran.webp",
  牛子: "/assets/images/avatar/niuzi.webp",
  欢乐豆人: "/assets/images/avatar/joybean.webp",
  天天: "/assets/images/avatar/smellycat7.webp",
  量子: "/assets/images/avatar/quantum.webp",
  泡泡冰: "/assets/images/avatar/paopao.webp",
  李焰老师: "/assets/images/avatar/liyan.webp",
  赵天明老师: "/assets/images/avatar/zhaotianming.webp",
  爸: "/assets/images/avatar/dad.webp",
  妈: "/assets/images/avatar/mom.webp",
  OpenAI: "/assets/images/avatar/openai.webp",
  "GPT-5.6": "/assets/images/avatar/openai.webp",
};
const DEFAULT_AVATAR = "/assets/images/avatar/default.webp";

const avatarFor = (username = "") =>
  avatarMap[String(username).trim()] || DEFAULT_AVATAR;
const isSelf = (username = "") => selfNames.has(username);
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const injectInfo = (contentHtml, infoHtml) => {
  const trimmed = String(contentHtml || "").trim();
  if (!trimmed) return `<p>${infoHtml}</p>`;

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
  const infoHtml = `<span class="comments-info" data-paragraph-comment-meta="true"><span class="user-name">${isSelf(username) ? "我" : escapeHtml(username)}</span>${comment.time ? `<span class="comment-time">${escapeHtml(comment.time)}</span>` : ""}</span>`;
  return injectInfo(comment.contentHtml, infoHtml);
};

const replyHtml = (reply) => {
  const replier = reply.replier || "用户";
  const target = reply.target || "用户";
  const infoHtml = `<span class="comments-info" data-paragraph-comment-meta="true"><span class="user-name">${isSelf(replier) ? "我" : escapeHtml(replier)}<span class="opacity-60"> 回复 </span>${escapeHtml(target)}</span>${reply.time ? `<span class="comment-time">${escapeHtml(reply.time)}</span>` : ""}</span>`;
  return injectInfo(reply.contentHtml, infoHtml);
};

const actions = computed(() => [
  { label: "点赞", icon: "ri-thumb-up-line", value: props.stats.like || "" },
  { label: "评论", icon: "ri-chat-3-line", value: props.stats.comment || "" },
  {
    label: "分享",
    icon: "ri-share-forward-line",
    value: props.stats.share || "",
  },
]);
</script>
