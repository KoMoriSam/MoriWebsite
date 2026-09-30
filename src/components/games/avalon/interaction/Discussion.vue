<template>
  <section class="card" :class="compact || fillHeight ? 'h-full min-h-0' : ''">
    <div
      class="card-body gap-4 p-0"
      :class="compact || fillHeight ? 'h-full min-h-0' : ''"
    >
      <div
        v-if="!compact"
        class="flex flex-wrap items-center justify-between gap-2"
      >
        <h2 class="card-title font-serif">
          <i class="ri-user-voice-line font-normal" aria-hidden="true"></i>
          {{ t("avalon.phrases.title") }}
        </h2>
        <span class="text-xs text-base-content/50">{{
          t("avalon.phrases.limit", { n: MESSAGE_LIMIT })
        }}</span>
      </div>
      <slot name="discussion-timer"></slot>
      <div
        class="min-w-0 gap-4"
        :class="
          compact || fillHeight
            ? 'flex min-h-0 flex-1 flex-col'
            : 'grid lg:grid-cols-2 lg:items-start'
        "
      >
        <div
          class="flex min-w-0 flex-col gap-3"
          :class="compact || fillHeight ? 'min-h-0 flex-1' : ''"
        >
          <div
            ref="log"
            class="min-w-0 overflow-x-hidden"
            role="log"
            :tabindex="compact || fillHeight ? 0 : undefined"
            aria-live="polite"
            aria-relevant="additions"
            :aria-label="t('avalon.phrases.title')"
            :class="
              compact || fillHeight
                ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin'
                : 'max-h-60 overflow-y-auto overscroll-contain scrollbar-thin sm:max-h-80 lg:max-h-128'
            "
            @scroll="trackScroll"
          >
            <div
              v-if="!messages.length"
              class="py-5 text-center text-sm text-base-content/50"
            >
              {{ t("avalon.phrases.empty") }}
            </div>
            <TransitionGroup tag="div" name="chat-message" appear class="relative min-w-0 overflow-x-clip">
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
            </TransitionGroup>
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
          <span
            v-if="compact"
            class="self-end shrink-0 text-xs text-base-content/50"
            >{{ t("avalon.phrases.limit", { n: MESSAGE_LIMIT }) }}</span
          >
        </div>
        <div
          class="min-w-0 space-y-4"
          :class="
            fillHeight
              ? '-mx-1 max-h-[55%] shrink-0 overflow-y-auto overscroll-contain px-1 py-1 scrollbar-thin'
              : compact
                ? 'shrink-0'
                : ''
          "
        >
          <div>
            <div class="flex min-w-0 flex-wrap items-end gap-2">
              <div
                class="grid min-w-0 basis-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2"
              >
                <fieldset class="fieldset min-w-0">
                  <legend class="fieldset-legend pb-0">
                    {{ t("avalon.phrases.categoriesLabel") }}
                  </legend>
                  <select
                    :value="category"
                    class="select max-sm:select-sm min-w-0 w-full"
                    @change="selectCategory($event.target.value)"
                  >
                    <SelectLabel
                      :text="t(`avalon.phrases.categories.${category}`)"
                    />
                    <option
                      v-for="group in PHRASE_GROUPS"
                      :key="group.id"
                      :value="group.id"
                    >
                      {{ t(`avalon.phrases.categories.${group.id}`) }}
                    </option>
                  </select>
                </fieldset>

                <fieldset class="fieldset min-w-0">
                  <legend class="fieldset-legend pb-0">
                    {{ t("avalon.phrases.compose") }}
                  </legend>
                  <select
                    v-model="selectedId"
                    class="select max-sm:select-sm min-w-0 w-full"
                  >
                    <SelectLabel :text="preview(selected)" />
                    <option
                      v-for="phrase in currentGroup.phrases"
                      :key="phrase.id"
                      :value="phrase.id"
                    >
                      {{ preview(phrase) }}
                    </option>
                  </select>
                </fieldset>
              </div>

              <fieldset
                v-if="selected.player"
                class="fieldset min-w-0 w-26 shrink-0"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.target") }}
                </legend>
                <select
                  v-model="targetId"
                  class="select max-sm:select-sm min-w-0 w-full"
                >
                  <SelectLabel :text="targetName" />
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
                class="fieldset min-w-0 w-26 shrink-0"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.role") }}
                </legend>
                <select
                  v-model="role"
                  class="select max-sm:select-sm min-w-0 w-full"
                >
                  <SelectLabel :text="t(`avalon.roles.${role}`)" />
                  <option v-for="option in roles" :key="option" :value="option">
                    {{ t(`avalon.roles.${option}`) }}
                  </option>
                </select>
              </fieldset>

              <fieldset
                v-if="selected.quest"
                class="fieldset min-w-0 w-26 shrink-0"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.quest") }}
                </legend>
                <select
                  v-model.number="quest"
                  class="select max-sm:select-sm min-w-0 w-full"
                >
                  <SelectLabel :text="t('avalon.questNumber', { n: quest })" />
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
                class="fieldset min-w-0 flex-1"
                :class="parameterCount === 1 ? 'basis-40 flex-[2]' : 'basis-full'"
              >
                <legend class="fieldset-legend pb-0">
                  {{ t("avalon.phrases.preview") }}
                </legend>

                <div class="flex min-w-0 gap-2">
                  <div class="input max-sm:input-sm min-w-0 flex-1">
                    <span class="block min-w-0 truncate">
                      {{ preview(selected) }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="btn btn-square shrink-0 max-sm:btn-sm"
                    :disabled="!canAct || cooling"
                    @click="send"
                  >
                    <i class="ri-send-ins-line" aria-hidden="true"></i>
                  </button>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useLocale } from "@/i18n";
import {
  DEFAULT_SPECIAL_ROLES,
  roleRoster,
} from "../../../../../shared/games/avalon/index.js";
import {
  findPhrase,
  PHRASE_GROUPS,
} from "../../../../../shared/games/avalon/phrases.js";
import {
  MESSAGE_COOLDOWN,
  MESSAGE_LIMIT,
} from "../../../../../shared/games/messages.js";
const props = defineProps({
  room: { type: Object, required: true },
  canAct: Boolean,
  active: { type: Boolean, default: true },
  compact: Boolean,
  fillHeight: Boolean,
  run: { type: Function, required: true },
});
const SelectLabel = defineComponent({
  props: { text: { type: String, default: "" } },
  setup(props) {
    return () =>
      h(
        "button",
        {
          type: "button",
          class:
            "min-w-0 flex-1 overflow-hidden border-0 bg-transparent p-0 text-left text-sm text-base-content max-sm:text-xs",
        },
        h("span", { class: "block truncate" }, props.text),
      );
  },
});
const { t, locale } = useLocale();
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
const parameterCount = computed(
  () =>
    ["player", "role", "quest"].filter((key) => selected.value?.[key]).length,
);
const targetName = computed(
  () =>
    props.room.players.find((player) => player.id === targetId.value)
      ?.nickname ?? t("avalon.phrases.target"),
);
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
    name: targetName.value,
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
function trackScroll() {
  if (!log.value) return;
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
onMounted(() => {
  if (props.active) void scrollToLatest();
});
watch(
  () => props.active,
  (active) => {
    if (active) void scrollToLatest();
  },
);
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

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .chat-message-enter-active {
    transition: opacity 360ms ease, transform 360ms ease;
  }

  .chat-message-leave-active {
    position: absolute;
    width: 100%;
    transition: opacity 220ms ease, transform 220ms ease;
  }

  .chat-message-move {
    transition: transform 300ms ease;
  }

  .chat-message-enter-from,
  .chat-message-leave-to {
    opacity: 0;
    transform: translateX(-1rem);
  }

  .chat-message-enter-from.chat-end {
    transform: translateX(1rem);
  }

  .chat-message-leave-to.chat-start {
    transform: translateX(1rem);
  }
}
</style>
