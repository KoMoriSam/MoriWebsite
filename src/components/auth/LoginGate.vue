<template>
  <section class="card border border-base-300 bg-base-100 p-6 text-center shadow-lg sm:p-8" aria-live="polite">
    <span class="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-base-200">
      <i class="ri-lock-2-line text-2xl" aria-hidden="true"></i>
    </span>
    <h2 class="font-serif text-xl font-semibold">{{ t('auth.loginTitle') }}</h2>
    <p class="mt-2 text-sm text-base-content/65">{{ state.checking ? t('auth.checking') : t('auth.novelGate') }}</p>
    <div class="mt-5 flex flex-wrap justify-center gap-2"><LoginButton /></div>
  </section>
</template>
<script setup>
import LoginButton from './LoginButton.vue';
import { useGithubSession } from '@/composables/auth/useGithubSession';
import { useLocale } from '@/i18n';
const { state } = useGithubSession();
const { t } = useLocale();
</script>
