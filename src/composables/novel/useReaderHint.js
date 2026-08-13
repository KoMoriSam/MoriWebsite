import { onBeforeUnmount, ref } from "vue";

export const useReaderHint = ({ duration = 10000 } = {}) => {
  const visible = ref(false);
  let timer = 0;

  const dismiss = () => {
    window.clearTimeout(timer);
    visible.value = false;
  };

  const show = () => {
    visible.value = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(dismiss, duration);
  };

  onBeforeUnmount(() => window.clearTimeout(timer));

  return { dismiss, show, visible };
};
