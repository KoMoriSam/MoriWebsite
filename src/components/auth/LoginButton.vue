<template>
  <button type="button" class="btn btn-primary" @click="(loginAction ?? login)({ hash: returnHash })">
    <i class="ri-github-fill" aria-hidden="true"></i>{{ label ?? t("auth.login") }}
  </button>
</template>
<script setup>
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
defineProps({ label: String, returnHash: String, loginAction: Function });
const { login } = useMoriAuth();
const { t } = useLocale();
</script>
