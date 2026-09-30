<template>
  <section
    ref="summaryRoot"
    class="min-w-0 space-y-3 text-left text-sm"
    :aria-label="t('avalon.agendaSummary.title')"
  >
    <header class="space-y-1">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 class="font-serif text-base font-semibold">
          {{ t('avalon.agendaSummary.title') }} · {{ t('avalon.questNumber', { n: room.questIndex + 1 }) }}
        </h3>
        <span class="text-xs text-base-content/60">
          {{ t('avalon.agendaSummary.score', { success: successes, failure: failures }) }}
        </span>
      </div>
      <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
        <span>
          <i class="ri-group-line" aria-hidden="true"></i>
          {{ t('avalon.records.required', { n: room.teamSizes[room.questIndex] }) }}
        </span>
        <span>
          <i class="ri-sword-line" aria-hidden="true"></i>
          {{ t('avalon.records.threshold', { n: room.twoFails ? 2 : 1 }) }}
        </span>
      </p>
    </header>

    <p v-if="room.team.length && ['vote', 'quest'].includes(room.phase)" class="wrap-break-word leading-6">
      {{ t('avalon.teamNames', { names: room.team.map(playerName).join(', ') }) }}
    </p>
    <p v-if="room.phase === 'vote' || room.phase === 'quest'" role="status" class="text-xs text-base-content/60">
      {{ t(room.phase === 'vote' ? 'avalon.voteProgress' : 'avalon.questProgress', {
        n: room.phase === 'vote' ? room.voteCount : room.questCount,
        total: room.phase === 'vote' ? room.participants.length : room.team.length,
      }) }}
    </p>

    <div class="border-t border-base-300 pt-2">
      <h4 class="mb-2 text-xs font-semibold text-base-content/60">
        {{ t('avalon.agendaSummary.latest') }}
      </h4>
      <p v-if="!recentRecords.length" class="text-xs text-base-content/60">
        {{ t('avalon.agendaSummary.empty') }}
      </p>
      <TransitionGroup
        tag="ol"
        name="recent-record"
        appear
        class="relative flex min-w-0 flex-col gap-3 overflow-x-clip"
      >
        <li
          v-for="(entry, index) in recentRecords"
          :key="`${room.code}:${room.game}:${entry.sequence}`"
          :style="{ '--record-delay': `${index * 70}ms` }"
          class="min-w-0 border-l-2 border-base-300 pl-3"
          :class="entry.type === 'quest' ? entry.success ? 'border-success' : 'border-error' : entry.type === 'vote' ? entry.approved ? 'border-success' : 'border-error' : ''"
        >
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <i :class="icons[entry.type] || 'ri-history-line'" class="text-base-content/60" aria-hidden="true"></i>
            <strong class="font-medium">{{ t(`avalon.records.types.${entry.type}`) }}</strong>
            <span
              v-if="entry.type === 'vote' || entry.type === 'quest'"
              class="text-xs font-medium"
              :class="entry.type === 'vote' ? entry.approved ? 'text-success' : 'text-error' : entry.success ? 'text-success' : 'text-error'"
            >
              {{ t(entry.type === 'vote' ? entry.approved ? 'avalon.approved' : 'avalon.rejectedLabel' : entry.success ? 'avalon.success' : 'avalon.failure') }}
            </span>
            <span class="ml-auto font-mono text-xs text-base-content/40">
              #{{ entry.sequence }}
              <time v-if="entry.at" :datetime="new Date(entry.at).toISOString()" class="ml-1">
                {{ date(entry.at, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
              </time>
            </span>
          </div>
          <div class="mt-1 space-y-1 text-xs leading-5">
            <p v-if="entry.quest !== room.questIndex" class="text-base-content/60">
              {{ t('avalon.questNumber', { n: entry.quest + 1 }) }}
            </p>
            <p v-if="entry.leaderId && ['begin_team', 'team'].includes(entry.type)" class="wrap-break-word text-base-content/60">
              {{ t(entry.leaderId === room.selfId ? 'avalon.records.leaderSelf' : 'avalon.records.leader', { name: playerName(entry.leaderId) }) }}
            </p>
            <p v-if="entry.team && entry.type !== 'quest' && !isCurrentTeam(entry.team)" class="wrap-break-word">
              {{ t('avalon.teamNames', { names: entry.team.map(playerName).join(', ') }) }}
            </p>
            <p v-if="entry.type === 'dialogue'" class="wrap-break-word">
              {{ t('avalon.discussionTimer.dialogueRecord', { name: playerName(entry.targetId) }) }}
            </p>
            <template v-if="entry.type === 'vote'">
              <p class="text-base-content/60">
                {{ t('avalon.records.tally', { yes: entry.votes.filter((vote) => vote.approve).length, no: entry.votes.filter((vote) => !vote.approve).length }) }}
              </p>
              <ul class="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                <li
                  v-for="vote in entry.votes"
                  :key="vote.playerId"
                  class="inline-flex min-w-0 items-start gap-1"
                  :class="vote.approve ? 'text-success' : 'text-error'"
                >
                  <i :class="vote.approve ? 'ri-thumb-up-line' : 'ri-thumb-down-line'" aria-hidden="true"></i>
                  <span class="sr-only">{{ t(vote.approve ? 'avalon.approve' : 'avalon.reject') }}:</span>
                  <span class="wrap-break-word">{{ playerName(vote.playerId) }}</span>
                </li>
              </ul>
            </template>
            <template v-if="entry.type === 'quest'">
              <p class="text-base-content/60">
                {{ t('avalon.records.cards', { passed: entry.team.length - entry.failures, failed: entry.failures }) }}
              </p>
              <p class="wrap-break-word">
                {{ t('avalon.agendaSummary.executors', { names: entry.team.map(playerName).join(', ') }) }}
              </p>
            </template>
            <p v-if="entry.type === 'assassinate'" class="wrap-break-word">
              {{ t(entry.playerId === room.selfId ? 'avalon.records.assassinationSelf' : entry.targetId === room.selfId ? 'avalon.records.assassinationTargetSelf' : 'avalon.records.assassination', { name: playerName(entry.playerId), target: playerName(entry.targetId) }) }}
            </p>
            <p v-if="entry.type === 'end'" class="text-base-content/60">
              {{ t('avalon.reasons.aborted') }}
            </p>
          </div>
        </li>
      </TransitionGroup>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useLocale } from '@/i18n';

const props = defineProps({
  room: { type: Object, required: true },
  playerName: { type: Function, required: true },
});
const { t, date } = useLocale();
const summaryRoot = ref(null);
const icons = {
  dialogue: 'ri-chat-3-line',
  begin_evil_discussion: 'ri-chat-smile-3-line',
  begin_assassinate: 'ri-sword-line',
  begin_team: 'ri-discuss-line',
  team: 'ri-group-line',
  vote: 'ri-hand-coin-line',
  quest: 'ri-shield-check-line',
  assassinate: 'ri-sword-line',
  end: 'ri-stop-circle-line',
};
const successes = computed(() => props.room.quests.filter((quest) => quest.success).length);
const failures = computed(() => props.room.quests.length - successes.value);
const isCurrentTeam = (team) =>
  ['vote', 'quest'].includes(props.room.phase) &&
  team.length === props.room.team.length &&
  team.every((id, index) => id === props.room.team[index]);
const recentRecords = computed(() => {
  const history = props.room.history;
  let voteIndex = -1;
  let questIndex = -1;
  for (let index = history.length - 1; index >= 0; index--) {
    const entry = history[index];
    if (voteIndex < 0 && entry.type === 'vote' && entry.quest === props.room.questIndex)
      voteIndex = index;
    if (questIndex < 0 && entry.type === 'quest') questIndex = index;
    if (voteIndex >= 0 && questIndex >= 0) break;
  }
  return [...new Set([history.length - 1, voteIndex, questIndex])]
    .filter((index) => index >= 0)
    .sort((a, b) => b - a)
    .map((index) => ({ ...history[index], sequence: index + 1 }));
});
watch(
  [() => props.room.code, () => props.room.game, () => props.room.phase, () => props.room.history.length],
  ([code, game, phase, length], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1]) return;
    if (phase === previous[2] && length === previous[3]) return;
    void nextTick(() => {
      const scrollArea = summaryRoot.value?.closest('[data-avalon-summary-scroll]');
      if (scrollArea) scrollArea.scrollTop = 0;
    });
  },
  { flush: 'post' },
);
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .recent-record-enter-active {
    transition: opacity 360ms ease, transform 360ms ease;
    transition-delay: var(--record-delay, 0ms);
  }

  .recent-record-leave-active {
    position: absolute;
    width: 100%;
    transition: opacity 220ms ease, transform 220ms ease;
  }

  .recent-record-move {
    transition: transform 300ms ease;
  }

  .recent-record-enter-from {
    opacity: 0;
    transform: translateX(-1rem);
  }

  .recent-record-leave-to {
    opacity: 0;
    transform: translateX(1rem);
  }
}
</style>
