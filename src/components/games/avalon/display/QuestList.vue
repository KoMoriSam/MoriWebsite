<template>
  <div
    ref="questProgress"
    class="grid shrink-0 grid-cols-5 gap-2"
    :aria-label="t('avalon.quests')"
  >
    <div
      v-for="(size, index) in teamSizes"
      :key="index"
      class="tooltip tooltip-bottom group min-w-0 [--tt-bg:var(--color-base-100)] after:hidden! hover:z-30 focus-within:z-30"
      :class="openQuest === index ? 'tooltip-open' : ''"
      @mouseenter="alignQuestTooltip"
      @focusin="
        openQuest = index;
        alignQuestTooltip($event);
      "
      @focusout="closeQuestTooltip"
    >
      <div
        :id="`${questTooltipId}-${index}`"
        role="tooltip"
        class="tooltip-content quest-tooltip fixed! bottom-auto! right-auto! hidden max-h-[min(24rem,50dvh)] w-80! max-w-[calc(100vw-2rem)]! transform-none! overflow-y-auto overscroll-contain border border-base-300 bg-base-100! p-3! text-left! text-base-content! shadow-lg scrollbar-thin group-hover:block group-focus-within:block group-hover:pointer-events-auto! group-focus-within:pointer-events-auto!"
      >
        <QuestHistory :room="room" :quest="index" :player-count="participantCount" />
      </div>
      <button
        type="button"
        class="relative block h-full w-full min-w-0 wrap-break-word rounded-box border p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-3"
        :class="questClasses(index)"
        :aria-describedby="`${questTooltipId}-${index}`"
        @click="$event.currentTarget.focus()"
        @keydown.esc="
          openQuest = null;
          $event.currentTarget.blur();
        "
      >
        <p class="text-xs">{{ t("avalon.questNumber", { n: index + 1 }) }}</p>
        <p class="mt-1 flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
          {{ size }}
          <i :class="questIcon(index)" class="text-sm font-normal" aria-hidden="true"></i>
          <span class="sr-only">{{ questLabel(index) }}</span>
        </p>
        <span
          v-if="participantCount >= 7 && index === 3"
          class="badge badge-warning badge-xs absolute -top-2 right-1 gap-0.5 px-1"
        >
          <i class="ri-sword-line text-[10px]" aria-hidden="true"></i>
          <span aria-hidden="true">2</span>
          <span class="sr-only">{{ t("avalon.twoFails") }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import { QUEST_TEAMS } from "../../../../../shared/games/avalon/index.js";
import QuestHistory from "./QuestHistory.vue";

const props = defineProps({
  room: { type: Object, default: null },
  playerCount: { type: Number, default: 5 },
});
const { t } = useLocale();
const participantCount = computed(
  () => props.room?.participants.length ?? props.playerCount,
);
const teamSizes = computed(
  () => props.room?.teamSizes ?? QUEST_TEAMS[participantCount.value] ?? QUEST_TEAMS[5],
);
const questTooltipId = `quest-detail-${useId()}`;
const openQuest = ref(null);
const questProgress = ref(null);
const questResult = (index) =>
  props.room?.quests.find((quest) => quest.quest === index);

function questClasses(index) {
  const result = questResult(index);
  return result
    ? result.success
      ? "border-success/40 bg-success/10"
      : "border-error/40 bg-error/10"
    : props.room && index === props.room.questIndex
      ? "border-base-content/40 bg-base-200"
      : "border-base-300";
}
function questLabel(index) {
  const result = questResult(index);
  return t(
    result
      ? result.success ? "avalon.success" : "avalon.failure"
      : "avalon.people",
  );
}
function questIcon(index) {
  const result = questResult(index);
  return result
    ? result.success ? "ri-checkbox-circle-line" : "ri-close-circle-line"
    : "ri-group-line";
}
function alignQuestTooltip(event) {
  const wrapper = event.currentTarget;
  const content = wrapper.querySelector(".tooltip-content");
  const bounds = wrapper.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const edge = 16;
  const gap = 8;
  const dock = document.querySelector(".dock");
  const bottom =
    dock && getComputedStyle(dock).display !== "none"
      ? dock.getBoundingClientRect().top - edge
      : viewportHeight - edge;
  const below = bounds.bottom + gap;
  const spaceBelow = Math.max(0, bottom - below);
  const spaceAbove = Math.max(0, bounds.top - gap - edge);
  const heightLimit = Math.min(
    viewportHeight * 0.5,
    24 * parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  const preferredHeight = Math.min(
    content.scrollHeight + content.offsetHeight - content.clientHeight,
    heightLimit,
  );
  const placeBelow = spaceBelow >= preferredHeight || spaceBelow >= spaceAbove;
  content.style.maxHeight = `${Math.min(heightLimit, placeBelow ? spaceBelow : spaceAbove)}px`;
  content.style.setProperty(
    "max-width",
    `${Math.max(0, viewportWidth - edge * 2)}px`,
    "important",
  );
  const width = content.offsetWidth;
  const height = content.offsetHeight;
  const left = Math.max(
    edge,
    Math.min(
      bounds.left + bounds.width / 2 - width / 2,
      viewportWidth - width - edge,
    ),
  );
  content.style.left = `${left}px`;
  content.style.top = `${placeBelow ? below : bounds.top - gap - height}px`;
}
function closeQuestTooltip(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) openQuest.value = null;
}
function realignQuestTooltip() {
  for (const wrapper of questProgress.value?.querySelectorAll(".tooltip") ?? []) {
    if (wrapper.matches(":hover, :focus-within")) {
      alignQuestTooltip({ currentTarget: wrapper });
    }
  }
}
watch(participantCount, () => {
  openQuest.value = null;
  questProgress.value?.querySelector("button:focus")?.blur();
});
onMounted(() => {
  window.addEventListener("resize", realignQuestTooltip);
  window.addEventListener("scroll", realignQuestTooltip, true);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", realignQuestTooltip);
  window.removeEventListener("scroll", realignQuestTooltip, true);
});
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
