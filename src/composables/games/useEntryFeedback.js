import { onBeforeUnmount, onMounted, ref, toValue, watch } from "vue";
import { useLocale } from "@/i18n";
import { useToast } from "@/composables/useToast";

export function useEntryFeedback({
  room,
  error,
  errorText,
  storageAvailable,
  notice,
}) {
  const { t } = useLocale();
  const mounted = ref(false);
  const toast = useToast({
    position:
      "toast-center toast-bottom lg:toast-middle lg:my-0 lg:[&.toast-center]:items-start max-w-[min(24rem,calc(100vw-2rem))]",
    duration: 10000,
    closable: true,
    soft: true,
  });
  const messages = new Map();

  function sync(key, message, type) {
    const previous = messages.get(key);
    if (previous?.message === message) return;
    if (previous) {
      toast.remove(previous.id, previous.position);
      messages.delete(key);
    }
    if (message) messages.set(key, { message, ...toast[type](message) });
  }

  onMounted(() => {
    mounted.value = true;
  });
  watch(
    () => [
      mounted.value && !toValue(room),
      toValue(error) ? toValue(errorText) : "",
      toValue(storageAvailable) ? "" : t("games.storageWarning"),
      toValue(notice),
    ],
    ([active, errorMessage, storageMessage, noticeMessage]) => {
      sync("error", active ? errorMessage : "", "error");
      sync("storage", active ? storageMessage : "", "warning");
      sync("notice", active ? noticeMessage : "", "warning");
    },
    { immediate: true },
  );
  onBeforeUnmount(() => {
    for (const { id, position } of messages.values())
      toast.remove(id, position);
    messages.clear();
  });
}
