<template>
  <button type="button" class="btn btn-primary" @click="signIn">
    <i class="ri-github-fill" aria-hidden="true"></i>{{ t('auth.login') }}
  </button>
</template>
<script setup>
import { useGithubSession } from '@/composables/auth/useGithubSession';
import { useLocale } from '@/i18n';
const { state, login, showFallback } = useGithubSession();
const { t } = useLocale();
const signIn = () => state.error === 'session' ? showFallback() : login();
</script>
