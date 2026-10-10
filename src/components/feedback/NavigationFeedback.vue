<template>
  <div
    v-if="isLoading"
    class="pointer-events-none fixed inset-x-0 top-0 z-80 h-1 animate-pulse bg-primary motion-reduce:animate-none"
    aria-hidden="true"
  />
  <div
    v-if="failedRoute"
    class="pointer-events-none fixed inset-x-0 top-20 z-80 flex justify-center px-3"
  >
    <div
      role="alert"
      class="alert pointer-events-auto max-w-xl sm:alert-horizontal"
    >
      <span>{{ translate("common.navigationFeedback.failed") }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-sm" @click="retry">
          {{ translate("common.navigationFeedback.retry") }}
        </button>
        <a :href="reloadHref" class="btn btn-sm btn-ghost">
          {{ translate("common.navigationFeedback.reload") }}
        </a>
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          @click="dismissError"
        >
          {{ translate("common.modal.close") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, watch } from "vue";
import { useNavigationFeedback } from "@/composables/useNavigationFeedback";
import { useToast } from "@/composables/useToast";
import { useLocale } from "@/i18n";

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
        translate("common.navigationFeedback.loading"),
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
