<template>
  <button type="button" class="btn btn-primary" @click="(loginAction ?? login)({ hash: returnHash })">
    <i class="ri-github-fill" aria-hidden="true"></i>{{ t("auth.login") }}
  </button>
</template>
<script setup>
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
defineProps({ returnHash: String, loginAction: Function });
const { login } = useMoriAuth();
const { t } = useLocale();
</script>
