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
        v-else-if="!state.checking"
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
      class="dropdown dropdown-end isolate origin-top-left mt-2 max-h-none w-96 overflow-hidden rounded-box border border-base-300 bg-base-100 p-3 shadow-xl max-sm:mt-0! max-sm:w-[calc(100vw-1rem)]! max-sm:inset-[calc(var(--navbar-height)+0.25rem)_0.5rem_auto_auto]! max-sm:[position-area:none]!"
      style="position-anchor: --account-controls-anchor"
      :aria-label="t('auth.account')"
      @beforetoggle="handleBeforeToggle"
    >
      <div
        ref="panelSurface"
        class="pointer-events-none invisible absolute -inset-px -z-10 origin-top-left rounded-inherit border border-base-300 bg-base-100 shadow-xl"
        aria-hidden="true"
      ></div>
      <div ref="panelViewport" class="relative overflow-hidden">
        <div
          ref="panelBody"
          class="flex origin-top-left flex-col"
          :style="
            panelHeight === null ? undefined : { height: `${panelHeight}px` }
          "
        >
          <header class="flex min-w-0 shrink-0 flex-col gap-1.5 px-3 py-2">
            <div
              class="flex min-w-0 items-center gap-3"
              :class="accountAction === 'login' ? 'flex-wrap' : ''"
            >
              <div
                class="flex min-w-0 flex-1 items-center gap-3"
                :class="accountAction === 'login' ? 'basis-auto' : 'basis-0'"
              >
                <Avatar
                  :src="panelState.profile?.avatarUrl"
                  :name="panelState.profile?.name"
                  :class="
                    panelState.profile ? 'mt-0.5 self-start' : 'self-center'
                  "
                />
                <hgroup
                  class="flex min-h-9 min-w-0 flex-1 flex-col justify-center"
                >
                  <h2
                    class="wrap-anywhere font-serif font-semibold"
                    :title="panelState.profile?.name"
                  >
                    {{
                      panelState.authenticated
                        ? panelState.profile?.name ||
                          panelState.profile?.login ||
                          t("auth.account")
                        : panelState.checking || panelState.hasSession
                          ? t("auth.account")
                          : t("auth.guest")
                    }}
                  </h2>
                  <p
                    v-if="panelState.profile"
                    class="wrap-anywhere text-xs leading-4 text-base-content/55"
                  >
                    @{{ panelState.profile.login }}
                  </p>
                </hgroup>
              </div>
              <LoginButton
                v-if="accountAction === 'login'"
                class="btn-sm ml-auto h-auto min-h-9 min-w-0 max-w-full shrink-0 wrap-anywhere px-3 py-2 leading-relaxed [&>i]:shrink-0"
              />
              <button
                v-if="panelState.hasSession || panelState.authenticated"
                type="button"
                class="btn btn-sm btn-ghost h-auto min-h-9 shrink-0 gap-1.5 px-2 py-1.5 leading-5"
                :class="panelState.profile ? 'self-start' : 'self-center'"
                @click="signOut"
              >
                <i class="ri-logout-box-r-line shrink-0" aria-hidden="true"></i>
                <span class="whitespace-nowrap">{{ t("auth.logout") }}</span>
              </button>
            </div>
            <p
              v-if="panelState.checking"
              class="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-base-content/60"
              role="status"
            >
              <span
                class="loading loading-spinner loading-xs scale-60 translate-y-0.25 shrink-0"
                aria-hidden="true"
              ></span>
              <span class="min-w-0 wrap-anywhere">{{
                t(
                  panelState.authenticated
                    ? "auth.loadingProfile"
                    : "auth.checking",
                )
              }}</span>
            </p>
            <p
              v-if="panelState.error"
              class="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-base-content/65"
              role="status"
            >
              <i class="ri-error-warning-line shrink-0" aria-hidden="true"></i>
              <span class="min-w-0 wrap-anywhere">{{
                t(`auth.errors.${panelState.error}`)
              }}</span>
            </p>
            <button
              v-if="accountAction === 'retry'"
              type="button"
              class="btn btn-sm w-full"
              @click="retry"
            >
              <i class="ri-refresh-line shrink-0" aria-hidden="true"></i>
              <span class="min-w-0 wrap-anywhere">{{ t("auth.retry") }}</span>
            </button>
          </header>
          <div
            ref="accordion"
            class="mt-2 flex min-h-0 flex-col border-t border-base-300 pt-2 [&>details]:transition-none [&>details]:overflow-visible [&>details>.collapse-content]:transition-none [&>details[data-accordion-open=false]>.collapse-content]:invisible [&>details[data-accordion-open=false]>.collapse-content]:pb-0 [&>details>.collapse-title]:after:[transform:var(--accordion-arrow-transform)]! [&>details::details-content]:contents [&>details::details-content]:[content-visibility:visible] [&>details::details-content]:transition-none"
            @click="accordionMotion.toggle"
            @toggle.capture="accordionMotion.sync"
          >
            <details
              class="collapse collapse-arrow shrink-0 rounded-box"
              @toggle="refreshNotices"
              open
            >
              <summary
                class="collapse-title flex min-h-11 items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
              >
                <i class="ri-notification-2-line" aria-hidden="true"></i
                >{{ t("common.notices.title") }}
                <span v-if="unreadCount" class="badge badge-error badge-xs">{{
                  unreadCount
                }}</span>
                <button
                  v-if="unreadCount"
                  type="button"
                  class="btn btn-xs ml-auto shrink-0"
                  @click.stop.prevent="announcements.markAllRead()"
                  @keydown.stop
                >
                  {{ t("common.modal.markRead") }}
                </button>
              </summary>
              <div
                class="collapse-content flex min-h-0 flex-col overflow-hidden px-3 pb-0"
              >
                <div
                  data-accordion-window
                  class="relative flex min-h-0 min-w-0 flex-1 flex-col"
                >
                  <div
                    data-accordion-content
                    class="flex min-h-0 min-w-0 flex-col overflow-hidden"
                  >
                    <NoticeCenter
                      :active="open && noticesOpen"
                      @navigate="close"
                    />
                  </div>
                </div>
              </div>
            </details>
            <details class="collapse collapse-arrow shrink-0 rounded-box">
              <summary
                class="collapse-title flex min-h-11 items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
              >
                <i class="ri-translate-2" aria-hidden="true"></i
                >{{ t("common.language") }}
                <span class="ml-auto text-xs text-base-content/55">{{
                  currentLanguageName
                }}</span>
              </summary>
              <div
                class="collapse-content flex min-h-0 flex-col overflow-hidden px-3 pb-0"
              >
                <div
                  data-accordion-window
                  class="relative -mx-1 flex min-h-0 min-w-0 flex-1 flex-col px-1"
                >
                  <div
                    data-accordion-content
                    class="flex min-h-0 min-w-0 flex-col overflow-visible"
                  >
                    <LanguageController />
                  </div>
                </div>
              </div>
            </details>
            <details class="collapse collapse-arrow shrink-0 rounded-box">
              <summary
                class="collapse-title flex min-h-11 flex-wrap items-center gap-2 py-3 pl-3 pr-9 text-sm font-medium"
              >
                <i :class="currentTheme.icon" aria-hidden="true"></i
                ><span class="min-w-0">{{ t("common.theme.title") }}</span>
                <label
                  class="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-base-content/65"
                  @click.stop
                  @keydown.stop
                >
                  <span>{{ t("common.theme.system") }}</span>
                  <input
                    v-model="themes.followSystem"
                    type="checkbox"
                    class="toggle toggle-xs shrink-0"
                    :aria-label="t('common.theme.system')"
                    @click.stop
                    @keydown.stop
                  />
                </label>
                <span
                  class="ml-auto max-w-20 truncate text-xs text-base-content/55"
                  :title="currentTheme.name"
                  >{{ currentTheme.name }}</span
                >
              </summary>
              <div
                class="collapse-content flex min-h-0 flex-col overflow-hidden px-3 pb-2"
              >
                <div
                  data-accordion-window
                  class="relative -mx-1 flex min-h-0 min-w-0 flex-1 flex-col px-1"
                >
                  <div
                    data-accordion-content
                    class="flex min-h-0 min-w-0 flex-col overflow-visible"
                  >
                    <ThemeController />
                  </div>
                </div>
              </div>
            </details>
          </div>
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
import { useMoriAuth } from "@/composables/auth/useMoriAuth";
import { useAccordionTransition } from "@/composables/layout/useAccordionTransition";
import { useLocale, LOCALES } from "@/i18n";
const { state, logout, retry } = useMoriAuth();
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
const panelSurface = ref(null);
const panelViewport = ref(null);
const panelHeight = ref(null);
const open = ref(false);
const noticesOpen = ref(true);
const panelState = shallowRef({ ...state });
const accountAction = computed(() => {
  const { authenticated, hasSession, checking, error } = panelState.value;
  if (checking) return null;
  if (authenticated) return error ? "retry" : null;
  if (hasSession || error === "storage") return "retry";
  return "login";
});
const accordion = ref(null);
const accordionMotion = useAccordionTransition(
  accordion,
  panel,
  panelBody,
  panelSurface,
  panelViewport,
);
const handleBeforeToggle = (event) => {
  open.value = event.newState === "open";
  if (open.value) {
    panelHeight.value = null;
    panelState.value = { ...state };
  } else {
    panelHeight.value = panelBody.value?.offsetHeight ?? null;
    accordionMotion.cancel();
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
  noticesOpen.value = event.target.open;
  if (event.target.open) void announcements.refreshIfStale();
};
</script>
