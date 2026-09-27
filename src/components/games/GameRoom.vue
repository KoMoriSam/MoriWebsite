<template>
  <ContentPage
    :title="t(definition.titleKey)"
    :description="t(definition.descriptionKey)"
    :compact-mobile-header="!!room && room.status !== 'lobby'"
    :hide-mobile-actions="!!room"
    hide-mobile-footer
  >
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
          {{ t("games.roomCode") }}
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
          class="inline-flex items-center gap-1.5"
          role="status"
          aria-live="polite"
        >
          <span
            v-if="connectionLoading"
            class="loading loading-spinner loading-xs"
            aria-hidden="true"
          ></span>
          <i v-else :class="connectionIcon" aria-hidden="true"></i>
          {{ t(`games.connections.${connection}`) }}
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
      <div v-else class="hidden flex-wrap items-center gap-x-5 gap-y-2 lg:flex">
        <button
          v-for="action in roomActions"
          :key="action.key"
          type="button"
          class="btn btn-sm"
          :disabled="action.disabled"
          @click="action.onClick()"
        >
          <i :class="action.icon" aria-hidden="true"></i>
          {{ action.label }}
        </button>
      </div>
    </template>
    <FloatingActionButton
      v-if="room"
      mobile-floating
      :actions="roomActions"
      main-icon="ri-more-line"
      main-button-class=""
      :main-label="t('common.contentPage.pageActions')"
      :fab-class="room.status !== 'lobby' && room.game?.phase !== 'night'
        ? 'fixed right-6 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 lg:hidden'
        : 'fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 lg:hidden'"
    />
    <div
      v-if="error"
      role="alert"
      class="alert alert-error alert-soft alert-vertical mb-4 sm:alert-horizontal"
    >
      <span class="min-w-0 flex-1 text-sm">{{ errorText }}</span>
      <button v-if="room && ['offline', 'replaced'].includes(connection)" type="button" class="btn btn-sm" @click="confirmReconnect">
        <i class="ri-cloud-line" aria-hidden="true"></i>
        {{ t('games.reconnect') }}
      </button>
    </div>
    <p v-if="!storageAvailable" role="status" class="mb-4 text-sm text-warning">
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
          <fieldset class="fieldset">
            <label class="label" for="nick-name">{{
              t("games.nickname")
            }}</label>
            <div class="flex gap-2">
              <div class="min-w-0 flex-1">
                <input
                  type="text"
                  id="nick-name"
                  ref="nicknameInput"
                  v-model="nickname"
                  class="input validator w-full"
                  maxlength="24"
                  required
                  autocomplete="nickname"
                  aria-describedby="nickname-hint"
                  :aria-invalid="nicknameChecked && !validNickname"
                  @blur="nicknameChecked = true"
                  @change="joinCompletedRoom"
                  :disabled="busy"
                />
                <p
                  id="nickname-hint"
                  class="validator-hint hidden"
                  aria-live="polite"
                >
                  {{ t("games.errors.NICKNAME") }}
                </p>
              </div>
              <button
                v-if="entryMode === 'create'"
                type="submit"
                class="btn shrink-0 self-start"
                :disabled="busy"
              >
                {{ t("games.create") }}
              </button>
            </div>
          </fieldset>
          <fieldset v-if="entryMode === 'join'" class="fieldset">
            <label class="label" for="room-code">{{
              t("games.roomCode")
            }}</label>
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <label class="otp validator" :class="{ 'opacity-50': busy }">
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
            </div>
          </fieldset>
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
    <div v-else class="space-y-5">
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
          <ol class="grid gap-2 sm:grid-cols-2">
            <li
              v-for="(player, index) in room.players"
              :key="player.id"
              class="flex items-center gap-3 rounded-box border p-3"
              :class="
                player.ready
                  ? 'bg-success/10 border-success'
                  : 'border-base-300'
              "
            >
              <span class="font-mono text-sm text-base-content/50">{{
                index + 1
              }}</span>
              <div class="min-w-0 flex-1">
                <p class="wrap-break-word text-sm font-medium">
                  {{ player.nickname }}
                  <span
                    v-if="player.id === room.selfId"
                    class="text-base-content/50"
                    >{{ t("games.you") }}</span
                  >
                </p>
                <div
                  class="mt-1 flex flex-wrap gap-2 text-xs text-base-content/60"
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
                class="btn btn-sm shrink-0"
                :disabled="!canAct"
                @click="run('ready', { ready: !player.ready })"
              >
                {{ player.ready ? t("games.unready") : t("games.prepare") }}
              </button>
              <button
                v-else-if="isHost"
                type="button"
                class="btn btn-ghost btn-sm btn-square shrink-0"
                :disabled="!canAct"
                :aria-label="t('games.kickPlayer', { name: player.nickname })"
                :title="t('games.kickPlayer', { name: player.nickname })"
                @click="kickPlayer(player)"
              >
                <i class="ri-user-unfollow-line" aria-hidden="true"></i>
              </button>
              <span
                class="size-2 shrink-0 rounded-full"
                :class="player.online ? 'bg-success' : 'bg-base-300'"
                aria-hidden="true"
              ></span>
            </li>
          </ol>
          <slot
            name="settings"
            :room="room"
            :can-act="canAct"
            :run="run"
          ></slot>
          <button
            v-if="isHost"
            class="btn self-start"
            :disabled="!canAct || !canStart"
            @click="
              confirmRoomAction('start', 'confirmStart', 'start', 'lobby')
            "
          >
            {{ t("games.start") }}
          </button>
        </div>
      </section>
      <slot v-else :room="room" :can-act="canAct" :run="run"></slot>
    </div>
  </ContentPage>
</template>
<script setup>
import { computed, onMounted, ref, watch } from "vue";
import ContentPage from "@/components/layout/ContentPage.vue";
import FloatingActionButton from "@/components/ui/button/FloatingActionButton.vue";
import { useLocale } from "@/i18n";
import { findGame } from "@/games/catalog";
import { useGameRoom } from "@/composables/useGameRoom";
import { useModal } from "@/composables/useModal";
const props = defineProps({ gameType: { type: String, required: true } });
const definition = findGame(props.gameType);
const { t, i18n } = useLocale();
const modal = useModal();
const {
  room,
  code,
  error,
  connection,
  busy,
  sending,
  storageAvailable,
  openRoom,
  run,
  leave,
  reconnect,
} = useGameRoom(props.gameType);
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
const nickname = ref("");
const entryMode = ref("create");
const nicknameStorageKey = "mori:games:nickname";
onMounted(() => {
  if (code.value) entryMode.value = "join";
  try {
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
    nickname.value.trim().length > 0 &&
    nickname.value.length <= 24 &&
    !/[\p{Cc}\p{Cf}]/u.test(nickname.value),
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
  void openRoom(join, nickname.value);
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
    if (typeof value === "string") nickname.value = value;
  },
);
const isHost = computed(() => room.value?.hostId === room.value?.selfId);
const onlinePlayerCount = computed(
  () => room.value?.players.filter((player) => player.online).length ?? 0,
);
const canAct = computed(() => connection.value === "online" && !sending.value);
const roomActions = computed(() => {
  if (!room.value) return [];
  const actions = [];
  const add = (key, icon, label, onClick, disabled = false) => {
    actions.push({ key, icon, label, onClick, disabled, buttonClass: '' });
  };
  if (connection.value !== 'online') add('reconnect', 'ri-cloud-line', t('games.reconnect'), confirmReconnect);
  add('invite', 'ri-link', t(copied.value ? 'games.copied' : 'games.invite'), copyInvite);
  if (isHost.value && room.value.status === 'playing') {
    add('end', 'ri-stop-circle-line', t('games.end'), endGame, !canAct.value);
  }
  if (isHost.value && room.value.status === 'finished') {
    add('restart', 'ri-restart-line', t('games.restart'), () => confirmRoomAction('restart', 'confirmRestart', 'restart', 'finished'), !canAct.value);
  }
  if (isHost.value && ['playing', 'finished'].includes(room.value.status)) {
    const playing = room.value.status === 'playing';
    add('quick-start', 'ri-refresh-line', t(playing ? 'games.quickRestart' : 'games.quickStart'), () => confirmRoomAction(playing ? 'quickRestart' : 'quickStart', playing ? 'confirmQuickRestart' : 'confirmQuickStart', 'quick_start', playing ? 'playing' : 'finished'), !canAct.value);
  }
  add('leave', 'ri-logout-box-line', t('games.leave'), leaveRoom, sending.value);
  return actions;
});
const canStart = computed(
  () =>
    room.value &&
    room.value.players.length >= room.value.limits.minPlayers &&
    room.value.players.length <= room.value.limits.maxPlayers &&
    room.value.players.every((p) => p.ready && p.online),
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
        : t(
            isHost.value
              ? "games.lobbyStatus.readyHost"
              : "games.lobbyStatus.readyGuest",
          );
  const capacity =
    current < max
      ? t("games.lobbyStatus.morePlayers", { n: max - current })
      : t("games.lobbyStatus.full");
  return {
    title,
    description: [
      ...(!canStart.value ? [t("games.lobbyHint", { min, max })] : []),
      capacity,
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
  const code = room.value.code;
  modal.confirm(t("games.reconnect"), t("games.confirmReconnect"), {
    buttonText: t("games.reconnect"),
    onSubmit: () => {
      if (room.value?.code === code && connection.value !== "online")
        reconnect();
    },
  });
}
</script>
