<template>
  <ChatMessageTransition :delay="delay" @before-enter="markSending">
    <div
      class="chat min-w-0"
      :class="side === 'end' ? 'chat-end' : 'chat-start'"
    >
      <div class="chat-image avatar">
        <div class="w-10 rounded-full">
          <img
            alt="KoMoriSam"
            src="/assets/images/avatar/ayanami-with-eye-mask.webp"
          />
        </div>
      </div>
      <div class="chat-header">
        KoMoriSam
        <time class="text-xs opacity-50">{{ greetingTime }}</time>
      </div>
      <div ref="bubble" class="chat-bubble box-border" :aria-busy="deliveryState === 'sending'">
        <span
          v-if="deliveryState === 'sending'"
          class="loading loading-dots loading-xs"
        ></span>
        <span
          v-else
          class="transition-opacity duration-200 motion-reduce:transition-none"
          :class="contentVisible ? 'opacity-100' : 'opacity-0'"
        ><slot></slot></span>
      </div>
      <div class="chat-footer min-h-5" role="status" aria-atomic="true">
        <Transition
          mode="out-in"
          enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-150 ease-in motion-reduce:transition-none"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <span
            :key="deliveryState"
            class="inline-flex items-center gap-1"
            :class="
              deliveryState === 'read' ? 'text-success' : 'text-base-content/55'
            "
          >
            <i
              :class="
                deliveryState === 'sending'
                  ? 'loading loading-spinner size-3 motion-reduce:animate-none'
                  : deliveryState === 'read'
                    ? 'ri-check-double-line'
                    : 'ri-check-line'
              "
              aria-hidden="true"
            ></i>
            {{ translate(`common.chat.${deliveryState}`) }}
          </span>
        </Transition>
      </div>
    </div>
  </ChatMessageTransition>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "@/i18n";
import ChatMessageTransition from "@/components/interaction/feedback/ChatMessageTransition.vue";

const props = defineProps({
  side: { type: String, default: "start" },
  delay: { type: Number, default: 0 },
});
const { t: translate } = useLocale();
const greetingTime = ref("");
const deliveryState = ref("sending");
const bubble = ref(null);
const contentVisible = ref(true);
let deliveryTimer;
let readTimer;
let bubbleAnimation;
let messageRevision = 0;

async function deliverMessage() {
  const revision = messageRevision;
  const element = bubble.value;
  const before = element?.getBoundingClientRect();
  const animate = Boolean(element?.animate)
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  contentVisible.value = !animate;
  deliveryState.value = "delivered";
  await nextTick();
  if (revision !== messageRevision || !element) return;
  if (!animate) return;

  const after = element.getBoundingClientRect();
  bubbleAnimation = element.animate([
    { width: `${before.width}px`, height: `${before.height}px` },
    { width: `${after.width}px`, height: `${after.height}px` },
  ], { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  bubbleAnimation.onfinish = () => {
    if (revision !== messageRevision) return;
    bubbleAnimation = null;
    contentVisible.value = true;
  };
}

function markSending() {
  messageRevision++;
  bubbleAnimation?.cancel();
  bubbleAnimation = null;
  clearTimeout(deliveryTimer);
  clearTimeout(readTimer);
  contentVisible.value = true;
  deliveryState.value = "sending";
  greetingTime.value = new Date(Date.now() + props.delay).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
  deliveryTimer = setTimeout(() => {
    void deliverMessage();
    readTimer = setTimeout(() => {
      deliveryState.value = "read";
    }, 1000);
  }, props.delay + 1500);
}

onMounted(() => {
  // Hydration reuses the visible greeting without running an appear transition.
  if (!messageRevision) markSending();
});

onBeforeUnmount(() => {
  messageRevision++;
  bubbleAnimation?.cancel();
  clearTimeout(deliveryTimer);
  clearTimeout(readTimer);
});
</script>
