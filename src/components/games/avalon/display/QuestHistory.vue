<template>
  <section class="min-w-0 space-y-3 text-left text-sm">
    <header class="space-y-1">
      <div
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
      >
        <h3 class="font-serif text-base font-semibold">
          {{ t("avalon.questNumber", { n: quest + 1 }) }}
        </h3>
        <span
          v-if="room"
          class="text-xs font-medium"
          :class="
            result
              ? result.success
                ? 'text-success'
                : 'text-error'
              : 'text-base-content/60'
          "
        >
          {{ status }}
        </span>
      </div>
      <p class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
        <span
          ><i class="ri-group-line" aria-hidden="true"></i>
          {{ t("avalon.records.required", { n: teamSize }) }}</span
        >
        <span
          ><i class="ri-sword-line" aria-hidden="true"></i>
          {{
            t("avalon.records.threshold", {
              n: participantCount >= 7 && quest === 3 ? 2 : 1,
            })
          }}</span
        >
      </p>
    </header>
    <div
      v-if="showProgress && current && ['vote', 'quest'].includes(room.phase)"
      class="space-y-1 text-xs leading-5"
    >
      <p class="wrap-break-word">
        {{
          t("avalon.teamNames", { names: room.team.map(playerName).join(", ") })
        }}
      </p>
      <p class="text-base-content/60">
        {{
          t(
            room.phase === "vote"
              ? "avalon.voteProgress"
              : "avalon.questProgress",
            {
              n: room.phase === "vote" ? room.voteCount : room.questCount,
              total:
                room.phase === "vote"
                  ? room.participants.length
                  : room.team.length,
            },
          )
        }}
      </p>
    </div>
    <div v-if="room" class="border-t border-base-300 pt-2">
      <p v-if="!entries.length" class="text-xs text-base-content/60">
        {{ t(current ? "avalon.records.waiting" : "avalon.records.empty") }}
      </p>
      <ol v-else class="space-y-3">
        <RecordEntry
          v-for="entry in entries"
          :key="entry.sequence"
          :title="t(`avalon.records.types.${entry.type}`)"
          :icon="icons[entry.type]"
          :sequence="entry.sequence"
          :at="entry.at"
          :tone="
            entry.type === 'quest'
              ? entry.success
                ? 'success'
                : 'error'
              : entry.type === 'vote'
                ? entry.approved
                  ? 'success'
                  : 'error'
                : ''
          "
        >
          <template #heading>
            <span
              v-if="entry.type === 'vote'"
              class="text-xs font-medium"
              :class="entry.approved ? 'text-success' : 'text-error'"
              >{{
                t(entry.approved ? "avalon.approved" : "avalon.rejectedLabel")
              }}</span
            >
            <span
              v-if="entry.type === 'quest'"
              class="text-xs font-medium"
              :class="entry.success ? 'text-success' : 'text-error'"
              >{{
                t(entry.success ? "avalon.success" : "avalon.failure")
              }}</span
            >
          </template>
          <p v-if="entry.leaderId" class="wrap-break-word text-base-content/60">
            {{
              t(
                entry.leaderId === room.selfId
                  ? "avalon.records.leaderSelf"
                  : "avalon.records.leader",
                { name: playerName(entry.leaderId) },
              )
            }}
          </p>
          <p
            v-if="entry.team && entry.type !== 'quest'"
            class="wrap-break-word"
          >
            {{
              t("avalon.teamNames", {
                names: entry.team.map(playerName).join(", "),
              })
            }}
          </p>
          <p v-if="entry.type === 'dialogue'" class="wrap-break-word">
            {{
              t("avalon.discussionTimer.dialogueRecord", {
                name: playerName(entry.targetId),
              })
            }}
          </p>
          <template v-if="entry.type === 'vote'">
            <p class="text-base-content/60">
              {{
                t("avalon.records.tally", {
                  yes: entry.votes.filter((vote) => vote.approve).length,
                  no: entry.votes.filter((vote) => !vote.approve).length,
                })
              }}
            </p>
            <ul class="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
              <li
                v-for="vote in entry.votes"
                :key="vote.playerId"
                class="inline-flex min-w-0 items-start gap-1"
                :class="vote.approve ? 'text-success' : 'text-error'"
              >
                <i
                  :class="
                    vote.approve ? 'ri-thumb-up-line' : 'ri-thumb-down-line'
                  "
                  class="shrink-0"
                  aria-hidden="true"
                ></i>
                <span class="sr-only"
                  >{{
                    t(vote.approve ? "avalon.approve" : "avalon.reject")
                  }}:</span
                >
                <span class="min-w-0 wrap-break-word">{{
                  playerName(vote.playerId)
                }}</span>
              </li>
            </ul>
          </template>
          <p v-if="entry.type === 'quest'" class="text-base-content/60">
            {{
              t("avalon.records.cards", {
                passed: entry.team.length - entry.failures,
                failed: entry.failures,
              })
            }}
          </p>
          <p v-if="entry.type === 'quest'" class="wrap-break-word">
            {{
              t("avalon.agendaSummary.executors", {
                names: entry.team.map(playerName).join(", "),
              })
            }}
          </p>
          <template v-if="entry.type === 'assassinate'">
            <p class="wrap-break-word">
              {{
                t(
                  entry.playerId === room.selfId
                    ? "avalon.records.assassinationSelf"
                    : entry.targetId === room.selfId
                      ? "avalon.records.assassinationTargetSelf"
                      : "avalon.records.assassination",
                  {
                    name: playerName(entry.playerId),
                    target: playerName(entry.targetId),
                  },
                )
              }}
            </p>
            <p class="text-base-content/60">
              {{ t(`avalon.reasons.${entry.reason}`) }}
            </p>
          </template>
          <p v-if="entry.type === 'end'" class="text-base-content/60">
            {{ t("avalon.reasons.aborted") }}
          </p>
          <p v-if="entry.type === 'reveal_role'" class="wrap-break-word">
            {{
              t("avalon.records.roleRevealed", {
                name: playerName(entry.playerId),
                role: t(`avalon.roles.${entry.role}`),
              })
            }}
          </p>
          <p v-if="entry.type === 'lady'" class="wrap-break-word">
            {{
              t("avalon.lady.record", {
                name: playerName(entry.playerId),
                target: playerName(entry.targetId),
              })
            }}
          </p>
          <p v-if="entry.type === 'recruit'" class="wrap-break-word">
            {{
              t(
                entry.success
                  ? "avalon.untrustworthy.success"
                  : "avalon.untrustworthy.failure",
                { name: playerName(entry.targetId) },
              )
            }}
          </p>
        </RecordEntry>
      </ol>
    </div>
  </section>
</template>
<script setup>
import RecordEntry from "../../display/RecordEntry.vue";
import { computed } from "vue";
import { useLocale } from "@/i18n";
import { QUEST_TEAMS } from "../../../../../shared/games/avalon/index.js";
const props = defineProps({
  room: { type: Object, default: null },
  playerCount: { type: Number, default: 5 },
  quest: { type: Number, required: true },
  sequence: { type: Number, default: null },
  showProgress: { type: Boolean, default: true },
});
const { t } = useLocale();
const participantCount = computed(
  () => props.room?.participants.length ?? props.playerCount,
);
const teamSize = computed(
  () =>
    props.room?.teamSizes[props.quest] ??
    (QUEST_TEAMS[participantCount.value] ?? QUEST_TEAMS[5])[props.quest],
);
const icons = {
  begin_recruit: "ri-user-shared-line",
  recruit: "ri-user-shared-line",
  begin_lady: "ri-drop-line",
  lady: "ri-eye-line",
  reveal_role: "ri-eye-2-line",
  dialogue: "ri-chat-3-line",
  begin_evil_discussion: "ri-chat-smile-3-line",
  begin_assassinate: "ri-sword-line",
  begin_team: "ri-discuss-line",
  team: "ri-group-line",
  vote: "ri-hand-coin-line",
  quest: "ri-shield-check-line",
  assassinate: "ri-sword-line",
  end: "ri-stop-circle-line",
};
const result = computed(() =>
  props.room?.quests.find((entry) => entry.quest === props.quest),
);
const current = computed(() =>
  Boolean(
    props.room &&
    props.quest === props.room.questIndex &&
    props.room.phase !== "finished",
  ),
);
const status = computed(() =>
  result.value
    ? t(result.value.success ? "avalon.success" : "avalon.failure")
    : t(
        current.value
          ? "avalon.records.current"
          : props.room?.phase === "finished"
            ? "avalon.records.unplayed"
            : "avalon.records.upcoming",
      ),
);
const entries = computed(() =>
  (props.room?.history ?? [])
    .map((entry, index) => ({ ...entry, sequence: index + 1 }))
    .filter(
      (entry) =>
        entry.quest === props.quest &&
        (props.sequence === null || entry.sequence === props.sequence),
    ),
);
const playerName = (id) =>
  props.room.participants.find((player) => player.id === id)?.nickname ||
  t("games.departed");
</script>
