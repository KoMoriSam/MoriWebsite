<template>
  <Teleport to="body">
    <ul
      ref="menu"
      popover="auto"
      class="dropdown menu menu-sm fixed right-auto bottom-auto m-0 w-56 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-box border border-base-300 bg-base-100! p-2 text-base-content shadow-xl [position-area:none]"
      :style="position"
      :aria-label="t('avalon.notes.player', { name: player?.nickname || '' })"
      @keydown="navigate"
    >
      <li class="menu-title break-words">
        {{ t("avalon.notes.title", { name: player?.nickname || "" }) }}
      </li>
      <li>
        <button
          type="button"
          :class="!marks[player?.id] ? 'menu-active' : ''"
          :aria-pressed="!marks[player?.id]"
          @click="choose('')"
        >
          <i class="ri-eraser-line" aria-hidden="true"></i
          >{{ t("avalon.notes.none") }}
        </button>
      </li>
      <li v-for="group in groups" :key="group.id">
        <button
          v-if="group.mark"
          type="button"
          :class="[
            group.tone,
            marks[player?.id] === group.mark ? 'menu-active' : '',
          ]"
          :aria-pressed="marks[player?.id] === group.mark"
          @click="choose(group.mark)"
        >
          <i :class="group.icon" aria-hidden="true"></i>{{ t(group.label) }}
        </button>
        <span
          v-else
          class="menu-title flex items-center gap-2"
          :class="group.tone"
        >
          <i :class="group.icon" aria-hidden="true"></i>{{ t(group.label) }}
        </span>
        <ul>
          <li v-for="mark in group.roles" :key="mark">
            <button
              type="button"
              :class="marks[player?.id] === mark ? 'menu-active' : ''"
              :aria-pressed="marks[player?.id] === mark"
              @click="choose(mark)"
            >
              <i :class="markIcon(mark)" aria-hidden="true"></i
              >{{ t(markLabel(mark)) }}
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </Teleport>
</template>
<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useLocale } from "@/i18n";
import { possibleMarks } from "@/games/avalon/notes";
import { ROLE_ICONS } from "@/games/avalon/presentation";
import { isEvil } from "../../../../../shared/games/avalon/index.js";
const props = defineProps({
  room: { type: Object, required: true },
  marks: { type: Object, required: true },
});
const emit = defineEmits(["mark"]);
const { t } = useLocale();
const menu = ref(null);
const player = ref(null);
const position = ref({});
const options = computed(() =>
  player.value ? possibleMarks(props.room, player.value.id) : [],
);
const groups = computed(() =>
  [
    {
      id: "good",
      label: "avalon.night.good",
      icon: "ri-shield-star-line",
      tone: "text-success",
      mark: options.value.includes("good") ? "good" : null,
      roles: options.value.filter(
        (mark) => Object.hasOwn(ROLE_ICONS, mark) && !isEvil(mark),
      ),
    },
    {
      id: "evil",
      label: "avalon.night.evil",
      icon: "ri-skull-line",
      tone: "text-error",
      mark: options.value.includes("evil") ? "evil" : null,
      roles: options.value.filter(
        (mark) => Object.hasOwn(ROLE_ICONS, mark) && isEvil(mark),
      ),
    },
  ].filter((group) => group.roles.length),
);
const markLabel = (mark) =>
  ({ good: "avalon.night.good", evil: "avalon.night.evil" })[mark] ||
  `avalon.roles.${mark}`;
const markIcon = (mark) =>
  ROLE_ICONS[mark] ||
  { good: "ri-shield-star-line", evil: "ri-skull-line" }[mark];
let opening = 0;
function close() {
  opening++;
  if (menu.value?.matches(":popover-open")) menu.value.hidePopover();
}
async function open(seat, event) {
  if (seat.id === props.room.selfId || props.room.phase === "finished") return;
  event.preventDefault();
  if (player.value?.id === seat.id && menu.value?.matches(":popover-open")) {
    close();
    return;
  }
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = bounds.right;
  const y = bounds.bottom + 6;
  close();
  const request = opening;
  player.value = seat;
  position.value = {
    left: "8px",
    top: "8px",
    maxHeight: `${window.innerHeight - 16}px`,
  };
  await nextTick();
  if (request !== opening) return;
  menu.value.showPopover();
  const size = {
    width: menu.value.offsetWidth,
    height: menu.value.offsetHeight,
  };
  position.value = {
    left: `${Math.max(8, Math.min(x, window.innerWidth - size.width - 8))}px`,
    top: `${Math.max(8, Math.min(y, window.innerHeight - size.height - 8))}px`,
    maxHeight: `${window.innerHeight - 16}px`,
  };
  await nextTick();
  if (request === opening)
    (
      menu.value.querySelector(".menu-active") ||
      menu.value.querySelector("button")
    )?.focus({ preventScroll: true });
}
function choose(mark) {
  if (
    player.value &&
    props.room.players.some((seat) => seat.id === player.value.id) &&
    (!mark || options.value.includes(mark))
  )
    emit("mark", player.value.id, mark);
  close();
}
function navigate(event) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...menu.value.querySelectorAll("button")];
  const current = buttons.indexOf(document.activeElement);
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[index]?.focus();
}
function onScroll(event) {
  if (!menu.value?.contains(event.target)) close();
}
watch(
  [
    () => props.room.code,
    () => props.room.selfId,
    () => props.room.game,
    () => props.room.phase,
  ],
  close,
);
onMounted(() => {
  window.addEventListener("resize", close);
  window.addEventListener("scroll", onScroll, true);
});
onBeforeUnmount(() => {
  close();
  window.removeEventListener("resize", close);
  window.removeEventListener("scroll", onScroll, true);
});
defineExpose({ open });
</script>
