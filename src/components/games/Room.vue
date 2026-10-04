<template>
  <div
    ref="roomRoot"
    class="min-w-0 flex-1"
    :class="
      showSidebar
        ? 'drawer drawer-end max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:bottom-0 max-lg:grid-rows-[minmax(0,1fr)] max-lg:overflow-hidden lg:drawer-open'
        : nightPhase
          ? 'flex min-h-dvh flex-col lg:min-h-0'
          : 'flex flex-col'
    "
  >
    <input
      v-if="showSidebar"
      :id="sidebarId"
      type="checkbox"
      class="drawer-toggle"
      :checked="sidebarExpanded && desktopViewport"
    />
    <div
      class="flex min-w-0 flex-1 flex-col"
      :class="
        showSidebar ? 'drawer-content min-h-0 overflow-hidden lg:h-dvh' : ''
      "
    >
      <ContentPage
        :title="t(definition.titleKey)"
        :description="t(definition.descriptionKey)"
        :show-footer="!viewportFrame"
        :fill-height="viewportFrame"
        :compact-header="!!room && room.status !== 'lobby'"
        hide-mobile-footer
      >
        <template v-if="$slots['page-notice']" #header-notice>
          <slot name="page-notice"></slot>
        </template>
        <template #meta>
          <template v-if="!room">
            <span class="inline-flex items-center gap-1.5">
              <i class="ri-group-line" aria-hidden="true"></i>
              {{
                t("games.playerRange", {
                  min: definition.minPlayers,
                  max: definition.maxPlayers,
                })
              }}
            </span>
            <span
              v-for="info in definition.metadata"
              :key="info.labelKey"
              class="inline-flex items-center gap-1.5"
            >
              <i :class="info.icon" aria-hidden="true"></i>
              {{ t(info.labelKey) }}
            </span>
          </template>
          <template v-else>
            <span class="inline-flex items-center gap-1.5">
              <i class="ri-door-open-line" aria-hidden="true"></i>
              <span class="hidden sm:block">{{ t("games.roomCode") }}</span>
              <span class="font-mono tracking-widest">{{ room.code }}</span>
            </span>
            <span
              v-if="room.status === 'lobby'"
              class="inline-flex items-center gap-1.5"
            >
              <i class="ri-group-line" aria-hidden="true"></i>
              {{ t("games.onlinePlayers", { n: onlinePlayerCount }) }}
            </span>
            <span
              class="inline-flex min-w-0 items-center gap-1.5"
              role="status"
              aria-live="polite"
            >
              <span
                v-if="connectionLoading"
                class="loading loading-spinner loading-xs"
                aria-hidden="true"
              ></span>
              <i v-else :class="connectionIcon" aria-hidden="true"></i>
              <span
                class="truncate"
                :title="t(`games.connections.${connection}`)"
                >{{ t(`games.connections.${connection}`) }}</span
              >
            </span>
          </template>
        </template>
        <template #actions>
          <div v-if="!room" role="tablist" class="tabs tabs-box w-fit">
            <button
              v-for="mode in ['create', 'join']"
              :key="mode"
              :id="`game-entry-${mode}`"
              type="button"
              role="tab"
              class="tab"
              :class="{ 'tab-active': entryMode === mode }"
              :aria-selected="entryMode === mode"
              aria-controls="game-entry-panel"
              :tabindex="entryMode === mode ? 0 : -1"
              :disabled="busy"
              @click="selectEntryMode(mode)"
              @keydown.left.prevent="
                selectEntryMode(mode === 'create' ? 'join' : 'create', $event)
              "
              @keydown.right.prevent="
                selectEntryMode(mode === 'create' ? 'join' : 'create', $event)
              "
            >
              {{ t(`games.${mode}`) }}
            </button>
          </div>
          <div v-else class="flex items-center gap-1">
            <button
              type="button"
              class="btn btn-square btn-ghost btn-xs"
              :aria-label="
                t(audioEnabled ? 'games.audio.disable' : 'games.audio.enable')
              "
              :title="
                t(audioEnabled ? 'games.audio.disable' : 'games.audio.enable')
              "
              :aria-pressed="audioEnabled"
              @click="toggleAudio"
            >
              <i
                :class="
                  audioEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line'
                "
                aria-hidden="true"
              ></i>
            </button>
            <slot name="page-actions" :room="room"></slot>
            <div
              v-for="action in roomActions"
              :key="action.key"
              class="tooltip tooltip-bottom"
              :data-tip="action.label"
            >
              <button
                type="button"
                class="btn btn-square btn-ghost btn-xs"
                :aria-label="action.label"
                :disabled="action.disabled"
                @click="action.onClick()"
              >
                <i :class="action.icon" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </template>
        <div
          v-if="error"
          role="alert"
          class="alert alert-error alert-soft alert-vertical mb-4 sm:alert-horizontal"
        >
          <span class="min-w-0 flex-1 text-sm">{{ errorText }}</span>
          <button
            v-if="room && canReconnect && connection !== 'online'"
            type="button"
            class="btn btn-sm"
            @click="confirmReconnect"
          >
            <i class="ri-cloud-line" aria-hidden="true"></i>
            {{ t("games.reconnect") }}
          </button>
        </div>
        <p
          v-if="!storageAvailable"
          role="status"
          class="mb-4 text-sm text-warning"
        >
          {{ t("games.storageWarning") }}
        </p>
        <div v-if="!room" class="grid gap-6 lg:grid-cols-2">
          <section class="card">
            <form
              id="game-entry-panel"
              role="tabpanel"
              :aria-labelledby="`game-entry-${entryMode}`"
              class="card-body gap-3 p-0"
              novalidate
              @submit.prevent="enterRoom(entryMode === 'join')"
            >
              <ProfileForm
                ref="nicknameInput"
                v-model:nickname="nickname"
                :github="useGithubProfile"
                :disabled="busy"
                :checked="nicknameChecked"
                @update:github="chooseProfile"
                @blur="nicknameChecked = true"
                @commit="joinCompletedRoom"
              >
                <template #action>
                  <button
                    v-if="entryMode === 'create'"
                    type="submit"
                    class="btn shrink-0"
                    :disabled="busy"
                  >
                    {{ t("games.create") }}
                  </button>
                </template>
                <fieldset v-if="entryMode === 'join'" class="fieldset">
                  <label class="label" for="room-code">{{
                    t("games.roomCode")
                  }}</label>
                  <div class="flex flex-wrap items-start gap-3">
                    <div class="min-w-0">
                      <label
                        class="otp validator"
                        :class="{ 'opacity-50': busy }"
                      >
                        <span
                          v-for="digit in 8"
                          :key="digit"
                          aria-hidden="true"
                        ></span>
                        <input
                          type="text"
                          id="room-code"
                          ref="codeInput"
                          :value="code"
                          @input="updateRoomCode"
                          maxlength="8"
                          pattern="[A-HJ-NP-Z2-9]{8}"
                          required
                          inputmode="text"
                          autocapitalize="characters"
                          autocomplete="off"
                          :spellcheck="false"
                          :aria-label="t('games.roomCode')"
                          aria-describedby="room-code-hint"
                          :aria-invalid="codeChecked && !validCode"
                          @blur="codeChecked = true"
                          :disabled="busy"
                        />
                      </label>
                      <p
                        id="room-code-hint"
                        class="validator-hint hidden"
                        aria-live="polite"
                      >
                        {{ t("games.errors.ROOM_CODE") }}
                      </p>
                    </div>
                    <button
                      type="submit"
                      class="btn btn-primary shrink-0 self-start"
                      :disabled="busy"
                    >
                      {{ t("games.join") }}
                    </button>
                    <button
                      v-if="canReconnect && connection !== 'online'"
                      type="button"
                      class="btn shrink-0 self-start"
                      :disabled="busy"
                      @click="confirmReconnect"
                    >
                      <i class="ri-cloud-line" aria-hidden="true"></i>
                      {{ t("games.reconnect") }}
                    </button>
                  </div>
                </fieldset>
              </ProfileForm>
              <p
                v-if="connection !== 'offline'"
                role="status"
                aria-live="polite"
                class="inline-flex items-center gap-1.5 text-sm text-base-content/60"
              >
                <span
                  v-if="connectionLoading"
                  class="loading loading-spinner loading-xs"
                  aria-hidden="true"
                ></span>
                <i v-else :class="connectionIcon" aria-hidden="true"></i>
                {{ t(`games.connections.${connection}`) }}
              </p>
            </form>
          </section>
          <section class="py-2 lg:px-4">
            <slot name="instructions"></slot>
            <p class="mt-6 text-sm text-base-content/60">
              {{ t("games.reconnectHint") }}
            </p>
          </section>
        </div>
        <div
          v-else
          :class="
            showSidebar ? 'flex min-h-0 flex-1 flex-col gap-5' : 'space-y-5'
          "
        >
          <label v-if="showInvite" class="block text-sm">
            {{ t("games.invite") }}
            <input
              class="input mt-2 w-full text-xs"
              readonly
              :value="inviteUrl"
              @focus="$event.target.select()"
            />
          </label>
          <section v-if="room.status === 'lobby'" class="card">
            <div class="card-body gap-3 p-0">
              <h2
                class="card-title font-serif"
                aria-live="polite"
                aria-atomic="true"
              >
                {{ lobbySummary.title }}
              </h2>
              <p class="text-sm text-base-content/70">
                {{ lobbySummary.description }}
              </p>
              <p
                v-if="room.lobbyStartsAt"
                role="timer"
                aria-live="polite"
                class="flex items-center gap-2 text-sm font-medium"
              >
                <i class="ri-timer-line" aria-hidden="true"></i>
                {{ t("games.lobbyStatus.startingIn") }}
                <span
                  class="countdown font-mono text-lg"
                  :aria-label="
                    t('games.lobbyStatus.seconds', { n: startSeconds })
                  "
                >
                  <span :style="{ '--value': startSeconds }">{{
                    startSeconds
                  }}</span>
                </span>
                {{ t("games.lobbyStatus.secondsUnit") }}
              </p>
              <ol
                class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                <li
                  v-for="(player, index) in lobbySeats"
                  :key="index"
                  class="flex h-16 min-w-0 items-center gap-2 rounded-box border p-2"
                  :class="
                    player
                      ? player.ready
                        ? 'bg-success/10 border-success'
                        : 'border-base-300'
                      : 'border-dashed border-base-300'
                  "
                >
                  <span class="font-mono text-sm text-base-content/50">{{
                    index + 1
                  }}</span>
                  <template v-if="player">
                    <Avatar :src="player.avatarUrl" :name="player.nickname" />
                    <div class="min-w-0 flex-1">
                      <div class="flex min-w-0 items-center gap-1">
                        <p
                          class="min-w-0 truncate text-sm font-medium"
                          :title="player.nickname"
                        >
                          {{ player.nickname }}
                          <span
                            v-if="player.id === room.selfId"
                            class="text-base-content/50"
                            >{{ t("games.you") }}</span
                          >
                        </p>
                        <button
                          v-if="player.id === room.selfId"
                          type="button"
                          class="btn btn-ghost btn-square btn-xs shrink-0"
                          :aria-label="t('auth.editProfile')"
                          :title="t('auth.editProfile')"
                          :disabled="!canAct"
                          @click="editProfile"
                        >
                          <i class="ri-pencil-line" aria-hidden="true"></i>
                        </button>
                      </div>
                      <div
                        class="mt-1 flex min-w-0 gap-2 overflow-hidden whitespace-nowrap text-xs text-base-content/60"
                      >
                        <span v-if="player.id === room.hostId">{{
                          t("games.host")
                        }}</span>
                        <span v-if="player.ready">{{ t("games.ready") }}</span>
                        <span v-else>{{ t("games.notReady") }}</span>
                        <span v-if="!player.online">{{
                          t("games.disconnected")
                        }}</span>
                      </div>
                    </div>
                    <button
                      v-if="player.id === room.selfId"
                      class="btn btn-ghost btn-xs shrink-0"
                      :disabled="!canAct"
                      @click="run('ready', { ready: !player.ready })"
                    >
                      {{
                        player.ready ? t("games.unready") : t("games.prepare")
                      }}
                    </button>
                    <button
                      v-else-if="isHost"
                      type="button"
                      class="btn btn-ghost btn-xs shrink-0"
                      :disabled="!canAct"
                      :aria-label="
                        t('games.kickPlayer', { name: player.nickname })
                      "
                      :title="t('games.kickPlayer', { name: player.nickname })"
                      @click="kickPlayer(player)"
                    >
                      {{ t("games.kickPlayer") }}
                    </button>
                    <span
                      class="size-2 shrink-0 rounded-full"
                      :class="player.online ? 'bg-success' : 'bg-base-300'"
                      aria-hidden="true"
                    ></span>
                  </template>
                  <button
                    v-else
                    type="button"
                    class="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-field text-left text-sm text-base-content/60 hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
                    :disabled="!canAct"
                    :aria-label="t('games.moveSeat', { n: index + 1 })"
                    @click="run('move_seat', { seat: index })"
                  >
                    <i class="ri-add-line text-base" aria-hidden="true"></i>
                    {{ t("games.emptySeat") }}
                  </button>
                </li>
              </ol>
              <slot
                name="lobby-guide"
                :room="room"
                :can-act="canAct"
                :run="run"
              ></slot>
              <slot
                name="settings"
                :room="room"
                :can-act="canAct"
                :run="run"
              ></slot>
            </div>
          </section>
          <div
            v-else
            :class="showSidebar ? 'min-h-0 flex-1 max-lg:overflow-hidden' : ''"
          >
            <slot
              :room="room"
              :can-act="canAct"
              :run="run"
              :error="error ? errorText : ''"
            ></slot>
          </div>
        </div>
      </ContentPage>
    </div>
    <aside
      v-if="showSidebar"
      class="drawer-side lg:overflow-y-hidden! lg:shadow-md lg:[clip-path:inset(0_-8px_0_-20rem)] lg:is-drawer-close:overflow-visible!"
    >
      <label
        :for="sidebarId"
        class="drawer-overlay"
        :aria-label="t('common.modal.close')"
      ></label>
      <div
        class="min-w-0 w-96 h-dvh bg-base-100 lg:sticky lg:top-0 lg:is-drawer-close:w-14"
      >
        <div
          class="relative flex h-full min-h-0 flex-col px-4 py-2 lg:is-drawer-close:px-1"
        >
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-base mb-2 hidden shrink-0 self-end lg:inline-flex lg:is-drawer-open:absolute lg:is-drawer-open:right-4 lg:is-drawer-open:top-2 lg:is-drawer-open:z-10 lg:is-drawer-open:mb-0 lg:is-drawer-close:self-center lg:is-drawer-close:tooltip lg:is-drawer-close:tooltip-left"
            :aria-label="
              t(
                sidebarExpanded
                  ? 'common.sideBar.closeSidebar'
                  : 'common.sideBar.openSidebar',
              )
            "
            :data-tip="
              t(
                sidebarExpanded
                  ? 'common.sideBar.closeSidebar'
                  : 'common.sideBar.openSidebar',
              )
            "
            @click="sidebarExpanded = !sidebarExpanded"
          >
            <i
              :class="
                sidebarExpanded
                  ? 'ri-sidebar-unfold-line'
                  : 'ri-sidebar-fold-line'
              "
              aria-hidden="true"
            ></i>
          </button>
          <div class="min-h-0 flex-1">
            <slot
              name="sidebar"
              :room="room"
              :can-act="canAct"
              :run="run"
              :expand-sidebar="expandSidebar"
            ></slot>
          </div>
        </div>
      </div>
    </aside>
  </div>
  <Footer v-if="showSidebar" class="hidden lg:grid" />
</template>
<script setup>
import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useSlots,
  watch,
} from "vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import Footer from "@/components/layout/Footer.vue";
import { useLocale } from "@/i18n";
import { findGame } from "@/games/catalog";
import Avatar from "@/components/auth/Avatar.vue";
import ProfileForm from "@/components/games/interaction/ProfileForm.vue";
import { useGithubSession } from "@/composables/auth/useGithubSession";
import { useGameRoom } from "@/composables/games/useGameRoom";
import { useGameAudio } from "@/composables/games/useGameAudio";
import { useGameRoomActivity } from "@/composables/games/useGameRoomActivity";
import { useModal } from "@/composables/useModal";
const props = defineProps({ gameType: { type: String, required: true } });
const emit = defineEmits(["room-state", "room-activity"]);
const slots = useSlots();
const roomRoot = ref(null);
const sidebarId = `game-sidebar-${useId()}`;
const sidebarExpanded = ref(true);
const desktopViewport = ref(false);
let sidebarMedia;
let scrollFrame = 0;
let pendingGameScroll = false;
function scrollPastNavbar() {
  if (
    !pendingGameScroll ||
    (!desktopViewport.value && !nightPhase.value) ||
    !roomRoot.value
  )
    return;
  const top = Math.ceil(
    roomRoot.value.getBoundingClientRect().top + window.scrollY,
  );
  window.scrollTo({
    top,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
  const pageHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  if (pageHeight - window.innerHeight >= top - 1) pendingGameScroll = false;
}
function scheduleScrollPastNavbar() {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(scrollPastNavbar);
}
function expandSidebar() {
  sidebarExpanded.value = true;
}
function updateSidebarViewport() {
  const wasDesktop = desktopViewport.value;
  desktopViewport.value = sidebarMedia.matches;
  if (desktopViewport.value && !wasDesktop) sidebarExpanded.value = true;
}
function setMobileGameViewport(active) {
  document.documentElement.classList.toggle("game-room-viewport", active);
  document.body.classList.toggle("game-room-viewport", active);
  if (active) {
    pendingGameScroll = false;
    cancelAnimationFrame(scrollFrame);
    window.scrollTo(0, 0);
  }
}
onMounted(() => {
  sidebarMedia = window.matchMedia("(min-width: 1024px)");
  updateSidebarViewport();
  sidebarMedia.addEventListener("change", updateSidebarViewport);
  setMobileGameViewport(viewportFrame.value && !desktopViewport.value);
});
onBeforeUnmount(() => {
  sidebarMedia?.removeEventListener("change", updateSidebarViewport);
  cancelAnimationFrame(scrollFrame);
  setMobileGameViewport(false);
});
const definition = findGame(props.gameType);
const { t, i18n } = useLocale();
const modal = useModal();
const {
  room,
  code,
  error,
  connection,
  canReconnect,
  busy,
  sending,
  storageAvailable,
  openRoom,
  run,
  leave,
  reconnect,
} = useGameRoom(props.gameType);
const {
  enabled: audioEnabled,
  observe: observeAudio,
  toggle: toggleAudio,
  playActivity,
} = useGameAudio(props.gameType);
const roomActivity = useGameRoomActivity((kind) => {
  playActivity(kind);
  emit("room-activity", kind);
});
watch(
  [room, connection],
  ([state, status]) => {
    observeAudio(state, status);
    emit("room-state", state, status);
    roomActivity.observe(state, status);
  },
  { immediate: true },
);
const nightPhase = computed(() => room.value?.game?.phase === "night");
const showSidebar = computed(
  () => !!slots.sidebar && !!room.value?.game && !nightPhase.value,
);
const viewportFrame = showSidebar;
const mobileGameViewport = computed(
  () => viewportFrame.value && !desktopViewport.value,
);
watch(
  mobileGameViewport,
  (active, wasActive) => {
    setMobileGameViewport(active);
    if (!active && wasActive && showSidebar.value && desktopViewport.value) {
      pendingGameScroll = true;
      scheduleScrollPastNavbar();
    }
  },
  { flush: "post" },
);
watch(
  [() => room.value?.status, () => room.value?.code, connection, nightPhase],
  (
    [status, roomCode, connectionState, isNight],
    [previousStatus, previousCode, previousConnection, wasNight],
  ) => {
    if (!status) {
      pendingGameScroll = false;
      return;
    }
    if (!["playing", "finished"].includes(status)) return;
    const enteredGame = !["playing", "finished"].includes(previousStatus);
    const changedRoom = roomCode !== previousCode;
    const reconnected =
      connectionState === "online" && previousConnection !== "online";
    if (enteredGame || changedRoom || reconnected || (isNight && !wasNight)) {
      pendingGameScroll = true;
      scheduleScrollPastNavbar();
    }
  },
  { flush: "post" },
);
watch(
  showSidebar,
  (visible) => {
    if (visible && pendingGameScroll) scheduleScrollPastNavbar();
  },
  { flush: "post" },
);
const connectionLoading = computed(
  () =>
    connection.value === "connecting" || connection.value === "reconnecting",
);
const connectionIcon = computed(
  () =>
    ({
      online: "ri-wifi-line",
      offline: "ri-wifi-off-line",
      replaced: "ri-device-line",
    })[connection.value] || "ri-wifi-off-line",
);
const auth = useGithubSession();
const nickname = ref("");
const useGithubProfile = ref(!!auth.profile.value);
let customChoice = false;
let profileSyncPending = false;
let profileSyncing = false;
let profileSaving = false;
const selectedProfile = computed(() => ({
  profileSource:
    useGithubProfile.value && auth.profile.value ? "github" : "guest",
  avatarUrl: useGithubProfile.value
    ? auth.profile.value?.avatarUrl || null
    : null,
}));
const entryNickname = computed({
  get: () =>
    useGithubProfile.value && auth.profile.value
      ? auth.profile.value.name
      : nickname.value,
  set: (value) => {
    if (!useGithubProfile.value) nickname.value = value;
  },
});
function chooseProfile(value) {
  customChoice = !value;
  useGithubProfile.value = value;
  try {
    localStorage.setItem(
      "mori:games:profile-source",
      value ? "github" : "guest",
    );
  } catch {
    /* Keep the choice for this page. */
  }
}
function fallbackNickname() {
  const others =
    room.value?.players
      .filter((p) => p.id !== room.value.selfId)
      .map((p) => p.nickname.toLocaleLowerCase()) || [];
  const custom = nickname.value.trim();
  const base =
    custom && custom.length <= 24 && !/[\p{Cc}\p{Cf}]/u.test(custom)
      ? custom
      : t("auth.guest");
  let name = base;
  for (let n = 1; others.includes(name.toLocaleLowerCase()); n++)
    name = base.slice(0, 20) + " " + n;
  return name;
}
let profileEditor = null;
function closeProfileEditor() {
  profileEditor?.close();
  profileEditor = null;
}
onBeforeUnmount(closeProfileEditor);
watch([() => room.value?.code, () => room.value?.status], () =>
  closeProfileEditor(),
);
function editProfile() {
  if (room.value?.status !== "lobby" || !canAct.value || profileEditor) return;
  const roomCode = room.value.code;
  const draftNickname = ref(nickname.value);
  const draftGithub = ref(
    selfPlayer.value?.profileSource === "github" && !!auth.profile.value,
  );
  const checked = ref(false);
  const saving = ref(false);
  const failure = ref("");
  const form = ref(null);
  const editor = {
    setup() {
      watch(auth.profile, (profile) => {
        if (!profile) draftGithub.value = false;
      });
      return () =>
        h("div", [
          h(ProfileForm, {
            ref: form,
            nickname: draftNickname.value,
            github: draftGithub.value,
            disabled: saving.value || !canAct.value,
            checked: checked.value,
            "onUpdate:nickname": (value) => {
              draftNickname.value = value;
              failure.value = "";
            },
            "onUpdate:github": (value) => {
              draftGithub.value = value;
              failure.value = "";
            },
            onBlur: () => {
              checked.value = true;
            },
          }),
          failure.value
            ? h(
                "p",
                { class: "mt-3 text-sm text-error", role: "alert" },
                failure.value,
              )
            : null,
        ]);
    },
  };
  const handle = modal.confirm(t("auth.editProfile"), h(editor), {
    buttonText: t("auth.saveProfile"),
    cancelText: t("common.modal.cancel"),
    onCancel: () => {
      profileEditor = null;
    },
    onSubmit: () => {
      if (
        saving.value ||
        !canAct.value ||
        room.value?.code !== roomCode ||
        room.value.status !== "lobby"
      )
        return false;
      checked.value = true;
      const githubProfile = draftGithub.value ? auth.profile.value : null;
      const name = githubProfile ? githubProfile.name : draftNickname.value;
      if (
        !name.trim() ||
        name.length > (githubProfile ? 256 : 24) ||
        /[\p{Cc}\p{Cf}]/u.test(name)
      ) {
        form.value?.focus();
        return false;
      }
      const profile = {
        profileSource: githubProfile ? "github" : "guest",
        avatarUrl: githubProfile?.avatarUrl || null,
      };
      saving.value = true;
      profileSaving = true;
      failure.value = "";
      void run("profile", { nickname: name, profile })
        .then((saved) => {
          if (saved && room.value?.code === roomCode) {
            nickname.value = draftNickname.value;
            chooseProfile(
              !!githubProfile && auth.profile.value === githubProfile,
            );
            if (profileEditor === handle) profileEditor = null;
            handle.close();
          } else if (!saved) failure.value = errorText.value;
        })
        .finally(() => {
          saving.value = false;
          profileSaving = false;
          void syncProfile();
        });
      // useModal 的确认回调同步判断返回值；异步保存成功后再关闭。
      return false;
    },
  });
  profileEditor = handle;
}
async function syncProfile() {
  if (
    !profileSyncPending ||
    profileSyncing ||
    profileSaving ||
    room.value?.status !== "lobby" ||
    !canAct.value
  )
    return;
  profileSyncing = true;
  profileSyncPending = false;
  for (
    let attempt = 0;
    attempt < 3 && room.value?.status === "lobby" && canAct.value;
    attempt++
  ) {
    const name = useGithubProfile.value
      ? entryNickname.value
      : fallbackNickname();
    const profile = selectedProfile.value;
    if (
      selfPlayer.value?.nickname === name &&
      (selfPlayer.value?.avatarUrl ?? null) === profile.avatarUrl &&
      (selfPlayer.value?.profileSource ?? "guest") === profile.profileSource
    )
      break;
    const saved = await run("profile", { nickname: name, profile });
    if (saved || error.value !== "STALE") break;
    await nextTick();
  }
  profileSyncing = false;
  if (profileSyncPending) void syncProfile();
}
watch(
  () => auth.profile.value,
  (profile, previous) => {
    useGithubProfile.value = !!profile && !customChoice;
    if (profile || previous) {
      profileSyncPending = true;
      void syncProfile();
    }
  },
);
const entryMode = ref("create");
const nicknameStorageKey = "mori:games:nickname";
onMounted(() => {
  if (code.value) entryMode.value = "join";
  try {
    customChoice =
      localStorage.getItem("mori:games:profile-source") === "guest";
    useGithubProfile.value = !!auth.profile.value && !customChoice;
    const saved = localStorage.getItem(nicknameStorageKey);
    if (saved !== null && saved.length <= 24) nickname.value = saved;
  } catch {
    storageAvailable.value = false;
  }
});
watch(nickname, (value) => {
  try {
    localStorage.setItem(nicknameStorageKey, value);
  } catch {
    storageAvailable.value = false;
  }
});
const nicknameInput = ref(null);
const codeInput = ref(null);
const nicknameChecked = ref(false);
const codeChecked = ref(false);
const validNickname = computed(
  () =>
    entryNickname.value.trim().length > 0 &&
    entryNickname.value.length <= (useGithubProfile.value ? 256 : 24) &&
    !/[\p{Cc}\p{Cf}]/u.test(entryNickname.value),
);
const validCode = computed(() => /^[A-HJ-NP-Z2-9]{8}$/.test(code.value));
function selectEntryMode(mode, event) {
  if (busy.value) return;
  entryMode.value = mode;
  nicknameChecked.value = false;
  codeChecked.value = false;
  error.value = "";
  if (event) {
    event.currentTarget.parentElement
      .querySelector(`#game-entry-${mode}`)
      ?.focus();
  }
}
function updateRoomCode(event) {
  code.value = event.target.value.toUpperCase().replace(/\s/g, "");
  if (code.value.length === 8) codeChecked.value = true;
  joinCompletedRoom();
}
function joinCompletedRoom() {
  if (entryMode.value === "join" && !room.value && validCode.value)
    enterRoom(true);
}
function enterRoom(join) {
  if (busy.value) return;
  nicknameChecked.value = true;
  if (join) codeChecked.value = true;
  if (!validNickname.value) {
    nicknameInput.value?.focus();
    return;
  }
  if (join && !validCode.value) {
    codeInput.value?.focus();
    return;
  }
  void openRoom(join, entryNickname.value, selectedProfile.value);
}
const copied = ref(false);
const showInvite = ref(false);
const errorText = computed(() => {
  const common = `games.errors.${error.value}`;
  const specific = `${props.gameType}.errors.${error.value}`;
  return t(
    i18n.global.te(common)
      ? common
      : i18n.global.te(specific)
        ? specific
        : "games.errors.SERVER",
  );
});
const selfPlayer = computed(() =>
  room.value?.players.find((p) => p.id === room.value.selfId),
);
watch(
  () => selfPlayer.value?.nickname,
  (value) => {
    if (
      typeof value === "string" &&
      selfPlayer.value?.profileSource !== "github"
    )
      nickname.value = value;
  },
);
const isHost = computed(() => room.value?.hostId === room.value?.selfId);
const onlinePlayerCount = computed(
  () => room.value?.players.filter((player) => player.online).length ?? 0,
);
const lobbySeats = computed(() => {
  const seats = Array(
    room.value?.limits.maxPlayers ?? definition.maxPlayers,
  ).fill(null);
  room.value?.players.forEach((player, index) => {
    seats[player.seat ?? index] = player;
  });
  return seats;
});
const canAct = computed(() => connection.value === "online" && !sending.value);
watch(
  [
    canAct,
    () => room.value?.status,
    () => auth.state.authenticated,
    () => auth.state.checking,
  ],
  () => {
    if (
      !profileSyncing &&
      room.value?.status === "lobby" &&
      selfPlayer.value?.profileSource === "github" &&
      !auth.state.authenticated &&
      !auth.state.checking
    ) {
      useGithubProfile.value = false;
      profileSyncPending = true;
    }
    void syncProfile();
  },
  { flush: "post" },
);
watch(
  () => room.value?.code,
  () => {
    useGithubProfile.value = !!auth.profile.value && !customChoice;
    if (room.value) {
      profileSyncPending = true;
      void syncProfile();
    }
  },
);
const roomActions = computed(() => {
  if (!room.value) return [];
  const actions = [];
  const add = (key, icon, label, onClick, disabled = false) => {
    actions.push({ key, icon, label, onClick, disabled });
  };
  if (canReconnect.value && connection.value !== "online")
    add("reconnect", "ri-cloud-line", t("games.reconnect"), confirmReconnect);
  add(
    "invite",
    "ri-link",
    t(copied.value ? "games.copied" : "games.invite"),
    copyInvite,
  );
  if (isHost.value && room.value.status === "playing") {
    add("end", "ri-stop-circle-line", t("games.end"), endGame, !canAct.value);
  }
  if (isHost.value && room.value.status === "finished") {
    add(
      "restart",
      "ri-arrow-go-back-line",
      t("games.restart"),
      () =>
        confirmRoomAction("restart", "confirmRestart", "restart", "finished"),
      !canAct.value,
    );
  }
  if (isHost.value && ["playing", "finished"].includes(room.value.status)) {
    const playing = room.value.status === "playing";
    add(
      "quick-start",
      "ri-refresh-line",
      t(playing ? "games.quickRestart" : "games.quickStart"),
      () =>
        confirmRoomAction(
          playing ? "quickRestart" : "quickStart",
          playing ? "confirmQuickRestart" : "confirmQuickStart",
          "quick_start",
          playing ? "playing" : "finished",
        ),
      !canAct.value,
    );
  }
  add(
    "leave",
    "ri-logout-box-line",
    t("games.leave"),
    leaveRoom,
    sending.value,
  );
  return actions;
});
const canStart = computed(
  () =>
    room.value &&
    room.value.players.length >= room.value.limits.minPlayers &&
    room.value.players.length <= room.value.limits.maxPlayers &&
    room.value.players.every((p) => p.ready && p.online),
);
const now = ref(Date.now());
let clockOffset = 0;
let clockTimer;
watch(
  () => room.value?.serverNow,
  (serverNow) => {
    clockOffset = (serverNow ?? Date.now()) - Date.now();
    now.value = Date.now() + clockOffset;
  },
  { immediate: true },
);
watch(
  () => room.value?.lobbyStartsAt,
  (startsAt) => {
    clearInterval(clockTimer);
    if (startsAt)
      clockTimer = setInterval(() => {
        now.value = Date.now() + clockOffset;
      }, 250);
  },
);
onMounted(() => {
  if (room.value?.lobbyStartsAt)
    clockTimer = setInterval(() => {
      now.value = Date.now() + clockOffset;
    }, 250);
});
onBeforeUnmount(() => clearInterval(clockTimer));
const startSeconds = computed(() =>
  Math.min(
    5,
    Math.max(
      0,
      Math.ceil(((room.value?.lobbyStartsAt ?? 0) - now.value) / 1000),
    ),
  ),
);
const lobbySummary = computed(() => {
  if (!room.value) return { title: "", description: "" };
  const { players, limits } = room.value;
  const current = players.length;
  const min = limits.minPlayers;
  const max = limits.maxPlayers;
  const offline = players.filter((player) => !player.online).length;
  const unready = players.filter((player) => !player.ready).length;
  if (current < min) {
    return {
      title: t("games.lobbyStatus.needPlayers", { min }),
      description: t("games.lobbyStatus.missingHint", {
        current,
        n: min - current,
      }),
    };
  }
  const title = offline
    ? t("games.lobbyStatus.offline", { n: offline })
    : unready
      ? t("games.lobbyStatus.unready", { n: unready })
      : connection.value !== "online"
        ? t("games.lobbyStatus.connection")
        : t("games.lobbyStatus.starting");
  const capacity =
    current < max
      ? t("games.lobbyStatus.morePlayers", { n: max - current })
      : t("games.lobbyStatus.full");
  return {
    title,
    description: [
      ...(!canStart.value ? [t("games.lobbyHint", { min, max })] : []),
      canStart.value ? t("games.lobbyStatus.countdownHint") : capacity,
    ].join(" "),
  };
});
const inviteUrl = computed(() =>
  typeof window === "undefined" || !room.value
    ? ""
    : `${window.location.origin}${definition.path}?room=${room.value.code}`,
);
async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value);
    copied.value = true;
  } catch {
    showInvite.value = true;
  }
}
function endGame() {
  confirmRoomAction("end", "confirmEnd", "end", "playing");
}
function kickPlayer(player) {
  const { code, stage } = room.value;
  modal.confirm(
    t("games.kickPlayer", { name: player.nickname }),
    t("games.confirmKick", { name: player.nickname }),
    {
      buttonText: t("games.kick"),
      onSubmit: () => {
        if (
          canAct.value &&
          isHost.value &&
          room.value?.code === code &&
          room.value.stage === stage &&
          room.value.status === "lobby" &&
          player.id !== room.value.selfId &&
          room.value.players.some((target) => target.id === player.id)
        )
          void run("kick", { targetId: player.id });
      },
    },
  );
}
function confirmRoomAction(label, message, type, status) {
  const { code, round, stage } = room.value;
  modal.confirm(t(`games.${label}`), t(`games.${message}`), {
    buttonText: t(`games.${label}`),
    onSubmit: () => {
      if (
        room.value?.code === code &&
        room.value.round === round &&
        room.value.stage === stage &&
        room.value.status === status &&
        isHost.value &&
        canAct.value
      )
        void run(type);
    },
  });
}
function leaveRoom() {
  const { code, round, status } = room.value;
  modal.confirm(
    t("games.leave"),
    t(status === "playing" ? "games.confirmLeave" : "games.confirmLeaveRoom"),
    {
      buttonText: t("games.leave"),
      onSubmit: () => {
        if (
          room.value?.code === code &&
          room.value.round === round &&
          room.value.status === status &&
          !sending.value
        )
          void leave();
      },
    },
  );
}
function confirmReconnect() {
  const roomCode = room.value?.code || code.value;
  modal.confirm(t("games.reconnect"), t("games.confirmReconnect"), {
    buttonText: t("games.reconnect"),
    onSubmit: () => {
      if (
        code.value === roomCode &&
        canReconnect.value &&
        connection.value !== "online"
      )
        reconnect();
    },
  });
}
</script>
<style>
@media (max-width: 1023px) {
  html.game-room-viewport,
  body.game-room-viewport {
    height: 100dvh;
    min-height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
  }
}
</style>
