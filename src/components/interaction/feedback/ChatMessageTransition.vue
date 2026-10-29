<template>
  <component
    :is="group ? TransitionGroup : Transition"
    v-bind="$attrs"
    :tag="group ? 'div' : undefined"
    name="chat-message"
    :duration="{ leave: 220 }"
    appear
    @before-enter="prepareMessageEnter"
    @enter="animateMessageEnter"
    @enter-cancelled="cancelMessageEnter"
    @after-enter="$emit('after-enter')"
  >
    <slot></slot>
  </component>
</template>

<script setup>
import { onBeforeUnmount, Transition, TransitionGroup } from 'vue';

defineOptions({ inheritAttrs: false });
const props = defineProps({ group: Boolean, delay: { type: Number, default: 0 } });
const emit = defineEmits(['before-enter', 'after-enter']);

let nextMessageEnterAt = 0;
const messageEnterCleanups = new Map();
function prepareMessageEnter(element) {
  emit('before-enter');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = Date.now();
  const start = Math.max(now + props.delay, nextMessageEnterAt);
  nextMessageEnterAt = start + 160;
  element.style.setProperty('--message-delay', `${start - now}ms`);
}
function animateMessageEnter(element, done) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }
  const delay = parseFloat(element.style.getPropertyValue('--message-delay')) || 0;
  const bubble = element.querySelector(':scope > .chat-bubble');
  const finish = () => {
    cancelMessageEnter(element);
    done();
  };
  const onTransitionEnd = event => {
    if (event.target === bubble && event.propertyName === 'transform') finish();
  };
  bubble?.addEventListener('transitionend', onTransitionEnd);
  const timer = setTimeout(finish, delay + 600);
  messageEnterCleanups.set(element, () => {
    clearTimeout(timer);
    bubble?.removeEventListener('transitionend', onTransitionEnd);
    element.style.removeProperty('--message-delay');
  });
}
function cancelMessageEnter(element) {
  messageEnterCleanups.get(element)?.();
  messageEnterCleanups.delete(element);
}
onBeforeUnmount(() => {
  for (const cleanup of messageEnterCleanups.values()) cleanup();
  messageEnterCleanups.clear();
});
</script>

<style>
@media (prefers-reduced-motion: no-preference) {
  .chat-message-enter-active > .chat-bubble,
  .chat-message-enter-active > .chat-image,
  .chat-message-enter-active > .chat-header,
  .chat-message-enter-active > .chat-footer {
    transition:
      opacity 360ms ease,
      transform 360ms ease;
    transition-delay: var(--message-delay, 0ms);
  }

  .chat-message-enter-active > .chat-bubble,
  .chat-message-enter-active > .chat-header,
  .chat-message-enter-active > .chat-footer {
    transition-delay: calc(var(--message-delay, 0ms) + 160ms);
  }

  .chat-message-leave-active {
    position: absolute;
    width: 100%;
  }

  .chat-message-leave-active > .chat-bubble,
  .chat-message-leave-active > .chat-image,
  .chat-message-leave-active > .chat-header,
  .chat-message-leave-active > .chat-footer {
    transition:
      opacity 220ms ease,
      transform 220ms ease;
  }

  .chat-message-move {
    transition: transform 300ms ease;
  }

  .chat-message-enter-from > .chat-bubble,
  .chat-message-enter-from > .chat-image,
  .chat-message-enter-from > .chat-header,
  .chat-message-enter-from > .chat-footer,
  .chat-message-leave-to > .chat-bubble,
  .chat-message-leave-to > .chat-image,
  .chat-message-leave-to > .chat-header,
  .chat-message-leave-to > .chat-footer {
    opacity: 0;
  }

  .chat-message-enter-from.chat-end > .chat-bubble,
  .chat-message-leave-to.chat-end > .chat-bubble {
    transform: translateX(1rem);
  }

  .chat-message-enter-from.chat-start > .chat-bubble,
  .chat-message-leave-to.chat-start > .chat-bubble {
    transform: translateX(-1rem);
  }

  .chat-message-enter-from > .chat-image,
  .chat-message-leave-to > .chat-image {
    transform: translateY(1rem);
  }
}
</style>
