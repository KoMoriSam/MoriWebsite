import { computed, onBeforeUnmount, ref } from "vue";

const activeMotions = ref(0);
export const layoutMotionActive = computed(() => activeMotions.value > 0);

export function useLayoutMotion() {
  const animations = new Map();
  let active = false;

  function start() {
    if (active) return;
    active = true;
    activeMotions.value++;
  }

  function finish() {
    if (!active) return;
    active = false;
    activeMotions.value--;
  }

  function settle(animation) {
    if (!animations.has(animation)) return;
    const cleanup = animations.get(animation);
    animations.delete(animation);
    cleanup();
    if (!animations.size) finish();
  }

  function track(animation, cleanup = () => {}) {
    start();
    animations.set(animation, cleanup);
    animation.finished.then(() => settle(animation), () => settle(animation));
  }

  function cancel({ cancelAnimations = true } = {}) {
    for (const animation of [...animations.keys()]) {
      if (cancelAnimations) animation.cancel();
      settle(animation);
    }
    finish();
  }

  onBeforeUnmount(cancel);
  return { start, finish, track, cancel };
}
