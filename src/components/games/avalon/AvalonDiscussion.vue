<template>
  <section class="card">
    <div class="card-body gap-4 p-0">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="card-title font-serif">
          <i class="ri-user-voice-line font-normal" aria-hidden="true"></i>
          {{ t("avalon.phrases.title") }}
        </h2>
        <span class="text-xs text-base-content/50">{{
          t("avalon.phrases.limit", { n: MESSAGE_LIMIT })
        }}</span>
      </div>
      <slot name="discussion-timer"></slot>
      <div class="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
        <div class="flex min-w-0 flex-col gap-3">
          <div
            ref="log"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            :aria-label="t('avalon.phrases.title')"
            class="max-h-60 overflow-y-auto overscroll-contain scrollbar-thin sm:max-h-80 lg:max-h-128"
            @scroll="trackScroll"
          >
            <div
              v-if="!messages.length"
              class="py-5 text-center text-sm text-base-content/50"
            >
              {{ t("avalon.phrases.empty") }}
            </div>
            <div
              v-for="message in messages"
              :key="message.id"
              class="chat"
              :class="
                message.playerId === room.selfId ? 'chat-end' : 'chat-start'
              "
            >
              <div class="chat-header text-xs text-base-content/60">
                {{ message.nickname
                }}<time class="ml-2 opacity-60">{{
                  messageTime(message.at)
                }}</time>
              </div>
              <div
                class="chat-bubble min-h-0 wrap-break-word text-sm"
                :class="
                  message.playerId === room.selfId ? 'chat-bubble-primary' : ''
                "
              >
                {{ messageText(message) }}
              </div>
            </div>
          </div>
          <button
            v-if="unread"
            type="button"
            class="btn btn-ghost btn-xs self-center"
            @click="scrollToLatest"
          >
            <i class="ri-arrow-down-line" aria-hidden="true"></i
            >{{ t("avalon.phrases.unread", { n: unread }) }}
          </button>
        </div>
        <div class="min-w-0 space-y-4">
          <div
            role="tablist"
            :aria-label="t('avalon.phrases.categoriesLabel')"
            class="tabs tabs-border tabs-sm max-w-full flex-nowrap justify-center overflow-x-auto overscroll-x-contain scrollbar-thin"
          >
            <button
              v-for="group in PHRASE_GROUPS"
              :id="`${panelId}-${group.id}`"
              :key="group.id"
              type="button"
              role="tab"
              class="tab shrink-0 flex-nowrap gap-1 whitespace-nowrap"
              :class="category === group.id ? 'tab-active' : ''"
              :aria-selected="category === group.id"
              :aria-controls="panelId"
              :tabindex="category === group.id ? 0 : -1"
              @click="
                selectCategory(group.id);
                revealTab($event.currentTarget);
              "
              @keydown="navigateTabs(group.id, $event)"
            >
              <i :class="group.icon" aria-hidden="true"></i
              >{{ t(`avalon.phrases.categories.${group.id}`) }}
            </button>
          </div>
          <div>
            <div class="flex min-w-0 flex-wrap items-end gap-2">
              <fieldset
                v-if="selected.player"
                class="fieldset min-w-0 flex-1 basis-40"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.target") }}
                </legend>
                <select v-model="targetId" class="select w-full">
                  <option
                    v-for="player in room.players"
                    :key="player.id"
                    :value="player.id"
                  >
                    {{ player.nickname }}
                  </option>
                </select>
              </fieldset>

              <fieldset
                v-if="selected.role"
                class="fieldset min-w-0 flex-1 basis-40"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.role") }}
                </legend>
                <select v-model="role" class="select w-full">
                  <option v-for="option in roles" :key="option" :value="option">
                    {{ t(`avalon.roles.${option}`) }}
                  </option>
                </select>
              </fieldset>

              <fieldset
                v-if="selected.quest"
                class="fieldset min-w-0 flex-1 basis-40"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.quest") }}
                </legend>
                <select v-model.number="quest" class="select w-full">
                  <option
                    v-for="number in room.questIndex + 1"
                    :key="number"
                    :value="number"
                  >
                    {{ t("avalon.questNumber", { n: number }) }}
                  </option>
                </select>
              </fieldset>

              <fieldset
                class="fieldset min-w-0 basis-full sm:flex-1 sm:basis-auto"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.preview") }}
                </legend>

                <div class="flex min-w-0 gap-2">
                  <div class="input min-w-0 flex-1">
                    <span class="block min-w-0 truncate">
                      {{ preview(selected) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="btn shrink-0 max-sm:btn-square"
                    :disabled="!canAct || cooling"
                    @click="send"
                  >
                    <i class="ri-send-ins-line" aria-hidden="true"></i>
                    <span class="hidden sm:block">
                      {{
                        t(
                          cooling
                            ? "avalon.phrases.cooldown"
                            : "avalon.phrases.send",
                        )
                      }}
                    </span>
                  </button>
                </div>
              </fieldset>
            </div>

            <span class="text-base-content/50 text-xs leading-5">
              {{ t("avalon.phrases.hint") }}
            </span>
          </div>
          <div
            :id="panelId"
            role="tabpanel"
            :aria-labelledby="`${panelId}-${category}`"
            class="grid gap-2 sm:grid-cols-2"
          >
            <button
              v-for="phrase in currentGroup.phrases"
              :key="phrase.id"
              type="button"
              class="btn btn-sm h-auto min-h-9 min-w-0 justify-start py-2 text-left font-normal"
              :class="selectedId === phrase.id ? 'btn-active' : 'btn-ghost'"
              :aria-pressed="selectedId === phrase.id"
              @click="selectedId = phrase.id"
            >
              {{ preview(phrase) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import {
  DEFAULT_SPECIAL_ROLES,
  roleRoster,
} from "../../../../shared/games/avalon.js";
import {
  findPhrase,
  PHRASE_GROUPS,
} from "../../../../shared/games/avalon-phrases.js";
import {
  MESSAGE_COOLDOWN,
  MESSAGE_LIMIT,
} from "../../../../shared/games/messages.js";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  active: { type: Boolean, default: true },
  run: { type: Function, required: true },
});
const { t, locale } = useLocale();
const panelId = `phrase-panel-${useId()}`;
const category = ref(PHRASE_GROUPS[0].id);
const selectedId = ref(PHRASE_GROUPS[0].phrases[0].id);
const targetId = ref("");
const role = ref("servant");
const quest = ref(1);
const log = ref(null);
const unread = ref(0);
const atBottom = ref(true);
const cooling = ref(false);
let cooldownTimer = null;
const currentGroup = computed(() =>
  PHRASE_GROUPS.find((group) => group.id === category.value),
);
const selected = computed(() => findPhrase(selectedId.value));
const roles = computed(() => [
  ...new Set(
    roleRoster(
      props.room.participants.length,
      props.room.gameConfig?.specialRoles ?? DEFAULT_SPECIAL_ROLES,
    ).roles,
  ),
]);
const messages = computed(() =>
  (props.room.messages ?? []).filter((message) => findPhrase(message.phraseId)),
);
function preview(phrase) {
  return t(`avalon.phrases.items.${phrase.id}`, {
    name:
      props.room.players.find((player) => player.id === targetId.value)
        ?.nickname ?? t("avalon.phrases.target"),
    role: t(`avalon.roles.${role.value}`),
    quest: quest.value,
  });
}
function messageText(message) {
  return t(`avalon.phrases.items.${message.phraseId}`, {
    ...message.params,
    ...(message.params.role
      ? { role: t(`avalon.roles.${message.params.role}`) }
      : {}),
  });
}
function messageTime(at) {
  return new Intl.DateTimeFormat(locale.value, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}
function selectCategory(id) {
  category.value = id;
  selectedId.value = currentGroup.value.phrases[0].id;
}
function revealTab(tab) {
  const parent = tab.parentElement;
  const left =
    tab.getBoundingClientRect().left -
    parent.getBoundingClientRect().left +
    parent.scrollLeft;
  if (left < parent.scrollLeft) parent.scrollLeft = left;
  else if (left + tab.offsetWidth > parent.scrollLeft + parent.clientWidth)
    parent.scrollLeft = left + tab.offsetWidth - parent.clientWidth;
}
function navigateTabs(id, event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = PHRASE_GROUPS.findIndex((group) => group.id === id);
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? PHRASE_GROUPS.length - 1
        : (current +
            (event.key === "ArrowRight" ? 1 : -1) +
            PHRASE_GROUPS.length) %
          PHRASE_GROUPS.length;
  selectCategory(PHRASE_GROUPS[index].id);
  const tab = event.currentTarget.parentElement.querySelector(
    `#${panelId}-${category.value}`,
  );
  tab?.focus({ preventScroll: true });
  if (tab) revealTab(tab);
}
function trackScroll() {
  atBottom.value =
    log.value.scrollHeight - log.value.scrollTop - log.value.clientHeight < 24;
  if (atBottom.value) unread.value = 0;
}
async function scrollToLatest() {
  await nextTick();
  if (log.value) log.value.scrollTop = log.value.scrollHeight;
  atBottom.value = true;
  unread.value = 0;
}
watch(() => props.active, (active) => {
  if (active) void scrollToLatest();
});
async function send() {
  if (!props.canAct || cooling.value) return;
  const phrase = selected.value;
  await props.run("say", {
    phraseId: phrase.id,
    ...(phrase.player ? { targetId: targetId.value } : {}),
    ...(phrase.role ? { role: role.value } : {}),
    ...(phrase.quest ? { quest: quest.value } : {}),
  });
}
watch(
  () => props.room.players,
  (players) => {
    if (!players.some((player) => player.id === targetId.value))
      targetId.value =
        players.find((player) => player.id !== props.room.selfId)?.id ??
        players[0]?.id ??
        "";
  },
  { immediate: true },
);
watch(
  roles,
  (options) => {
    if (!options.includes(role.value)) role.value = options[0];
  },
  { immediate: true },
);
watch(
  () => props.room.questIndex,
  (index) => {
    quest.value = index + 1;
  },
  { immediate: true },
);
watch(
  () => messages.value.at(-1)?.id,
  async (id, old) => {
    const recent = messages.value.at(-1);
    if (!id || !old || atBottom.value || recent.playerId === props.room.selfId)
      await scrollToLatest();
    else unread.value++;
  },
  { immediate: true },
);
watch(
  () =>
    messages.value.findLast((message) => message.playerId === props.room.selfId)
      ?.at,
  (at) => {
    clearTimeout(cooldownTimer);
    const delay = (at ?? 0) + MESSAGE_COOLDOWN - Date.now();
    cooling.value = delay > 0;
    if (delay > 0)
      cooldownTimer = setTimeout(() => {
        cooling.value = false;
      }, delay);
  },
  { immediate: true },
);
watch(
  () => props.room.game,
  () => {
    unread.value = 0;
    atBottom.value = true;
  },
);
onBeforeUnmount(() => {
  clearTimeout(cooldownTimer);
});
</script>
