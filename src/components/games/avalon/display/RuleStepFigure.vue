<template>
  <figure
    class="rule-step-figure relative mx-auto flex h-44 w-full max-w-80 items-center justify-center overflow-hidden rounded-box border border-base-300 bg-base-200/60"
    aria-hidden="true"
    @animationiteration="onCycleComplete"
  >
    <template v-if="step === 'night'">
      <div
        class="grid w-fit max-w-[calc(100%-1.5rem)] min-w-0 grid-cols-[5rem_minmax(0,max-content)] items-center gap-3"
      >
        <div class="demo-flip-scene night-card-scene">
          <div class="demo-flip night-flip flow-cycle">
            <img
              class="demo-face"
              v-bind="getImageAttrs('/assets/images/games/avalon/card.webp', '96px')"
              alt=""
            />
            <div class="demo-face demo-face-front overflow-hidden">
              <img
                v-bind="getImageAttrs('/assets/images/games/avalon/merlin.webp', '96px')"
                alt=""
                class="h-full w-full object-cover object-[center_20%]"
              />
              <span
                class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/95 to-transparent px-1 pb-2 pt-5 text-xs text-white"
              >
                <i class="ri-checkbox-circle-fill text-success"></i>
                {{ t("avalon.roles.merlin") }}
              </span>
            </div>
          </div>
        </div>
        <div class="night-vision min-w-0 space-y-2 text-left text-xs leading-4">
          <p class="font-semibold">
            <i class="ri-eye-line"></i>
            {{ t("avalon.night.visionTitle") }}
          </p>
          <div class="space-y-1.5">
            <p class="text-error">{{ t("avalon.knowledge.evil") }}</p>
            <div
              v-for="name in ['Wishwa', 'Damsara']"
              :key="name"
              class="flex min-w-0 items-center gap-2"
            >
              <span class="avatar avatar-placeholder">
                <span
                  class="flex size-7 items-center justify-center rounded-full border border-error/40 bg-error/10 text-error"
                >
                  <i class="ri-user-line"></i>
                </span>
              </span>
              <span class="min-w-0 truncate">{{ name }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="step === 'discussion'">
      <div class="min-w-0 w-full px-4">
        <div class="chat chat-start discussion-first">
          <div
            class="chat-bubble chat-bubble-success min-h-0 max-w-full px-3 py-2 text-xs leading-4"
          >
            {{ t("avalon.phrases.items.take_me") }}
          </div>
        </div>
        <div class="chat chat-end discussion-second">
          <div
            class="chat-bubble min-h-0 max-w-full px-3 py-2 text-xs leading-4"
          >
            {{ t("avalon.phrases.items.support") }}
          </div>
        </div>
        <div class="demo-timer mt-3"><span class="flow-cycle"></span></div>
      </div>
    </template>

    <template v-else-if="step === 'team'">
      <div class="flex gap-4">
        <div
          v-for="player in 3"
          :key="player"
          class="relative flex flex-col items-center gap-2"
        >
          <span class="avatar avatar-placeholder">
            <span
              class="flex size-12 items-center justify-center rounded-full border border-base-300 bg-base-100"
            >
              <i class="ri-user-line text-xl"></i>
            </span>
          </span>
          <i
            class="team-check ri-checkbox-circle-fill text-xl text-success"
            :class="player === 3 ? 'flow-cycle' : ''"
            :style="{ '--player-order': player }"
          ></i>
        </div>
      </div>
      <i
        class="team-submit ri-send-plane-2-line absolute bottom-4 right-5 text-xl text-success"
      ></i>
    </template>

    <template v-else-if="step === 'vote' || step === 'quest'">
      <div
        class="demo-drop absolute bottom-4 left-1/2 flex h-12 w-24 -translate-x-1/2 items-center justify-center rounded-box border border-dashed border-base-content/30"
      >
        <i class="ri-drag-move-2-line text-lg text-base-content/40"></i>
      </div>
      <span
        class="demo-play-card demo-play-good card card-border flex items-center justify-center border-success/50 bg-base-100 text-success"
        :class="step === 'quest' ? 'quest-execute' : 'vote-approve'"
      >
        <i
          :class="
            step === 'quest' ? 'ri-shield-check-line' : 'ri-thumb-up-line'
          "
          class="text-2xl"
        ></i>
      </span>
      <span
        class="demo-play-card demo-play-evil card card-border flex items-center justify-center border-error/50 bg-base-100 text-error"
        :class="step === 'quest' ? 'quest-sabotage flow-cycle' : ''"
      >
        <i
          :class="step === 'quest' ? 'ri-sword-line' : 'ri-thumb-down-line'"
          class="text-2xl"
        ></i>
      </span>
      <i
        v-if="step === 'vote'"
        class="vote-receipt flow-cycle ri-checkbox-circle-fill absolute bottom-7 left-[calc(50%+3.5rem)] text-xl text-success"
      ></i>
    </template>

    <template v-else-if="step === 'evilDiscussion'">
      <div
        class="absolute left-1/2 top-3 flex -translate-x-1/2 gap-2 text-success"
      >
        <i
          v-for="quest in 3"
          :key="quest"
          class="ri-checkbox-circle-fill text-lg"
        ></i>
      </div>
      <div class="flex w-full min-w-0 items-center gap-3 px-4 pt-5">
        <img
          v-bind="getImageAttrs('/assets/images/games/avalon/assassin.webp', '96px')"
          alt=""
          class="h-24 w-16 shrink-0 rounded-box object-cover object-[center_15%]"
        />
        <div class="min-w-0 flex-1">
          <div class="chat chat-start discussion-first">
            <div
              class="chat-bubble min-h-0 max-w-full px-2 py-1 text-xs leading-4"
            >
              {{
                t("avalon.phrases.items.claim", {
                  role: t("avalon.roles.merlin"),
                })
              }}
            </div>
          </div>
          <div class="chat chat-end discussion-second">
            <div
              class="chat-bubble min-h-0 max-w-full px-2 py-1 text-xs leading-4"
            >
              {{ t("avalon.phrases.items.claim_unproven") }}
            </div>
          </div>
          <div class="demo-timer mt-2"><span class="flow-cycle"></span></div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="grid w-fit max-w-[calc(100%-1.5rem)] min-w-0 grid-cols-[minmax(0,5rem)_1.25rem_minmax(0,5rem)] items-center gap-3"
      >
        <div
          class="relative aspect-[2/3] w-full max-w-20 justify-self-center overflow-hidden rounded-box"
        >
          <img
            v-bind="getImageAttrs('/assets/images/games/avalon/assassin.webp', '96px')"
            alt=""
            class="h-full w-full object-cover object-[center_15%]"
          />
          <span
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 pb-2 pt-5 text-center text-xs leading-4 text-white"
            >{{ t("avalon.roles.assassin") }}</span
          >
        </div>
        <i class="assassin-strike ri-sword-line text-xl text-error"></i>
        <div class="relative aspect-[2/3] w-full max-w-20 justify-self-center">
          <div
            v-for="outcome in assassinationOutcomes"
            :key="outcome.role"
            class="assassination-case absolute inset-0"
            :class="
              outcome.winner === 'evil'
                ? 'assassination-hit flow-cycle'
                : 'assassination-miss'
            "
          >
            <div class="demo-flip-scene target-card-scene">
              <div class="demo-flip target-flip">
                <img
                  class="demo-face"
                  v-bind="getImageAttrs('/assets/images/games/avalon/card.webp', '96px')"
                  alt=""
                />
                <div class="demo-face demo-face-front overflow-hidden">
                  <img
                    v-bind="getImageAttrs(`/assets/images/games/avalon/${outcome.role}.webp`, '96px')"
                    alt=""
                    class="h-full w-full object-cover object-[center_20%]"
                  />
                  <span
                    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 pb-2 pt-5 text-center text-xs leading-4 text-white"
                  >
                    {{ t(`avalon.roles.${outcome.role}`) }}
                  </span>
                </div>
              </div>
              <i
                class="assassin-target ri-crosshair-2-line absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-error"
              ></i>
            </div>
          </div>
        </div>
        <div
          class="col-span-3 grid min-h-4 w-full place-items-center text-center text-xs font-semibold leading-4"
        >
          <p
            v-for="outcome in assassinationOutcomes"
            :key="outcome.winner"
            class="assassination-case col-start-1 row-start-1"
            :class="
              outcome.winner === 'evil'
                ? 'assassination-hit text-error'
                : 'assassination-miss text-success'
            "
          >
            <span class="winner-reveal inline-block">
              <i class="ri-trophy-line"></i>
              {{ t(`avalon.winners.${outcome.winner}`) }}
            </span>
          </p>
        </div>
      </div>
    </template>
  </figure>
</template>

<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { useLocale } from "@/i18n";
const props = defineProps({ step: { type: String, required: true } });
const emit = defineEmits(["cycle-complete"]);
const { t } = useLocale();
function onCycleComplete(event) {
  if (event.target.classList?.contains("flow-cycle")) {
    emit("cycle-complete", props.step);
  }
}
const assassinationOutcomes = [
  { role: "merlin", winner: "evil" },
  { role: "servant", winner: "good" },
];
</script>

<style scoped>
.demo-flip-scene {
  perspective: 600px;
}
.night-card-scene {
  width: 5rem;
  height: 7.5rem;
}
.target-card-scene {
  position: relative;
  width: 100%;
  height: 100%;
}
.assassination-miss {
  visibility: hidden;
}
.demo-flip {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}
.demo-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  border-radius: var(--radius-box);
  backface-visibility: hidden;
}
.demo-face-front {
  transform: rotateY(180deg);
}
.demo-timer {
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--radius-box);
  background: var(--color-base-300);
}
.demo-timer > span {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transform-origin: left;
}
.demo-play-card {
  position: absolute;
  top: 1rem;
  width: 3rem;
  height: 4.5rem;
}
.demo-play-good {
  left: calc(50% - 4rem);
}
.demo-play-evil {
  left: calc(50% + 1rem);
}

@media (prefers-reduced-motion: no-preference) {
  .night-flip {
    animation: identity-flip 5s ease-in-out infinite;
  }
  .night-vision {
    animation: identity-confirm 5s ease infinite;
  }
  .discussion-first {
    animation: speech-left 4s ease infinite;
  }
  .discussion-second {
    animation: speech-right 4s ease infinite;
  }
  .demo-timer > span {
    animation: discussion-clock 4s linear infinite;
  }
  .team-check {
    animation: select-player 5s ease infinite;
    animation-delay: calc((var(--player-order) - 1) * 0.35s);
  }
  .team-submit {
    animation: submit-team 5s ease infinite;
  }
  .vote-approve {
    animation: submit-approval 5s ease-in-out infinite;
  }
  .vote-receipt {
    animation: approval-received 5s ease infinite;
  }
  .quest-execute {
    animation: execute-quest 6s ease-in-out infinite;
  }
  .quest-sabotage {
    animation: sabotage-quest 6s ease-in-out infinite;
  }
  .assassination-hit {
    animation: assassination-hit 12s step-end infinite;
  }
  .assassination-miss {
    animation: assassination-miss 12s step-end infinite;
  }
  .assassin-strike {
    animation: assassin-strike 6s ease infinite;
  }
  .assassin-target {
    animation: select-target 6s ease infinite;
  }
  .target-flip {
    animation: reveal-target 6s ease-in-out infinite;
  }
  .winner-reveal {
    animation: reveal-winner 6s ease infinite;
  }
}

@keyframes identity-flip {
  0%,
  15%,
  100% {
    transform: rotateY(0);
  }
  35%,
  80% {
    transform: rotateY(180deg);
  }
}
@keyframes identity-confirm {
  0%,
  35%,
  95%,
  100% {
    opacity: 0;
    scale: 0.7;
  }
  45%,
  80% {
    opacity: 1;
    scale: 1;
  }
}
@keyframes speech-left {
  0%,
  5%,
  95%,
  100% {
    opacity: 0;
    transform: translateX(-0.75rem);
  }
  20%,
  80% {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes speech-right {
  0%,
  30%,
  95%,
  100% {
    opacity: 0;
    transform: translateX(0.75rem);
  }
  45%,
  80% {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes discussion-clock {
  0%,
  5% {
    transform: scaleX(1);
  }
  90%,
  100% {
    transform: scaleX(0);
  }
}
@keyframes select-player {
  0%,
  10%,
  90%,
  100% {
    opacity: 0.2;
    scale: 0.8;
  }
  25%,
  75% {
    opacity: 1;
    scale: 1;
  }
}
@keyframes submit-team {
  0%,
  45%,
  90%,
  100% {
    opacity: 0;
    transform: translateX(-0.5rem);
  }
  55%,
  75% {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes submit-approval {
  0%,
  10%,
  100% {
    opacity: 1;
    transform: translate(0, 0) rotate(-5deg);
  }
  40%,
  60% {
    opacity: 1;
    transform: translate(2.5rem, 5rem) rotate(0);
  }
  70%,
  95% {
    opacity: 0;
    transform: translate(2.5rem, 5rem);
  }
}
@keyframes approval-received {
  0%,
  55%,
  100% {
    opacity: 0;
    scale: 0.7;
  }
  70%,
  90% {
    opacity: 1;
    scale: 1;
  }
}
@keyframes execute-quest {
  0%,
  10%,
  100% {
    opacity: 1;
    transform: translate(0, 0) rotate(-5deg);
  }
  30%,
  40% {
    opacity: 1;
    transform: translate(2.5rem, 5rem) rotate(0);
  }
  50%,
  95% {
    opacity: 0;
    transform: translate(2.5rem, 5rem);
  }
}
@keyframes sabotage-quest {
  0%,
  45%,
  100% {
    opacity: 1;
    transform: translate(0, 0) rotate(5deg);
  }
  70%,
  80% {
    opacity: 1;
    transform: translate(-2.5rem, 5rem) rotate(0);
  }
  90%,
  95% {
    opacity: 0;
    transform: translate(-2.5rem, 5rem);
  }
}
@keyframes select-target {
  0% {
    opacity: 0;
    margin-left: -3rem;
  }
  15%,
  30% {
    opacity: 1;
    margin-left: 0;
  }
  45%,
  100% {
    opacity: 0;
    margin-left: 0;
  }
}
@keyframes reveal-target {
  0%,
  30%,
  100% {
    transform: rotateY(0);
  }
  50%,
  85% {
    transform: rotateY(180deg);
  }
}
@keyframes reveal-winner {
  0%,
  50%,
  100% {
    opacity: 0;
    scale: 0.7;
  }
  65%,
  85% {
    opacity: 1;
    scale: 1;
  }
}
@keyframes assassination-hit {
  0%,
  100% {
    visibility: visible;
  }
  50% {
    visibility: hidden;
  }
}
@keyframes assassination-miss {
  0%,
  100% {
    visibility: hidden;
  }
  50% {
    visibility: visible;
  }
}
@keyframes assassin-strike {
  0%,
  5%,
  45%,
  100% {
    opacity: 0.3;
    transform: translateX(-0.5rem);
  }
  15%,
  30% {
    opacity: 1;
    transform: translateX(0.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .night-flip,
  .target-flip {
    transform: rotateY(180deg);
  }
  .assassin-target,
  .vote-receipt {
    display: none;
  }
}
</style>
