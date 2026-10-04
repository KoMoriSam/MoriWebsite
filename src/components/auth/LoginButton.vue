<template>
  <button type="button" class="btn btn-primary" @click="login">
    <i class="ri-github-fill" aria-hidden="true"></i>{{ t("auth.login") }}
  </button>
</template>
<script setup>
import { useGithubSession } from "@/composables/auth/useGithubSession";
import { useLocale } from "@/i18n";
const { login } = useGithubSession();
const { t } = useLocale();
</script>
