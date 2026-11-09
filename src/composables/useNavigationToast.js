import { onBeforeUnmount, watch } from "vue";
import { useLocale } from "@/i18n";
import { useToast } from "@/composables/useToast";

export function useNavigationToast({ isLoading, failedRoute, reloadHref, retry, dismissError }) {
  const { t: translate } = useLocale();
  const toast = useToast({ position: "center-top" });
  let notification = null;

  function close() {
    if (!notification) return;
    toast.remove(notification.id, notification.position);
    notification = null;
  }

  watch(
    () => [isLoading.value, failedRoute.value, reloadHref.value],
    ([loading, failed, href]) => {
      if (loading) {
        const message = translate("common.navigationStatus.loading");
        const options = { duration: 0, closable: false, actions: [], onDismiss: null };
        if (notification) notification.loading(message, options);
        else notification = toast.loading(message, options);
      } else if (failed) {
        const message = translate("common.navigationStatus.failed");
        const options = {
          duration: 0,
          closable: true,
          actions: [
            {
              label: translate("common.navigationStatus.retry"),
              description: translate("common.navigationStatus.retryHint"),
              onClick: retry,
            },
            {
              label: translate("common.navigationStatus.reload"),
              description: translate("common.navigationStatus.reloadHint"),
              href,
            },
          ],
          onDismiss: dismissError,
        };
        if (notification) notification.error(message, options);
        else notification = toast.error(message, options);
      } else {
        close();
      }
    },
    { flush: "post", immediate: true },
  );

  onBeforeUnmount(close);
}
