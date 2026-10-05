<template>
  <div
    class="min-w-0"
    :class="
      room.phase !== 'night'
        ? 'flex h-full min-h-0 flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] lg:block lg:overflow-visible lg:pb-0'
        : 'space-y-5'
    "
  >
    <section v-if="room.phase === 'night'" class="card">
      <div
        class="card-body items-center gap-6 px-0 py-4 text-center max-lg:gap-3 max-lg:py-2"
      >
        <hgroup class="flex flex-col gap-4 items-center max-lg:gap-2">
          <div class="flex flex-wrap items-center justify-center gap-2">
            <h2 class="card-title font-serif text-xl sm:text-2xl">
              <i class="ri-moon-clear-line font-normal" aria-hidden="true"></i>
              {{ t("avalon.phases.night") }}
            </h2>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              @click="reviewConfiguration"
            >
              {{ t("avalon.config.title") }}
            </button>
          </div>
          <p class="max-w-lg text-pretty text-sm text-base-content/70">
            {{ t("avalon.night.invitation") }}
          </p>
        </hgroup>
        <IdentityCard
          class="max-w-xs max-lg:w-[min(100%,44dvh)]"
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
        />
        <button
          type="button"
          class="btn"
          :class="{
            invisible:
              !room.self.role || (!showRole && !room.self.nightConfirmed),
          }"
          :disabled="!canAct || !showRole || room.self.nightConfirmed"
          @click="run('confirm_role')"
        >
          {{
            t(
              room.self.nightConfirmed
                ? "avalon.night.confirmed"
                : "avalon.night.confirm",
            )
          }}
        </button>
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
      class="min-w-0 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-1 xl:grid-cols-[minmax(16rem,1fr)_auto_minmax(0,1.5fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-start"
      :class="
        ['discussion', 'history'].includes(mobilePanel)
          ? 'max-lg:hidden'
          : 'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col'
      "
    >
      <div
        class="min-w-0 lg:h-full lg:min-h-0 xl:order-3"
        :class="
          mobilePanel === 'players'
            ? 'max-lg:hidden'
            : 'max-lg:min-h-0 max-lg:flex-1'
        "
      >
        <div class="flex h-full min-h-0 min-w-0 flex-col lg:gap-5">
          <div
            v-if="room.phase !== 'night'"
            :id="`${mobilePanelId}-agenda`"
            class="min-h-0 flex-1 flex-col gap-3 lg:pr-2"
            :class="mobilePanel === 'agenda' ? 'flex' : 'hidden lg:flex'"
          >
            <section class="card shrink-0">
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
                    v-if="agendaStatus"
                    class="badge badge-soft ml-auto h-auto max-w-full shrink-0 py-1 text-right whitespace-normal"
                    :class="agendaStatus.tone"
                    >{{ agendaStatus.text }}</span
                  >
                </div>
                <template v-if="room.phase === 'discussion'">
                  <p
                    v-if="!room.history.length"
                    class="font-serif text-xl leading-8"
                  >
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
                  <p class="text-sm text-base-content/60">
                    {{ discussionHint }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'team'">
                  <p class="text-sm leading-6">
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
                  <p v-if="!room.self.voted" class="text-sm leading-6">
                    {{ t("avalon.voteHint") }}
                  </p>
                  <p v-else class="text-sm leading-6">
                    {{
                      t(
                        room.self.autoApproved
                          ? "avalon.ballot.leaderApproved"
                          : "avalon.submitted",
                      )
                    }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'quest'">
                  <p class="text-sm leading-6">
                    {{ t(isQuestMember ? questHintKey : "avalon.questHint") }}
                  </p>
                  <p v-if="room.twoFails" class="text-sm text-warning">
                    {{ t("avalon.twoFails") }}
                  </p>
                  <p
                    v-if="!isQuestMember || room.self.questSubmitted"
                    class="text-sm"
                  >
                    {{
                      room.self.questSubmitted
                        ? t("avalon.submitted")
                        : t("avalon.waitQuest")
                    }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'evil_discussion'">
                  <p class="text-sm leading-6">
                    {{ t("avalon.evilDiscussion.hint") }}
                  </p>
                  <p class="text-sm text-base-content/60">
                    {{ t("avalon.evilDiscussion.next") }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'assassinate'">
                  <p class="text-sm leading-6">
                    {{
                      t(
                        room.self.role === "assassin"
                          ? "avalon.assassinateHintSelf"
                          : "avalon.assassinateHint",
                      )
                    }}
                  </p>
                  <p
                    v-if="room.self.role !== 'assassin'"
                    class="text-sm text-base-content/60"
                  >
                    {{ t("avalon.waitAssassin") }}
                  </p>
                </template>
              </div>
            </section>
            <div
              data-avalon-summary-scroll
              class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 scrollbar-thin"
            >
              <AgendaSummary :room="room" :player-name="playerName" />
            </div>
            <div
              v-if="['discussion', 'evil_discussion'].includes(room.phase)"
              class="flex shrink-0 items-center gap-2 lg:hidden"
            >
              <DiscussionTimer
                class="min-w-0 flex-1"
                :discussion="room.discussion"
                :server-now="room.serverNow"
              />
              <button
                v-if="
                  room.phase === 'discussion' ? isLeader : canEndEvilDiscussion
                "
                type="button"
                class="btn shrink-0"
                :disabled="!canAct"
                @click="
                  room.phase === 'discussion'
                    ? endDiscussion()
                    : endEvilDiscussion()
                "
              >
                {{ t("avalon.discussionTimer.endEarly") }}
              </button>
            </div>
          </div>
          <div
            v-if="room.phase !== 'night'"
            :id="`${mobilePanelId}-table`"
            class="min-h-0 space-y-5 max-lg:flex-1 max-lg:flex-col max-lg:gap-3 max-lg:space-y-0 max-lg:overflow-hidden lg:shrink-0"
            :class="mobilePanel === 'table' ? 'max-lg:flex' : 'hidden lg:block'"
          >
            <div
              data-avalon-summary-scroll
              class="min-h-0 max-lg:flex-1 max-lg:overflow-x-hidden max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:scrollbar-thin lg:hidden"
            >
              <AgendaSummary :room="room" :player-name="playerName" />
            </div>
            <div
              class="flex max-h-full min-h-0 shrink-0 flex-col gap-3 lg:gap-5"
            >
              <QuestList
                v-if="room.game > 0 && !['lobby', 'night'].includes(room.phase)"
                :room="room"
              />

              <div
                v-if="
                  (room.phase === 'vote' && !room.self.voted) ||
                  (isQuestMember && !room.self.questSubmitted)
                "
                role="status"
                class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80 lg:hidden"
              >
                <i
                  class="ri-information-line shrink-0 text-info"
                  aria-hidden="true"
                ></i>
                <span class="min-w-0">
                  {{
                    room.phase === "vote"
                      ? t("avalon.mobileHints.vote")
                      : t("avalon.mobileHints.quest")
                  }}
                </span>
              </div>

              <section
                v-if="room.phase !== 'night' && room.self.role"
                class="min-h-0 min-w-0 overflow-y-auto overscroll-contain scrollbar-thin"
              >
                <ResultCard
                  v-if="room.phase === 'finished'"
                  :result="room.result"
                  :won="room.self.won"
                  :alignment="room.self.alignment"
                  :self-id="room.selfId"
                  :player-name="playerName"
                />
                <BallotCards
                  v-else-if="isQuestMember"
                  :self="room.self"
                  :self-id="room.selfId"
                  :player-name="playerName"
                  mode="quest"
                  active
                  :allow-fail="allowedQuestCards.includes(false)"
                  :allowed-choices="allowedQuestCards"
                  :can-submit="!room.self.questSubmitted && canAct"
                  :submitted="room.self.questSubmitted"
                  :context="`${room.code}:${room.game}:${room.stage}`"
                  @quest="playQuest"
                />
                <BallotCards
                  v-else
                  :self="room.self"
                  :self-id="room.selfId"
                  :player-name="playerName"
                  :active="room.phase === 'vote'"
                  :can-submit="
                    room.phase === 'vote' && !room.self.voted && canAct
                  "
                  :submitted="room.phase === 'vote' && room.self.voted"
                  :auto-approved="
                    room.phase === 'vote' && room.self.autoApproved
                  "
                  :context="`${room.code}:${room.game}:${room.stage}`"
                  @vote="castVote"
                />
              </section>
            </div>
          </div>
        </div>
      </div>
      <div
        class="divider divider-horizontal hidden xl:order-2 xl:flex"
        aria-hidden="true"
      ></div>
      <Teleport :to="`#${playersTargetId}`" :disabled="!midDesktop" defer>
        <div
          class="flex min-h-0 min-w-0 flex-col lg:h-full xl:order-1"
          :class="mobilePanel === 'players' ? 'max-lg:flex-1' : 'max-lg:hidden'"
        >
          <div
            v-if="room.phase !== 'night'"
            :id="`${mobilePanelId}-players`"
            class="flex min-h-0 flex-1 flex-col"
            :class="
              midDesktop || mobilePanel === 'players' ? '' : 'hidden lg:flex'
            "
          >
            <section class="card min-h-0 flex-1">
              <div class="card-body min-h-0 flex-1 gap-4 p-0">
                <div
                  v-if="!midDesktop"
                  class="flex shrink-0 items-center justify-between gap-3"
                >
                  <h2 class="card-title font-serif">
                    <i class="ri-group-line font-normal" aria-hidden="true"></i>
                    {{ t("avalon.players", { n: room.players.length }) }}
                  </h2>
                </div>
                <div
                  v-if="['discussion', 'evil_discussion'].includes(room.phase)"
                  class="shrink-0 items-center gap-2"
                  :class="
                    room.phase === 'discussion' &&
                    room.discussion?.mode === 'fast' &&
                    !room.discussion.partnerId
                      ? 'flex'
                      : 'hidden lg:flex'
                  "
                >
                  <DiscussionTimer
                    class="min-w-0 flex-1"
                    :discussion="room.discussion"
                    :server-now="room.serverNow"
                  />
                  <button
                    v-if="
                      room.phase === 'discussion'
                        ? isLeader
                        : canEndEvilDiscussion
                    "
                    type="button"
                    class="btn shrink-0"
                    :disabled="!canAct"
                    @click="
                      room.phase === 'discussion'
                        ? endDiscussion()
                        : endEvilDiscussion()
                    "
                  >
                    {{ t("avalon.discussionTimer.endEarly") }}
                  </button>
                </div>
                <div
                  v-if="selectionMode === 'team'"
                  role="status"
                  class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80 lg:hidden"
                >
                  <i
                    class="ri-information-line shrink-0 text-info"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0">{{
                    t("avalon.mobileHints.team", {
                      n: selected.length,
                      total: teamSize,
                    })
                  }}</span>
                </div>
                <div
                  v-else-if="selectionMode === 'invite'"
                  role="status"
                  class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80 lg:hidden"
                >
                  <i
                    class="ri-information-line shrink-0 text-info"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0">{{
                    t("avalon.mobileHints.invite")
                  }}</span>
                </div>
                <div
                  v-else-if="selectionMode === 'assassinate'"
                  role="status"
                  class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80 lg:hidden"
                >
                  <i
                    class="ri-information-line shrink-0 text-info"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0">{{
                    t("avalon.mobileHints.assassinate")
                  }}</span>
                </div>
                <ol
                  class="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain p-1 scrollbar-thin sm:grid-cols-2 lg:grid-cols-1"
                >
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
                        (!selected.includes(player.id) &&
                          selected.length >= teamSize)
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
                      :checked="
                        selectionMode === 'invite'
                          ? discussionPartner === player.id
                          : target === player.id
                      "
                      :disabled="!canAct"
                      @change="choosePlayer(player.id)"
                    />
                    <span
                      v-else
                      class="w-5 shrink-0 text-center font-mono text-sm text-base-content/50"
                      >{{ index + 1 }}</span
                    >
                    <component
                      :is="guessable[player.id] ? 'button' : 'div'"
                      :type="guessable[player.id] ? 'button' : undefined"
                      class="shrink-0 border-0 bg-transparent p-0"
                      :class="
                        guessable[player.id]
                          ? 'indicator cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                          : ''
                      "
                      :role="guessable[player.id] ? undefined : 'img'"
                      :aria-label="
                        guessable[player.id]
                          ? t('avalon.notes.player', { name: player.nickname })
                          : portraits[player.id]
                            ? t(`avalon.roles.${portraits[player.id].role}`)
                            : t('avalon.knowledge.unknown')
                      "
                      @click="
                        guessable[player.id] && notesMenu.open(player, $event)
                      "
                    >
                      <span
                        v-if="guessable[player.id]"
                        class="indicator-item indicator-bottom indicator-end badge badge-xs z-10 size-4! rounded-full! p-0! text-[10px] ring-1 ring-base-100"
                        style="
                          --indicator-e: 0;
                          --indicator-b: 0;
                          --indicator-x: 0;
                          --indicator-y: 0;
                        "
                        aria-hidden="true"
                        ><i class="ri-pencil-line" aria-hidden="true"></i
                      ></span>
                      <div
                        class="avatar"
                        :class="
                          player.online ? 'avatar-online' : 'avatar-offline'
                        "
                      >
                        <div
                          class="relative size-12 overflow-hidden rounded-full border bg-base-200"
                          :class="
                            portraits[player.id]?.guessed
                              ? 'border-base-content/30'
                              : portraits[player.id]
                                ? currentRoleAlignment(
                                    room,
                                    portraits[player.id].role,
                                  ) === 'evil'
                                  ? 'border-error/40'
                                  : 'border-success/40'
                                : 'border-base-300'
                          "
                        >
                          <img
                            v-if="portraits[player.id]"
                            :src="roleImage(portraits[player.id].role)"
                            @error="$event.currentTarget.style.opacity = '0'"
                            @load="$event.currentTarget.style.opacity = ''"
                            alt=""
                            class="absolute inset-0 h-full w-full origin-top scale-150 object-cover object-top"
                            :class="
                              portraits[player.id].guessed
                                ? 'grayscale opacity-70'
                                : ''
                            "
                          />
                          <img
                            v-else
                            src="/assets/images/games/avalon/card.webp"
                            alt=""
                            class="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </component>
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
                          t(
                            player.departed
                              ? "games.departed"
                              : "games.disconnected",
                          )
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
                        <button
                          v-if="player.id === room.selfId && lancelotStatus"
                          type="button"
                          class="badge badge-xs gap-1"
                          :class="lancelotStatus.tone"
                          :aria-label="lancelotStatus.description"
                          @click="reviewLancelotStatus"
                        >
                          <i
                            :class="lancelotStatus.icon"
                            aria-hidden="true"
                          ></i>
                          {{
                            t(`avalon.lancelot.states.${lancelotStatus.label}`)
                          }}
                        </button>
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
                  </li>
                </ol>
                <button
                  v-if="isLeader && room.phase === 'team'"
                  class="btn shrink-0"
                  :disabled="!canAct || selected.length !== teamSize"
                  @click="run('team', { team: selected })"
                >
                  {{ t("avalon.propose") }}
                </button>
                <button
                  v-if="selectionMode === 'assassinate'"
                  type="button"
                  class="btn shrink-0"
                  :disabled="!canAct || !target"
                  @click="assassinate"
                >
                  {{ t("avalon.assassinate") }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </Teleport>
    </div>

    <NotesMenu ref="notesMenu" :room="room" :marks="marks" @mark="markPlayer" />
    <div
      v-if="room.phase !== 'night' && !desktop"
      :id="`${mobilePanelId}-discussion`"
      class="min-h-0 flex-1 flex-col gap-3 px-1.5"
      :class="mobilePanel === 'discussion' ? 'flex' : 'hidden'"
    >
      <div
        v-if="
          ['discussion', 'evil_discussion'].includes(room.phase) && canSpeak
        "
        role="status"
        class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80"
      >
        <i
          class="ri-information-line shrink-0 text-info"
          aria-hidden="true"
        ></i>
        <span class="min-w-0">{{ mobileDiscussionHint }}</span>
      </div>
      <Discussion
        class="min-h-0 flex-1"
        :room="room"
        :can-act="canAct && canSpeak"
        :active="mobilePanel === 'discussion'"
        fill-height
        :run="run"
      >
        <template #discussion-timer>
          <div
            v-if="['discussion', 'evil_discussion'].includes(room.phase)"
            class="flex shrink-0 items-center gap-2 lg:hidden"
          >
            <DiscussionTimer
              class="min-w-0 flex-1"
              :discussion="room.discussion"
              :server-now="room.serverNow"
            />
            <button
              v-if="
                room.phase === 'discussion' ? isLeader : canEndEvilDiscussion
              "
              type="button"
              class="btn shrink-0"
              :disabled="!canAct"
              @click="
                room.phase === 'discussion'
                  ? endDiscussion()
                  : endEvilDiscussion()
              "
            >
              {{ t("avalon.discussionTimer.endEarly") }}
            </button>
          </div>
        </template>
      </Discussion>
    </div>

    <section
      v-if="room.phase !== 'night' && !desktop"
      :id="`${mobilePanelId}-history`"
      class="min-h-0 flex-1"
      :class="mobilePanel === 'history' ? 'flex' : 'hidden'"
    >
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <h2 class="shrink-0 font-serif text-xl font-semibold">
          <i class="ri-history-line font-normal" aria-hidden="true"></i>
          {{ t("avalon.history") }}
        </h2>
        <p
          v-if="!room.history.length"
          class="py-5 text-sm text-base-content/50"
        >
          {{ t("avalon.mobile.historyEmpty") }}
        </p>
        <ol
          class="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-thin"
        >
          <li
            v-for="quest in recordedQuests"
            :key="quest"
            class="min-w-0 border-t border-base-300 pt-4 first:border-t-0 first:pt-0"
          >
            <QuestHistory :room="room" :quest="quest" />
          </li>
        </ol>
      </div>
    </section>
    <RolePreviewPopover
      ref="switchPopover"
      allegiance-switch
      :self="switchSelf"
      :switch-from-alignment="switchFromAlignment"
      :face-up="switchFaceUp"
      @closed="finishSwitchPresentation"
    />
    <MobileDock
      v-if="room.phase !== 'night'"
      :items="dockItems"
      :panel="mobilePanel"
      :panel-id="mobilePanelId"
      :label="t('avalon.mobile.navigation')"
      @select-panel="goToPanel"
    />
  </div>
</template>
<script setup>
import { computed, h, onBeforeUnmount, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import { useMediaQuery } from "@vueuse/core";
import { useModal } from "@/composables/useModal";
import {
  selfAlignment,
  roleAlignment,
  LANCELOTS,
} from "../../../../../shared/games/avalon/index.js";
import { useToast } from "@/composables/useToast";
import MobileDock from "../../layout/MobileDock.vue";
import IdentityCard from "../display/IdentityCard.vue";
import RolePreviewPopover from "../interaction/RolePreviewPopover.vue";
import ConfigurationSummary from "../display/ConfigurationSummary.vue";
import BallotCards from "../interaction/BallotCards.vue";
import ResultCard from "../display/ResultCard.vue";
import NotesMenu from "../interaction/NotesMenu.vue";
import Discussion from "../interaction/Discussion.vue";
import DiscussionTimer from "../display/DiscussionTimer.vue";
import { canDiscuss } from "../../../../../shared/games/avalon/discussion.js";
import QuestHistory from "../display/QuestHistory.vue";
import QuestList from "../display/QuestList.vue";
import AgendaSummary from "../display/AgendaSummary.vue";
import {
  knownPlayer,
  ROLE_ICONS,
  roleImage,
  currentRoleAlignment,
  playerAlignment,
} from "@/games/avalon/presentation";
import { possibleMarks } from "@/games/avalon/notes";
import { useAvalonNotes } from "@/composables/games/avalon/useAvalonNotes";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  run: { type: Function, required: true },
  playersTargetId: { type: String, required: true },
});
const emit = defineEmits(["request-sidebar-panel"]);
const { t } = useLocale();
const modal = useModal();
const toast = useToast();
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
const lancelotStatus = computed(() => {
  const self = room.value.self;
  if (self.lancelotMode !== "switching" || !LANCELOTS.includes(self.role))
    return null;
  const count = room.value.history.filter(
    (entry) => entry.type === "lancelot_draw" && entry.switched,
  ).length;
  const state =
    count === 0 ? "unchanged" : count === 1 ? "switched" : "returned";
  const current = selfAlignment(self);
  return {
    count,
    initial: roleAlignment(self.role),
    current,
    state,
    label:
      state === "switched"
        ? current === "good"
          ? "redeemed"
          : "fallen"
        : state,
    tone: {
      unchanged: "badge-ghost",
      switched: current === "good" ? "badge-success" : "badge-error",
      returned: "badge-success",
    }[state],
    icon: {
      unchanged: "ri-time-line",
      switched: current === "good" ? "ri-shield-check-line" : "ri-skull-line",
      returned: "ri-arrow-go-back-line",
    }[state],
    description: t(`avalon.lancelot.stateHints.${state}`, {
      n: count,
      side: t(`avalon.night.${current}`),
    }),
  };
});
function reviewLancelotStatus() {
  const status = lancelotStatus.value;
  if (!status) return;
  modal.info(
    t(`avalon.lancelot.states.${status.label}`),
    h("div", { class: "space-y-2 text-sm" }, [
      h(
        "p",
        { class: "text-base-content/60" },
        t("avalon.lancelot.opening", {
          side: t(`avalon.night.${status.initial}`),
        }),
      ),
      h("p", status.description),
    ]),
  );
}
watch(
  () => [room.value.code, room.value.game, room.value.self.alignment],
  (value, previous) => {
    if (
      !previous ||
      value[0] !== previous[0] ||
      value[1] !== previous[1] ||
      !previous[2] ||
      value[2] === previous[2] ||
      !LANCELOTS.includes(room.value.self.role)
    )
      return;
    toast.info(
      t("avalon.lancelot.changed", { side: t(`avalon.night.${value[2]}`) }),
      { duration: 6000 },
    );
  },
);
const { marks, markPlayer } = useAvalonNotes(room);
const notesMenu = ref(null);
const markLabel = (mark) =>
  ({ good: "avalon.night.good", evil: "avalon.night.evil" })[mark] ||
  `avalon.roles.${mark}`;
const mobilePanelId = `avalon-panels-${useId()}`;
const mobilePanel = ref("agenda");
function goToPanel(panel) {
  mobilePanel.value = panel;
}
const desktop = useMediaQuery("(min-width: 1024px)");
const midDesktop = useMediaQuery("(min-width: 1024px) and (max-width: 1279px)");
const unreadMessages = ref(0);
watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.selfId,
    () => room.value.messages ?? [],
  ],
  ([code, game, selfId, messages], previous) => {
    if (
      !previous ||
      code !== previous[0] ||
      game !== previous[1] ||
      selfId !== previous[2]
    ) {
      unreadMessages.value = 0;
      return;
    }
    if (desktop.value || mobilePanel.value === "discussion") return;
    const seen = new Set(previous[3].map((message) => message.id));
    unreadMessages.value += messages.filter(
      (message) => !seen.has(message.id) && message.playerId !== selfId,
    ).length;
  },
  { immediate: true },
);
watch([mobilePanel, desktop], ([panel, isDesktop]) => {
  if (panel === "discussion" || isDesktop) unreadMessages.value = 0;
});
const mobilePanels = [
  {
    id: "agenda",
    icon: "ri-question-answer-line",
    label: "avalon.mobile.agenda",
  },
  { id: "table", icon: "ri-layout-grid-line", label: "avalon.mobile.table" },
  { id: "players", icon: "ri-group-line", label: "avalon.mobile.players" },
  {
    id: "discussion",
    icon: "ri-user-voice-line",
    label: "avalon.mobile.discussion",
  },
  { id: "history", icon: "ri-history-line", label: "avalon.mobile.history" },
];
const dockItems = computed(() =>
  mobilePanels.map((item) => ({
    ...item,
    badge: item.id === "discussion" ? unreadMessages.value : 0,
    badgeLabel: t("avalon.phrases.unread", { n: unreadMessages.value }),
  })),
);
const selected = ref([]);
const target = ref("");
const showRole = ref(false);
let configurationModal = null;
function reviewConfiguration() {
  if (room.value.phase !== "night") return;
  configurationModal?.close();
  configurationModal = modal.info(
    t("avalon.config.title"),
    h(ConfigurationSummary, { room: room.value }),
    {
      scrollContent: true,
      buttonText: t("common.modal.close"),
    },
  );
}
watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.selfId,
    () => room.value.phase,
  ],
  ([code, game, selfId, phase], previous) => {
    const changed =
      !previous ||
      code !== previous[0] ||
      game !== previous[1] ||
      selfId !== previous[2];
    if (changed || phase !== "night") {
      configurationModal?.close();
      configurationModal = null;
    }
    if (
      phase === "night" &&
      (changed || previous[3] !== "night") &&
      !room.value.self.roleRevealed
    )
      reviewConfiguration();
  },
  { immediate: true, flush: "post" },
);

const recordedQuests = computed(() =>
  [...new Set(room.value.history.map((entry) => entry.quest))].sort(
    (a, b) => a - b,
  ),
);
let questResultModal = null;
let voteResultModal = null;
let voteModalPhase = null;
const switchPopover = ref(null);
const switchFaceUp = ref(false);
const switchSelf = ref(null);
const switchFromAlignment = ref(null);
let switchPresenting = false;
let switchPresentation = 0;
let switchFlipTimer = 0;
let switchCloseTimer = 0;
let switchResumeTimer = 0;
let pendingQuestResult = null;

function clearSwitchTimers() {
  window.clearTimeout(switchFlipTimer);
  window.clearTimeout(switchCloseTimer);
  window.clearTimeout(switchResumeTimer);
}

function resetSwitchPresentation() {
  clearSwitchTimers();
  switchPresentation += 1;
  switchPresenting = false;
  pendingQuestResult = null;
  switchPopover.value?.close();
}

function finishSwitchPresentation() {
  if (!switchPresenting) return;
  clearSwitchTimers();
  const presentation = switchPresentation;
  switchResumeTimer = window.setTimeout(() => {
    if (presentation !== switchPresentation) return;
    switchPresenting = false;
    const showResult = pendingQuestResult;
    pendingQuestResult = null;
    showResult?.();
  }, 300);
}

async function presentLancelotSwitch() {
  resetSwitchPresentation();
  const presentation = switchPresentation;
  switchFaceUp.value = false;
  const self = room.value.self;
  switchSelf.value =
    self.lancelotMode === "switching" && LANCELOTS.includes(self.role)
      ? { role: self.role, alignment: selfAlignment(self) }
      : null;
  // Snapshot both faces of the most recent switch; role identity stays unchanged.
  switchFromAlignment.value = switchSelf.value
    ? switchSelf.value.alignment === "evil"
      ? "good"
      : "evil"
    : null;
  switchPresenting = true;
  questResultModal?.close();
  questResultModal = null;
  voteResultModal?.close();
  voteResultModal = null;
  voteModalPhase = null;
  await switchPopover.value?.open();
  if (presentation !== switchPresentation || !switchPresenting) return;
  switchFlipTimer = window.setTimeout(
    () => {
      switchFaceUp.value = true;
    },
    switchSelf.value ? 1000 : 400,
  );
  switchCloseTimer = window.setTimeout(
    () => {
      switchPopover.value?.close();
    },
    switchSelf.value ? 4400 : 3400,
  );
}

watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.selfId,
    () => room.value.history,
    () => room.value.phase,
  ],
  ([code, game, selfId, history, phase], previous) => {
    if (
      !previous ||
      code !== previous[0] ||
      game !== previous[1] ||
      selfId !== previous[2] ||
      phase === "finished"
    ) {
      resetSwitchPresentation();
      return;
    }
    // Public draw records contain no player identities; existing snapshots are not replayed.
    if (
      history
        .slice(previous[3].length)
        .some((entry) => entry.type === "lancelot_draw" && entry.switched)
    ) {
      void presentLancelotSwitch();
    }
  },
  { immediate: true },
);
watch(
  [() => room.value.code, () => room.value.game, () => room.value.quests],
  ([code, game, quests], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1]) {
      questResultModal?.close();
      questResultModal = null;
      pendingQuestResult = null;
      return;
    }
    if (quests.length <= previous[2].length) return;
    const result = quests.at(-1);
    const successes = quests.filter((quest) => quest.success).length;
    const failures = quests.length - successes;
    const outlook =
      failures === 3
        ? [t("avalon.questResult.evilVictory")]
        : successes === 3
          ? [t("avalon.questResult.assassination")]
          : [
              t("avalon.questResult.goodRemaining", 3 - successes),
              t("avalon.questResult.evilRemaining", 3 - failures),
            ];
    const description = h("div", { class: "space-y-4" }, [
      h("div", { class: "flex items-center gap-3" }, [
        h("i", {
          class: result.success
            ? "ri-shield-check-line text-4xl text-success"
            : "ri-close-circle-line text-4xl text-error",
          "aria-hidden": true,
        }),
        h("div", { class: "min-w-0 space-y-1" }, [
          h(
            "p",
            { class: "font-semibold" },
            t("avalon.records.cards", {
              passed: result.team.length - result.failures,
              failed: result.failures,
            }),
          ),
          h(
            "p",
            { class: "text-sm text-base-content/60" },
            t("avalon.teamNames", {
              names: result.team.map(playerName).join(", "),
            }),
          ),
        ]),
      ]),
      h(
        "div",
        { class: "space-y-1 text-sm" },
        outlook.map((line) => h("p", line)),
      ),
    ]);
    voteResultModal?.close();
    voteResultModal = null;
    voteModalPhase = null;
    questResultModal?.close();
    const showResult = () => {
      questResultModal = modal.info(
        t(
          result.success
            ? "avalon.questResult.success"
            : "avalon.questResult.failure",
          { n: result.quest + 1 },
        ),
        description,
      );
    };
    if (switchPresenting) pendingQuestResult = showResult;
    else showResult();
  },
  { immediate: true },
);
watch(
  [() => room.value.code, () => room.value.game, () => room.value.history],
  ([code, game, history], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1]) {
      voteResultModal?.close();
      voteResultModal = null;
      voteModalPhase = null;
      return;
    }
    const votes = history.filter((entry) => entry.type === "vote");
    if (
      votes.length <=
      previous[2].filter((entry) => entry.type === "vote").length
    )
      return;
    const result = votes.at(-1);
    const state = room.value;
    if (
      (result.approved && state.phase !== "quest") ||
      (!result.approved &&
        !["discussion", "team", "finished"].includes(state.phase))
    )
      return;
    const yes = result.votes.filter((vote) => vote.approve).length;
    const no = result.votes.length - yes;
    const needed = Math.floor(result.votes.length / 2) + 1;
    const reason = t(
      result.approved
        ? "avalon.voteResult.approvedReason"
        : yes === no
          ? "avalon.voteResult.tieReason"
          : "avalon.voteResult.rejectedReason",
      { needed },
    );
    const next = result.approved
      ? t(
          result.team.includes(state.selfId)
            ? "avalon.voteResult.nextMember"
            : "avalon.voteResult.nextObserver",
        )
      : state.phase === "finished"
        ? t("avalon.reasons.rejections")
        : t(
            state.phase === "team"
              ? state.leaderId === state.selfId
                ? "avalon.voteResult.nextLeaderTeam"
                : "avalon.voteResult.nextTeam"
              : state.leaderId === state.selfId
                ? "avalon.voteResult.nextLeaderDiscussion"
                : "avalon.voteResult.nextDiscussion",
            { name: playerName(state.leaderId) },
          );
    const description = h("div", { class: "space-y-4 text-sm" }, [
      h("div", { class: "flex items-center gap-3" }, [
        h("i", {
          class: result.approved
            ? "ri-checkbox-circle-line text-4xl text-success"
            : "ri-close-circle-line text-4xl text-error",
          "aria-hidden": true,
        }),
        h("div", { class: "min-w-0 space-y-1" }, [
          h(
            "p",
            { class: "font-semibold" },
            t("avalon.records.tally", { yes, no }),
          ),
          h(
            "p",
            { class: "text-base-content/60" },
            t("avalon.teamNames", {
              names: result.team.map(playerName).join(", "),
            }),
          ),
        ]),
      ]),
      h("p", reason),
      h("p", { class: "rounded-box bg-base-200/60 p-3 font-medium" }, next),
    ]);
    questResultModal?.close();
    questResultModal = null;
    voteResultModal?.close();
    voteModalPhase = state.phase;
    voteResultModal = modal.info(
      t(
        result.approved
          ? "avalon.voteResult.approved"
          : "avalon.voteResult.rejected",
      ),
      description,
    );
  },
  { immediate: true },
);
watch(
  () => room.value.phase,
  (phase) => {
    if (!voteResultModal || phase === voteModalPhase) return;
    voteResultModal.close();
    voteResultModal = null;
    voteModalPhase = null;
  },
);
onBeforeUnmount(() => {
  resetSwitchPresentation();
  configurationModal?.close();
  questResultModal?.close();
  voteResultModal?.close();
});

const isLeader = computed(() => room.value.leaderId === room.value.selfId);
const canSpeak = computed(() => canDiscuss(room.value, room.value.selfId));
const canEndEvilDiscussion = computed(
  () => evil.value && room.value.self.role !== "oberon",
);
const discussionPartner = ref("");
const discussionHint = computed(() => {
  const discussion = room.value.discussion;
  if (!discussion) return t("avalon.discussionTimer.syncing");
  if (discussion.mode === "evil") return t("avalon.evilDiscussion.hint");
  if (discussion.mode === "slow") return t("avalon.discussionTimer.slowHint");
  if (!discussion.partnerId)
    return t(
      isLeader.value
        ? "avalon.discussionTimer.inviteSelf"
        : "avalon.discussionTimer.inviteWait",
    );
  return t(
    isLeader.value
      ? "avalon.discussionTimer.dialogueSelf"
      : discussion.partnerId === room.value.selfId
        ? "avalon.discussionTimer.dialoguePartner"
        : "avalon.discussionTimer.dialogueWait",
    {
      leader: playerName(room.value.leaderId),
      partner: playerName(discussion.partnerId),
    },
  );
});
const mobileDiscussionHint = computed(() =>
  t(
    room.value.phase === "evil_discussion"
      ? "avalon.mobileHints.evilDiscussion"
      : room.value.discussion?.mode === "slow"
        ? "avalon.mobileHints.slowDiscussion"
        : "avalon.mobileHints.fastDiscussion",
  ),
);
const teamSize = computed(
  () => room.value.teamSizes[room.value.questIndex] || 0,
);
const evil = computed(() => selfAlignment(room.value.self) === "evil");
const allowedQuestCards = computed(() =>
  room.value.self.questChoices?.length
    ? room.value.self.questChoices
    : evil.value
      ? [true, false]
      : [true],
);
const questHintKey = computed(() =>
  allowedQuestCards.value.length === 1 && !allowedQuestCards.value[0]
    ? "avalon.questHintLunatic"
    : room.value.self.role === "brute" &&
        !allowedQuestCards.value.includes(false)
      ? "avalon.questHintBrute"
      : evil.value
        ? "avalon.questHintEvil"
        : "avalon.questHintGood",
);
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
const portraits = computed(() =>
  Object.fromEntries(
    room.value.players.map((player) => {
      const label = knowledge.value[player.id]?.label;
      const knownRole =
        room.value.phase === "finished"
          ? player.role
          : label?.startsWith("avalon.roles.")
            ? label.slice("avalon.roles.".length)
            : null;
      if (knownRole && Object.hasOwn(ROLE_ICONS, knownRole))
        return [player.id, { role: knownRole, guessed: false }];
      const mark = marks.value[player.id];
      return [
        player.id,
        Object.hasOwn(ROLE_ICONS, mark) ? { role: mark, guessed: true } : null,
      ];
    }),
  ),
);
const guessable = computed(() =>
  Object.fromEntries(
    room.value.players.map((player) => [
      player.id,
      possibleMarks(room.value, player.id).length > 0,
    ]),
  ),
);
const targets = computed(() =>
  room.value.players.filter(
    (p) =>
      p.id !== room.value.selfId &&
      playerAlignment(room.value, p.id) !== "evil",
  ),
);
const selectionMode = computed(() => {
  if (room.value.phase === "team" && isLeader.value) return "team";
  if (
    room.value.phase === "discussion" &&
    isLeader.value &&
    room.value.discussion?.mode === "fast" &&
    !room.value.discussion.partnerId
  )
    return "invite";
  if (room.value.phase === "assassinate" && room.value.self.role === "assassin")
    return "assassinate";
  return "";
});
const agendaStatus = computed(() => {
  const state = room.value;
  const status = (key, tone = "badge-ghost", params = {}) => ({
    text: t(`avalon.agendaStatus.${key}`, params),
    tone,
  });

  if (state.phase === "finished")
    return {
      text: t(`avalon.winners.${state.result?.winner || "none"}`),
      tone:
        state.result?.winner === "good"
          ? "badge-success"
          : state.result?.winner === "evil"
            ? "badge-error"
            : "badge-ghost",
    };
  if (
    state.rejected === 4 &&
    ["discussion", "team", "vote"].includes(state.phase)
  )
    return status("lastReject", "badge-error");

  switch (state.phase) {
    case "discussion":
      if (!state.discussion)
        return {
          text: t("avalon.discussionTimer.syncing"),
          tone: "badge-ghost",
        };
      if (state.discussion?.mode === "slow")
        return status("slow", "badge-info");
      if (!state.discussion?.partnerId)
        return status(
          isLeader.value ? "inviteSelf" : "inviteWait",
          isLeader.value ? "badge-primary" : "badge-ghost",
        );
      return status(
        canSpeak.value ? "dialogueSelf" : "dialogueWait",
        canSpeak.value ? "badge-info" : "badge-ghost",
      );
    case "team":
      if (!isLeader.value) return status("teamWait");
      return selected.value.length === teamSize.value
        ? status("teamReady", "badge-primary")
        : status("teamSelf", "badge-primary", {
            n: selected.value.length,
            total: teamSize.value,
          });
    case "evil_discussion":
      return status("evilDiscussion", "badge-error");
    case "vote":
      return status(
        state.self.voted ? "voteWait" : "voteSelf",
        state.self.voted ? "badge-ghost" : "badge-primary",
      );
    case "quest":
      return status(
        isQuestMember.value && !state.self.questSubmitted
          ? "questSelf"
          : "questWait",
        isQuestMember.value && !state.self.questSubmitted
          ? "badge-primary"
          : "badge-ghost",
      );
    case "assassinate":
      return state.self.role === "assassin"
        ? status(
            target.value ? "assassinateConfirm" : "assassinateSelf",
            "badge-primary",
          )
        : status("assassinateWait");
    default:
      return null;
  }
});
const requiredPanel = computed(() => {
  if (selectionMode.value) return "players";
  if (room.value.phase === "evil_discussion") return "discussion";
  if (room.value.phase === "discussion" && canSpeak.value) return "discussion";
  if (
    (room.value.phase === "vote" && !room.value.self.voted) ||
    (isQuestMember.value && !room.value.self.questSubmitted) ||
    room.value.phase === "finished"
  )
    return "table";
  return "agenda";
});
watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.stage,
    () => room.value.phase,
    () => room.value.selfId,
    requiredPanel,
    desktop,
    midDesktop,
  ],
  ([, , , phase, , panel, isDesktop, isMidDesktop]) => {
    if (phase === "night") return;
    if (isDesktop) {
      emit(
        "request-sidebar-panel",
        isMidDesktop && panel === "players" ? "players" : "discussion",
      );
      return;
    }
    goToPanel(panel);
  },
  { immediate: true },
);
function canSelectPlayer(player) {
  return (
    selectionMode.value === "team" ||
    (selectionMode.value === "invite" && player.id !== room.value.selfId) ||
    (selectionMode.value === "assassinate" &&
      targets.value.some((target) => target.id === player.id))
  );
}
async function choosePlayer(id) {
  if (
    !props.canAct ||
    !room.value.players.some(
      (player) => player.id === id && canSelectPlayer(player),
    )
  )
    return;
  if (selectionMode.value === "assassinate") target.value = id;
  else if (selectionMode.value === "invite") {
    discussionPartner.value = id;
    await run("discussion_partner", { targetId: id });
    if (!room.value.discussion?.partnerId) discussionPartner.value = "";
  }
}
watch([() => room.value.code, () => room.value.stage], () => {
  discussionPartner.value = "";
  selected.value = [];
  target.value = "";
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
    (selectionMode.value === "team" && selected.value.includes(player.id)) ||
    (selectionMode.value === "invite" &&
      discussionPartner.value === player.id) ||
    (selectionMode.value === "assassinate" && target.value === player.id)
      ? "border-primary"
      : {
          evil: "border-error/30",
          good: "border-success/30",
          candidate: "border-warning/30",
        }[tone] || "border-base-300";
  return [background, border];
}

function playQuest(success) {
  if (
    !isQuestMember.value ||
    room.value.self.questSubmitted ||
    !props.canAct ||
    !allowedQuestCards.value.includes(success)
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
  if (!isLeader.value || room.value.phase !== "discussion" || !props.canAct)
    return;
  confirmGameAction(
    t("avalon.discussionTimer.endEarly"),
    t("avalon.discussionTimer.confirmEnd"),
    "begin_team",
  );
}
function endEvilDiscussion() {
  if (
    !canEndEvilDiscussion.value ||
    room.value.phase !== "evil_discussion" ||
    !props.canAct
  )
    return;
  confirmGameAction(
    t("avalon.discussionTimer.endEarly"),
    t("avalon.evilDiscussion.confirmEnd"),
    "end_assassination_discussion",
  );
}
function endCurrentDiscussion() {
  if (room.value.phase === "evil_discussion") endEvilDiscussion();
  else endDiscussion();
}
defineExpose({ endCurrentDiscussion });
function confirmGameAction(title, description, type, payload) {
  const { code, stage } = room.value;
  modal.confirm(title, description, {
    buttonText: title,
    onSubmit: () => {
      if (
        type === "begin_team" &&
        (!isLeader.value || room.value.phase !== "discussion")
      )
        return;
      if (type === "vote" && room.value.self.voted) return;
      if (
        type === "end_assassination_discussion" &&
        (!canEndEvilDiscussion.value || room.value.phase !== "evil_discussion")
      )
        return;
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
