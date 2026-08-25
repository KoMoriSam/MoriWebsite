<template>
  <div v-if="header" class="chat-leading-group">
    <div class="chat-bar">
      <i class="ri-arrow-left-wide-line ml-0.5 sm:ml-2 mr-0"></i>
      <div class="chat-image avatar">
        <div class="w-8 sm:w-10 rounded-full">
          <img :alt="header.title" :src="avatarFor(header.title)" />
        </div>
      </div>
      <span class="font-bold">{{ header.title }}</span>
      <span
        v-if="header.extra"
        class="badge max-sm:badge-xs"
        :class="headerBadgeClass"
      >
        {{ header.extra }}
      </span>
      <i class="ri-menu-line ml-auto mr-0.5 sm:mr-2"></i>
    </div>
    <ChatMessage v-if="messages[0]" :message="messages[0]" />
  </div>

  <ChatMessage
    v-for="(message, index) in remainingMessages"
    :key="`${message.type}-${message.username || 'system'}-${index}`"
    :message="message"
  />
</template>

<script setup>
import { computed, defineComponent, h } from "vue";

import RenderedContent from "@/components/markdown/RenderedContent.vue";

const props = defineProps({
  header: {
    type: Object,
    default: null,
  },
  messages: {
    type: Array,
    default: () => [],
  },
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
const footerStyleMap = [
  ["已送达", "badge-info"],
  ["已读", "badge-success"],
  ["发送失败", "badge-error"],
  ["已删除", "badge-neutral"],
  ["已编辑", "badge-primary"],
  ["已转发", "badge-secondary"],
  ["已回复", "badge-accent"],
  ["已引用", "badge-info"],
  ["精华消息", "badge-secondary"],
  ["👍", "badge-success"],
  ["👎", "badge-error"],
  ["💬", "badge-info"],
  ["🔗", "badge-primary"],
  ["📎", "badge-secondary"],
  ["📷", "badge-accent"],
  ["🎥", "badge-warning"],
];
const DEFAULT_AVATAR = "/assets/images/avatar/default.webp";

const avatarFor = (username = "") =>
  avatarMap[String(username).trim()] || DEFAULT_AVATAR;

const footerClass = (footer = "") =>
  footerStyleMap.find(([keyword]) => footer.includes(keyword))?.[1] || "";

const ChatMessage = defineComponent({
  name: "ChatMessage",
  props: {
    message: {
      type: Object,
      required: true,
    },
  },
  setup(messageProps) {
    return () => {
      const message = messageProps.message;

      if (message.type === "system") {
        return h("div", { class: "chat-page-block" }, [
          h(
            "p",
            { class: "chat-info" },
            (message.lines || []).flatMap((line, index) =>
              index ? [h("br"), line] : [line],
            ),
          ),
        ]);
      }

      const username = message.username || "用户";
      const isSelf = selfNames.has(username);

      return h("div", { class: "chat-page-block" }, [
        h("div", { class: ["chat", isSelf ? "chat-end" : "chat-start"] }, [
          h("div", { class: "chat-image avatar" }, [
            h("div", { class: "w-10 rounded-full" }, [
              h("img", { alt: username, src: avatarFor(username) }),
            ]),
          ]),
          h("div", { class: "chat-header" }, [
            username,
            " ",
            h("time", { class: "opacity-50" }, message.time || ""),
          ]),
          message.footers?.length
            ? h(
                "div",
                { class: "chat-footer join mt-1.5" },
                message.footers.map((footer) =>
                  h(
                    "span",
                    {
                      class: [
                        "join-item badge badge-soft",
                        footerClass(footer),
                      ],
                    },
                    footer,
                  ),
                ),
              )
            : null,
          h(
            "div",
            { class: ["chat-bubble", isSelf && "chat-bubble-primary"] },
            [h(RenderedContent, { html: message.contentHtml || "" })],
          ),
        ]),
      ]);
    };
  },
});

const remainingMessages = computed(() =>
  props.header ? props.messages.slice(1) : props.messages,
);

const headerBadgeClass = computed(() => {
  if (!props.header?.extra || /^\d+$/.test(props.header.extra)) return "";

  return (
    {
      在线: "badge-soft badge-success",
      离线: "badge-soft badge-outline",
      忙碌: "badge-soft badge-error",
    }[props.header.extra] || "badge-soft"
  );
});
</script>
