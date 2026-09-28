<template>
  <div
    class="w-full min-w-0 max-w-full space-y-3 wrap-break-word text-left text-sm"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="font-serif font-semibold">
        {{ t("avalon.questNumber", { n: quest + 1 }) }}
      </h3>
      <span
        class="badge badge-sm badge-soft"
        :class="
          result
            ? result.success
              ? 'badge-success'
              : 'badge-error'
            : 'badge-ghost'
        "
      >
        {{ status }}
      </span>
    </header>
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/60">
      <span
        ><i class="ri-group-line" aria-hidden="true"></i>
        {{ t("avalon.records.required", { n: room.teamSizes[quest] }) }}</span
      >
      <span
        ><i class="ri-sword-line" aria-hidden="true"></i>
        {{
          t("avalon.records.threshold", {
            n: room.participants.length >= 7 && quest === 3 ? 2 : 1,
          })
        }}</span
      >
    </div>
    <div
      v-if="showProgress && current && ['vote', 'quest'].includes(room.phase)"
      class="space-y-1 rounded-box bg-base-200/50 p-2 text-xs"
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
    <p v-if="!entries.length" class="text-xs text-base-content/60">
      {{ t(current ? "avalon.records.waiting" : "avalon.records.empty") }}
    </p>
    <ol
      v-else
      class="timeline timeline-vertical timeline-compact timeline-snap-icon min-w-0"
    >
      <li
        v-for="(entry, index) in entries"
        :key="entry.sequence"
        class="w-full min-w-0 [--timeline-col-start:0] [--timeline-col-end:minmax(0,1fr)]"
      >
        <hr v-if="index > 0" class="bg-base-200 -translate-y-2.25" />
        <div class="timeline-middle text-base-content/60 -translate-y-2.25">
          <i
            :class="icons[entry.type] || 'ri-history-line'"
            aria-hidden="true"
          ></i>
        </div>
        <div class="timeline-end m-0 mb-4 min-w-0 w-full pl-2">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="badge badge-xs">{{
              t(`avalon.records.types.${entry.type}`)
            }}</span>
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
            <span class="ml-auto font-mono text-xs text-base-content/40"
              >#{{ entry.sequence
              }}<time
                v-if="entry.at"
                :datetime="new Date(entry.at).toISOString()"
                class="ml-2"
                >{{
                  date(entry.at, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                }}</time
              ></span
            >
          </div>
          <div class="mt-2 space-y-1 text-xs leading-5">
            <p
              v-if="entry.leaderId"
              class="wrap-break-word text-base-content/60"
            >
              {{
                t(
                  entry.leaderId === room.selfId
                    ? "avalon.records.leaderSelf"
                    : "avalon.records.leader",
                  { name: playerName(entry.leaderId) },
                )
              }}
            </p>
            <p v-if="entry.team" class="wrap-break-word">
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
              <ul class="space-y-1.5">
                <li
                  v-for="vote in entry.votes"
                  :key="vote.playerId"
                  class="flex min-w-0 items-start gap-1"
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
          </div>
        </div>
        <hr
          v-if="index < entries.length - 1"
          class="bg-base-200 -translate-y-2.25"
        />
      </li>
    </ol>
  </div>
</template>
<script setup>
import { computed } from "vue";
import { useLocale } from "@/i18n";
const props = defineProps({
  room: { type: Object, required: true },
  quest: { type: Number, required: true },
  sequence: { type: Number, default: null },
  showProgress: { type: Boolean, default: true },
});
const { t, date } = useLocale();
const icons = {
  dialogue: "ri-chat-3-line",
  begin_team: "ri-discuss-line",
  team: "ri-group-line",
  vote: "ri-hand-coin-line",
  quest: "ri-shield-check-line",
  assassinate: "ri-sword-line",
  end: "ri-stop-circle-line",
};
const result = computed(() =>
  props.room.quests.find((entry) => entry.quest === props.quest),
);
const current = computed(
  () =>
    props.quest === props.room.questIndex && props.room.phase !== "finished",
);
const status = computed(() =>
  result.value
    ? t(result.value.success ? "avalon.success" : "avalon.failure")
    : t(
        current.value
          ? "avalon.records.current"
          : props.room.phase === "finished"
            ? "avalon.records.unplayed"
            : "avalon.records.upcoming",
      ),
);
const entries = computed(() =>
  props.room.history
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
