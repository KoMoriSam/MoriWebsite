<template>
  <div class="min-w-0">
    <button
      type="button"
      class="btn btn-ghost rounded-full h-auto min-h-11 min-w-0 gap-2 pl-3 pr-1"
      popovertarget="account-controls"
      style="anchor-name: --account-controls-anchor"
      :aria-label="t('auth.account')"
      :aria-expanded="open"
    >
      <span
        v-if="state.authenticated"
        class="max-w-16 truncate text-sm sm:max-w-32"
        :title="state.profile?.name"
        >{{ state.profile?.name || t("auth.loadingProfile") }}</span
      >
      <span
        v-else
        class="max-w-16 truncate text-sm sm:max-w-32"
        :title="state.profile?.name"
        >{{ t("auth.guest") }}</span
      >
      <span class="indicator shrink-0">
        <span
          v-if="unreadCount"
          class="indicator-item badge badge-error badge-xs"
          aria-hidden="true"
        ></span>
        <Avatar :src="state.profile?.avatarUrl" :name="state.profile?.name" />
      </span>
    </button>
    <section
      id="account-controls"
      ref="panel"
      popover="auto"
      class="dropdown dropdown-end mt-2 max-h-[min(78dvh,42rem)] w-96 overflow-hidden rounded-box border border-base-300 bg-base-100 p-3 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:[inset:3.75rem_0.5rem_auto_auto]! max-sm:[position-area:none]!"
      style="position-anchor: --account-controls-anchor"
      :aria-label="t('auth.account')"
      @beforetoggle="handleBeforeToggle"
    >
      <div
        ref="panelBody"
        class="flex max-h-[calc(min(78dvh,42rem)-1.5rem-2px)] flex-col"
        :style="
          panelHeight === null ? undefined : { height: `${panelHeight}px` }
        "
      >
        <header class="flex min-w-0 shrink-0 items-center gap-3 p-2">
          <Avatar
            :src="panelState.profile?.avatarUrl"
            :name="panelState.profile?.name"
          />
          <div class="min-w-0 flex-1">
            <h2
              class="truncate font-serif font-semibold"
              :title="panelState.profile?.name"
            >
              {{
                panelState.authenticated
                  ? panelState.profile?.name || t("auth.loadingProfile")
                  : t("auth.guest")
              }}
            </h2>
            <template v-if="panelState.profile">
              <p class="truncate text-xs text-base-content/55">
                @{{ panelState.profile.login }}
              </p>
              <p class="mt-1 break-all text-xs text-base-content/65">
                <span class="sr-only">{{ t("auth.email") }}: </span
                >{{ panelState.profile.email || t("auth.emailPrivate") }}
              </p>
            </template>
            <p
              v-else-if="panelState.checking"
              class="mt-1 text-xs text-base-content/60"
            >
              {{ t("auth.checking") }}
            </p>
          </div>
          <LoginButton
            v-if="!panelState.authenticated && !panelState.checking"
            class="max-sm:btn-sm"
          />
          <button
            v-if="
              (panelState.hasSession || panelState.authenticated) &&
              !panelState.checking
            "
            type="button"
            class="btn btn-ghost max-sm:btn-sm shrink-0"
            @click="signOut"
          >
            <i class="ri-logout-box-r-line" aria-hidden="true"></i>
            {{ t("auth.logout") }}
          </button>
        </header>
        <div
          v-if="panelState.error"
          class="my-2 flex shrink-0 items-center justify-between gap-2 px-2 text-xs text-base-content/65"
          role="status"
        >
          <span>{{ t(`auth.errors.${panelState.error}`) }}</span>
          <button type="button" class="btn btn-ghost btn-xs" @click="retry">
            {{ t("auth.retry") }}
          </button>
        </div>
        <div class="mt-2 shrink-0 border-t border-base-300 pt-2">
          <details
            name="account-settings"
            class="collapse collapse-arrow rounded-box"
            @toggle="refreshNotices"
          >
            <summary
              class="collapse-title flex min-h-11 items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
            >
              <i class="ri-notification-2-line" aria-hidden="true"></i
              >{{ t("common.noticeCenter.notifications") }}
              <span v-if="unreadCount" class="badge badge-error badge-xs">{{
                unreadCount
              }}</span>
            </summary>
            <div class="collapse-content px-2 pb-2">
              <NoticeCenter
                class="flex min-h-0 flex-1 flex-col"
                inline
                @navigate="close"
              />
            </div>
          </details>
          <details
            name="account-settings"
            class="collapse collapse-arrow rounded-box"
          >
            <summary
              class="collapse-title flex min-h-11 items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
            >
              <i class="ri-translate-2" aria-hidden="true"></i
              >{{ t("common.language") }}
              <span class="ml-auto text-xs text-base-content/55">{{
                currentLanguageName
              }}</span>
            </summary>
            <div class="collapse-content px-2 pb-2">
              <LanguageController inline />
            </div>
          </details>
          <details
            name="account-settings"
            class="collapse collapse-arrow rounded-box"
          >
            <summary
              class="collapse-title flex min-h-11 flex-wrap items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
            >
              <i :class="currentTheme.icon" aria-hidden="true"></i
              ><span class="min-w-0">{{
                t("common.themeController.interfaceTheme")
              }}</span>
              <span
                v-if="!themes.followSystem"
                class="max-w-20 truncate text-xs text-base-content/55"
                :title="currentTheme.name"
                >{{ currentTheme.name }}</span
              >
              <label
                class="ml-auto flex min-w-0 cursor-pointer items-center gap-2 text-xs text-base-content/65"
                @click.stop
                @keydown.stop
              >
                <span>{{ t("common.themeController.followSystemTheme") }}</span>
                <input
                  v-model="themes.followSystem"
                  type="checkbox"
                  class="toggle toggle-xs shrink-0"
                  :aria-label="t('common.themeController.followSystemTheme')"
                  @click.stop
                  @keydown.stop
                />
              </label>
            </summary>
            <div class="collapse-content px-2 pb-2">
              <ThemeController inline hide-header />
            </div>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>
<script setup>
import { computed, ref, shallowRef, watch } from "vue";
import Avatar from "./Avatar.vue";
import LoginButton from "./LoginButton.vue";
import LanguageController from "@/components/interaction/controls/LanguageController.vue";
import ThemeController from "@/components/interaction/controls/ThemeController.vue";
import NoticeCenter from "@/components/announcement/interaction/NoticeCenter.vue";
import { useAnnouncementStore } from "@/stores/announcementStore";
import { useThemeStore } from "@/stores/themeStore";
import { useGithubSession } from "@/composables/auth/useGithubSession";
import { useLocale, LOCALES } from "@/i18n";
const { state, logout, retry } = useGithubSession();
const { t, locale } = useLocale();
const announcements = useAnnouncementStore();
const themes = useThemeStore();
const unreadCount = computed(() => announcements.unreadAnnouncements.length);
const currentTheme = computed(() => themes.currentTheme);
const currentLanguageName = computed(
  () => LOCALES.find((item) => item.code === locale.value)?.name,
);
const panel = ref(null);
const panelBody = ref(null);
const panelHeight = ref(null);
const open = ref(false);
const panelState = shallowRef({ ...state });
const handleBeforeToggle = (event) => {
  open.value = event.newState === "open";
  if (open.value) {
    panelHeight.value = null;
    panelState.value = { ...state };
  } else {
    panelHeight.value = panelBody.value?.offsetHeight ?? null;
  }
};
// 退场期间保留当前账户展示，下一次打开时再同步最新资料。
watch(
  () => [
    state.authenticated,
    state.hasSession,
    state.profile,
    state.checking,
    state.error,
  ],
  () => {
    if (open.value) panelState.value = { ...state };
  },
  { flush: "sync" },
);
const close = () => {
  if (panel.value?.matches(":popover-open")) panel.value.hidePopover();
};
const signOut = () => {
  close();
  logout();
};
const refreshNotices = (event) => {
  if (event.target.open) void announcements.refreshIfStale();
};
</script>
