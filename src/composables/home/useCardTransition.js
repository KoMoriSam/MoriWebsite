import { nextTick, onBeforeUnmount } from 'vue';
import { useLayoutMotion } from '@/composables/layout/useLayoutMotion';

export function useCardTransition(root) {
  const motion = useLayoutMotion();
  let revision = 0;
  const cancel = motion.cancel;
  const capture = () => new Map([...root.value.querySelectorAll('[data-card-motion]')].map(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return [element, { left: rect.left, top: rect.top, width: rect.width, height: rect.height, fontSize: parseFloat(style.fontSize), opacity: Number(style.opacity) }];
  }));
  const mix = (from, to, progress) => from + (to - from) * progress;
  const unchanged = (a, b) => ['left', 'top', 'width', 'height', 'fontSize', 'opacity'].every(key => Math.abs(a[key] - b[key]) < 0.01);

  async function change(update) {
    const current = ++revision;
    if (!root.value?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancel();
      update();
      return;
    }
    const before = capture();
    cancel();
    motion.start();
    update();
    await nextTick();
    if (current !== revision || !root.value) return;
    const after = capture();

    const pending = [];
    for (const [element, target] of after) {
      const source = before.get(element);
      const card = element.closest('[data-project-card]');
      const parentBefore = before.get(card);
      const parentAfter = after.get(card);
      if (!source || !parentBefore || !parentAfter || !target.width || !target.height || !parentAfter.width || !parentAfter.height) continue;
      if (unchanged(source, target) && unchanged(parentBefore, parentAfter)) continue;
      const isCard = element === card;
      const isText = ['title', 'description'].includes(element.dataset.cardMotion);
      const frames = Array.from({ length: 17 }, (_, index) => {
        const offset = index / 16;
        const progress = 1 - (1 - offset) ** 3;
        const parentScaleX = mix(parentBefore.width / parentAfter.width, 1, progress);
        const parentScaleY = mix(parentBefore.height / parentAfter.height, 1, progress);
        let x, y, scaleX, scaleY;
        if (isCard) {
          x = (source.left - target.left) * (1 - progress);
          y = (source.top - target.top) * (1 - progress);
          scaleX = parentScaleX;
          scaleY = parentScaleY;
        } else {
          x = (mix(source.left, target.left, progress) - mix(parentBefore.left, parentAfter.left, progress)) / parentScaleX - (target.left - parentAfter.left);
          y = (mix(source.top, target.top, progress) - mix(parentBefore.top, parentAfter.top, progress)) / parentScaleY - (target.top - parentAfter.top);
          const textScale = mix(source.fontSize / target.fontSize, 1, progress);
          scaleX = (isText ? textScale : mix(source.width / target.width, 1, progress)) / parentScaleX;
          scaleY = (isText ? textScale : mix(source.height / target.height, 1, progress)) / parentScaleY;
        }
        return {
          offset,
          transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
          ...(source.opacity !== target.opacity ? { opacity: mix(source.opacity, target.opacity, progress) } : {}),
        };
      });
      pending.push({ element, frames, origin: element.style.transformOrigin });
    }
    for (const { element } of pending) element.style.transformOrigin = '0 0';
    for (const { element, frames, origin } of pending) {
      motion.track(element.animate(frames, { duration: 240, easing: 'linear' }), () => {
        element.style.transformOrigin = origin;
      });
    }
    if (!pending.length) motion.finish();
  }

  onBeforeUnmount(() => { revision++; cancel(); });
  return { change };
}
