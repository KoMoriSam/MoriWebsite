<template>
  <div class="relative grid min-w-0 gap-3">
    <fieldset class="fieldset">
      <label class="label" :for="inputId">{{ t("games.nickname") }}</label>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <Avatar
            :src="usingGithub ? profile.avatarUrl : ''"
            :name="displayName"
          />
          <div data-entry-nickname class="min-w-0 flex-1">
            <input
              :id="inputId"
              ref="input"
              type="text"
              class="input flex w-full"
              :class="{ 'input-error': checked && !validName }"
              :value="displayName"
              :title="displayName"
              :disabled="disabled"
              maxlength="24"
              required
              autocomplete="nickname"
              :aria-describedby="`${inputId}-hint`"
              :aria-invalid="checked && !validName"
              @input="updateNickname"
              @blur="emit('blur')"
              @change="emit('commit')"
            />
          </div>
          <slot name="action"></slot>
        </div>
        <p :id="`${inputId}-hint`" class="mt-1 ml-11 grid text-xs leading-4 text-base-content/50" role="status">
          <span class="col-start-1 row-start-1" :class="{ invisible: checked && !validName }" :aria-hidden="checked && !validName">{{ t(usingGithubNickname ? "games.githubNicknameHint" : "games.nicknameHint") }}</span>
          <span class="col-start-1 row-start-1 text-error" :class="{ invisible: !checked || validName }" :aria-hidden="!checked || validName">{{ t("games.errors.NICKNAME") }}</span>
        </p>
      </div>
    </fieldset>
    <div data-entry-profile class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <label class="label cursor-pointer whitespace-normal text-sm">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          :checked="usingGithub"
          :disabled="disabled || (state.authenticated && !profile)"
          @change="chooseGithub"
        />
        {{ t("auth.githubProfile") }}
      </label>
      <template v-if="state.error">
        <span class="text-xs text-base-content/60">{{
          t(`auth.errors.${state.error}`)
        }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          :disabled="disabled"
          @click="retry"
        >
          {{ t("auth.retry") }}
        </button>
      </template>
    </div>
    <slot></slot>
  </div>
</template>
<script setup>
import { computed, ref, useId } from "vue";
import Avatar from "@/components/auth/Avatar.vue";
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useLocale } from "@/i18n";
const props = defineProps({
  nickname: { type: String, default: "" },
  github: Boolean,
  disabled: Boolean,
  checked: Boolean,
});
const emit = defineEmits([
  "update:nickname",
  "update:github",
  "blur",
  "commit",
]);
const { profile, state, retry, login } = useMoriAuth();
const { t } = useLocale();
const inputId = `player-nickname-${useId()}`;
const input = ref(null);
const usingGithub = computed(() => props.github && !!profile.value);
const displayName = computed(() => props.nickname);
const usingGithubNickname = computed(
  () => !!profile.value?.name && displayName.value === profile.value.name,
);
const validName = computed(
  () =>
    displayName.value.trim().length > 0 &&
    displayName.value.length <= 24 &&
    !/[\p{Cc}\p{Cf}]/u.test(displayName.value),
);
const updateNickname = (event) => {
  emit("update:nickname", event.target.value);
};
const chooseGithub = (event) => {
  const checked = event.target.checked;
  if (checked && !state.authenticated) {
    emit("update:github", true);
    // 授权返回后保留此次选择，包括从大厅编辑弹窗发起的登录。
    try {
      localStorage.setItem("mori:games:profile-source", "github");
    } catch {
      /* Storage can be unavailable. */
    }
    event.target.checked = false;
    login();
    return;
  }
  emit("update:github", checked);
};
defineExpose({ focus: () => input.value?.focus() });
</script>
