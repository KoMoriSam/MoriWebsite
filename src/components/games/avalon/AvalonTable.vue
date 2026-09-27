<template>
  <div class="space-y-5" :class="room.phase !== 'night' ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0' : ''">
    <section v-if="room.phase === 'night'" class="card">
      <div class="card-body items-center gap-6 px-0 py-4 text-center">
        <hgroup class="flex flex-col gap-4 items-center">
          <h2 class="card-title font-serif text-xl sm:text-2xl">
            <i class="ri-moon-clear-line font-normal" aria-hidden="true"></i>
            {{ t("avalon.phases.night") }}
          </h2>
          <p class="max-w-lg text-pretty text-sm text-base-content/70">
            {{ t("avalon.night.invitation") }}
          </p>
        </hgroup>
        <AvalonIdentityCard
          class="max-w-xs"
          :self="room.self"
          :self-id="room.selfId"
          :player-name="playerName"
          :face-up="showRole"
          :disabled="!room.self.roleRevealed && !canAct"
          :back-title="
            t(
              room.self.nightConfirmed
                ? 'avalon.night.confirmed'
                : 'avalon.night.sealed',
            )
          "
          :back-hint="
            t(
              room.self.nightConfirmed
                ? 'avalon.night.wait'
                : 'avalon.night.peek',
            )
          "
          @flip="flipIdentity"
        >
          <template #actions>
            <button
              v-if="!room.self.nightConfirmed"
              class="btn btn-xs"
              :disabled="!canAct"
              @click="run('confirm_role')"
            >
              {{ t("avalon.night.confirm") }}
            </button>
          </template>
        </AvalonIdentityCard>
        <p
          role="status"
          aria-live="polite"
          class="text-sm text-base-content/60"
        >
          {{
            t("avalon.night.progress", {
              n: room.nightCount,
              total: room.players.length,
            })
          }}
        </p>
      </div>
    </section>
    <div
      v-if="room.phase !== 'night'"
      :id="`${mobilePanelId}-agenda`"
      class="scroll-mt-24 space-y-5"
      :class="mobilePanel === 'agenda' ? '' : 'hidden lg:block'"
    >
      <section class="card">
        <div class="card-body gap-3 p-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="card-title font-serif">
              <i
                class="ri-question-answer-line font-normal"
                aria-hidden="true"
              ></i>
              {{ t(`avalon.phases.${room.phase}`) }}
            </h2>
            <span
              v-if="room.phase !== 'lobby' && room.phase !== 'finished'"
              class="badge badge-outline"
              >{{ t("avalon.rejected", { n: room.rejected }) }}</span
            >
          </div>
          <template v-if="room.phase === 'discussion'">
            <p v-if="!room.history.length" class="font-serif text-xl leading-8">
              {{ t("avalon.night.daybreak") }}
            </p>
            <p class="text-sm leading-7">
              {{
                t(
                  isLeader
                    ? "avalon.discussionHintSelf"
                    : "avalon.discussionHint",
                  { name: playerName(room.leaderId) },
                )
              }}
            </p>
            <div v-if="canSpeak" role="status" class="alert alert-vertical sm:alert-horizontal">
              <p class="min-w-0 flex-1 text-sm">{{ discussionHint }}</p>
              <button type="button" class="btn btn-sm" @click="goToPanel('discussion')">{{ t('avalon.promptActions.discussion') }}</button>
            </div>
            <div v-else-if="isLeader && room.discussion?.mode === 'fast' && !room.discussion.partnerId" role="status" class="alert alert-vertical sm:alert-horizontal">
              <p class="min-w-0 flex-1 text-sm">{{ discussionHint }}</p>
              <button type="button" class="btn btn-sm" @click="goToPanel('players')">{{ t('avalon.discussionTimer.choose') }}</button>
            </div>
            <p v-else class="text-sm text-base-content/60">{{ discussionHint }}</p>
          </template>
          <template v-else-if="room.phase === 'team'">
            <div v-if="isLeader" role="status" class="alert alert-vertical sm:alert-horizontal">
              <div class="min-w-0 flex-1 space-y-1 text-sm">
                <p>{{ t('avalon.teamHintSelf', { n: teamSize }) }}</p>
                <p class="text-base-content/60">{{ t('avalon.selected', { n: selected.length, total: teamSize }) }}</p>
              </div>
              <button type="button" class="btn btn-sm" @click="goToPanel('players')">{{ t('avalon.promptActions.team') }}</button>
            </div>
            <p v-else class="text-sm leading-6">
              {{
                t(isLeader ? "avalon.teamHintSelf" : "avalon.teamHint", {
                  name: playerName(room.leaderId),
                  n: teamSize,
                })
              }}
            </p>
            <p v-if="!isLeader" class="text-sm text-base-content/60">
              {{ t("avalon.waitLeader") }}
            </p>
          </template>
          <template v-else-if="room.phase === 'vote'">
            <div v-if="!room.self.voted" role="status" class="alert alert-vertical sm:alert-horizontal">
              <p class="min-w-0 flex-1 text-sm">{{ t('avalon.voteHint') }}</p>
              <button type="button" class="btn btn-sm lg:hidden" @click="goToPanel('table')">{{ t('avalon.promptActions.vote') }}</button>
            </div>
            <p v-else class="text-sm leading-6">{{ t(room.self.autoApproved ? 'avalon.ballot.leaderApproved' : 'avalon.submitted') }}</p>
            <p v-if="!agendaEntry" class="text-sm">
              {{
                t("avalon.teamNames", {
                  names: room.team.map(playerName).join(", "),
                })
              }}
            </p>
            <p role="status" class="text-sm text-base-content/60">
              {{
                t("avalon.voteProgress", {
                  n: room.voteCount,
                  total: room.players.length,
                })
              }}
            </p>
          </template>
          <template v-else-if="room.phase === 'quest'">
            <div v-if="isQuestMember && !room.self.questSubmitted" role="status" class="alert alert-vertical sm:alert-horizontal">
              <p class="min-w-0 flex-1 text-sm">{{ t(evil ? 'avalon.questHintEvil' : 'avalon.questHintGood') }}</p>
              <button type="button" class="btn btn-sm lg:hidden" @click="goToPanel('table')">{{ t('avalon.promptActions.quest') }}</button>
            </div>
            <p v-else class="text-sm leading-6">
              {{
                t(
                  isQuestMember
                    ? evil
                      ? "avalon.questHintEvil"
                      : "avalon.questHintGood"
                    : "avalon.questHint",
                )
              }}
            </p>
            <p v-if="room.twoFails" class="text-sm text-warning">
              {{ t("avalon.twoFails") }}
            </p>
            <p role="status" class="text-sm text-base-content/60">
              {{
                t("avalon.questProgress", {
                  n: room.questCount,
                  total: room.team.length,
                })
              }}
            </p>
            <p v-if="!isQuestMember || room.self.questSubmitted" class="text-sm">
              {{
                room.self.questSubmitted
                  ? t("avalon.submitted")
                  : t("avalon.waitQuest")
              }}
            </p>
          </template>
          <template v-else-if="room.phase === 'assassinate'">
            <div v-if="room.self.role === 'assassin'" role="status" class="alert alert-vertical sm:alert-horizontal">
              <p class="min-w-0 flex-1 text-sm">{{ t('avalon.assassinateHintSelf') }}</p>
              <button type="button" class="btn btn-sm" @click="goToPanel('players')">{{ t('avalon.chooseTarget') }}</button>
            </div>
            <p v-else class="text-sm leading-6">
              {{
                t(
                  room.self.role === "assassin"
                    ? "avalon.assassinateHintSelf"
                    : "avalon.assassinateHint",
                )
              }}
            </p>
            <p v-if="room.self.role !== 'assassin'" class="text-sm text-base-content/60">
              {{ t("avalon.waitAssassin") }}
            </p>
          </template>
        </div>
      </section>
      <section v-if="agendaEntry" class="card card-border border-base-300 p-3 sm:p-4">
        <AvalonQuestHistory
          :room="room"
          :quest="agendaEntry.quest"
          :sequence="agendaEntry.sequence"
          :show-progress="false"
        />
      </section>
      <div v-if="room.phase === 'discussion'" class="flex items-center gap-2">
        <AvalonDiscussionTimer class="min-w-0 flex-1" :discussion="room.discussion" :server-now="room.serverNow" />
        <button v-if="isLeader" type="button" class="btn shrink-0" :disabled="!canAct" @click="endDiscussion">{{ t('avalon.discussionTimer.endEarly') }}</button>
      </div>
      <div v-if="room.phase === 'finished'" role="status" class="alert alert-vertical sm:alert-horizontal lg:hidden">
        <p class="min-w-0 flex-1 text-sm">{{ t(`avalon.winners.${room.result?.winner || 'none'}`) }}</p>
        <button type="button" class="btn btn-sm" @click="goToPanel('table')">{{ t('avalon.promptActions.result') }}</button>
      </div>
    </div>
    <div
      v-if="room.phase !== 'night'"
      :id="`${mobilePanelId}-table`"
      class="scroll-mt-24 space-y-5"
      :class="mobilePanel === 'table' ? '' : 'hidden lg:block'"
    >
      <div
        v-if="room.game > 0 && !['lobby', 'night'].includes(room.phase)"
        ref="questProgress"
        class="grid grid-cols-5 gap-2"
        :aria-label="t('avalon.quests')"
      >
        <div
          v-for="(size, index) in room.teamSizes"
          :key="index"
          class="tooltip tooltip-bottom group min-w-0 [--tt-bg:var(--color-base-100)] hover:z-30 focus-within:z-30"
          :class="openQuest === index ? 'tooltip-open' : ''"
          @mouseenter="alignQuestTooltip"
          @focusin="
            openQuest = index;
            alignQuestTooltip($event);
          "
          @focusout="closeQuestTooltip($event)"
        >
          <div
            :id="`${questTooltipId}-${index}`"
            role="tooltip"
            class="tooltip-content quest-tooltip hidden max-h-[65dvh] w-80! max-w-[calc(100vw-2rem)]! overflow-y-auto overscroll-contain border border-base-300 bg-base-100! p-3! text-left! text-base-content! shadow-lg scrollbar-thin group-hover:block group-focus-within:block group-hover:pointer-events-auto! group-focus-within:pointer-events-auto!"
          >
            <AvalonQuestHistory :room="room" :quest="index" />
          </div>
          <button
            type="button"
            class="block h-full w-full min-w-0 wrap-break-word rounded-box border p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-3"
            :class="questClasses(index)"
            :aria-describedby="`${questTooltipId}-${index}`"
            @click="$event.currentTarget.focus()"
            @keydown.esc="
              openQuest = null;
              $event.currentTarget.blur();
            "
          >
            <p class="text-xs">{{ t("avalon.questNumber", { n: index + 1 }) }}</p>
            <p class="mt-1 text-lg font-semibold">
              {{ size }}
              <span class="text-xs">{{ questLabel(index) }}</span>
            </p>
            <p
              v-if="room.players.length >= 7 && index === 3"
              class="mt-1 text-xs"
            >
              {{ t("avalon.twoFails") }}
            </p>
          </button>
        </div>
      </div>

      <section
        v-if="room.phase !== 'night' && room.self.role"
        class="grid grid-cols-2 items-stretch gap-2 sm:gap-3"
      >
        <AvalonIdentityCard
          compact
          :self="room.self"
          :self-id="room.selfId"
          :player-name="playerName"
          :face-up="showRole"
          :back-title="t('avalon.night.sealed')"
          :back-hint="t('avalon.showRole')"
          @flip="flipIdentity"
        />
        <AvalonResultCard
          v-if="room.phase === 'finished'"
          :result="room.result"
          :self-id="room.selfId"
          :player-name="playerName"
        />
        <AvalonBallotCards
          v-else-if="isQuestMember"
          mode="quest"
          active
          :allow-fail="evil"
          :can-submit="!room.self.questSubmitted && canAct"
          :submitted="room.self.questSubmitted"
          :context="`${room.code}:${room.game}:${room.stage}`"
          @quest="playQuest"
        />
        <AvalonBallotCards
          v-else
          :active="room.phase === 'vote'"
          :can-submit="room.phase === 'vote' && !room.self.voted && canAct"
          :submitted="room.phase === 'vote' && room.self.voted"
          :auto-approved="room.phase === 'vote' && room.self.autoApproved"
          :context="`${room.code}:${room.game}:${room.stage}`"
          @vote="castVote"
        />
      </section>
    </div>
    <div v-if="room.phase !== 'night'" class="divider hidden lg:flex"></div>
    <div
      v-if="room.phase !== 'night'"
      :id="`${mobilePanelId}-players`"
      class="scroll-mt-24 space-y-5"
      :class="mobilePanel === 'players' ? '' : 'hidden lg:block'"
    >
      <section class="card">
        <div class="card-body gap-4 p-0">
          <div class="flex items-center justify-between gap-3">
            <h2 class="card-title font-serif">
              <i class="ri-group-line font-normal" aria-hidden="true"></i>
              {{ t("avalon.players", { n: room.players.length }) }}
            </h2>
          </div>
          <p
            v-if="room.phase !== 'finished'"
            class="text-xs leading-6 text-base-content/60"
          >
            {{ t("avalon.knowledge.hint") }}
          </p>
          <p v-if="selectionMode === 'invite'" class="text-sm">{{ t('avalon.discussionTimer.inviteSelf') }}</p>
          <p v-else-if="selectionMode === 'assassinate'" class="text-sm">{{ t('avalon.chooseTarget') }}</p>
          <ol class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="(player, index) in room.players"
              :key="player.id"
              class="flex items-center gap-3 rounded-box border p-3"
              :class="playerClasses(player)"
            >
              <input
                v-if="room.phase === 'team' && isLeader"
                :id="`seat-${player.id}`"
                type="checkbox"
                class="checkbox checkbox-sm shrink-0"
                :checked="selected.includes(player.id)"
                :disabled="
                  !canAct ||
                  (!selected.includes(player.id) && selected.length >= teamSize)
                "
                @change="togglePlayer(player.id)"
              />
              <input
                v-else-if="canSelectPlayer(player)"
                :id="`seat-${player.id}`"
                type="radio"
                class="radio radio-sm shrink-0"
                :name="`${mobilePanelId}-${selectionMode}`"
                :value="player.id"
                :checked="selectionMode === 'invite' ? discussionPartner === player.id : target === player.id"
                :disabled="!canAct"
                @change="choosePlayer(player.id)"
              />
              <span
                v-else
                class="w-5 shrink-0 text-center font-mono text-sm text-base-content/50"
                >{{ index + 1 }}</span
              >
              <div class="min-w-0 flex-1">
                <label
                  :for="
                    canSelectPlayer(player)
                      ? `seat-${player.id}`
                      : undefined
                  "
                  class="block wrap-break-word text-sm font-medium"
                  >{{ player.nickname }}
                  <span
                    v-if="player.id === room.selfId"
                    class="text-base-content/50"
                    >{{ t("games.you") }}</span
                  ></label
                >
                <div
                  class="mt-1 flex flex-wrap gap-1 text-xs text-base-content/60"
                >
                  <span v-if="player.id === room.hostId">{{
                    t("games.host")
                  }}</span>
                  <span
                    v-if="
                      player.id === room.leaderId &&
                      !['lobby', 'finished'].includes(room.phase)
                    "
                    >{{ t("avalon.leader") }}</span
                  >
                  <span
                    v-if="
                      room.team.includes(player.id) &&
                      !['lobby', 'team'].includes(room.phase)
                    "
                    >{{ t("avalon.onTeam") }}</span
                  >
                  <span v-if="room.phase === 'lobby' && player.ready">{{
                    t("games.ready")
                  }}</span>
                  <span v-if="!player.online">{{
                    t("games.disconnected")
                  }}</span>
                  <span
                    v-if="knowledge[player.id]"
                    class="inline-flex items-center gap-1"
                    :class="
                      knowledge[player.id].tone === 'evil'
                        ? 'text-error'
                        : knowledge[player.id].tone === 'good'
                          ? 'text-success'
                          : 'text-warning'
                    "
                  >
                    <i
                      :class="knowledge[player.id].icon"
                      aria-hidden="true"
                    ></i>
                    {{ t(knowledge[player.id].label) }}
                  </span>
                  <span v-else class="inline-flex items-center gap-1">
                    <i class="ri-question-line" aria-hidden="true"></i>
                    {{ t("avalon.knowledge.unknown") }}
                  </span>
                  <span
                    v-if="marks[player.id]"
                    class="inline-flex items-center gap-1"
                  >
                    <i class="ri-pencil-line" aria-hidden="true"></i>
                    {{
                      t("avalon.notes.guess", {
                        role: t(markLabel(marks[player.id])),
                      })
                    }}
                  </span>
                </div>
              </div>
              <button
                v-if="possibleMarks(room, player.id).length"
                type="button"
                class="btn btn-ghost btn-xs btn-square shrink-0"
                :aria-label="
                  t('avalon.notes.player', { name: player.nickname })
                "
                @click="notesMenu.open(player, $event)"
              >
                <i class="ri-pencil-line" aria-hidden="true"></i>
              </button>
              <span
                class="size-2 shrink-0 rounded-full"
                :class="player.online ? 'bg-success' : 'bg-base-300'"
                aria-hidden="true"
              ></span>
            </li>
          </ol>
          <div v-if="room.phase === 'discussion' && room.discussion?.mode === 'fast' && !room.discussion.partnerId" class="space-y-3">
            <div class="flex items-center gap-2">
              <AvalonDiscussionTimer class="min-w-0 flex-1" :discussion="room.discussion" :server-now="room.serverNow" />
              <button v-if="isLeader" type="button" class="btn shrink-0" :disabled="!canAct" @click="endDiscussion">{{ t('avalon.discussionTimer.endEarly') }}</button>
            </div>
          </div>
          <button
            v-if="isLeader && room.phase === 'team'"
            class="btn"
            :disabled="!canAct || selected.length !== teamSize"
            @click="run('team', { team: selected })"
          >
            {{ t("avalon.propose") }}
          </button>
          <button v-if="selectionMode === 'assassinate'" type="button" class="btn" :disabled="!canAct || !target" @click="assassinate">{{ t('avalon.assassinate') }}</button>
        </div>
      </section>
    </div>

    <div v-if="room.phase !== 'night'" class="divider hidden lg:flex"></div>

    <AvalonNotesMenu
      ref="notesMenu"
      :room="room"
      :marks="marks"
      @mark="markPlayer"
    />
    <div
      v-if="room.phase !== 'night'"
      :id="`${mobilePanelId}-discussion`"
      class="scroll-mt-24 space-y-3"
      :class="mobilePanel === 'discussion' ? '' : 'hidden lg:block'"
    >
      <AvalonDiscussion :room="room" :can-act="canAct && canSpeak" :active="mobilePanel === 'discussion' || desktop" :run="run">
        <template #discussion-timer>
          <AvalonDiscussionTimer v-if="room.phase === 'discussion'" class="lg:hidden" :discussion="room.discussion" :server-now="room.serverNow" />
        </template>
      </AvalonDiscussion>
    </div>

    <div v-if="room.history.length" class="divider hidden lg:flex"></div>

    <section
      v-if="room.phase !== 'night'"
      :id="`${mobilePanelId}-history`"
      class="card"
      :class="mobilePanel === 'history' ? '' : 'hidden lg:block'"
    >
      <div class="card-body p-0">
        <h2 class="card-title font-serif">
          <i class="ri-history-line font-normal" aria-hidden="true"></i>
          {{ t("avalon.history") }}
        </h2>
        <p v-if="!room.history.length" class="py-5 text-sm text-base-content/50">{{ t('avalon.mobile.historyEmpty') }}</p>
        <ol class="mt-2 space-y-4">
          <li
            v-for="quest in recordedQuests"
            :key="quest"
            class="card card-border border-base-300 p-3 sm:p-4"
          >
            <AvalonQuestHistory :room="room" :quest="quest" />
          </li>
        </ol>
      </div>
    </section>
    <nav v-if="room.phase !== 'night'" class="dock z-30 lg:hidden" :aria-label="t('avalon.mobile.navigation')">
      <button
        v-for="panel in mobilePanels"
        :key="panel.id"
        type="button"
        :class="{ 'dock-active': mobilePanel === panel.id }"
        :aria-current="mobilePanel === panel.id ? 'page' : undefined"
        :aria-controls="`${mobilePanelId}-${panel.id}`"
        @click="mobilePanel = panel.id"
      >
        <span class="indicator">
          <span v-if="panel.id === 'discussion' && unreadMessages" class="indicator-item badge badge-error badge-sm min-w-5 px-1 font-semibold tabular-nums" aria-hidden="true">{{ unreadMessages }}</span>
          <i :class="panel.icon" class="text-xl" aria-hidden="true"></i>
        </span>
        <span class="dock-label">{{ t(panel.label) }}</span>
        <span v-if="panel.id === 'discussion' && unreadMessages" class="sr-only">{{ t('avalon.phrases.unread', { n: unreadMessages }) }}</span>
      </button>
    </nav>
  </div>
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
  watch,
} from "vue";
import { useLocale } from "@/i18n";
import { useMediaQuery } from '@vueuse/core';
import { useModal } from "@/composables/useModal";
import { isEvil } from "../../../../shared/games/avalon.js";
import AvalonIdentityCard from "./AvalonIdentityCard.vue";
import AvalonBallotCards from "./AvalonBallotCards.vue";
import AvalonResultCard from "./AvalonResultCard.vue";
import AvalonNotesMenu from "./AvalonNotesMenu.vue";
import AvalonDiscussion from "./AvalonDiscussion.vue";
import AvalonDiscussionTimer from "./AvalonDiscussionTimer.vue";
import { canDiscuss } from '../../../../shared/games/avalon-discussion.js';
import AvalonQuestHistory from "./AvalonQuestHistory.vue";
import { knownPlayer } from "@/games/avalon-presentation";
import { possibleMarks } from "@/games/avalon-notes";
import { useAvalonNotes } from "@/composables/useAvalonNotes";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
});
const { t } = useLocale();
const modal = useModal();
const room = computed(() => ({
  ...props.room,
  ...props.room.game,
  game: props.room.round,
  players: props.room.players.map((player) => ({
    ...player,
    ...(props.room.game.revealedRoles
      ? { role: props.room.game.revealedRoles[player.id] }
      : {}),
  })),
}));
const run = (...args) => props.run(...args);
const { marks, markPlayer } = useAvalonNotes(room);
const notesMenu = ref(null);
const markLabel = (mark) =>
  ({ good: "avalon.night.good", evil: "avalon.night.evil" })[mark] ||
  `avalon.roles.${mark}`;
const mobilePanelId = `avalon-panels-${useId()}`;
const mobilePanel = ref('agenda');
async function goToPanel(panel) {
  mobilePanel.value = panel;
  await nextTick();
  document.getElementById(`${mobilePanelId}-${panel}`)?.scrollIntoView({ block: 'start' });
}
const desktop = useMediaQuery('(min-width: 1024px)');
const unreadMessages = ref(0);
watch(
  [() => room.value.code, () => room.value.game, () => room.value.selfId, () => room.value.messages ?? []],
  ([code, game, selfId, messages], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1] || selfId !== previous[2]) {
      unreadMessages.value = 0;
      return;
    }
    if (desktop.value || mobilePanel.value === 'discussion') return;
    const seen = new Set(previous[3].map(message => message.id));
    unreadMessages.value += messages.filter(message => !seen.has(message.id) && message.playerId !== selfId).length;
  },
  { immediate: true },
);
watch([mobilePanel, desktop], ([panel, isDesktop]) => {
  if (panel === 'discussion' || isDesktop) unreadMessages.value = 0;
});
watch(() => room.value.phase, (phase, previous) => {
  if (previous === 'team' && phase === 'vote' && mobilePanel.value === 'players') mobilePanel.value = 'table';
});
const mobilePanels = [
  { id: 'agenda', icon: 'ri-question-answer-line', label: 'avalon.mobile.agenda' },
  { id: 'table', icon: 'ri-layout-grid-line', label: 'avalon.mobile.table' },
  { id: 'players', icon: 'ri-group-line', label: 'avalon.mobile.players' },
  { id: 'discussion', icon: 'ri-user-voice-line', label: 'avalon.mobile.discussion' },
  { id: 'history', icon: 'ri-history-line', label: 'avalon.mobile.history' },
];
const selected = ref([]);
const target = ref("");
const showRole = ref(false);
const questTooltipId = `quest-detail-${useId()}`;
const openQuest = ref(null);
const questProgress = ref(null);
// Keep only the latest public event relevant to the current stage; history keeps the full timeline.
const agendaEntry = computed(() => {
  const history = room.value.history;
  const latest = history.at(-1);
  const types = {
    discussion: ['vote', 'quest', 'dialogue'],
    team: ['begin_team'],
    vote: ['team'],
    quest: ['vote'],
    assassinate: ['quest'],
    finished: ['vote', 'quest', 'assassinate', 'end'],
  };
  return latest && types[room.value.phase]?.includes(latest.type)
    ? { ...latest, sequence: history.length }
    : null;
});
const recordedQuests = computed(() =>
  [...new Set(room.value.history.map((entry) => entry.quest))].sort(
    (a, b) => a - b,
  ),
);
let questResultModal = null;
watch(
  [() => room.value.code, () => room.value.game, () => room.value.quests],
  ([code, game, quests], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1]) {
      questResultModal?.close();
      questResultModal = null;
      return;
    }
    if (quests.length <= previous[2].length) return;
    const result = quests.at(-1);
    const successes = quests.filter(quest => quest.success).length;
    const description = h('div', { class: 'space-y-4' }, [
      h('div', { class: 'flex items-center gap-3' }, [
        h('i', { class: result.success ? 'ri-shield-check-line text-4xl text-success' : 'ri-close-circle-line text-4xl text-error', 'aria-hidden': true }),
        h('div', { class: 'min-w-0 space-y-1' }, [
          h('p', { class: 'font-semibold' }, t('avalon.records.cards', { passed: result.team.length - result.failures, failed: result.failures })),
          h('p', { class: 'text-sm text-base-content/60' }, t('avalon.teamNames', { names: result.team.map(playerName).join(', ') })),
        ]),
      ]),
      h('p', { class: 'text-sm' }, t('avalon.questResult.score', { success: successes, failure: quests.length - successes })),
    ]);
    questResultModal?.close();
    questResultModal = modal.info(t(result.success ? 'avalon.questResult.success' : 'avalon.questResult.failure', { n: result.quest + 1 }), description);
  },
  { immediate: true },
);
onBeforeUnmount(() => questResultModal?.close());
function alignQuestTooltip(event) {
  const wrapper = event.currentTarget;
  const content = wrapper.querySelector(".tooltip-content");
  const bounds = wrapper.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  content.style.setProperty(
    "max-width",
    `${Math.max(0, viewportWidth - 32)}px`,
    "important",
  );
  const width = content.offsetWidth;
  const centered = bounds.left + bounds.width / 2 - width / 2;
  const left = Math.max(16, Math.min(centered, viewportWidth - width - 16));
  content.style.marginLeft = `${left - centered}px`;
}
function closeQuestTooltip(event) {
  if (!event.currentTarget.contains(event.relatedTarget))
    openQuest.value = null;
}
function realignQuestTooltip() {
  for (const wrapper of questProgress.value?.querySelectorAll(".tooltip") ??
    []) {
    if (wrapper.matches(":hover, :focus-within"))
      alignQuestTooltip({ currentTarget: wrapper });
  }
}
onMounted(() => window.addEventListener("resize", realignQuestTooltip));
onBeforeUnmount(() =>
  window.removeEventListener("resize", realignQuestTooltip),
);
const isLeader = computed(() => room.value.leaderId === room.value.selfId);
const canSpeak = computed(() => canDiscuss(room.value, room.value.selfId));
const discussionPartner = ref('');
const discussionHint = computed(() => {
  const discussion = room.value.discussion;
  if (!discussion) return t('avalon.discussionTimer.syncing');
  if (discussion.mode === 'slow') return t('avalon.discussionTimer.slowHint');
  if (!discussion.partnerId) return t(isLeader.value ? 'avalon.discussionTimer.inviteSelf' : 'avalon.discussionTimer.inviteWait');
  return t(isLeader.value ? 'avalon.discussionTimer.dialogueSelf' : discussion.partnerId === room.value.selfId ? 'avalon.discussionTimer.dialoguePartner' : 'avalon.discussionTimer.dialogueWait', {
    leader: playerName(room.value.leaderId), partner: playerName(discussion.partnerId),
  });
});
const teamSize = computed(
  () => room.value.teamSizes[room.value.questIndex] || 0,
);
const evil = computed(() => isEvil(room.value.self.role));
const isQuestMember = computed(
  () =>
    room.value.phase === "quest" && room.value.team.includes(room.value.selfId),
);
const knowledge = computed(() =>
  Object.fromEntries(
    room.value.players.map((player) => [
      player.id,
      knownPlayer(room.value, player, showRole.value),
    ]),
  ),
);
const targets = computed(() =>
  room.value.players.filter(
    (p) =>
      p.id !== room.value.selfId && !room.value.self.knownEvil.includes(p.id),
  ),
);
const selectionMode = computed(() => {
  if (room.value.phase === 'team' && isLeader.value) return 'team';
  if (room.value.phase === 'discussion' && isLeader.value && room.value.discussion?.mode === 'fast' && !room.value.discussion.partnerId) return 'invite';
  if (room.value.phase === 'assassinate' && room.value.self.role === 'assassin') return 'assassinate';
  return '';
});
function canSelectPlayer(player) {
  return selectionMode.value === 'team' ||
    (selectionMode.value === 'invite' && player.id !== room.value.selfId) ||
    (selectionMode.value === 'assassinate' && targets.value.some(target => target.id === player.id));
}
async function choosePlayer(id) {
  if (!props.canAct || !room.value.players.some(player => player.id === id && canSelectPlayer(player))) return;
  if (selectionMode.value === 'assassinate') target.value = id;
  else if (selectionMode.value === 'invite') {
    discussionPartner.value = id;
    await run('discussion_partner', { targetId: id });
    if (!room.value.discussion?.partnerId) discussionPartner.value = '';
  }
}
watch([() => room.value.code, () => room.value.stage], () => {
  discussionPartner.value = '';
  selected.value = [];
  target.value = "";
});
watch([() => room.value.code, () => room.value.game], () => {
  mobilePanel.value = 'agenda';
});
watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.selfId,
    () => room.value.phase,
    () => room.value.self.roleRevealed,
    () => room.value.self.nightConfirmed,
  ],
  ([code, game, selfId, phase, revealed, confirmed], previous) => {
    if (phase === "night") showRole.value = revealed && !confirmed;
    else if (
      !previous ||
      code !== previous[0] ||
      game !== previous[1] ||
      selfId !== previous[2] ||
      previous[3] === "night"
    )
      showRole.value = !!room.value.self.role;
  },
  { immediate: true },
);
const playerName = (id) =>
  room.value.participants.find((p) => p.id === id)?.nickname ||
  t("games.departed");
function togglePlayer(id) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : selected.value.length < teamSize.value
      ? [...selected.value, id]
      : selected.value;
}
function flipIdentity() {
  if (!room.value.self.roleRevealed) {
    if (props.canAct) void run("peek_role");
  } else showRole.value = !showRole.value;
}
function playerClasses(player) {
  const tone = knowledge.value[player.id]?.tone;
  const background =
    { evil: "bg-error/5", good: "bg-success/5", candidate: "bg-warning/5" }[
      tone
    ] || "";
  const border =
    (selectionMode.value === 'team' && selected.value.includes(player.id)) ||
    (selectionMode.value === 'invite' && discussionPartner.value === player.id) ||
    (selectionMode.value === 'assassinate' && target.value === player.id)
      ? "border-primary"
      : {
          evil: "border-error/30",
          good: "border-success/30",
          candidate: "border-warning/30",
        }[tone] || "border-base-300";
  return [background, border];
}
function questClasses(index) {
  const result = room.value.quests[index];
  return result
    ? result.success
      ? "border-success/40 bg-success/10"
      : "border-error/40 bg-error/10"
    : index === room.value.questIndex
      ? "border-base-content/40 bg-base-200"
      : "border-base-300";
}
function questLabel(index) {
  const result = room.value.quests[index];
  return t(
    result
      ? result.success
        ? "avalon.success"
        : "avalon.failure"
      : "avalon.people",
  );
}
function playQuest(success) {
  if (
    !isQuestMember.value ||
    room.value.self.questSubmitted ||
    !props.canAct ||
    (!success && !evil.value)
  )
    return;
  confirmGameAction(
    t(success ? "avalon.questCards.execute" : "avalon.questCards.sabotage"),
    t(success ? "avalon.confirmSuccess" : "avalon.confirmFailure"),
    "quest",
    { success },
  );
}
function castVote(approve) {
  if (room.value.phase !== "vote" || room.value.self.voted || !props.canAct)
    return;
  confirmGameAction(
    t(approve ? "avalon.approve" : "avalon.reject"),
    t("avalon.ballot.confirm", {
      choice: t(approve ? "avalon.approve" : "avalon.reject"),
    }),
    "vote",
    { approve },
  );
}
function assassinate() {
  const targetId = target.value;
  confirmGameAction(
    t("avalon.assassinate"),
    t("avalon.confirmTarget", { name: playerName(targetId) }),
    "assassinate",
    { targetId },
  );
}
function endDiscussion() {
  if (!isLeader.value || room.value.phase !== 'discussion' || !props.canAct) return;
  confirmGameAction(t('avalon.discussionTimer.endEarly'), t('avalon.discussionTimer.confirmEnd'), 'begin_team');
}
function confirmGameAction(title, description, type, payload) {
  const { code, stage } = room.value;
  modal.confirm(title, description, {
    buttonText: title,
    onSubmit: () => {
      if (type === 'begin_team' && (!isLeader.value || room.value.phase !== 'discussion')) return;
      if (type === "vote" && room.value.self.voted) return;
      if (
        type === "quest" &&
        (!isQuestMember.value ||
          room.value.self.questSubmitted ||
          (!payload.success && !evil.value))
      )
        return;
      if (
        props.canAct &&
        room.value.code === code &&
        room.value.stage === stage
      )
        void run(type, payload);
    },
  });
}
</script>
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .quest-tooltip {
    transition-property: opacity, transform, display;
    transition-behavior: allow-discrete;
  }

  @starting-style {
    .quest-tooltip {
      opacity: 0;
      --tt-pos: 0.25rem;
    }
  }
}
</style>
