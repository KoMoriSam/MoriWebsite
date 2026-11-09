<template>
  <div
    v-if="isLoading"
    class="pointer-events-none fixed inset-x-0 top-0 z-80 h-1 animate-pulse bg-primary motion-reduce:animate-none"
    aria-hidden="true"
  />
  <NavigationFailure
    v-if="failedRoute"
    :reload-href="reloadHref"
    @retry="retry"
    @dismiss="dismissError"
  />
</template>

<script setup>
import { onBeforeUnmount, watch } from "vue";
import { useNavigationFeedback } from "@/composables/useNavigationFeedback";
import { useToast } from "@/composables/useToast";
import { useLocale } from "@/i18n";
import NavigationFailure from "@/components/feedback/NavigationFailure.vue";

const { t: translate } = useLocale();
const { isLoading, failedRoute, reloadHref, retry, dismissError } =
  useNavigationFeedback();
const toast = useToast();
let loadingToast = null;

function closeLoadingToast() {
  if (!loadingToast) return;
  toast.remove(loadingToast.id, loadingToast.position);
  loadingToast = null;
}

watch(
  isLoading,
  (loading) => {
    if (loading) {
      loadingToast = toast.loading(
        translate("common.navigationStatus.loading"),
        { position: "center-top" },
      );
    } else {
      closeLoadingToast();
    }
  },
  { flush: "post" },
);

onBeforeUnmount(closeLoadingToast);
</script>
