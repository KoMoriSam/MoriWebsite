<template>
  <section
    class="card border border-base-300 bg-base-100 p-6 text-center shadow-lg sm:p-8"
    aria-live="polite"
  >
    <span
      class="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-base-200"
    >
      <i class="ri-lock-2-line text-2xl" aria-hidden="true"></i>
    </span>
    <h2 class="font-serif text-xl font-semibold">{{ t("auth.loginTitle") }}</h2>
    <p class="mt-2 text-sm text-base-content/65">
      {{ state.checking ? t("auth.checking") : t(state.authenticated ? "auth.novelForbidden" : "auth.novelGate") }}
    </p>
    <p v-if="state.error" class="mt-2 text-sm text-base-content/65">
      {{ t(`auth.errors.${state.error}`) }}
    </p>
    <div class="mt-5 flex flex-wrap justify-center gap-2">
      <LoginButton v-if="!state.authenticated" :disabled="state.checking" />
      <button
        v-if="state.hasSession && !state.checking"
        type="button"
        class="btn btn-ghost"
        @click="retry"
      >
        {{ t("auth.retry") }}
      </button>
    </div>
  </section>
</template>
<script setup>
import LoginButton from "./LoginButton.vue";
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
const { state, retry } = useMoriAuth();
const { t } = useLocale();
</script>
