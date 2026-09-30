<template>
  <div class="grid min-w-0 gap-3">
    <fieldset class="fieldset">
      <label class="label" :for="inputId">{{ t('games.nickname') }}</label>
      <div class="flex items-start gap-2">
        <Avatar class="mt-0.5" :src="usingGithub ? profile.avatarUrl : ''" :name="displayName" />
        <div class="min-w-0 flex-1">
          <input
            :id="inputId"
            ref="input"
            type="text"
            class="input w-full"
            :class="{ 'input-error': checked && !validName }"
            :value="displayName"
            :title="displayName"
            :readonly="usingGithub"
            :disabled="disabled"
            :maxlength="usingGithub ? undefined : 24"
            required
            autocomplete="nickname"
            :aria-describedby="checked && !validName ? `${inputId}-hint` : undefined"
            :aria-invalid="checked && !validName"
            @input="updateNickname"
            @blur="emit('blur')"
            @change="emit('commit')"
          />
          <p v-if="checked && !validName" :id="`${inputId}-hint`" class="mt-1 text-xs text-error" role="status">{{ t('games.errors.NICKNAME') }}</p>
        </div>
        <slot name="action"></slot>
      </div>
    </fieldset>
    <slot></slot>
    <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <label class="label cursor-pointer whitespace-normal text-sm">
        <input type="checkbox" class="checkbox checkbox-sm" :checked="usingGithub" :disabled="disabled || (state.authenticated && !profile)" @change="chooseGithub" />
        {{ t('auth.githubProfile') }}
      </label>
      <template v-if="state.error">
        <span class="text-xs text-base-content/60">{{ t('auth.profileError') }}</span>
        <button type="button" class="btn btn-ghost btn-xs" :disabled="disabled" @click="retry">{{ t('auth.retry') }}</button>
      </template>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, useId } from 'vue';
import Avatar from '@/components/auth/Avatar.vue';
import { useGithubSession } from '@/composables/auth/useGithubSession';
import { useLocale } from '@/i18n';
const props = defineProps({ nickname: { type: String, default: '' }, github: Boolean, disabled: Boolean, checked: Boolean });
const emit = defineEmits(['update:nickname', 'update:github', 'blur', 'commit']);
const { profile, state, retry, login, showFallback } = useGithubSession();
const { t } = useLocale();
const inputId = `player-nickname-${useId()}`;
const input = ref(null);
const usingGithub = computed(() => props.github && !!profile.value);
const displayName = computed(() => usingGithub.value ? profile.value.name : props.nickname);
const validName = computed(() => displayName.value.trim().length > 0 && displayName.value.length <= (usingGithub.value ? 256 : 24) && !/[\p{Cc}\p{Cf}]/u.test(displayName.value));
const updateNickname = event => { if (!usingGithub.value) emit('update:nickname', event.target.value); };
const chooseGithub = event => {
  const checked = event.target.checked;
  if (checked && !state.authenticated) {
    emit('update:github', true);
    // 授权返回后保留此次选择，包括从大厅编辑弹窗发起的登录。
    try { localStorage.setItem('mori:games:profile-source', 'github'); } catch { /* Storage can be unavailable. */ }
    event.target.checked = false;
    if (state.error === 'session') showFallback();
    else login();
    return;
  }
  emit('update:github', checked);
};
defineExpose({ focus: () => input.value?.focus() });
</script>
