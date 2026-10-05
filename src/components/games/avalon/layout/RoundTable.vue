<template>
  <div
    class="min-w-0"
    :class="
      !['opening', 'night'].includes(room.phase)
        ? 'flex h-full min-h-0 flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] lg:block lg:overflow-visible lg:pb-0'
        : 'space-y-5'
    "
  >
    <section
      v-if="room.phase === 'opening'"
      class="flex min-h-0 flex-1 flex-col overflow-y-auto text-center"
    >
      <div
        class="my-auto flex w-full shrink-0 flex-col items-center gap-4 py-6"
      >
        <h2 class="text-sm text-base-content/60">
          {{ t("avalon.opening.title") }}
        </h2>
        <Avatar
          :src="openingLeader?.avatarUrl || ''"
          :name="playerName(room.openingLeaderId)"
          class="[&>div]:size-20 sm:[&>div]:size-24 [&_i]:text-4xl [&_span]:text-4xl"
        />
        <p
          class="max-w-full break-words font-serif text-2xl font-semibold sm:text-3xl"
        >
          {{ playerName(room.openingLeaderId) }}
          <span
            v-if="room.openingLeaderId === room.selfId"
            class="text-base font-normal text-base-content/50 sm:text-lg"
            >{{ t("games.you") }}</span
          >
        </p>
        <p class="text-sm text-base-content/60">
          {{ t("avalon.opening.hint") }}
        </p>
        <button
          type="button"
          class="btn"
          :disabled="!canAct || room.self.openingConfirmed"
          @click="run('confirm_opening')"
        >
          {{
            t(
              room.self.openingConfirmed
                ? "avalon.opening.confirmed"
                : "avalon.opening.confirm",
            )
          }}
        </button>
        <p role="status" class="text-sm text-base-content/60">
          {{
            t("avalon.opening.progress", {
              n: room.openingCount,
              total: room.players.length,
            })
          }}
        </p>
      </div>
    </section>
    <section v-if="room.phase === 'night'" ref="nightSection" class="card">
      <div
        class="card-body items-center gap-3 px-0 py-2 text-center lg:gap-4 lg:py-4"
      >
        <hgroup class="flex shrink-0 flex-col gap-2 items-center lg:gap-4">
          <div class="flex flex-wrap items-center justify-center gap-2">
            <h2 class="card-title font-serif text-xl sm:text-2xl">
              <i class="ri-moon-clear-line font-normal" aria-hidden="true"></i>
              {{ t("avalon.phases.night") }}
            </h2>
          </div>
          <p class="max-w-lg text-sm text-base-content/70">
            {{ t("avalon.night.invitation") }}
            <button
              type="button"
              class="link link-hover link-primary text-xs"
              @click="reviewConfiguration"
            >
              {{ t("avalon.config.title") }}
              <i class="ri-external-link-line" aria-hidden="true"></i>
            </button>
          </p>
        </hgroup>
        <div
          ref="nightCards"
          class="grid w-full min-w-0 grid-cols-[repeat(var(--night-card-count),minmax(0,1fr))] gap-3"
          :class="nightCardCount === 3 ? 'max-sm:grid-cols-2' : ''"
          :style="{
            '--night-card-count': nightCardCount,
            maxWidth: `${nightCardGridWidth}px`,
          }"
        >
          <IdentityCard
            :class="
              nightCardCount === 3
                ? 'col-start-1 col-span-2 row-start-1 justify-self-center sm:col-start-2 sm:col-span-1'
                : ''
            "
            :self="room.self"
            :game-config="room.gameConfig"
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
          <LoyaltyReply
            inline
            :request="room.self.loyaltyRequest"
            :can-act="canAct"
            :run="run"
          />
        </div>
        <p
          v-if="room.self.loyaltyPending && !room.self.loyaltyRequest"
          role="status"
          class="shrink-0 text-xs text-base-content/60"
        >
          {{ t("avalon.loyalty.wait") }}
        </p>
        <button
          type="button"
          class="btn shrink-0"
          :class="{
            invisible:
              !room.self.role || (!showRole && !room.self.nightConfirmed),
          }"
          :disabled="
            !canAct ||
            !showRole ||
            room.self.nightConfirmed ||
            room.self.loyaltyPending
          "
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
          class="shrink-0 text-sm text-base-content/60"
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
      v-if="!['opening', 'night'].includes(room.phase)"
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
            v-if="!['opening', 'night'].includes(room.phase)"
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
                <template v-else-if="room.phase === 'lady'">
                  <p class="text-sm leading-6">
                    {{
                      t(
                        selectionMode === "lady"
                          ? "avalon.lady.choose"
                          : room.self.loyaltyRequest
                            ? "avalon.loyalty.title"
                            : "avalon.lady.wait",
                        { name: playerName(room.lady.holderId) },
                      )
                    }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'recruit'">
                  <p class="text-sm leading-6">
                    {{
                      t(
                        room.self.role === "assassin"
                          ? "avalon.untrustworthy.hintSelf"
                          : "avalon.untrustworthy.hintWait",
                      )
                    }}
                  </p>
                </template>
                <template v-else-if="room.phase === 'assassinate'">
                  <p class="text-sm leading-6">
                    {{
                      t(
                        canAssassinate
                          ? "avalon.assassinateHintSelf"
                          : "avalon.assassinateHint",
                      )
                    }}
                  </p>
                  <p
                    v-if="!canAssassinate"
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
            v-if="!['opening', 'night'].includes(room.phase)"
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
                v-if="
                  room.game > 0 &&
                  !['lobby', 'opening', 'night'].includes(room.phase)
                "
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
                v-if="
                  !['opening', 'night'].includes(room.phase) && room.self.role
                "
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
                  :game-config="room.gameConfig"
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
                  :game-config="room.gameConfig"
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
            v-if="!['opening', 'night'].includes(room.phase)"
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
                  v-else-if="
                    ['assassinate', 'recruit', 'lady'].includes(selectionMode)
                  "
                  role="status"
                  class="flex shrink-0 items-start gap-1.5 border-l-2 border-info pl-2 text-xs leading-5 text-base-content/80 lg:hidden"
                >
                  <i
                    class="ri-information-line shrink-0 text-info"
                    aria-hidden="true"
                  ></i>
                  <span class="min-w-0">{{
                    t(
                      selectionMode === "lady"
                        ? "avalon.lady.choose"
                        : `avalon.mobileHints.${selectionMode}`,
                    )
                  }}</span>
                </div>
                <LoyaltyReply
                  v-if="room.phase === 'lady'"
                  popover
                  :request="room.self.loyaltyRequest"
                  :can-act="canAct"
                  :run="run"
                />
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
                              : knowledge[player.id]?.tone === 'evil'
                                ? 'border-error/40'
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
                        class="mt-1 flex flex-wrap items-center gap-1 text-xs text-base-content/60"
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
                          v-if="
                            knowledge[player.id] &&
                            !(
                              loyaltyReports[player.id] &&
                              [
                                'avalon.loyalty.reportedGood',
                                'avalon.loyalty.reportedEvil',
                              ].includes(knowledge[player.id].label)
                            )
                          "
                          class="inline-flex items-center gap-1"
                          :class="
                            knowledge[player.id].tone === 'evil'
                              ? 'text-error'
                              : knowledge[player.id].tone === 'good'
                                ? ''
                                : 'text-warning'
                          "
                        >
                          <i
                            :class="knowledge[player.id].icon"
                            aria-hidden="true"
                          ></i>
                          {{ t(knowledge[player.id].label) }}
                        </span>
                        <span
                          v-else-if="!knowledge[player.id]"
                          class="inline-flex items-center gap-1"
                        >
                          <i class="ri-question-line" aria-hidden="true"></i>
                          {{ t("avalon.knowledge.unknown") }}
                        </span>
                        <button
                          v-if="loyaltyReports[player.id]"
                          type="button"
                          class="badge badge-ghost badge-xs gap-1"
                          :aria-label="
                            t('avalon.loyalty.result', {
                              name: player.nickname,
                              side: t(
                                `avalon.night.${loyaltyReports[player.id].alignment}`,
                              ),
                            })
                          "
                          @click="showLoyaltyResult(loyaltyReports[player.id])"
                        >
                          <i class="ri-eye-line" aria-hidden="true"></i>
                          {{
                            t(
                              loyaltyReports[player.id].alignment === "good"
                                ? "avalon.loyalty.reportedGood"
                                : "avalon.loyalty.reportedEvil",
                            )
                          }}
                        </button>
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
                        <button
                          v-if="room.lady?.holderId === player.id"
                          type="button"
                          class="badge badge-ghost badge-xs h-auto min-h-5 gap-1"
                          :aria-label="
                            t('avalon.config.viewRole', {
                              name: t('avalon.lady.title'),
                            })
                          "
                          @click="skillPopover?.open()"
                        >
                          <img
                            :src="SKILL_CARDS.lady.image"
                            alt=""
                            class="size-4 shrink-0 rounded-full object-cover object-top"
                          />
                          {{ t("avalon.lady.holder") }}
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
                  v-if="selectionMode === 'lady'"
                  type="button"
                  class="btn shrink-0"
                  :disabled="!canAct || !target"
                  @click="inspectLoyalty"
                >
                  {{ t("avalon.lady.inspect") }}
                </button>
                <button
                  v-if="['assassinate', 'recruit'].includes(selectionMode)"
                  type="button"
                  class="btn shrink-0"
                  :disabled="!canAct || !target"
                  @click="assassinate"
                >
                  {{
                    t(
                      selectionMode === "recruit"
                        ? "avalon.untrustworthy.recruit"
                        : "avalon.assassinate",
                    )
                  }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </Teleport>
    </div>

    <NotesMenu ref="notesMenu" :room="room" :marks="marks" @mark="markPlayer" />
    <div
      v-if="!['opening', 'night'].includes(room.phase) && !desktop"
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
      v-if="!['opening', 'night'].includes(room.phase) && !desktop"
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
    <RolePreviewPopover ref="skillPopover" skill="lady" />
    <RolePreviewPopover
      ref="loyaltyPopover"
      :dialog-label="
        t(
          loyaltyResult?.source === 'cleric'
            ? 'avalon.opening.title'
            : 'avalon.lady.title',
        )
      "
      :close-on-card-click="false"
      @closed="loyaltyResult = null"
    >
      <LoyaltyReply
        v-if="loyaltyResult"
        preview
        :result="loyaltyResult"
        :game-config="room.gameConfig"
        :player-name="playerName"
        :run="run"
        @dismiss="loyaltyPopover?.close()"
      />
    </RolePreviewPopover>
    <RolePreviewPopover
      ref="switchPopover"
      allegiance-switch
      :self="switchSelf"
      :switch-from-alignment="switchFromAlignment"
      :face-up="switchFaceUp"
      @closed="finishSwitchPresentation"
    />
    <MobileDock
      v-if="!['opening', 'night'].includes(room.phase)"
      :items="dockItems"
      :panel="mobilePanel"
      :panel-id="mobilePanelId"
      :label="t('avalon.mobile.navigation')"
      @select-panel="goToPanel"
    />
  </div>
</template>
<script setup>
import { computed, h, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import { useMediaQuery, useResizeObserver, useWindowSize } from "@vueuse/core";
import { useModal } from "@/composables/useModal";
import {
  selfAlignment,
  roleAlignment,
  ladyTargetIds,
  LANCELOTS,
} from "../../../../../shared/games/avalon/index.js";
import { useToast } from "@/composables/useToast";
import MobileDock from "../../layout/MobileDock.vue";
import IdentityCard from "../display/IdentityCard.vue";
import LoyaltyReply from "../interaction/LoyaltyReply.vue";
import RolePreviewPopover from "../interaction/RolePreviewPopover.vue";
import Avatar from "@/components/auth/Avatar.vue";
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
  possibleRoles,
  ROLE_ICONS,
  SKILL_CARDS,
  roleImage,
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
const skillPopover = ref(null);
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
const openingLeader = computed(() =>
  room.value.players.find((player) => player.id === room.value.openingLeaderId),
);
const nightCardCount = computed(
  () => 1 + (room.value.self.loyaltyRequest?.choices.length ?? 0),
);
const nightSection = ref(null);
const nightCards = ref(null);
const nightCardSpace = ref(null);
const nightCardGap = ref(12);
const narrowNight = useMediaQuery("(max-width: 639px)");
const { height: viewportHeight } = useWindowSize();
const nightCardGridWidth = computed(() => {
  const height =
    nightCardSpace.value ?? Math.max(120, viewportHeight.value - 260);
  if (narrowNight.value && nightCardCount.value === 3)
    return Math.max(1, ((height - nightCardGap.value / 4) * 4) / 9);
  return (
    Math.min(320, (height * 2) / 3) * nightCardCount.value +
    nightCardGap.value * (nightCardCount.value - 1)
  );
});
function fitNightCards() {
  const section = nightSection.value;
  const cards = nightCards.value;
  const main = section?.closest("main");
  if (!section || !cards || !main) return;
  const sectionBounds = section.getBoundingClientRect();
  const cardBounds = cards.getBoundingClientRect();
  const beforeCards = cardBounds.top - main.getBoundingClientRect().top;
  const afterCards =
    sectionBounds.bottom -
    cardBounds.bottom +
    (parseFloat(getComputedStyle(main).paddingBottom) || 0);
  nightCardGap.value = parseFloat(getComputedStyle(cards).rowGap) || 0;
  nightCardSpace.value = Math.max(
    1,
    Math.floor(viewportHeight.value - beforeCards - afterCards),
  );
}
useResizeObserver(
  [
    nightSection,
    nightCards,
    computed(() => nightSection.value?.closest("main")),
  ],
  fitNightCards,
);
watch(
  [viewportHeight, narrowNight, nightCardCount, () => room.value.phase],
  () => {
    void nextTick(fitNightCards);
  },
  { flush: "post" },
);
const run = (...args) => props.run(...args);
const lancelotStatus = computed(() => {
  const self = room.value.self;
  if (self.lancelotMode !== "switching" || !LANCELOTS.includes(self.role))
    return null;
  const count = (self.lancelotDraws ?? []).filter(
    (entry) => entry.switched,
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
let recruitmentModal = null;
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
let pendingLoyaltyResult = null;
const loyaltyPopover = ref(null);
const loyaltyResult = ref(null);

async function showLoyaltyResult(entry) {
  loyaltyResult.value = entry;
  await loyaltyPopover.value?.open();
}

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
  pendingLoyaltyResult = null;
  loyaltyPopover.value?.close();
  loyaltyResult.value = null;
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
    const showLoyalty = pendingLoyaltyResult;
    pendingLoyaltyResult = null;
    showLoyalty?.();
  }, 300);
}

async function presentLancelotSwitch() {
  if (!LANCELOTS.includes(room.value.self.role)) return;
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
  switchFlipTimer = window.setTimeout(() => {
    switchFaceUp.value = true;
  }, 1000);
  switchCloseTimer = window.setTimeout(() => {
    switchPopover.value?.close();
  }, 4400);
}

watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.selfId,
    () => room.value.self.lancelotDraws ?? [],
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
    // Private draw snapshots are never replayed on a reconnect.
    if (history.slice(previous[3].length).some((entry) => entry.switched)) {
      void presentLancelotSwitch();
    } else if (history.length > previous[3].length) {
      toast.info(t("avalon.lancelot.privateStay"));
    }
  },
  { immediate: true },
);
watch(
  [
    () => room.value.code,
    () => room.value.game,
    () => room.value.self.loyaltyObservations ?? [],
  ],
  ([code, game, observations], previous) => {
    if (
      !previous ||
      code !== previous[0] ||
      game !== previous[1] ||
      observations.length <= previous[2].length
    )
      return;
    const entry = observations.at(-1);
    if (!["lady", "cleric"].includes(entry.source)) return;
    const showResult = () => {
      void showLoyaltyResult(entry);
    };
    if (switchPresenting) pendingLoyaltyResult = showResult;
    else showResult();
  },
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
          ? [
              t(
                room.value.gameConfig?.specialRoles?.includes(
                  "untrustworthy_servant",
                )
                  ? "avalon.untrustworthy.endgameHint"
                  : "avalon.questResult.assassination",
              ),
            ]
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
watch(
  [() => room.value.code, () => room.value.game, () => room.value.history],
  ([code, game, history], previous) => {
    if (!previous || code !== previous[0] || game !== previous[1]) {
      recruitmentModal?.close();
      recruitmentModal = null;
      return;
    }
    const result = history
      .slice(previous[2].length)
      .find((entry) => entry.type === "recruit");
    if (!result) return;
    questResultModal?.close();
    recruitmentModal?.close();
    recruitmentModal = modal.info(
      t("avalon.untrustworthy.recruit"),
      t(
        result.success
          ? "avalon.untrustworthy.success"
          : "avalon.untrustworthy.failure",
        { name: playerName(result.targetId) },
      ),
    );
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  resetSwitchPresentation();
  configurationModal?.close();
  questResultModal?.close();
  voteResultModal?.close();
  recruitmentModal?.close();
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
const loyaltyReports = computed(() =>
  Object.fromEntries([
    ...Object.entries(room.value.self.knownLoyalties ?? {}).map(
      ([targetId, alignment]) => [
        targetId,
        { targetId, alignment, source: "cleric", quest: 0 },
      ],
    ),
    ...(room.value.self.loyaltyObservations ?? [])
      .filter((entry) => ["lady", "cleric"].includes(entry.source))
      .map((entry) => [entry.targetId, entry]),
  ]),
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
      (room.value.phase === "recruit"
        ? possibleRoles(room.value, p.id).includes("untrustworthy_servant")
        : playerAlignment(room.value, p.id) !== "evil"),
  ),
);
const canAssassinate = computed(
  () =>
    room.value.phase === "assassinate" &&
    (room.value.assassinationActorId
      ? room.value.assassinationActorId === room.value.selfId
      : room.value.self.role === "assassin"),
);
const selectionMode = computed(() => {
  if (
    room.value.phase === "lady" &&
    room.value.lady?.holderId === room.value.selfId &&
    !room.value.lady.targetId
  )
    return "lady";
  if (room.value.phase === "team" && isLeader.value) return "team";
  if (
    room.value.phase === "discussion" &&
    isLeader.value &&
    room.value.discussion?.mode === "fast" &&
    !room.value.discussion.partnerId
  )
    return "invite";
  if (room.value.phase === "recruit" && room.value.self.role === "assassin")
    return "recruit";
  if (canAssassinate.value) return "assassinate";
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
    case "lady":
      return {
        text: t("avalon.lady.title"),
        tone:
          selectionMode.value === "lady" || room.value.self.loyaltyRequest
            ? "badge-info"
            : "badge-ghost",
      };
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
    case "recruit":
      return state.self.role === "assassin"
        ? status(
            target.value ? "recruitConfirm" : "recruitSelf",
            "badge-primary",
          )
        : status("recruitWait");
    case "assassinate":
      return canAssassinate.value
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
  if (selectionMode.value || room.value.self.loyaltyRequest) return "players";
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
    if (["opening", "night"].includes(phase)) return;
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
  if (selectionMode.value === "lady")
    return ladyTargetIds(room.value.players, room.value.lady).includes(
      player.id,
    );
  return (
    selectionMode.value === "team" ||
    (selectionMode.value === "invite" && player.id !== room.value.selfId) ||
    (["assassinate", "recruit"].includes(selectionMode.value) &&
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
  if (["assassinate", "recruit", "lady"].includes(selectionMode.value))
    target.value = id;
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
    { evil: "bg-error/5", candidate: "bg-warning/5" }[tone] || "";
  const border =
    (selectionMode.value === "team" && selected.value.includes(player.id)) ||
    (selectionMode.value === "invite" &&
      discussionPartner.value === player.id) ||
    (["assassinate", "recruit", "lady"].includes(selectionMode.value) &&
      target.value === player.id)
      ? "border-primary"
      : {
          evil: "border-error/30",
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
function inspectLoyalty() {
  if (selectionMode.value !== "lady" || !target.value) return;
  confirmGameAction(
    t("avalon.lady.inspect"),
    t("avalon.lady.confirm", { name: playerName(target.value) }),
    "lady",
    { targetId: target.value },
  );
}
function assassinate() {
  const targetId = target.value;
  const recruiting = room.value.phase === "recruit";
  confirmGameAction(
    t(recruiting ? "avalon.untrustworthy.recruit" : "avalon.assassinate"),
    t(recruiting ? "avalon.untrustworthy.confirm" : "avalon.confirmTarget", {
      name: playerName(targetId),
    }),
    recruiting ? "recruit" : "assassinate",
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
