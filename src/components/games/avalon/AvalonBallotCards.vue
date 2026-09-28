<template>
  <section
    class="card card-border h-52 min-w-0 bg-base-200/40 sm:h-full lg:h-72"
  >
    <div class="card-body h-full min-h-0 gap-2 p-4">
      <div class="flex min-w-0 shrink-0 items-start gap-1">
        <h3
          class="line-clamp-2 min-w-0 flex-1 font-serif font-semibold text-lg leading-6"
        >
          {{ t(`${textPrefix}.title`) }}
        </h3>
        <AvalonRoleInfo
          class="max-w-[60%]"
          :self="self"
          :self-id="selfId"
          :player-name="playerName"
        />
      </div>
      <span
        class="line-clamp-2 shrink-0 text-xs leading-4 text-base-content/60 sm:leading-5"
        >{{ t(hintKey) }}</span
      >
      <div
        class="grid min-h-0 flex-1 auto-rows-fr items-stretch gap-2 sm:gap-3"
        :class="choices.length === 1 ? 'grid-cols-1' : 'grid-cols-2'"
      >
        <button
          v-for="approve in choices"
          :key="String(approve)"
          type="button"
          class="card card-border m-0 h-full min-h-0 min-w-0 self-stretch select-none bg-base-100 text-center touch-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          :class="[
            selected === approve || (autoApproved && submitted && approve)
              ? approve
                ? 'border-success'
                : 'border-error'
              : '',
            drag?.approve === approve
              ? 'relative z-20 cursor-grabbing shadow-xl'
              : canPlay
                ? 'cursor-grab hover:border-base-content/50'
                : 'opacity-50',
          ]"
          :style="cardStyle(approve)"
          :disabled="!canPlay"
          :aria-pressed="
            selected === approve || (autoApproved && submitted && approve)
          "
          @pointerdown="beginDrag(approve, $event)"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="cancelDrag"
          @lostpointercapture="cancelDrag"
          @click="selectCard(approve)"
        >
          <span
            class="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 p-1 sm:gap-2 sm:p-3"
          >
            <i
              :class="[
                choiceIcon(approve),
                approve ? 'text-success' : 'text-error',
              ]"
              class="text-xl sm:text-3xl"
              aria-hidden="true"
            ></i>
            <span class="font-serif text-xs font-semibold sm:text-lg">{{
              t(choiceLabel(approve))
            }}</span>
          </span>
        </button>
      </div>
      <button
        ref="dropZone"
        type="button"
        class="flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-box border-2 border-dashed p-1 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:min-h-12 sm:gap-2 sm:p-2 sm:text-sm"
        :class="
          overDrop
            ? 'border-base-content bg-base-100'
            : 'border-base-300 text-base-content/60'
        "
        :disabled="!canPlay || selected === null"
        @click="submitSelected"
      >
        <i
          :class="submitted ? 'ri-check-double-line' : 'ri-hand-coin-line'"
          class="hidden text-xl sm:inline"
          aria-hidden="true"
        ></i>
        <span class="line-clamp-2">{{
          t(
            submitted
              ? "avalon.submitted"
              : selected === null
                ? `${textPrefix}.drop`
                : `${textPrefix}.compactSelected`,
            { choice: selected === null ? "" : t(choiceLabel(selected)) },
          )
        }}</span>
      </button>
    </div>
  </section>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useLocale } from "@/i18n";
import AvalonRoleInfo from "./AvalonRoleInfo.vue";
const props = defineProps({
  self: { type: Object, required: true },
  selfId: { type: String, required: true },
  playerName: { type: Function, required: true },
  active: Boolean,
  canSubmit: Boolean,
  submitted: Boolean,
  autoApproved: Boolean,
  allowFail: Boolean,
  mode: { type: String, default: "vote" },
  context: { type: String, required: true },
});
const emit = defineEmits(["vote", "quest"]);
const { t } = useLocale();
const questMode = computed(() => props.mode === "quest");
const canPlay = computed(
  () => props.active && props.canSubmit && !props.submitted,
);
const choices = computed(() =>
  (questMode.value && !props.allowFail) ||
  (!questMode.value && props.autoApproved && props.submitted)
    ? [true]
    : [true, false],
);
const textPrefix = computed(() =>
  questMode.value ? "avalon.questCards" : "avalon.ballot",
);
const hintKey = computed(() =>
  props.submitted
    ? !questMode.value && props.autoApproved
      ? "avalon.ballot.leaderApproved"
      : "avalon.submitted"
    : questMode.value
      ? props.allowFail
        ? "avalon.questCards.hint"
        : "avalon.questCards.goodHint"
      : props.active
        ? "avalon.ballot.compactHint"
        : "avalon.ballot.compactWait",
);
const choiceLabel = (choice) =>
  questMode.value
    ? choice
      ? "avalon.questCards.execute"
      : "avalon.questCards.sabotage"
    : choice
      ? "avalon.approve"
      : "avalon.reject";
const choiceIcon = (choice) =>
  questMode.value
    ? choice
      ? "ri-shield-check-line"
      : "ri-sword-line"
    : choice
      ? "ri-thumb-up-line"
      : "ri-thumb-down-line";
const selected = ref(null);
const drag = ref(null);
const overDrop = ref(false);
const dropZone = ref(null);
let capture = null;
let ignoreClickUntil = 0;
function beginDrag(approve, event) {
  if (
    !canPlay.value ||
    !choices.value.includes(approve) ||
    !event.isPrimary ||
    event.button !== 0 ||
    drag.value
  )
    return;
  selected.value = approve;
  drag.value = {
    approve,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    x: 0,
    y: 0,
    moved: false,
    context: props.context,
    mode: props.mode,
  };
  capture = event.currentTarget;
  capture.setPointerCapture(event.pointerId);
}
function withinDrop(x, y) {
  const bounds = dropZone.value?.getBoundingClientRect();
  return (
    !!bounds &&
    x >= bounds.left &&
    x <= bounds.right &&
    y >= bounds.top &&
    y <= bounds.bottom
  );
}
function moveDrag(event) {
  const state = drag.value;
  if (!state || state.pointerId !== event.pointerId) return;
  state.x = event.clientX - state.startX;
  state.y = event.clientY - state.startY;
  state.moved ||= Math.hypot(state.x, state.y) > 6;
  if (state.moved) event.preventDefault();
  overDrop.value = state.moved && withinDrop(event.clientX, event.clientY);
}
function endDrag(event) {
  const state = drag.value;
  if (!state || state.pointerId !== event.pointerId) return;
  const submit =
    state.moved &&
    withinDrop(event.clientX, event.clientY) &&
    state.context === props.context &&
    state.mode === props.mode;
  if (state.moved) ignoreClickUntil = Date.now() + 350;
  cancelDrag();
  if (submit) submitSelected();
}
function cancelDrag() {
  const pointerId = drag.value?.pointerId;
  drag.value = null;
  overDrop.value = false;
  const element = capture;
  capture = null;
  if (pointerId !== undefined && element?.hasPointerCapture(pointerId))
    element.releasePointerCapture(pointerId);
}
function selectCard(approve) {
  if (
    canPlay.value &&
    choices.value.includes(approve) &&
    Date.now() >= ignoreClickUntil
  )
    selected.value = approve;
}
function cardStyle(approve) {
  const state = drag.value;
  return state?.approve === approve
    ? {
        transform: `translate(${state.x}px, ${state.y}px) rotate(${state.x / 20}deg)`,
      }
    : {};
}
function submitSelected() {
  if (canPlay.value && choices.value.includes(selected.value))
    emit(questMode.value ? "quest" : "vote", selected.value);
}
watch(
  [() => props.context, () => props.mode, () => props.allowFail, canPlay],
  () => {
    cancelDrag();
    selected.value = null;
    ignoreClickUntil = 0;
  },
);
onBeforeUnmount(cancelDrag);
</script>
